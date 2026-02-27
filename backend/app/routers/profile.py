from fastapi import APIRouter
from app.services.data_loader import load_json

router = APIRouter()


@router.get("/profile")
def get_profile():
    user = load_json("user_profile.json")
    budget = load_json("budget.json")
    streaks = load_json("streaks.json")

    total_balance = budget["totalBalance"]
    locked_total = sum(f["amount"] for f in budget["lockedFunds"])
    safe_to_spend = round(total_balance - locked_total, 2)

    return {
        **user,
        "balance": total_balance,
        "safeToSpend": safe_to_spend,
        "currentStreak": streaks.get("currentStreak", 0),
        "longestStreak": streaks.get("longestStreak", 0),
    }
