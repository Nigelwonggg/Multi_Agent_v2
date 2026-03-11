from langgraph.graph import StateGraph, END
from app.nodes.chat_nodes import (
    State, router, direct_answer, answer_with_rag,
    image_selection, final_answer_agent, evaluator
)

from app.utils.logging_config import get_logger
logger = get_logger("graph_logics.chat_graph")

def router_decision(state: State) -> str:
    """Router decision function"""
    if state["is_rag_needed"]:
        return "answer_with_rag"
    else:
        return "direct_answer"

def evaluation_decision(state: State) -> str:
    """
    Make a decision based on the evaluation.
    """
    if state.get("is_approved", True):
        return "END"
    elif state.get("is_rag_needed", True):
        return "final_answer_agent" # temporary comment out due to evaluator issue
        # return "END"
    else:
        return "direct_answer"


def build_graph():
    """Build and compile the LangGraph"""
    logger.info("🔧 Initializing Chat LangGraph Components")

    # Build graph
    graph_builder = StateGraph(State)
    nodes = [
        ("router", router),
        ("direct_answer", direct_answer),
        ("answer_with_rag", answer_with_rag),
        ("image_selection", image_selection),
        ("final_answer_agent", final_answer_agent),
        ("evaluator", evaluator)
    ]

    # Add all nodes
    for node_name, node_func in nodes:
        graph_builder.add_node(node_name, node_func)

    logger.info("📊 Graph nodes added successfully")

    # Set up the graph flow
    graph_builder.set_entry_point("router")
    graph_builder.add_conditional_edges(
        "router",
        router_decision,
        {
            "answer_with_rag": "answer_with_rag",
            "direct_answer": "direct_answer"
        }
    )
    graph_builder.add_edge("answer_with_rag", "image_selection")
    graph_builder.add_edge("image_selection", "final_answer_agent")
    graph_builder.add_edge("final_answer_agent", "evaluator")
    graph_builder.add_edge("direct_answer", "evaluator")

    graph_builder.add_conditional_edges(
        "evaluator",
        evaluation_decision,
        {
            "final_answer_agent": "final_answer_agent",
            "direct_answer": "direct_answer",
            "END": END
        }
    )

    logger.info("🔗 Graph edges and flow configured")

    graph = graph_builder.compile()
    logger.info("✅ LangGraph compiled successfully")
    return graph

chat_graph = build_graph()