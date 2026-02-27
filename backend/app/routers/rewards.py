from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from app.services.data_loader import load_json, save_json
import uuid

router = APIRouter()


# ── Models ──
class PurchaseRequest(BaseModel):
    reward_id: str


# ── Helpers ──
def _get_coins():
    return load_json("coins.json")


def _save_coins(data):
    save_json("coins.json", data)


def _add_history(coins_data, entry_type: str, amount: int, source: str, label: str):
    entry = {
        "id": f"ch-{uuid.uuid4().hex[:6]}",
        "type": entry_type,
        "amount": amount if entry_type == "earned" else -abs(amount),
        "source": source,
        "label": label,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    coins_data["history"].insert(0, entry)
    # Keep only last 50 entries
    coins_data["history"] = coins_data["history"][:50]
    return entry


# ── Endpoints ──
@router.get("/coins")
def get_coins():
    """Get current coin balance and history."""
    coins = _get_coins()
    return {
        "balance": coins["balance"],
        "lifetime": coins["lifetime"],
        "history": coins["history"][:20],
    }


@router.get("/coins/balance")
def get_coin_balance():
    """Quick endpoint for just the coin balance (used by TopBar)."""
    coins = _get_coins()
    return {"balance": coins["balance"]}


@router.get("/rewards-shop")
def get_rewards_shop():
    """Get all available rewards in the shop."""
    rewards = load_json("rewards_shop.json")
    coins = _get_coins()
    return {
        "balance": coins["balance"],
        "rewards": rewards,
    }


@router.post("/rewards-shop/purchase")
def purchase_reward(req: PurchaseRequest):
    """Purchase a reward with coins."""
    rewards = load_json("rewards_shop.json")
    coins = _get_coins()

    # Find the reward
    reward = None
    for r in rewards:
        if r["id"] == req.reward_id:
            reward = r
            break

    if not reward:
        return {"success": False, "message": "Reward not found"}

    if reward.get("purchased"):
        return {"success": False, "message": "Already purchased"}

    if reward.get("stock") is not None and reward["stock"] <= 0:
        return {"success": False, "message": "Out of stock"}

    if coins["balance"] < reward["cost"]:
        return {
            "success": False,
            "message": f"Not enough coins. Need {reward['cost']}, have {coins['balance']}",
        }

    # Deduct coins
    coins["balance"] -= reward["cost"]
    _add_history(coins, "spent", reward["cost"], "reward", f"Redeemed: {reward['name']}")
    _save_coins(coins)

    # Mark reward as purchased & reduce stock
    reward["purchased"] = True
    reward["purchasedAt"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    if reward.get("stock") is not None:
        reward["stock"] -= 1
    save_json("rewards_shop.json", rewards)

    return {
        "success": True,
        "reward": reward,
        "newBalance": coins["balance"],
        "message": f"🎉 Redeemed {reward['name']}!",
    }


@router.post("/coins/earn")
def earn_coins_manual(amount: int = 0, source: str = "bonus", label: str = "Bonus coins"):
    """Admin/system endpoint to award coins."""
    if amount <= 0:
        return {"success": False, "message": "Amount must be positive"}
    coins = _get_coins()
    coins["balance"] += amount
    coins["lifetime"] += amount
    _add_history(coins, "earned", amount, source, label)
    _save_coins(coins)
    return {"success": True, "newBalance": coins["balance"]}
