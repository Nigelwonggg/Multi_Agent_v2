"""
Router node for determining if RAG is needed
"""
from typing import Dict, Any, List, Literal
from typing_extensions import Literal as TLiteral
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from app.utils.logging_config import get_logger

from ..base import BaseNode, State
from app.services.llm import llm_factory, LLMProvider
from ..config.domain_config_manager import get_domain_config_manager
from ..config.router_config_manager import get_router_config_manager

# Get available domains from configuration
config_manager = get_domain_config_manager()
AVAIALABLE_DOMAINS = config_manager.get_available_domains()
DomainLiteral = TLiteral[tuple(AVAIALABLE_DOMAINS)] 

class RouterOutput(BaseModel):
    is_rag_needed: bool = Field(description="True if RAG is needed, false if not")
    domains: List[Literal[DomainLiteral]] 

class RouterNode(BaseNode):
    def __init__(self):
        super().__init__("router_agent")
        
        # Get logger for this specific class
        self.logger = get_logger("nodes.chat_nodes.router")
        self.domain_config_manager = get_domain_config_manager()
        self.router_config_manager = get_router_config_manager()
        
        try:
            self.logger.info("✅ Router initialized successfully with general router config")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Router: {str(e)}")
            raise
    
    def execute(self, state: State) -> Dict[str, Any]:
        """Execute router logic"""
        messages = state["messages"]
        current_input = state["current_input"]
        
        # Dynamically fetch available domains to include newly created ones
        available_domains = self.domain_config_manager.get_available_domains()
        requested_domains = state.get("requested_domains", [])
        selected_requested_domains = [
            domain for domain in requested_domains if domain in available_domains
        ]
        
        self.logger.info(f"🔍 Router analyzing query: '{current_input}'")
        self.logger.debug(f"📄 Available domains: {available_domains}")

        if state.get("force_rag"):
            domains = available_domains if state.get("search_all_domains") else selected_requested_domains or available_domains
            self.logger.info(f"✅ Router using requested RAG domains: {domains}")
            return {
                "is_rag_needed": bool(domains),
                "domains": domains,
            }
        
        # Use general router configuration (not domain-specific)
        model_config = self.router_config_manager.get_model_config()
        prompt_config = self.router_config_manager.get_prompt_config()
        
        self.logger.debug(f"⚙️ Using router model: {model_config.provider}/{model_config.model_name}")
        
        # Use general router prompts
        system_prompt = prompt_config.system_prompt
        user_prompt = prompt_config.user_prompt_template.format(
            messages=messages,
            current_input=current_input,
            available_domains=available_domains
        )
        
        # Prepare messages for LLM
        llm_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        # Use general router model configuration
        # Gemini-2.0-flash-exp and similar models use method: "json_schema"
        structured_kwargs = {"method": "json_schema"}
        if model_config.provider.lower() == "openai":
            structured_kwargs["strict"] = True
            
        router_llm_with_output = llm_factory.get_structured_model(
            LLMProvider[model_config.provider.upper()], 
            RouterOutput,
            model_name=model_config.model_name,
            **structured_kwargs
        )

        try:
            # Invoke LLM with system + user message
            self.logger.debug("🔍 Calling LLM for routing decision...")
            
            response = router_llm_with_output.invoke(llm_messages)
            
            is_rag_needed = response.is_rag_needed

            if not is_rag_needed:
                domains = []
            elif state.get("search_all_domains"):
                domains = available_domains
            else:
                model_domains = [d for d in response.domains if d in available_domains]
                domains = list(dict.fromkeys([*model_domains, *selected_requested_domains]))

            self.logger.info(f"✅ Router decision: is_rag_needed={is_rag_needed}, domains={domains}")
            
            return {
                "is_rag_needed": is_rag_needed,
                "domains": domains
            }
        
        except Exception as e:
            self.logger.error(f"💥 Error in router LLM call: {str(e)}")
            self.logger.exception("🔍 Full LLM error traceback:")
            
            # Fallback to direct answer
            self.logger.warning("🔄 Falling back to direct answer due to LLM error")
            return {
                "is_rag_needed": False
            }
        
# Create router instance
router = RouterNode()
