"""
Configuration manager for direct answer agent
"""
import yaml
import os
from pathlib import Path
from typing import Dict, Any
from dataclasses import dataclass
from app.utils.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class ModelConfig:
    provider: str
    model_name: str


@dataclass 
class PromptConfig:
    system_prompt: str
    user_prompt_template: str


class DirectAnswerConfigManager:
    """Manages configuration for direct answer agent"""
    
    def __init__(self, config_path: str = None):
        self.logger = get_logger("nodes.chat_nodes.config.direct_answer_config_manager")
        
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), 
                "direct_answer_config.yaml"
            )
        
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.logger.info("✅ Direct Answer configuration loaded successfully")
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as file:
                config = yaml.safe_load(file)
                self.logger.debug(f"📄 Loaded config from: {self.config_path}")
                return config
        except Exception as e:
            self.logger.error(f"❌ Error loading config from {self.config_path}: {str(e)}")
            raise
    
    def get_model_config(self, agent_type: str) -> ModelConfig:
        """Get model configuration for specific agent type"""
        try:
            model_config = self.config["models"][agent_type]
            return ModelConfig(
                provider=model_config["provider"],
                model_name=model_config["model_name"]
            )
        except KeyError as e:
            self.logger.error(f"❌ Model config not found for agent: {agent_type}, key: {e}")
            # Return default configuration
            return ModelConfig(provider="gemini", model_name="2.5-flash")
    
    def get_prompt_config(self, agent_type: str) -> PromptConfig:
        """Get prompt configuration for specific agent type"""
        try:
            prompt_config = self.config["prompts"][agent_type]
            return PromptConfig(
                system_prompt=prompt_config["system_prompt"],
                user_prompt_template=prompt_config["user_prompt_template"]
            )
        except KeyError as e:
            self.logger.error(f"❌ Prompt config not found for agent: {agent_type}, key: {e}")
            # Return default configuration
            return PromptConfig(
                system_prompt="You are a helpful assistant.",
                user_prompt_template="Please answer: {current_input}"
            )
    
    def get_default_model_provider(self) -> str:
        """Get default model provider"""
        return self.config.get("default_model_provider", "gemini")


# Global instance
_direct_answer_config_manager = None


def get_direct_answer_config_manager() -> DirectAnswerConfigManager:
    """Get the global direct answer config manager instance"""
    global _direct_answer_config_manager
    if _direct_answer_config_manager is None:
        _direct_answer_config_manager = DirectAnswerConfigManager()
    return _direct_answer_config_manager