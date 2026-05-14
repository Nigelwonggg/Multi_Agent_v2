from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ================================================================
# LOGGING SETUP
# ================================================================
# Import centralized logging
from app.utils.logging_config import setup_logging, get_logger

# Ensure logging is properly configured with DEBUG level
setup_logging(log_level="DEBUG", enable_console_logging=True, enable_file_logging=True)

# Get logger for main module
logger = get_logger("main")


# ================================================================
# DATABASE SETUP
# ================================================================
from app.databases.chat_database import init_db

# ================================================================
# FASTAPI APPLICATION
# ================================================================

app = FastAPI(
    title="Chatbot Backend",
    description="A chatbot backend application using FastAPI and LangGraph.",
    version="0.1.0",
)


# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://gen-lang-client-0059459242.web.app",
        "https://gen-lang-client-0059459242.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("🌐 CORS middleware configured")


# ================================================================
# API ROUTES
# ================================================================
from app.api.routes.chat import router as chat_router
app.include_router(chat_router)

from app.api.routes.auth import router as auth_router
app.include_router(auth_router)

from app.api.routes.identity_registry import router as identity_registry_router
app.include_router(identity_registry_router)

from app.api.routes.text_store import router as text_store_router
app.include_router(text_store_router)

from app.api.routes.image_store import router as image_store_router
app.include_router(image_store_router)

from app.api.routes.domains import router as domains_router
app.include_router(domains_router)

from app.api.routes import quiz
app.include_router(quiz.router)

from app.api.routes.quiz import router as quiz_router
app.include_router(quiz_router)

from app.databases.session import Base, engine
from app.models import quiz, question 

Base.metadata.create_all(bind=engine)

# ================================================================
# LLM FACTORY INITIALIZATION
# ================================================================
# from app.services.llm.llm_factory import get_llm_factory

@app.on_event("startup")
def on_startup():
    init_db()
    # llm_factory = get_llm_factory()
    logger.info("🎬 Application startup complete")
    logger.info("📊 Available endpoints:")


@app.get("/")
async def root():
    return {"message": "Welcome to the Chatbot Backend!"}
