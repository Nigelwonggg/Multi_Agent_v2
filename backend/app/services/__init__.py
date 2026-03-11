# from .text_store_service import TextStoreService
# from .image_store_service import ImageStoreService

# Import LLM services for easy access
from .llm import (
    get_llm_factory, 
    get_embedding_service,
    LLMProvider,
    LLMFactory,
    EmbeddingService
)

# Create singleton instances
# text_store_service = TextStoreService()
# image_store_service = ImageStoreService()