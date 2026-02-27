from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_agent import run_agent

router = APIRouter()


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    sources: list[str] = []
    intent: str = "general"


@router.post("/chat", response_model=ChatResponse)
def chat(msg: ChatMessage):
    """
    LangGraph-style AI agent endpoint.
    Routes through: classify_intent -> load_context -> generate_response.
    Supports optional OpenAI GPT enrichment via OPENAI_API_KEY env var.
    """
    result = run_agent(msg.message)
    return ChatResponse(
        response=result["response"],
        sources=result["sources"],
        intent=result.get("intent", "general"),
    )
