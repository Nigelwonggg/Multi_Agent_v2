"""
Image Selection Node with structured output
"""
from typing import Dict, Any
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage

from app.utils.logging_config import get_logger
from ..base import BaseNode, State
from app.services.image_store_services import image_store_factory
from app.services.llm import llm_factory, LLMProvider
from ..config.domain_config_manager import get_domain_config_manager

class ImageSelectionOutput(BaseModel):
    """Output schema for image selection"""

    selected_image_index: int = Field(
        description="Index of the selected image from the retrieved images. Use -1 if no image is suitable"
    )
    justification: str = Field(
        description="One-line justification for the selected image or why no image is suitable"
    )


class ImageSelectionNode(BaseNode):
    """Node that selects the most relevant image using structured LLM output"""

    def __init__(self):
        super().__init__("image_selection_agent")
        # Get specific logger for this class
        self.logger = get_logger("nodes.chat_nodes.image_selection")
        self.config_manager = get_domain_config_manager()

        try:
            self.logger.info("✅ Image Selection initialized successfully with domain config")

        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Image Selection: {str(e)}")
            raise

    def execute(self, state: State) -> Dict[str, Any]:
        """Execute image selection logic using structured LLM output"""
        text_answer = state.get("text_answer", "")
        current_input = state["current_input"]

        # Get domain from state, fallback to data_science
        domains = state.get("domains", ["data_science"])
        primary_domain = domains[0] if domains else "data_science"
        
        # Get domain-specific configurations
        model_config = self.config_manager.get_model_config(primary_domain, "image_selection")
        self.logger.info(f"🖼️ Using model: {model_config.model_name} from provider: {model_config.provider}")

        prompt_config = self.config_manager.get_prompt_config(primary_domain, "image_selection")

        self.logger.info(f"🖼️ Processing image selection for query: '{current_input}' using domain: '{primary_domain}'")


        try:
            image_store_service = image_store_factory.get_store_by_name(primary_domain)

            # Retrieve image documents from vector store
            images = image_store_service.search_images_by_query(current_input)

            self.logger.debug(f"🔍 Retrieved {len(images)} images from vector store")

            if not images:
                self.logger.warning("⚠️ No images found in vector store")
                return {
                    "text_answer": text_answer,
                    "selected_image": None,
                    "used_image": None,
                    "image_selection_result": {
                        "selected_image_index": None,
                        "justification": "No images available in the vector store",
                    },
                }

            # Format image summaries
            image_summaries = ""
            for i, image in enumerate(images):
                image_summary = image.page_content
                image_summaries += f"***[IMG_{i}]:*** \n\n{image_summary}\n\n"

            self.logger.debug(f"📄 Formatted summaries for {len(images)} images")

            # Use domain-specific prompts
            system_prompt = prompt_config.system_prompt
            user_prompt = prompt_config.user_prompt_template.format(
                current_input=current_input,
                text_answer=text_answer,
                image_summaries=image_summaries
            )

            self.logger.debug(f"🗨️ System message length: {len(system_prompt)} chars")
            self.logger.debug(f"👤 User message length: {len(user_prompt)} chars")

            # Prepare messages for LLM
            llm_messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]

            # Use domain-specific model configuration
            image_selection_llm = llm_factory.get_structured_model(
                LLMProvider[model_config.provider.upper()], 
                ImageSelectionOutput,
                model_name=model_config.model_name,
                method="json_schema", 
                strict=True
            )

            # Call LLM with structured output
            result = image_selection_llm.invoke(llm_messages)

            self.logger.info(
                f"🎯 Image Selection Result: Index {result.selected_image_index}"
            )
            self.logger.debug(f"📋 Justification: {result.justification}")

            # Step 5: Convert selected image index to domain-aware reference
            selected_image = None
            used_image = None
            
            if (
                result.selected_image_index != -1
                and 0 <= result.selected_image_index < len(images)
            ):
                selected_image = images[result.selected_image_index]
                used_image = {
                    "doc_id": selected_image.metadata.get("doc_id", "unknown_id"),
                    "domain": primary_domain
                }
                self.logger.info(
                    f"✅ Selected image at index {result.selected_image_index} from domain '{primary_domain}'"
                )
            else:
                self.logger.info("❌ No suitable image selected or invalid index")

            return {
                "selected_image": selected_image,
                "used_image": used_image,
                "image_selection_result": {
                    "selected_image_index": result.selected_image_index,
                    "justification": result.justification,
                },
            }

        except Exception as e:
            self.logger.error(f"❌ Error during image selection: {str(e)}")
            return {
                "selected_image": None,
                "used_image": None,
                "image_selection_result": {
                    "selected_image_index": -1,
                    "justification": f"Error occurred during image selection: {str(e)}",
                },
            }


# Create image selection node instance
image_selection = ImageSelectionNode()
