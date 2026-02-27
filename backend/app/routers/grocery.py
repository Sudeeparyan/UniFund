from fastapi import APIRouter, Query
from typing import Optional
from app.services.data_loader import load_json

router = APIRouter()


@router.get("/grocery")
def get_grocery(item: Optional[str] = Query(None)):
    data = load_json("grocery_prices.json")
    items = data["items"]
    if item:
        items = [i for i in items if item.lower() in i["name"].lower()]
    return items
