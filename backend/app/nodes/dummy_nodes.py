from typing import List
from langchain_core.messages import AnyMessage

def simple_llm_node(state: List[AnyMessage]):
    # A dummy node that just returns the state
    return {"messages": state["messages"]}

def another_dummy_node(state: List[AnyMessage]):
    # Another dummy node for a different graph
    return {"messages": state["messages"]}
