from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.databases.chat_database import Base


class PdfUploadJobRecord(Base):
    __tablename__ = "pdf_upload_jobs"

    job_id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, nullable=False, default="queued")
    processed_pages = Column(Integer, nullable=False, default=0)
    total_pages = Column(Integer, nullable=False, default=0)
    created_documents = Column(Integer, nullable=False, default=0)
    created_images = Column(Integer, nullable=False, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
