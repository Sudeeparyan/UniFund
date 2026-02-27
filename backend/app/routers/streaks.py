from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from app.services.data_loader import load_json, save_json
import uuid

router = APIRouter()


class MissionToggle(BaseModel):
    mission_id: str


def _award_coins(amount: int, source: str, label: str):
    """Award coins to the user and record in history."""
    coins = load_json("coins.json")
    coins["balance"] += amount
    coins["lifetime"] += amount
    entry = {
        "id": f"ch-{uuid.uuid4().hex[:6]}",
        "type": "earned",
        "amount": amount,
        "source": source,
        "label": label,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    coins["history"].insert(0, entry)
    coins["history"] = coins["history"][:50]
    save_json("coins.json", coins)
    return coins["balance"]


@router.get("/streaks")
def get_streaks():
    streaks = load_json("streaks.json")
    # Add coin rewards for milestones
    milestone_coins = {3: 50, 7: 100, 14: 150, 30: 250, 60: 400, 90: 600}
    for m in streaks["milestones"]:
        m["coins"] = milestone_coins.get(m["days"], 0)
    return streaks


@router.get("/survival-missions")
def get_survival_missions():
    missions = load_json("survival_missions.json")
    # Ensure each mission has a coin value (XP = coins)
    for m in missions:
        if "coins" not in m:
            m["coins"] = m["xp"]
    return missions


@router.post("/survival-missions/toggle")
def toggle_mission(req: MissionToggle):
    """Toggle a survival mission's completed status and award/deduct coins."""
    missions = load_json("survival_missions.json")
    for m in missions:
        if m["id"] == req.mission_id:
            was_completed = m["completed"]
            m["completed"] = not m["completed"]
            save_json("survival_missions.json", missions)

            coins_amount = m.get("coins", m["xp"])
            new_balance = None

            if m["completed"] and not was_completed:
                # Award coins on completion
                new_balance = _award_coins(
                    coins_amount, "mission", f"Completed: {m['title']}"
                )
            elif not m["completed"] and was_completed:
                # Deduct coins if un-completing
                coins = load_json("coins.json")
                coins["balance"] = max(0, coins["balance"] - coins_amount)
                save_json("coins.json", coins)
                new_balance = coins["balance"]

            return {
                "success": True,
                "completed": m["completed"],
                "coinsEarned": coins_amount if m["completed"] else 0,
                "newBalance": new_balance,
            }
    return {"success": False, "message": "Mission not found"}


@router.get("/streaks/rewards")
def get_rewards():
    """Get available reward coupons earned from streaks."""
    streaks = load_json("streaks.json")
    rewards = []
    for milestone in streaks["milestones"]:
        if milestone["achieved"]:
            rewards.append({
                "id": f"rwd-{milestone['days']}",
                "milestone": milestone["label"],
                "emoji": milestone["emoji"],
                "reward": milestone["reward"],
                "days": milestone["days"],
                "claimed": milestone.get("claimed", False),
            })
    return rewards


@router.post("/streaks/rewards/{reward_id}/claim")
def claim_reward(reward_id: str):
    """Claim a streak reward."""
    streaks = load_json("streaks.json")
    for milestone in streaks["milestones"]:
        rid = f"rwd-{milestone['days']}"
        if rid == reward_id and milestone["achieved"]:
            milestone["claimed"] = True
            save_json("streaks.json", streaks)
            return {"success": True, "reward": milestone["reward"]}
    return {"success": False, "message": "Reward not found or not yet earned"}
