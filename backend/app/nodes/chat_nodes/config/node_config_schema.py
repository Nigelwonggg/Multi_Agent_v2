"""
Configuration schema for domain-based node configurations
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

class LLMProviderType(str, Enum):
    """Available LLM providers"""
    GEMINI = "gemini"
    OPENAI = "openai"

class ModelConfig(BaseModel):
    """Configuration for LLM model selection"""
    provider: LLMProviderType = Field(description="LLM provider to use")
    model_name: str = Field(description="Specific model name")

class PromptConfig(BaseModel):
    """Configuration for node prompts"""
    system_prompt: str = Field(description="System prompt template")
    user_prompt_template: Optional[str] = Field(default=None, description="User prompt template")

class NodeConfig(BaseModel):
    """Complete configuration for a specific node in a domain"""
    model: ModelConfig = Field(description="Model configuration")
    prompts: PromptConfig = Field(description="Prompt configuration")

class DomainConfig(BaseModel):
    """Configuration for an entire domain"""
    default_model_provider: LLMProviderType = Field(description="Default provider for this domain")
    models: Dict[str, ModelConfig] = Field(description="Model configs per node type")
    prompts: Dict[str, PromptConfig] = Field(description="Prompt configs per node type")

class DomainsConfig(BaseModel):
    """Root configuration containing all domains"""
    domains: Dict[str, DomainConfig] = Field(description="Configuration for each domain")