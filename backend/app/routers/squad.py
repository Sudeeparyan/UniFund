from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.data_loader import load_json, save_json
import uuid
from datetime import datetime

router = APIRouter()


class SplitExpenseRequest(BaseModel):
    description: str
    total_amount: float
    member_ids: list[str]
    paid_by: str = "you"


class NudgeRequest(BaseModel):
    member_id: str


class SettleRequest(BaseModel):
    member_id: str
    amount: float


@router.get("/squad")
def get_squad():
    members = load_json("squad_members.json")
    activity = load_json("squad_activity.json")
    return {"members": members, "activity": activity}


@router.post("/squad/split")
def split_expense(req: SplitExpenseRequest):
    """Split an expense among squad members."""
    members = load_json("squad_members.json")
    activity = load_json("squad_activity.json")

    # Calculate per-person share
    num_people = len(req.member_ids) + 1  # +1 for "you"
    per_person = round(req.total_amount / num_people, 2)

    # Update member balances
    updated_ids = []
    for member in members:
        if member["id"] in req.member_ids:
            if req.paid_by == "you":
                # You paid, so they owe you
                if member["direction"] == "you-owe":
                    member["amount"] = max(0, member["amount"] - per_person)
                    if member["amount"] == 0:
                        member["direction"] = "owes-you"
                        member["amount"] = 0
                else:
                    member["amount"] += per_person
                member["reason"] = f"{req.description} (split)"
                member["daysSince"] = 0
            updated_ids.append(member["id"])

    # Add activity entry
    new_activity = {
        "id": f"act-{uuid.uuid4().hex[:6]}",
        "emoji": "✂️",
        "text": f"New split: {req.description} — €{req.total_amount:.2f} total (€{per_person:.2f} each)",
        "time": "Just now",
    }
    activity.insert(0, new_activity)

    save_json("squad_members.json", members)
    save_json("squad_activity.json", activity)

    return {
        "success": True,
        "perPerson": per_person,
        "totalPeople": num_people,
        "activity": new_activity,
    }


@router.post("/squad/nudge")
def nudge_member(req: NudgeRequest):
    """Send a nudge to a squad member who owes you."""
    members = load_json("squad_members.json")
    activity = load_json("squad_activity.json")

    for member in members:
        if member["id"] == req.member_id:
            new_activity = {
                "id": f"act-{uuid.uuid4().hex[:6]}",
                "emoji": "👆",
                "text": f"You sent a nudge to {member['name']} for €{member['amount']:.2f}",
                "time": "Just now",
            }
            activity.insert(0, new_activity)
            save_json("squad_activity.json", activity)
            return {"success": True, "message": f"Nudge sent to {member['name']}!"}

    return {"success": False, "message": "Member not found"}


@router.post("/squad/settle")
def settle_debt(req: SettleRequest):
    """Settle a debt with a squad member. If amount is 0, settle the full balance."""
    members = load_json("squad_members.json")
    activity = load_json("squad_activity.json")

    for member in members:
        if member["id"] == req.member_id:
            prev_amount = member["amount"]
            prev_direction = member["direction"]
            # If amount is 0, settle the entire balance
            settle_amount = req.amount if req.amount > 0 else prev_amount
            member["amount"] = max(0, member["amount"] - settle_amount)
            if member["amount"] == 0:
                member["direction"] = "settled"
            member["daysSince"] = 0

            emoji = "💸" if prev_direction == "you-owe" else "✅"
            new_activity = {
                "id": f"act-{uuid.uuid4().hex[:6]}",
                "emoji": emoji,
                "text": f"{'You paid' if prev_direction == 'you-owe' else member['name'] + ' paid you'} €{settle_amount:.2f}",
                "time": "Just now",
            }
            activity.insert(0, new_activity)

            save_json("squad_members.json", members)
            save_json("squad_activity.json", activity)
            return {"success": True, "remaining": member["amount"]}

    return {"success": False, "message": "Member not found"}
