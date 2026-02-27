from fastapi import APIRouter, Query
from typing import Optional
from app.services.data_loader import load_json

router = APIRouter()


@router.get("/market")
def get_market(type: Optional[str] = Query(None)):
    listings = load_json("market_listings.json")
    if type:
        listings = [l for l in listings if l["type"] == type]
    return listings
