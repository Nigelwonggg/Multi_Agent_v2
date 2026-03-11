import os
import uuid
import shutil
import base64
import openai
from dotenv import load_dotenv
from unstructured.partition.pdf import partition_pdf
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.schema.document import Document
from IPython.display import display, Image, Markdown
from vector_db_prompt import (
    AVAILABLE_DOMAINS,
    get_available_domains,
    ds_text_summary_prompt, 
    ds_image_summary_prompt, 
    med_text_summary_prompt, 
    med_image_summary_prompt
)

# Load environment variables
load_dotenv()

# Constants for models and API

# Currently using Ark API
# ARK_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
# ARK_API_KEY = os.environ.get("ARK_API_KEY", "your-key-if-not-using-env")

# Using GROQ API
# vision_model = "meta-llama/llama-4-scout-17b-16e-instruct"
# text_model = "llama-3.1-8b-instant"


# vision_model = "gemini-2.0-flash"
# text_model = "gemini-2.0-flash"
# BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
# API_KEY=os.environ.get("GOOGLE_API_KEY")

BASE_URL = "https://api.groq.com/openai/v1"
API_KEY = os.environ.get("GROQ_API_KEY", "your-key-if-not-using-env")

EMBEDDING_MODEL = "sentence-transformers/all-mpnet-base-v2"

class PDFProcessor:
    def __init__(
        self, 
        pdf_dir, 
        output_path, 
        text_db_directory, 
        image_db_directory, 
        domain: str = "data_science",
        text_model: str = "llama-3.1-8b-instant",
        vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct",
        base_url: str = "https://api.groq.com/openai/v1",
        remove_old_db=False,
    ):
        """
        Initialize the PDFProcessor with paths and database configuration.
        
        Args:
            pdf_dir: Directory containing PDF files
            output_path: Output path for processed files
            text_db_directory: Directory for text vector database
            image_db_directory: Directory for image vector database
            domain: Domain for prompt generation ("data_science" or "medical")
            text_model: Model to use for text processing
            base_url: API base URL
            remove_old_db: Whether to remove existing databases
        """
        # Validate domain
        if domain not in AVAILABLE_DOMAINS:
            raise ValueError(f"Domain '{domain}' not supported. Available domains: {AVAILABLE_DOMAINS}")
        
        self.pdf_dir = pdf_dir
        self.output_path = output_path
        self.text_db_directory = text_db_directory
        self.image_db_directory = image_db_directory
        self.domain = domain
        self.remove_old_db = remove_old_db
        self.text_model = text_model
        self.vision_model = vision_model
        self.base_url = base_url

        # Initialize embeddings
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

        os.environ["TOKENIZERS_PARALLELISM"] = "false"

        # Optionally remove old text DB
        if remove_old_db and os.path.exists(text_db_directory):
            shutil.rmtree(text_db_directory)
        self.text_vectorstore = Chroma(
            collection_name=text_db_directory,
            embedding_function=self.embeddings,
            persist_directory=text_db_directory
        )

        # Optionally remove old image DB
        if remove_old_db and os.path.exists(image_db_directory):
            shutil.rmtree(image_db_directory)
        self.image_vectorstore = Chroma(
            collection_name=image_db_directory,
            embedding_function=self.embeddings,
            persist_directory=image_db_directory
        )

        # Setup OpenAI client for text tasks (using configured API)
        self.client = openai.OpenAI(
            base_url=self.base_url,
            api_key=API_KEY
        )

    @staticmethod
    def get_available_domains():
        """
        Get the list of available domains for PDF processing.
        
        Returns:
            list: List of available domain names
        """
        return get_available_domains()

    def set_domain(self, domain: str):
        """
        Change the domain for prompt generation.
        
        Args:
            domain: New domain to use ("data_science" or "medical")
            
        Raises:
            ValueError: If domain is not supported
        """
        if domain not in AVAILABLE_DOMAINS:
            raise ValueError(f"Domain '{domain}' not supported. Available domains: {AVAILABLE_DOMAINS}")
        self.domain = domain
        print(f"Domain changed to: {domain}")

    def get_current_domain(self):
        """
        Get the current domain being used.
        
        Returns:
            str: Current domain name
        """
        return self.domain

    def chunk_pdf(self, pdf_file):
        """
        Use unstructured.partition.pdf to chunk the PDF.
        """
        chunks = partition_pdf(
            filename=pdf_file,
            infer_table_structure=True,
            strategy="hi_res",
            extract_image_block_types=["Image"],
            extract_image_block_to_payload=True,
            chunking_strategy="by_title",
            max_characters=1500,
            combine_text_under_n_chars=500,
            new_after_n_chars=1200,
        )
        return chunks

    def get_text_chunks(self, chunks):
        """
        Extract text chunks from the list of chunks.
        """
        text_chunks = []
        for chunk in chunks:
            if "CompositeElement" in str(type(chunk)):
                text_chunks.append(chunk)
        return text_chunks

    def get_image_chunks(self, chunks):
        """
        Extract image chunks from the list of chunks.
        """
        images = []
        for chunk in chunks:
            if "CompositeElement" in str(type(chunk)):
                for el in chunk.metadata.orig_elements:
                    if "Image" in str(type(el)):
                        images.append({
                            'base64_image': el.metadata.image_base64,
                            'page_number': el.metadata.page_number,
                            'filename': chunk.metadata.filename
                        })
        return images

    def make_text_table_summary_prompt(self, element, category):
        """
        Create the prompt messages for summarizing text or table chunks using domain-specific prompts.
        """
        system_prompt = "You are an assistant tasked with summarizing tables and text."

        # Get domain-specific prompt
        if self.domain == "data_science":
            prompt_text = ds_text_summary_prompt(element, category)
        elif self.domain == "medical":
            prompt_text = med_text_summary_prompt(element, category)
        else:
            # Fallback to data science if domain is not recognized
            prompt_text = ds_text_summary_prompt(element, category)

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_text}
        ]

    def get_text_summary(self, text_chunk, model, category):
        """
        Request a summary for a text chunk from the OpenAI API.
        """
        prompt = self.make_text_table_summary_prompt(text_chunk.text, category)
        response = self.client.chat.completions.create(
            model=model,
            messages=prompt,
            temperature=0.6,
            max_completion_tokens=1024,
            top_p=0.95
        )
        return {
            'text_summary': response.choices[0].message.content,
            'raw_text': text_chunk.text,
            'page_number': text_chunk.metadata.page_number,
            'filename': text_chunk.metadata.filename
        }

    def create_text_db_document(self, text_summaries, category):
        """
        Create Document objects for text summaries.
        """
        doc_ids = [str(uuid.uuid4()) for _ in text_summaries]
        return [
            Document(
                page_content=summary.get("text_summary"),
                metadata={
                    "doc_id": doc_ids[i],
                    "raw_text": summary.get("raw_text"),
                    "page_number": summary.get("page_number"),
                    "filename": summary.get("filename"),
                    "category": category
                },
                id=doc_ids[i],
            )
            for i, summary in enumerate(text_summaries)
        ]

    def make_image_summary_prompt(self, image):
        """
        Create the prompt messages for summarizing an image using domain-specific prompts.
        """
        # Get domain-specific prompt
        if self.domain == "data_science":
            prompt_text = ds_image_summary_prompt(image)
        elif self.domain == "medical":
            prompt_text = med_image_summary_prompt(image)
        else:
            # Fallback to data science if domain is not recognized
            prompt_text = ds_image_summary_prompt(image)

        return [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image.get('base64_image')}",
                        }
                    }
                ]
            }
        ]

    def get_image_summary(self, image):
        """
        Request a summary for an image from the OpenAI API.
        """
        prompt = self.make_image_summary_prompt(image)

        response = self.client.chat.completions.create(
            model=self.vision_model,
            messages=prompt,
            temperature=0.6,
            max_completion_tokens=1024,
            top_p=0.95
        )
        return {
            'image_summary': response.choices[0].message.content,
            'base64_image': image.get('base64_image'),
            'page_number': image.get('page_number'),
            'filename': image.get('filename')
        }

    def create_image_db_document(self, image_summaries, category):
        """
        Create Document objects for image summaries.
        """
        doc_ids = [str(uuid.uuid4()) for _ in image_summaries]
        return [
            Document(
                page_content=summary.get("image_summary"),
                metadata={
                    "doc_id": doc_ids[i],
                    "base64_image": summary.get("base64_image"),
                    "page_number": summary.get("page_number"),
                    "filename": summary.get("filename"),
                    "category": category
                },
                id=doc_ids[i],
            )
            for i, summary in enumerate(image_summaries)
        ]

    def process_pdf(self, pdf_file_path, category):
        """
        Process a single PDF:
         - Chunk the PDF.
         - Extract text and image chunks.
         - Generate summaries.
         - Create Document objects.
         - Add them to the vector stores.
        """
        print(f"Processing {pdf_file_path}")

        # Use the file previous directory as the category
        # category = os.path.basename(os.path.normpath(pdf_file_path))

        chunks = self.chunk_pdf(pdf_file_path)

        # Process image chunks
        images = self.get_image_chunks(chunks)
        image_summaries = []
        print(f"Total image chunks: {len(images)}")
        for i, image in enumerate(images):
            print(f"\rProcessing image chunk {i} from {pdf_file_path}", end='', flush=True)
            summary = self.get_image_summary(image)
            image_summaries.append(summary)
        summary_images_docs = self.create_image_db_document(image_summaries, category)
        self.image_vectorstore.add_documents(summary_images_docs)

        # Process text chunks
        text_chunks = self.get_text_chunks(chunks)
        text_summaries = []
        print(f"\nTotal text chunks: {len(text_chunks)}")
        for i, chunk in enumerate(text_chunks):
            print(f"\rProcessing text chunk {i} from {pdf_file_path}", end='', flush=True)
            summary = self.get_text_summary(chunk, self.text_model, category)
            text_summaries.append(summary)

        summary_texts_docs = self.create_text_db_document(text_summaries, category)
        self.text_vectorstore.add_documents(summary_texts_docs)

        # According to the langchain_chroma documentation, 
        # _persist_directory is no longer needed as the add_documents method already persists the data.
        # Keeping it here for reference.
        # self.text_vectorstore._persist_directory 

        # According to the langchain_chroma documentation, 
        # _persist_directory is no longer needed as the add_documents method already persists the data.
        # Keeping it here for reference.
        # self.image_vectorstore._persist_directory

    def process_all_pdfs(self, category):
        """
        Process all PDF files in the provided directory.
        """
        directory = os.path.join(self.pdf_dir, category)
        pdf_files = [f for f in os.listdir(directory) if f.endswith('.pdf')]
        print(f"Found PDF files: {pdf_files}")
        for pdf in pdf_files:
            pdf_file_path = os.path.join(directory, pdf)
            self.process_pdf(pdf_file_path, category)


# # Example usage:
# if __name__ == "__main__":
#     # Check available domains
#     print(f"Available domains: {PDFProcessor.get_available_domains()}")
    
#     # Define paths (adjust as necessary)
#     PDF_DIR = "../kaggle_data/Data Engineering/"
#     OUTPUT_PATH = "./data/temp_pdfs_output/"
#     TEXT_DB_DIR = "kaggle_text_db"
#     IMAGE_DB_DIR = "kaggle_image_db"

#     # Create an instance of PDFProcessor with data science domain
#     processor = PDFProcessor(
#         pdf_dir=PDF_DIR,
#         output_path=OUTPUT_PATH,
#         text_db_directory=TEXT_DB_DIR,
#         image_db_directory=IMAGE_DB_DIR,
#         domain="data_science",  # Specify domain during initialization
#         remove_old_db=False
#     )
    
#     print(f"Current domain: {processor.get_current_domain()}")
    
#     # You can change domain if needed
#     # processor.set_domain("medical")

#     # To process a single PDF file:
#     # single_pdf_path = os.path.join(PDF_DIR, "example.pdf")
#     # processor.process_pdf(single_pdf_path, "some_category")

#     # To process all PDFs in the directory:
#     # processor.process_all_pdfs("some_category")
