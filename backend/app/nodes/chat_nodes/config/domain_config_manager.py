"""
Domain Configuration Manager for chat nodes
"""

import os
import yaml
from typing import Dict, List, Optional
from pathlib import Path

from .node_config_schema import (
    DomainsConfig, DomainConfig, NodeConfig, 
    ModelConfig, PromptConfig, LLMProviderType
)
from app.utils.logging_config import get_logger


class DomainConfigManager:
    """Singleton manager for domain-based node configurations"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.logger = get_logger("nodes.chat_nodes.config.domain_config_manager")
            self._config: Optional[DomainsConfig] = None
            self._load_configs()
            DomainConfigManager._initialized = True
    
    def _load_configs(self) -> None:
        """Load configuration from per-domain YAML files"""
        domains_dir = Path(__file__).parent / "domains"
        
        try:
            if not domains_dir.exists():
                self.logger.error(f"❌ Domains directory not found: {domains_dir}")
                raise FileNotFoundError(f"Domains directory not found: {domains_dir}")
            
            # Load all YAML files from domains directory
            domain_configs = {}
            yaml_files = list(domains_dir.glob("*.yaml")) + list(domains_dir.glob("*.yml"))
            
            if not yaml_files:
                self.logger.error(f"❌ No YAML files found in domains directory: {domains_dir}")
                raise FileNotFoundError(f"No domain configuration files found in: {domains_dir}")
            
            for yaml_file in yaml_files:
                domain_name = yaml_file.stem  # filename without extension
                
                self.logger.debug(f"📄 Loading domain config: {domain_name}")
                
                with open(yaml_file, 'r', encoding='utf-8') as file:
                    domain_data = yaml.safe_load(file)
                
                # Validate that required keys exist
                if not isinstance(domain_data, dict):
                    raise ValueError(f"Domain config {domain_name} must be a dictionary")
                
                domain_configs[domain_name] = domain_data
            
            # Create the full configuration structure
            config_data = {"domains": domain_configs}
            self._config = DomainsConfig(**config_data)
            
            loaded_domains = list(self._config.domains.keys())
            self.logger.info(f"✅ Loaded configurations for domains: {loaded_domains}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to load domain configurations: {str(e)}")
            raise
    
    def get_available_domains(self) -> List[str]:
        """Get list of available domains (from YAML and vector databases)"""
        domains = set()
        if self._config:
            domains.update(self._config.domains.keys())
        
        # Also discover from vector databases
        base_db_dir = Path("vector_databases")
        if base_db_dir.exists():
            # Check custom_domains for text stores
            custom_dir = base_db_dir / "custom_domains"
            if custom_dir.exists():
                for d in custom_dir.iterdir():
                    if d.is_dir():
                        # Support multiple naming conventions
                        if d.name.endswith("_text_db"):
                            domains.add(d.name.replace("_text_db", ""))
                        elif d.name.endswith("_db_llama"):
                            domains.add(d.name.replace("_db_llama", ""))
            
            # Check custom_image_domains for image stores
            custom_image_dir = base_db_dir / "custom_image_domains"
            if custom_image_dir.exists():
                for d in custom_image_dir.iterdir():
                    if d.is_dir():
                        if d.name.endswith("_image_db"):
                            domains.add(d.name.replace("_image_db", ""))
                        elif d.name.endswith("_db_llama"):
                            domains.add(d.name.replace("_db_llama", ""))

            # Check root vector_databases for legacy naming
            # Use explicit mapping to avoid duplicates like 'med' vs 'medical'
            legacy_mappings = {
                "med_text_db": "medical",
                "med_image_db": "medical",
                "ds_text_db_llama": "data_science",
                "ds_image_db_llama": "data_science"
            }
            
            for d in base_db_dir.iterdir():
                if d.is_dir():
                    if d.name in legacy_mappings:
                        domains.add(legacy_mappings[d.name])
                    elif (d.name.endswith("_text_db") or d.name.endswith("_db_llama")) and "custom_domains" not in str(d):
                        # Only add if it doesn't conflict with legacy or YAML
                        if d.name.endswith("_text_db"):
                            domain_name = d.name.replace("_text_db", "")
                        else:
                            domain_name = d.name.replace("_db_llama", "")
                            
                        # Basic check: if 'medical' or 'data_science' already there, 
                        # don't add 'med' or 'ds' from folders
                        if domain_name == "med" and "medical" in domains:
                            continue
                        if domain_name == "ds" and "data_science" in domains:
                            continue
                        domains.add(domain_name)

        return sorted(list(domains))
    
    def get_domain_config(self, domain: str) -> DomainConfig:
        """Get complete configuration for a domain (with fallback to generic)"""
        if not self._config:
            raise RuntimeError("Configuration not loaded")
        
        if domain in self._config.domains:
            return self._config.domains[domain]
        
        # Fallback to a generic configuration for unknown domains
        self.logger.info(f"🔍 Domain '{domain}' not found in YAML configs. Using generic fallback.")
        return DomainConfig(
            default_model_provider=LLMProviderType.GEMINI,
            models={},
            prompts={}
        )
    
    def get_model_config(self, domain: str, node_name: str) -> ModelConfig:
        """Get model configuration for specific domain and node"""
        domain_config = self.get_domain_config(domain)
        
        if node_name in domain_config.models:
            return domain_config.models[node_name]
        
        # Fallback to default provider with basic config
        self.logger.warning(f"⚠️ No model config found for {domain}.{node_name}, using default")
        return ModelConfig(
            provider=domain_config.default_model_provider,
            model_name="2.5-flash" if domain_config.default_model_provider == LLMProviderType.GEMINI else "gpt-4"
        )
    
    def get_prompt_config(self, domain: str, node_name: str) -> PromptConfig:
        """Get prompt configuration for specific domain and node"""
        domain_config = self.get_domain_config(domain)
        
        if node_name in domain_config.prompts:
            return domain_config.prompts[node_name]
        
        # Fallback to generic prompts
        self.logger.warning(f"⚠️ No prompt config found for {domain}.{node_name}, using generic")
        return PromptConfig(
            system_prompt="You are a helpful AI assistant.",
            user_prompt_template="{current_input}"
        )
    
    def get_node_config(self, domain: str, node_name: str) -> NodeConfig:
        """Get complete node configuration (model + prompts)"""
        return NodeConfig(
            model=self.get_model_config(domain, node_name),
            prompts=self.get_prompt_config(domain, node_name)
        )
    
    def reload_config(self) -> None:
        """Reload configuration from file"""
        self.logger.info("🔄 Reloading domain configurations...")
        self._load_configs()


# Singleton instance getter
_config_manager_instance = None

def get_domain_config_manager() -> DomainConfigManager:
    """Get singleton instance of domain configuration manager"""
    global _config_manager_instance
    if _config_manager_instance is None:
        _config_manager_instance = DomainConfigManager()
    return _config_manager_instance