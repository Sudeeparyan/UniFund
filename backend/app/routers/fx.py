from fastapi import APIRouter
from app.services.data_loader import load_json

router = APIRouter()


@router.get("/fx")
def get_fx():
    return load_json("fx_rates.json")
