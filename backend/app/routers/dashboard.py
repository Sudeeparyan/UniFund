from fastapi import APIRouter
from datetime import datetime, timedelta
from app.services.data_loader import load_json

router = APIRouter()


def _get_greeting():
    hour = datetime.now().hour
    if hour < 6:
        return "Burning the midnight oil"
    elif hour < 12:
        return "Good morning"
    elif hour < 17:
        return "Good afternoon"
    elif hour < 21:
        return "Good evening"
    else:
        return "Winding down"


@router.get("/dashboard")
def get_dashboard():
    user = load_json("user_profile.json")
    budget = load_json("budget.json")
    streaks = load_json("streaks.json")

    total_balance = budget["totalBalance"]
    locked_total = sum(f["amount"] for f in budget["lockedFunds"])
    ghost_total = sum(g["amount"] for g in budget["ghostItems"])
    spent_today = budget["spentToday"]
    daily_budget = budget["dailyBudget"]

    safe_to_spend = total_balance - locked_total - ghost_total
    remaining_today = daily_budget - spent_today
    percent_remaining = (remaining_today / daily_budget) * 100 if daily_budget > 0 else 0

    # Compute burn rate from transactions
    transactions = load_json("transactions.json")
    total_trans_amount = sum(abs(t["amount"]) for t in transactions)
    num_days_tracked = max(len(set(t["date"][:10] for t in transactions)), 1)
    daily_avg_spend = round(total_trans_amount / num_days_tracked, 2)
    remaining_balance = safe_to_spend
    days_left = int(remaining_balance / daily_avg_spend) if daily_avg_spend > 0 else 999

    # Compute hourly burn and savings vs average
    hours_elapsed = max(datetime.now().hour, 1)
    avg_burn_per_hour = round(spent_today / hours_elapsed, 2)
    saved_vs_avg = round(daily_avg_spend - spent_today, 2)

    today = datetime.now()
    broke_date = today + timedelta(days=days_left)
    next_loan_date = datetime.strptime(user["loanDate"], "%Y-%m-%d")
    gap_days = (next_loan_date - broke_date).days

    # Vibe — premium, concise messaging
    if percent_remaining >= 70:
        vibe_emoji = "📈"
        vibe_status = "On track — thriving"
        vibe_insight = "Your discipline is paying off. Keep this momentum."
    elif percent_remaining >= 50:
        vibe_emoji = "😎"
        vibe_status = "Steady pace"
        vibe_insight = "Doing well — you have room to breathe today."
    elif percent_remaining >= 30:
        vibe_emoji = "⚡"
        vibe_status = "Spending picking up"
        vibe_insight = "Consider slowing down to protect your runway."
    elif percent_remaining >= 10:
        vibe_emoji = "🔶"
        vibe_status = "Budget pressure"
        vibe_insight = "You're close to your limit. Only essentials from here."
    else:
        vibe_emoji = "🛑"
        vibe_status = "Over budget"
        vibe_insight = "Daily limit reached. Any spend extends into tomorrow's budget."

    # Weekly savings comparison
    weekly_budget = daily_budget * 7
    weekly_spent = daily_avg_spend * 7
    weekly_saved = round(weekly_budget - weekly_spent, 2)

    greeting = _get_greeting()
    first_name = user["name"].split()[0] if user.get("name") else "there"

    # Coin balance
    coins = load_json("coins.json")
    coin_balance = coins.get("balance", 0)

    return {
        "user": user,
        "budget": budget,
        "greeting": f"{greeting}, {first_name}",
        "coins": coin_balance,
        "runway": {
            "daysLeft": days_left,
            "brokeDate": broke_date.strftime("%B %d"),
            "nextLoanDate": user["loanDate"],
            "gapDays": gap_days,
            "dailyAvgSpend": daily_avg_spend,
            "safeToSpend": round(safe_to_spend, 2),
            "lockedTotal": round(locked_total, 2),
            "ghostTotal": round(ghost_total, 2),
            "avgBurnPerHour": avg_burn_per_hour,
            "savedVsAvg": saved_vs_avg,
            "weeklySaved": weekly_saved,
        },
        "vibe": {
            "emoji": vibe_emoji,
            "status": vibe_status,
            "insight": vibe_insight,
            "percentRemaining": round(percent_remaining, 1),
        },
        "streak": {
            "days": streaks["currentStreak"],
            "label": f"🔥 {streaks['currentStreak']} day streak!",
        },
    }
