from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.services.ai_insights import get_feature_insights

router = APIRouter()


class InsightItem(BaseModel):
    emoji: str
    title: str
    text: str


class InsightsResponse(BaseModel):
    insights: list[InsightItem]
    source: str
    feature: str


@router.get("/ai/insights")
def ai_insights(feature: str = Query("dashboard")):
    """
    Get AI-powered, context-aware insights for any feature.
    Loads full user data and generates personalized suggestions.

    Features: dashboard, feed, fx, grocery, community, squad, perks, market, streaks, rewards, profile
    """
    result = get_feature_insights(feature)
    return result
