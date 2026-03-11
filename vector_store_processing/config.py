# API and Model Configuration

# ARK API
ARK_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
ARK_API_KEY = "your-ark-api-key"

# GROQ API
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_API_KEY = "your-groq-api-key"

# Embedding Model
EMBEDDING_MODEL = "sentence-transformers/all-mpnet-base-v2"

# Database Configuration
TEXT_DB_NAME = "text_db"
IMAGE_DB_NAME = "image_db"

# Model Configurations
MODEL_CONFIGS = {
    "dsv3": {
        "model_name": "ep-20250508132315-dpnrq",
        "base_url": ARK_BASE_URL,
        "api_key": ARK_API_KEY,
        "db_path": "text_db_dsv3"
    },
    "dsr1": {
        "model_name": "ep-20250509020913-m2x2d",
        "base_url": ARK_BASE_URL,
        "api_key": ARK_API_KEY,
        "db_path": "text_db_dsr1"
    },
    "llama": {
        "model_name": "llama-3.1-8b-instant",
        "base_url": GROQ_BASE_URL,
        "api_key": GROQ_API_KEY,
        "db_path": "text_db_llama"
    },
    "default": {
        "model_name": "ep-20250418133427-wmnwt",
        "base_url": ARK_BASE_URL,
        "api_key": ARK_API_KEY,
        "db_path": "text_db_default"
    }
}

IMAGE_MODEL_CONFIG = {
    "model_name": "meta-llama/llama-4-scout-17b-16e-instruct",
    "base_url": GROQ_BASE_URL,
    "api_key": GROQ_API_KEY,
    "db_path": "image_db"
}
