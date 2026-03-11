"""
Router Configuration Manager
Handles general router configuration separate from domain-specific configs
"""
import yaml
from pathlib import Path
from typing import Dict, Any
from pydantic import BaseModel
from app.utils.logging_config import get_logger

logger = get_logger("nodes.chat_nodes.config.router_config_manager")

class RouterModelConfig(BaseModel):
    """Router model configuration"""
    provider: str
    model_name: str

class RouterPromptConfig(BaseModel):
    """Router prompt configuration"""
    system_prompt: str
    user_prompt_template: str

class RouterConfig(BaseModel):
    """Complete router configuration"""
    model: RouterModelConfig
    prompts: Dict[str, RouterPromptConfig]

class RouterConfigManager:
    """Manages general router configuration"""
    
    def __init__(self):
        self.config: RouterConfig = None
        self._load_config()
    
    def _load_config(self) -> None:
        """Load router configuration from YAML file"""
        try:
            config_path = Path(__file__).parent / "router_config.yaml"
            
            if not config_path.exists():
                raise FileNotFoundError(f"Router config file not found: {config_path}")
            
            with open(config_path, 'r', encoding='utf-8') as file:
                config_data = yaml.safe_load(file)
            
            # Convert to structured config
            self.config = RouterConfig(
                model=RouterModelConfig(**config_data["model"]),
                prompts={
                    "router": RouterPromptConfig(**config_data["prompts"]["router"])
                }
            )
            
            logger.info("✅ Router configuration loaded successfully")
            logger.debug(f"📄 Router using model: {self.config.model.provider}/{self.config.model.model_name}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load router configuration: {str(e)}")
            raise
    
    def get_model_config(self) -> RouterModelConfig:
        """Get router model configuration"""
        return self.config.model
    
    def get_prompt_config(self) -> RouterPromptConfig:
        """Get router prompt configuration"""
        return self.config.prompts["router"]

# Singleton instance
_router_config_manager = None

def get_router_config_manager() -> RouterConfigManager:
    """Get singleton router config manager instance"""
    global _router_config_manager
    if _router_config_manager is None:
        _router_config_manager = RouterConfigManager()
    return _router_config_manager