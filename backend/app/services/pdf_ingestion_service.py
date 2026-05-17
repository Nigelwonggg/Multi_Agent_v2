"""
Web PDF ingestion service.

This service adapts the original vector_store_processing PDF pipeline for
web uploads. It uses layout-aware PDF partitioning, generates domain-specific
summaries with an LLM, and stores both text and image documents in the
appropriate domain vector stores.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict, List, Literal, Optional, Sequence
import os
import tempfile
import uuid

import openai
from pypdf import PdfReader
from dotenv import load_dotenv
from unstructured.partition.pdf import partition_pdf

from app.services.image_store_services import get_image_store_factory
from app.services.text_store_services import get_text_store_factory
from app.databases.chat_database import SessionLocal
from app.models.pdf_upload_job import PdfUploadJobRecord
from app.services.pdf_summary_prompts import (
    AVAILABLE_DOMAINS,
    ds_image_summary_prompt,
    ds_text_summary_prompt,
    med_image_summary_prompt,
    med_text_summary_prompt,
    generic_image_summary_prompt,
    generic_text_summary_prompt,
)
from app.utils.logging_config import get_logger


load_dotenv()

JobStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]


@dataclass
class PdfUploadJob:
    job_id: str
    filename: str
    domain: str
    category: str
    status: JobStatus = "queued"
    processed_pages: int = 0
    total_pages: int = 0
    created_documents: int = 0
    created_images: int = 0
    error: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, object]:
        return {
            "job_id": self.job_id,
            "filename": self.filename,
            "domain": self.domain,
            "category": self.category,
            "status": self.status,
            "processed_pages": self.processed_pages,
            "total_pages": self.total_pages,
            "created_documents": self.created_documents,
            "created_images": self.created_images,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class PdfIngestionService:
    """Service for web PDF ingestion and upload job lifecycle management."""

    def __init__(self):
        self.logger = get_logger("services.pdf_ingestion")
        self.text_factory = get_text_store_factory()
        self.image_factory = get_image_store_factory()

        requested_provider = os.getenv("PDF_LLM_PROVIDER", "").strip().lower()
        openai_api_key = os.getenv("PDF_OPENAI_API_KEY", os.getenv("PDF_API_KEY", os.getenv("OPENAI_API_KEY", "")))
        groq_api_key = os.getenv("PDF_GROQ_API_KEY", os.getenv("PDF_API_KEY", os.getenv("GROQ_API_KEY", "")))
        gemini_api_key = os.getenv("PDF_GEMINI_API_KEY", os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", "")))

        if requested_provider in {"openai", "groq", "gemini"}:
            self.provider = requested_provider
        elif openai_api_key:
            self.provider = "openai"
        elif gemini_api_key:
            self.provider = "gemini"
        elif groq_api_key:
            self.provider = "groq"
        else:
            self.provider = "openai"

        if self.provider == "groq":
            self.text_model = os.getenv("PDF_GROQ_TEXT_MODEL", os.getenv("PDF_TEXT_MODEL", "llama-3.3-70b-versatile"))
            self.vision_model = os.getenv(
                "PDF_GROQ_VISION_MODEL",
                os.getenv("PDF_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
            )
            self.base_url = os.getenv("PDF_API_BASE_URL", os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"))
            self.api_key = groq_api_key
        elif self.provider == "gemini":
            self.text_model = os.getenv("PDF_GEMINI_TEXT_MODEL", os.getenv("PDF_TEXT_MODEL", "gemini-2.5-flash"))
            self.vision_model = os.getenv("PDF_GEMINI_VISION_MODEL", os.getenv("PDF_VISION_MODEL", "gemini-2.5-flash"))
            self.base_url = os.getenv(
                "PDF_API_BASE_URL",
                os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),
            )
            self.api_key = gemini_api_key
        else:
            self.text_model = os.getenv("PDF_OPENAI_TEXT_MODEL", os.getenv("PDF_TEXT_MODEL", "gpt-4o-mini"))
            self.vision_model = os.getenv("PDF_OPENAI_VISION_MODEL", "gpt-4o-mini")
            self.base_url = os.getenv("PDF_API_BASE_URL", os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))
            self.api_key = openai_api_key

        self.fallback_provider = "groq" if self.provider == "openai" and groq_api_key else None
        self.fallback_text_model = os.getenv(
            "PDF_FALLBACK_TEXT_MODEL",
            os.getenv("PDF_GROQ_TEXT_MODEL", "llama-3.3-70b-versatile"),
        ) if self.fallback_provider else None
        self.fallback_vision_model = os.getenv(
            "PDF_FALLBACK_VISION_MODEL",
            os.getenv("PDF_GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
        ) if self.fallback_provider else None

        self.logger.info(
            "PDF ingestion provider selected: %s (text_model=%s, vision_model=%s, fallback=%s)",
            self.provider,
            self.text_model,
            self.vision_model,
            self.fallback_provider or "none",
        )

        self.client = self._build_client(self.provider)
        self.fallback_client = self._build_client(self.fallback_provider) if self.fallback_provider else None

        if not self.client:
            self.logger.warning(
                "PDF ingestion LLM client not initialized because no API key was found for provider %s.",
                self.provider,
            )

        # Parsing knobs: tune speed/accuracy without changing code.
        self.parse_strategy = os.getenv("PDF_PARSE_STRATEGY", "auto")
        self.parse_infer_table_structure = self._env_bool("PDF_PARSE_INFER_TABLE_STRUCTURE", False)
        self.parse_extract_images = self._env_bool("PDF_PARSE_EXTRACT_IMAGES", True)
        self.parse_max_characters = self._env_int("PDF_PARSE_MAX_CHARACTERS", 1500)
        self.parse_combine_text_under_n_chars = self._env_int("PDF_PARSE_COMBINE_TEXT_UNDER_N_CHARS", 500)
        self.parse_new_after_n_chars = self._env_int("PDF_PARSE_NEW_AFTER_N_CHARS", 1200)

        self.logger.info(
            "PDF parse config: strategy=%s, infer_tables=%s, extract_images=%s",
            self.parse_strategy,
            self.parse_infer_table_structure,
            self.parse_extract_images,
        )

        self._lock = Lock()

    @staticmethod
    def _env_bool(name: str, default: bool) -> bool:
        value = os.getenv(name)
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "on"}

    @staticmethod
    def _env_int(name: str, default: int) -> int:
        value = os.getenv(name)
        if value is None:
            return default
        try:
            return int(value)
        except ValueError:
            return default

    def create_job(self, filename: str, domain: str, category: str) -> str:
        # Flexible domains: If not in AVAILABLE_DOMAINS, it will use generic prompts and stores
        job_id = str(uuid.uuid4())
        job = PdfUploadJob(job_id=job_id, filename=filename, domain=domain, category=category)
        db = SessionLocal()
        try:
            db.add(
                PdfUploadJobRecord(
                    job_id=job.job_id,
                    filename=job.filename,
                    domain=job.domain,
                    category=job.category,
                    status=job.status,
                    processed_pages=job.processed_pages,
                    total_pages=job.total_pages,
                    created_documents=job.created_documents,
                    created_images=job.created_images,
                    error=job.error,
                    created_at=job.created_at,
                    updated_at=job.updated_at,
                )
            )
            db.commit()
        finally:
            db.close()

        self.logger.info("Created PDF upload job %s for file %s in domain %s", job_id, filename, domain)
        return job_id

    def cancel_job(self, job_id: str) -> bool:
        """Mark a job as cancelled so processing stops."""
        db = SessionLocal()
        try:
            job = db.query(PdfUploadJobRecord).filter(PdfUploadJobRecord.job_id == job_id).first()
            if job and job.status in ["queued", "processing"]:
                job.status = "cancelled"
                job.updated_at = datetime.now(timezone.utc)
                db.add(job)
                db.commit()
                self.logger.info("Job %s marked as cancelled", job_id)
                return True
            return False
        finally:
            db.close()

    def _is_cancelled(self, job_id: str) -> bool:
        """Check if job has been marked as cancelled."""
        db = SessionLocal()
        try:
            job = db.query(PdfUploadJobRecord).filter(PdfUploadJobRecord.job_id == job_id).first()
            return job.status == "cancelled" if job else False
        finally:
            db.close()

    def get_job(self, job_id: str) -> Optional[Dict[str, object]]:
        db = SessionLocal()
        try:
            job = db.query(PdfUploadJobRecord).filter(PdfUploadJobRecord.job_id == job_id).first()
            if not job:
                return None

            return {
                "job_id": job.job_id,
                "filename": job.filename,
                "domain": job.domain,
                "category": job.category,
                "status": job.status,
                "processed_pages": job.processed_pages,
                "total_pages": job.total_pages,
                "created_documents": job.created_documents,
                "created_images": job.created_images,
                "error": job.error,
                "created_at": job.created_at.isoformat(),
                "updated_at": job.updated_at.isoformat(),
            }
        finally:
            db.close()

    def _update_job(self, job_id: str, **updates: object) -> None:
        db = SessionLocal()
        try:
            job = db.query(PdfUploadJobRecord).filter(PdfUploadJobRecord.job_id == job_id).first()
            if not job:
                return

            for key, value in updates.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            job.updated_at = datetime.now(timezone.utc)
            db.add(job)
            db.commit()
        finally:
            db.close()

    def process_pdf_file(self, *, file_path: Path, filename: str, domain: str, category: str, job_id: str) -> None:
        self._update_job(job_id, status="processing", error=None)

        try:
            # Check for cancellation before starting
            if self._is_cancelled(job_id):
                self.logger.info("Job %s was cancelled before processing started.", job_id)
                return

            # Get total pages first
            try:
                reader = PdfReader(str(file_path))
                total_pages = len(reader.pages)
                self._update_job(job_id, total_pages=total_pages)
            except Exception as e:
                self.logger.warning("Could not determine total pages for job %s: %s", job_id, e)
                total_pages = 0

            # Factories now handle dynamic domain creation via Generic stores
            text_store = self.text_factory.get_store_by_name(domain)
            image_store = self.image_factory.get_store_by_name(domain)

            self.logger.info("Starting PDF partitioning for job %s (file: %s)", job_id, filename)
            try:
                chunks = self._partition_pdf(str(file_path))
            except Exception as e:
                self.logger.error("Failed to partition PDF for job %s: %s", job_id, e)
                raise RuntimeError(f"PDF partitioning failed: {str(e)}")

            text_chunks = self._get_text_chunks(chunks)
            image_chunks = self._get_image_chunks(chunks)

            processed_pages = self._infer_processed_pages(text_chunks, image_chunks)
            created_documents = 0
            created_images = 0

            self.logger.info(
                "Processing PDF %s in domain %s: %s text chunks, %s image chunks",
                filename,
                domain,
                len(text_chunks),
                len(image_chunks),
            )

            for index, text_chunk in enumerate(text_chunks, start=1):
                if self._is_cancelled(job_id):
                    self.logger.info("Job %s was cancelled during text processing.", job_id)
                    return

                summary = self._get_text_summary(
                    text_chunk,
                    self.text_model,
                    category,
                    domain,
                    source_filename=filename,
                )
                summary_docs = self._create_text_db_document([summary], category)
                for document in summary_docs:
                    # Access the underlying Chroma store
                    text_store.text_store.add_documents([document], ids=[document.metadata["doc_id"]])
                created_documents += len(summary_docs)

                self._update_job(
                    job_id,
                    processed_pages=processed_pages,
                    created_documents=created_documents,
                    created_images=created_images,
                )

            for index, image in enumerate(image_chunks, start=1):
                if self._is_cancelled(job_id):
                    self.logger.info("Job %s was cancelled during image processing.", job_id)
                    return

                summary = self._get_image_summary(image, domain, source_filename=filename)
                summary_docs = self._create_image_db_document([summary], category)
                for document in summary_docs:
                    # Access the underlying Chroma store
                    image_store.image_store.add_documents([document], ids=[document.metadata["doc_id"]])
                created_images += len(summary_docs)

                self._update_job(
                    job_id,
                    processed_pages=processed_pages,
                    created_documents=created_documents,
                    created_images=created_images,
                )

            self._update_job(
                job_id,
                status="completed",
                processed_pages=processed_pages,
                created_documents=created_documents,
                created_images=created_images,
            )

            self.logger.info(
                "Completed PDF upload job %s. processed_pages=%s, created_documents=%s, created_images=%s",
                job_id,
                processed_pages,
                created_documents,
                created_images,
            )

        except Exception as exc:
            self.logger.exception("PDF upload job %s failed", job_id)
            self._update_job(job_id, status="failed", error=str(exc))

    def _partition_pdf(self, file_path: str):
        kwargs = {
            "filename": file_path,
            "infer_table_structure": self.parse_infer_table_structure,
            "strategy": self.parse_strategy,
            "chunking_strategy": "by_title",
            "max_characters": self.parse_max_characters,
            "combine_text_under_n_chars": self.parse_combine_text_under_n_chars,
            "new_after_n_chars": self.parse_new_after_n_chars,
        }

        if self.parse_extract_images:
            kwargs["extract_image_block_types"] = ["Image"]
            kwargs["extract_image_block_to_payload"] = True

        return partition_pdf(
            **kwargs,
        )

    @staticmethod
    def _get_text_chunks(chunks) -> List[object]:
        text_chunks = []
        for chunk in chunks:
            if "CompositeElement" in str(type(chunk)):
                text_chunks.append(chunk)
        return text_chunks

    @staticmethod
    def _get_image_chunks(chunks) -> List[Dict[str, object]]:
        images: List[Dict[str, object]] = []
        for chunk in chunks:
            if "CompositeElement" not in str(type(chunk)):
                continue

            orig_elements = getattr(getattr(chunk, "metadata", None), "orig_elements", []) or []
            for element in orig_elements:
                if "Image" in str(type(element)):
                    image_base64 = getattr(getattr(element, "metadata", None), "image_base64", None)
                    if not image_base64:
                        continue

                    images.append(
                        {
                            "base64_image": image_base64,
                            "page_number": getattr(getattr(element, "metadata", None), "page_number", None),
                            "filename": getattr(getattr(chunk, "metadata", None), "filename", ""),
                        }
                    )
        return images

    def _make_text_summary_prompt(self, element: str, category: str, domain: str):
        if domain == "medical":
            prompt_text = med_text_summary_prompt(element, category)
        elif domain == "data_science":
            prompt_text = ds_text_summary_prompt(element, category)
        else:
            prompt_text = generic_text_summary_prompt(element, category, domain)

        return [
            {"role": "system", "content": "You are an assistant tasked with summarizing tables and text."},
            {"role": "user", "content": prompt_text},
        ]

    def _make_image_summary_prompt(self, image: Dict[str, object], domain: str):
        if domain == "medical":
            prompt_text = med_image_summary_prompt(image)
        elif domain == "data_science":
            prompt_text = ds_image_summary_prompt(image)
        else:
            prompt_text = generic_image_summary_prompt(image, domain)

        return [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image.get('base64_image')}"},
                    },
                ],
            }
        ]

    def _get_text_summary(
        self,
        text_chunk,
        model: str,
        category: str,
        domain: str,
        source_filename: Optional[str] = None,
    ):
        raw_text = getattr(text_chunk, "text", "") or ""
        page_number = getattr(getattr(text_chunk, "metadata", None), "page_number", None)
        resolved_filename = source_filename or getattr(getattr(text_chunk, "metadata", None), "filename", "")

        content = self._generate_summary(
            model=model,
            messages=self._make_text_summary_prompt(raw_text, category, domain),
        )

        if not content:
            content = self._fallback_text_summary(raw_text)

        return {
            "text_summary": content,
            "raw_text": raw_text,
            "page_number": page_number,
            "filename": resolved_filename,
        }

    def _get_image_summary(self, image: Dict[str, object], domain: str, source_filename: Optional[str] = None):
        content = self._generate_summary(
            model=self.vision_model,
            messages=self._make_image_summary_prompt(image, domain),
        )

        if not content:
            content = self._fallback_image_summary(image)

        return {
            "image_summary": content,
            "base64_image": image.get("base64_image"),
            "page_number": image.get("page_number"),
            "filename": source_filename or image.get("filename"),
        }

    def _build_client(self, provider: Optional[str]):
        if provider == self.provider and self.api_key:
            return openai.OpenAI(base_url=self.base_url, api_key=self.api_key)

        if provider == "groq" and self.fallback_provider == "groq":
            groq_api_key = os.getenv("PDF_GROQ_API_KEY", os.getenv("PDF_API_KEY", os.getenv("GROQ_API_KEY", "")))
            groq_base_url = os.getenv("PDF_API_BASE_URL", os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"))
            if groq_api_key:
                return openai.OpenAI(base_url=groq_base_url, api_key=groq_api_key)

        return None

    def _generate_summary(self, model: str, messages: Sequence[Dict[str, object]]) -> str:
        if not self.client:
            return ""

        # Determine if this is a vision request by checking if any message content is a list
        is_vision = any(isinstance(m.get("content"), list) for m in messages)

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=list(messages),
                temperature=0.6,
                max_completion_tokens=512,
                top_p=0.95,
            )
            return (response.choices[0].message.content or "").strip()
        except openai.RateLimitError:
            self.logger.warning("PDF summary request hit rate limit on provider %s.", self.provider)
            if self.fallback_client and self.fallback_provider == "groq":
                # Correctly choose fallback based on request type, not just model name equality
                fallback_model = self.fallback_vision_model if is_vision else self.fallback_text_model
                try:
                    response = self.fallback_client.chat.completions.create(
                        model=fallback_model or model,
                        messages=list(messages),
                        temperature=0.6,
                        max_tokens=512,
                        top_p=0.95,
                    )
                    self.logger.info("PDF summary succeeded using fallback provider %s.", self.fallback_provider)
                    return (response.choices[0].message.content or "").strip()
                except Exception:
                    self.logger.exception("PDF summary fallback provider %s also failed.", self.fallback_provider)
                    return ""

            return ""
        except Exception:
            self.logger.exception("PDF summary generation failed for provider %s.", self.provider)
            return ""

    @staticmethod
    def _fallback_text_summary(raw_text: str) -> str:
        normalized = " ".join(raw_text.split())
        if len(normalized) <= 400:
            return normalized
        return normalized[:397] + "..."

    @staticmethod
    def _fallback_image_summary(image: Dict[str, object]) -> str:
        return (
            f"Embedded image extracted from {image.get('filename', 'uploaded PDF')} "
            f"on page {image.get('page_number', 'unknown')}."
        )

    def _create_text_db_document(self, text_summaries, category):
        doc_ids = [str(uuid.uuid4()) for _ in text_summaries]
        from langchain.schema.document import Document

        return [
            Document(
                page_content=summary.get("text_summary"),
                metadata={
                    "doc_id": doc_ids[i],
                    "raw_text": summary.get("raw_text"),
                    "page_number": summary.get("page_number"),
                    "filename": summary.get("filename"),
                    "category": category,
                },
                id=doc_ids[i],
            )
            for i, summary in enumerate(text_summaries)
        ]

    def _create_image_db_document(self, image_summaries, category):
        doc_ids = [str(uuid.uuid4()) for _ in image_summaries]
        from langchain.schema.document import Document

        return [
            Document(
                page_content=summary.get("image_summary"),
                metadata={
                    "doc_id": doc_ids[i],
                    "base64_image": summary.get("base64_image"),
                    "page_number": summary.get("page_number"),
                    "filename": summary.get("filename"),
                    "category": category,
                },
                id=doc_ids[i],
            )
            for i, summary in enumerate(image_summaries)
        ]

    @staticmethod
    def _infer_processed_pages(text_chunks: Sequence[object], image_chunks: Sequence[Dict[str, object]]) -> int:
        pages = set()
        for chunk in text_chunks:
            page_number = getattr(getattr(chunk, "metadata", None), "page_number", None)
            if page_number is not None:
                pages.add(page_number)
        for image in image_chunks:
            page_number = image.get("page_number")
            if page_number is not None:
                pages.add(page_number)
        return len(pages)

    @staticmethod
    def save_upload_to_temp_file(file_bytes: bytes, suffix: str = ".pdf") -> Path:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(file_bytes)
        temp_file.flush()
        temp_file.close()
        return Path(temp_file.name)

    @staticmethod
    def cleanup_temp_file(file_path: Path) -> None:
        try:
            file_path.unlink(missing_ok=True)
        except Exception:
            pass


_pdf_ingestion_service_instance: Optional[PdfIngestionService] = None


def get_pdf_ingestion_service() -> PdfIngestionService:
    global _pdf_ingestion_service_instance
    if _pdf_ingestion_service_instance is None:
        _pdf_ingestion_service_instance = PdfIngestionService()
    return _pdf_ingestion_service_instance
