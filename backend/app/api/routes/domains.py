import os
import shutil
import re
import gc
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.nodes.chat_nodes.config.domain_config_manager import get_domain_config_manager
from app.services.text_store_services import get_text_store_factory
from app.services.image_store_services import get_image_store_factory
from app.utils.logging_config import get_logger
from app.utils.auth_utils import get_current_user
from app.models.user_model import User

router = APIRouter(prefix="/api/domains", tags=["domains"])
logger = get_logger("api.routes.domains")

PROTECTED_DOMAINS = ["data_science", "medical"]

def robust_rmtree(path: str, max_retries: int = 10, delay: float = 1.0):
    """Robust rmtree with retries for Windows file locking issues"""
    if not os.path.exists(path):
        return False
        
    # Try to rename first - this can sometimes help bypass locks on the directory itself
    # and frees up the original path immediately.
    target_delete_path = path
    try:
        temp_path = f"{path}_del_{int(time.time())}"
        os.rename(path, temp_path)
        target_delete_path = temp_path
        logger.info(f"🔄 Renamed {path} to {temp_path} to assist deletion")
    except Exception as e:
        logger.warning(f"⚠️ Could not rename {path} before deletion (this is common if files are locked): {str(e)}")

    for i in range(max_retries):
        try:
            shutil.rmtree(target_delete_path)
            logger.info(f"✅ Successfully deleted {target_delete_path}")
            return True
        except Exception as e:
            if i == max_retries - 1:
                logger.error(f"❌ Failed to delete {target_delete_path} after {max_retries} attempts: {str(e)}")
                raise e
            logger.warning(f"⚠️ Retry {i+1}/{max_retries} deleting {target_delete_path} due to error: {str(e)}")
            # Multiple GC cycles during retries
            for _ in range(3):
                gc.collect()
            time.sleep(delay)
    return False

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

@router.delete("/{domain}")
async def delete_domain(
    domain: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a custom domain and its associated databases and configurations.
    Only lecturers can perform this action.
    """
    if current_user.role != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can delete domains")

    domain = domain.lower()
    
    # 1. Basic Validation to prevent path traversal
    if not re.match(r"^[a-z0-9_]+$", domain):
        raise HTTPException(status_code=400, detail="Invalid domain name. Only lowercase alphanumeric and underscores are allowed.")

    if domain in PROTECTED_DOMAINS:
        raise HTTPException(status_code=400, detail=f"Domain '{domain}' is protected and cannot be deleted")

    try:
        logger.info(f"🗑️ Attempting to delete domain: {domain}")

        # 2. Remove from factories (clears internal cache/retrievers and closes Chroma)
        get_text_store_factory().remove_store(domain)
        get_image_store_factory().remove_store(domain)
        
        # 3. Force multiple garbage collection cycles to release file handles
        for _ in range(5):
            gc.collect()
        time.sleep(1.5) # Give OS significant time to release handles

        # 4. Delete physical database folders
        # Support multiple naming conventions and paths
        text_db_paths = [
            f"./vector_databases/custom_domains/{domain}_text_db",
            f"./vector_databases/custom_domains/{domain}_db_llama",
            f"./vector_databases/{domain}_text_db",
            f"./vector_databases/{domain}_db_llama"
        ]
        
        image_db_paths = [
            f"./vector_databases/custom_image_domains/{domain}_image_db",
            f"./vector_databases/custom_image_domains/{domain}_db_llama",
            f"./vector_databases/{domain}_image_db",
            f"./vector_databases/{domain}_db_llama"
        ]

        deleted_paths = []
        
        # Collect all unique potential paths
        all_possible_paths = list(set(text_db_paths + image_db_paths))
        
        for path in all_possible_paths:
            if os.path.exists(path):
                if robust_rmtree(path):
                    deleted_paths.append(path)

        # 6. Delete YAML configuration if exists
        config_dir = Path(__file__).parent.parent.parent / "nodes" / "chat_nodes" / "config" / "domains"
        yaml_path = config_dir / f"{domain}.yaml"
        yml_path = config_dir / f"{domain}.yml"
        
        if yaml_path.exists():
            os.remove(yaml_path)
            deleted_paths.append(str(yaml_path))
        if yml_path.exists():
            os.remove(yml_path)
            deleted_paths.append(str(yml_path))

        # 7. Reload config manager to reflect changes
        get_domain_config_manager().reload_config()

        if not deleted_paths:
            logger.warning(f"⚠️ No database folders or configs found for domain '{domain}', but factory cache was cleared.")

        logger.info(f"✅ Domain '{domain}' deleted successfully. Paths removed: {deleted_paths}")
        return {"message": f"Domain '{domain}' deleted successfully", "deleted_paths": deleted_paths}

    except Exception as e:
        logger.error(f"❌ Error deleting domain '{domain}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete domain: {str(e)}")