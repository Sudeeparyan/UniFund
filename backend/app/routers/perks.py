from fastapi import APIRouter, Query
from typing import Optional
from app.services.data_loader import load_json

router = APIRouter()


@router.get("/perks")
def get_perks(category: Optional[str] = Query(None)):
    perks = load_json("perks.json")
    if category and category != "All":
        perks = [p for p in perks if p["category"] == category]
    return perks
