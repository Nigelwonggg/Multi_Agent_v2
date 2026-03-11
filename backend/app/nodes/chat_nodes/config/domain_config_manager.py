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
        """Get list of available domains"""
        if not self._config:
            return []
        return list(self._config.domains.keys())
    
    def get_domain_config(self, domain: str) -> DomainConfig:
        """Get complete configuration for a domain"""
        if not self._config:
            raise RuntimeError("Configuration not loaded")
        
        if domain not in self._config.domains:
            available_domains = list(self._config.domains.keys())
            raise ValueError(f"Domain '{domain}' not found. Available domains: {available_domains}")
        
        return self._config.domains[domain]
    
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