from fastapi import APIRouter
from typing import List

from app.nodes.chat_nodes.config.domain_config_manager import get_domain_config_manager
from app.utils.logging_config import get_logger

router = APIRouter(prefix="/api/domains", tags=["domains"])
logger = get_logger("api.routes.domains")

@router.get("/", response_model=List[str])
async def get_available_domains():
    """Get list of available domains for both text and image stores"""
    try:
        config_manager = get_domain_config_manager()
        domains = config_manager.get_available_domains()
        
        logger.info(f"📋 Available domains: {domains}")
        return domains
        
    except Exception as e:
        logger.error(f"❌ Error fetching domains: {str(e)}")
        # Fallback to hardcoded domains if config manager fails
        return ["data_science", "medical"]