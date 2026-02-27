"""
AI Insights Engine — Full-context, feature-specific AI suggestions.

Loads ALL user data (profile, budget, transactions, streaks, squad, perks, etc.)
and generates hyper-personalized insights for each feature screen.
Uses Azure OpenAI when available; falls back to smart templates.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Any
from app.services.data_loader import load_json


# ──────────────── Full Context Loader ────────────────


def _load_full_user_context() -> dict[str, Any]:
    """Load ALL user data into a single context dict."""
    ctx: dict[str, Any] = {}
    data_files = {
        "user": "user_profile.json",
        "budget": "budget.json",
        "transactions": "transactions.json",
        "streaks": "streaks.json",
        "missions": "survival_missions.json",
        "squad_members": "squad_members.json",
        "squad_activity": "squad_activity.json",
        "perks": "perks.json",
        "grocery": "grocery_prices.json",
        "fx": "fx_rates.json",
        "market": "market_listings.json",
        "community": "community_posts.json",
        "coins": "coins.json",
        "rewards_shop": "rewards_shop.json",
        "ghost_budget": "ghost_budget.json",
        "roasts": "roasts.json",
    }
    for key, filename in data_files.items():
        try:
            ctx[key] = load_json(filename)
        except Exception:
            ctx[key] = None
    return ctx


def _build_user_summary(ctx: dict) -> str:
    """Build a rich user summary string for LLM system prompt."""
    user = ctx.get("user") or {}
    budget = ctx.get("budget") or {}
    streaks = ctx.get("streaks") or {}
    transactions = ctx.get("transactions") or []
    coins = ctx.get("coins") or {}
    squad = ctx.get("squad_members") or []
    fx = ctx.get("fx") or {}
    missions = ctx.get("missions") or []

    total_balance = budget.get("totalBalance", 0)
    locked = sum(f.get("amount", 0) for f in budget.get("lockedFunds", []))
    ghost = sum(g.get("amount", 0) for g in budget.get("ghostItems", []))
    safe = total_balance - locked - ghost
    daily_budget = budget.get("dailyBudget", 0)
    spent_today = budget.get("spentToday", 0)
    remaining = daily_budget - spent_today

    # Spending analysis
    recent_txns = transactions[:20] if transactions else []
    categories = {}
    for tx in recent_txns:
        cat = tx.get("category", "other")
        categories[cat] = categories.get(cat, 0) + abs(tx.get("amount", 0))
    top_category = max(categories, key=categories.get) if categories else "none"
    total_recent_spend = sum(categories.values())

    # Squad
    owed_to_you = sum(m["amount"] for m in squad if m.get("direction") == "owes-you")
    you_owe = sum(m["amount"] for m in squad if m.get("direction") == "you-owe")

    # Missions
    completed_missions = sum(1 for m in missions if m.get("completed"))

    return (
        f"**User Profile:** {user.get('name', 'Student')}, {user.get('course', 'student')} at {user.get('university', 'university')}. "
        f"Year {user.get('yearOfStudy', 1)}. Location: {user.get('location', 'Dublin')}. Bio: {user.get('bio', '')}. "
        f"Home currency: {user.get('homeCurrency', 'INR')}, Host: {user.get('hostCurrency', 'EUR')}.\n"
        f"**Financial Snapshot:** Balance: €{total_balance}, Locked: €{locked}, Ghost: €{ghost}, Safe-to-spend: €{safe:.2f}. "
        f"Daily budget: €{daily_budget}, Spent today: €{spent_today}, Remaining: €{remaining:.2f}.\n"
        f"**Spending Behavior:** Top category: {top_category} (€{categories.get(top_category, 0):.2f} recent). "
        f"Total recent spend: €{total_recent_spend:.2f} across {len(recent_txns)} transactions.\n"
        f"**Streaks:** Current: {streaks.get('currentStreak', 0)} days, Longest: {streaks.get('longestStreak', 0)} days. "
        f"Today under budget: {'Yes' if streaks.get('todayUnderBudget') else 'No'}.\n"
        f"**Missions:** {completed_missions}/{len(missions)} completed.\n"
        f"**Coins:** Balance: {coins.get('balance', 0)}, Lifetime: {coins.get('lifetime', 0)}.\n"
        f"**Squad:** Owed to you: €{owed_to_you:.2f}, You owe: €{you_owe:.2f}. Net: €{(owed_to_you - you_owe):.2f}.\n"
        f"**Next loan date:** {user.get('loanDate', 'Unknown')}.\n"
        f"**FX:** Current rate: ₹1 = €{fx.get('currentRate', 'N/A')}. Best time: {fx.get('bestTimeToTransfer', 'N/A')}.\n"
    )


# ──────────────── LLM-Powered Insights ────────────────


FEATURE_PROMPTS = {
    "dashboard": (
        "Generate 2-3 concise, actionable financial insights for the user's dashboard. "
        "Analyze their daily spending, budget health, runway, and suggest specific actions. "
        "Consider their streak, locked funds, and upcoming loan date. Be encouraging but honest."
    ),
    "feed": (
        "Analyze the user's recent transactions and spending patterns. "
        "Give 2-3 insights: identify overspending categories, suggest where to cut, "
        "mention missed perks/discounts, and highlight positive habits. Reference specific amounts."
    ),
    "fx": (
        "Give 2-3 FX-specific insights. Consider the current rate, rate trends, "
        "the user's home currency (INR), and their balance. Suggest optimal transfer timing, "
        "amounts to transfer, and compare services (Wise, Remitly, Revolut)."
    ),
    "grocery": (
        "Give 2-3 grocery shopping insights. Based on the user's budget and spending on food/groceries, "
        "suggest the cheapest stores, items on sale, batch cooking tips, "
        "and how much they could save by switching stores. Be specific with prices."
    ),
    "community": (
        "Give 2-3 community engagement insights. Suggest what the user could post "
        "(based on their situation - e.g., looking for roommates, study groups, sharing tips). "
        "Mention how the AI matchmaker can help them connect with relevant posts."
    ),
    "squad": (
        "Give 2-3 squad management insights. Analyze who owes what, suggest who to nudge, "
        "recommend splitting strategies, and calculate the impact on their budget "
        "if all debts were settled. Be specific with names and amounts."
    ),
    "perks": (
        "Give 2-3 perk recommendations. Based on the user's spending categories, "
        "recommend the most relevant discounts they should use. Calculate potential savings. "
        "Mention nearby deals and transport optimization."
    ),
    "market": (
        "Give 2-3 market insights. Based on the user's budget constraints, "
        "suggest what they should buy secondhand vs new, recommend starter kits, "
        "and mention skill barter opportunities relevant to their course."
    ),
    "streaks": (
        "Give 2-3 streak and mission insights. Motivate based on current streak, "
        "suggest which missions to tackle next for maximum coins, "
        "and show what rewards they're closest to unlocking."
    ),
    "rewards": (
        "Give 2-3 rewards shop insights. Based on their coin balance, "
        "suggest the best value rewards to redeem, predict when they'll earn enough "
        "for premium rewards, and motivate continued earning."
    ),
    "profile": (
        "Give 2-3 personalized profile insights. Summarize their financial health score, "
        "highlight achievements they're close to earning, and give a monthly performance summary."
    ),
}


def _llm_generate_insights(feature: str, ctx: dict) -> dict:
    """Generate insights using Azure OpenAI with full user context."""
    try:
        from openai import AzureOpenAI

        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "https://cityupstart.cognitiveservices.azure.com/")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        model = os.getenv("AI_MODEL", "gpt-4.1")

        client = AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=api_version,
        )

        user_summary = _build_user_summary(ctx)
        feature_instruction = FEATURE_PROMPTS.get(feature, FEATURE_PROMPTS["dashboard"])

        system_prompt = (
            "You are Stash AI, an intelligent financial assistant embedded in a student finance app "
            "for international students in Dublin, Ireland. You have COMPLETE knowledge of this user's "
            "financial data, spending habits, streaks, squad debts, and preferences.\n\n"
            "RULES:\n"
            "- Be concise but specific — reference actual numbers from their data\n"
            "- Use 1-2 emojis per insight (not excessive)\n"
            "- Each insight should be 1-2 sentences max\n"
            "- Be actionable — tell them WHAT to do, not just what's happening\n"
            "- Be encouraging and friendly, like a smart friend giving advice\n"
            "- Format as a JSON array of objects with 'emoji', 'title' (short label), and 'text' (the insight)\n"
            "- Return ONLY valid JSON, no markdown\n\n"
            f"USER DATA:\n{user_summary}"
        )

        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": feature_instruction},
            ],
            max_tokens=500,
            temperature=0.7,
        )

        raw = completion.choices[0].message.content or "[]"
        # Clean up potential markdown formatting
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        insights = json.loads(raw)
        return {"insights": insights, "source": "Stash AI (GPT-powered)", "feature": feature}

    except Exception as e:
        print(f"[AI Insights] LLM error for {feature}: {e}")
        return _template_generate_insights(feature, ctx)


# ──────────────── Template Fallbacks ────────────────


def _template_generate_insights(feature: str, ctx: dict) -> dict:
    """Generate insights using templates when LLM is unavailable."""
    generators = {
        "dashboard": _insights_dashboard,
        "feed": _insights_feed,
        "fx": _insights_fx,
        "grocery": _insights_grocery,
        "community": _insights_community,
        "squad": _insights_squad,
        "perks": _insights_perks,
        "market": _insights_market,
        "streaks": _insights_streaks,
        "rewards": _insights_rewards,
        "profile": _insights_profile,
    }
    gen = generators.get(feature, _insights_dashboard)
    insights = gen(ctx)
    return {"insights": insights, "source": "Stash AI", "feature": feature}


def _insights_dashboard(ctx: dict) -> list:
    budget = ctx.get("budget") or {}
    streaks = ctx.get("streaks") or {}
    user = ctx.get("user") or {}
    transactions = ctx.get("transactions") or []

    daily_budget = budget.get("dailyBudget", 35)
    spent = budget.get("spentToday", 0)
    remaining = daily_budget - spent
    total = budget.get("totalBalance", 0)
    locked = sum(f.get("amount", 0) for f in budget.get("lockedFunds", []))
    ghost = sum(g.get("amount", 0) for g in budget.get("ghostItems", []))
    safe = total - locked - ghost

    # Burn rate
    total_tx = sum(abs(t.get("amount", 0)) for t in transactions)
    days_tracked = max(len(set(t.get("date", "")[:10] for t in transactions)), 1)
    daily_avg = total_tx / days_tracked
    days_left = int(safe / daily_avg) if daily_avg > 0 else 999

    insights = []

    if remaining / daily_budget > 0.7:
        insights.append({
            "emoji": "📈",
            "title": "Great pace today!",
            "text": f"You've only spent €{spent:.2f} of your €{daily_budget} daily budget. You're on track to save €{remaining:.2f} today.",
        })
    elif remaining / daily_budget < 0.2:
        insights.append({
            "emoji": "⚠️",
            "title": "Budget alert",
            "text": f"Only €{remaining:.2f} left today. Skip non-essentials to protect your {streaks.get('currentStreak', 0)}-day streak.",
        })

    if days_left < 30:
        loan_date = user.get("loanDate", "")
        insights.append({
            "emoji": "🔮",
            "title": "Runway warning",
            "text": f"At current spending, you'll run out in ~{days_left} days. Your next loan arrives {loan_date}. Consider reducing by €{(daily_avg - daily_budget):.2f}/day.",
        })
    else:
        insights.append({
            "emoji": "✅",
            "title": "Healthy runway",
            "text": f"At your current pace, your funds will last ~{days_left} days. Keep it up!",
        })

    if streaks.get("currentStreak", 0) > 0:
        next_milestone = None
        for m in streaks.get("milestones", []):
            if not m.get("achieved") and m.get("days", 0) > streaks.get("currentStreak", 0):
                next_milestone = m
                break
        if next_milestone:
            days_to = next_milestone["days"] - streaks.get("currentStreak", 0)
            insights.append({
                "emoji": "🎯",
                "title": f"{days_to} days to next reward",
                "text": f"Keep your streak going! You'll unlock '{next_milestone.get('reward', 'a reward')}' in {days_to} more days.",
            })

    return insights[:3]


def _insights_feed(ctx: dict) -> list:
    transactions = ctx.get("transactions") or []
    perks = ctx.get("perks") or []
    insights = []

    # Category analysis
    categories: dict[str, float] = {}
    for tx in transactions[:20]:
        cat = tx.get("category", "other")
        categories[cat] = categories.get(cat, 0) + abs(tx.get("amount", 0))

    if categories:
        top = max(categories, key=categories.get)
        insights.append({
            "emoji": "📊",
            "title": f"Top spend: {top}",
            "text": f"You've spent €{categories[top]:.2f} on {top} recently. That's {(categories[top] / sum(categories.values()) * 100):.0f}% of your recent spending.",
        })

    # Perk missed detection
    hot_perks = [p for p in perks if p.get("isHot")]
    food_spend = categories.get("food", 0) + categories.get("coffee", 0)
    if food_spend > 30 and hot_perks:
        p = hot_perks[0]
        insights.append({
            "emoji": "🎁",
            "title": "Missed savings!",
            "text": f"You spent €{food_spend:.2f} on food/coffee. Use {p.get('brand', 'a perk')} ({p.get('deal', '')}) to save next time!",
        })

    # Spending trend
    if len(transactions) > 5:
        recent_5 = sum(abs(t.get("amount", 0)) for t in transactions[:5])
        prev_5 = sum(abs(t.get("amount", 0)) for t in transactions[5:10])
        if prev_5 > 0:
            change = ((recent_5 - prev_5) / prev_5) * 100
            if change > 15:
                insights.append({
                    "emoji": "📈",
                    "title": "Spending up",
                    "text": f"Your recent spending is up {change:.0f}% vs earlier. Watch those impulse purchases!",
                })
            elif change < -15:
                insights.append({
                    "emoji": "👏",
                    "title": "Spending down!",
                    "text": f"Great job! Your spending dropped {abs(change):.0f}% recently. Your discipline is paying off.",
                })

    return insights[:3]


def _insights_fx(ctx: dict) -> list:
    fx = ctx.get("fx") or {}
    user = ctx.get("user") or {}
    budget = ctx.get("budget") or {}
    insights = []

    rate = fx.get("currentRate", 0)
    rates = fx.get("historicalRates", [])

    if rates:
        avg_rate = sum(r["rate"] for r in rates) / len(rates)
        if rate > avg_rate * 1.02:
            insights.append({
                "emoji": "🟢",
                "title": "Good time to transfer!",
                "text": f"Current rate (€{rate:.4f}/₹) is {((rate - avg_rate) / avg_rate * 100):.1f}% above the 30-day average. Transfer now to get more euros.",
            })
        elif rate < avg_rate * 0.98:
            insights.append({
                "emoji": "🔴",
                "title": "Hold off on transfers",
                "text": f"Rate is {((avg_rate - rate) / avg_rate * 100):.1f}% below average. Wait a few days for a better rate if you can.",
            })
        else:
            insights.append({
                "emoji": "📊",
                "title": "Rate is average",
                "text": f"Current rate €{rate:.4f}/₹ is near the 30-day average. Transfer if you need to, but no rush.",
            })

    # Suggest optimal amount
    safe = budget.get("totalBalance", 0) - sum(f.get("amount", 0) for f in budget.get("lockedFunds", []))
    if safe < 200 and rate:
        inr_needed = int(200 / rate) if rate > 0 else 0
        insights.append({
            "emoji": "💡",
            "title": "Top-up suggestion",
            "text": f"Your safe balance is low (€{safe:.0f}). Consider transferring ₹{inr_needed:,} (~€200) via Wise for the best rates.",
        })

    insights.append({
        "emoji": "⏰",
        "title": "Best transfer time",
        "text": f"{fx.get('bestTimeToTransfer', 'Mid-week mornings typically have better rates')}. Set a rate alert to catch dips!",
    })

    return insights[:3]


def _insights_grocery(ctx: dict) -> list:
    grocery = ctx.get("grocery") or {}
    budget = ctx.get("budget") or {}
    transactions = ctx.get("transactions") or []
    insights = []

    items = grocery.get("items", [])
    grocery_spend = sum(abs(t.get("amount", 0)) for t in transactions if t.get("category") == "groceries")
    daily_budget = budget.get("dailyBudget", 35)

    # Find items with biggest price differences
    biggest_diff = []
    for item in items:
        prices = [s["price"] for s in item.get("stores", [])]
        if len(prices) >= 2:
            diff = max(prices) - min(prices)
            if diff > 0.5:
                cheapest_store = min(item["stores"], key=lambda s: s["price"])
                biggest_diff.append((item["name"], diff, cheapest_store["store"], cheapest_store["price"]))

    biggest_diff.sort(key=lambda x: x[1], reverse=True)
    if biggest_diff:
        top = biggest_diff[0]
        insights.append({
            "emoji": "💰",
            "title": f"Save on {top[0]}",
            "text": f"{top[0]} varies by €{top[1]:.2f} across stores. Get it at {top[2]} for €{top[3]:.2f} — cheapest option!",
        })

    if grocery_spend > daily_budget * 3:
        insights.append({
            "emoji": "🛒",
            "title": "Grocery spend is high",
            "text": f"You've spent €{grocery_spend:.2f} on groceries recently. Batch cooking on Sundays could save you €15-20/week.",
        })
    else:
        insights.append({
            "emoji": "✅",
            "title": "Smart grocery spending",
            "text": "Your grocery spending looks well-managed. Keep using price comparisons to maximize savings!",
        })

    # Sale alerts
    on_sale = [item for item in items for s in item.get("stores", []) if s.get("onSale")]
    if on_sale:
        insights.append({
            "emoji": "🏷️",
            "title": f"{len(on_sale)} items on sale",
            "text": f"There are {len(on_sale)} items currently on sale. Check the list and stock up on essentials!",
        })

    return insights[:3]


def _insights_community(ctx: dict) -> list:
    user = ctx.get("user") or {}
    community = ctx.get("community") or []
    insights = []

    seeking = [p for p in community if p.get("intent") == "SEEKING"]
    offering = [p for p in community if p.get("intent") == "OFFERING"]

    insights.append({
        "emoji": "🤝",
        "title": "Community activity",
        "text": f"{len(seeking)} people seeking help, {len(offering)} offering. Your skills in {user.get('course', 'your field')} could help someone!",
    })

    # Location-based suggestion
    location = user.get("location", "")
    local_posts = [p for p in community if location.lower().split(",")[0].strip() in p.get("content", "").lower()]
    if local_posts:
        insights.append({
            "emoji": "📍",
            "title": "Posts near you",
            "text": f"Found {len(local_posts)} posts mentioning your area. Check for nearby sublets, study groups, or deals!",
        })

    insights.append({
        "emoji": "💡",
        "title": "AI matching active",
        "text": "Post what you're looking for and our AI will auto-match you with relevant offers from other students.",
    })

    return insights[:3]


def _insights_squad(ctx: dict) -> list:
    squad = ctx.get("squad_members") or []
    budget = ctx.get("budget") or {}
    insights = []

    owed = [m for m in squad if m.get("direction") == "owes-you"]
    owing = [m for m in squad if m.get("direction") == "you-owe"]

    total_owed = sum(m["amount"] for m in owed)
    total_owing = sum(m["amount"] for m in owing)

    if total_owed > 0:
        # Find the biggest debtor
        biggest = max(owed, key=lambda m: m["amount"])
        days = biggest.get("daysSince", 0)
        insights.append({
            "emoji": "💸",
            "title": f"€{total_owed:.2f} owed to you",
            "text": f"{biggest['name']} owes €{biggest['amount']:.2f} for {biggest.get('reason', 'expenses')} ({days} days). Send a nudge!",
        })

    if total_owing > 0:
        daily = budget.get("dailyBudget", 35)
        days_equiv = total_owing / daily if daily > 0 else 0
        insights.append({
            "emoji": "🔴",
            "title": "Settle debts to free budget",
            "text": f"You owe €{total_owing:.2f} — that's ~{days_equiv:.1f} days of budget. Settling up would improve your runway.",
        })

    if total_owed > total_owing:
        insights.append({
            "emoji": "✅",
            "title": "Net positive",
            "text": f"You're net +€{(total_owed - total_owing):.2f}. Collect your debts to boost your safe-to-spend balance!",
        })

    if not insights:
        insights.append({
            "emoji": "👥",
            "title": "All settled up!",
            "text": "No outstanding debts. Next time you split a bill, use the split feature for easy tracking!",
        })

    return insights[:3]


def _insights_perks(ctx: dict) -> list:
    perks = ctx.get("perks") or []
    transactions = ctx.get("transactions") or []
    insights = []

    # Match perks to spending
    categories_spent: dict[str, float] = {}
    for tx in transactions[:30]:
        cat = tx.get("category", "other")
        categories_spent[cat] = categories_spent.get(cat, 0) + abs(tx.get("amount", 0))

    top_cat = max(categories_spent, key=categories_spent.get) if categories_spent else "food"
    perk_map = {"food": "Food", "coffee": "Food", "shopping": "Shopping", "entertainment": "Entertainment", "transport": "Transport"}
    matched_cat = perk_map.get(top_cat, "Food")
    relevant_perks = [p for p in perks if p.get("category") == matched_cat and p.get("isActive", True)]

    if relevant_perks:
        p = relevant_perks[0]
        insights.append({
            "emoji": "🎯",
            "title": f"Perfect for your {top_cat} spending",
            "text": f"You spend lots on {top_cat}. Use {p.get('brand', '')} — {p.get('deal', '')} (code: {p.get('code', 'N/A')})!",
        })

    hot_perks = [p for p in perks if p.get("isHot")]
    if hot_perks:
        total_potential = len(hot_perks) * 3  # rough estimate
        insights.append({
            "emoji": "🔥",
            "title": f"{len(hot_perks)} hot deals expiring soon",
            "text": f"Don't miss out! {hot_perks[0].get('brand', '')} has {hot_perks[0].get('deal', '')} right now.",
        })

    insights.append({
        "emoji": "💡",
        "title": "Monthly savings potential",
        "text": f"Using all relevant perks could save you €20-40/month based on your spending patterns.",
    })

    return insights[:3]


def _insights_market(ctx: dict) -> list:
    market = ctx.get("market") or []
    user = ctx.get("user") or {}
    budget = ctx.get("budget") or {}
    insights = []

    safe = budget.get("totalBalance", 0) - sum(f.get("amount", 0) for f in budget.get("lockedFunds", []))

    # Budget-friendly suggestions
    cheap_items = [l for l in market if l.get("price", 999) < 20 and l.get("type") == "secondhand"]
    if cheap_items:
        insights.append({
            "emoji": "🏷️",
            "title": f"{len(cheap_items)} items under €20",
            "text": f"Found {len(cheap_items)} affordable secondhand items. Great for stretching your €{safe:.0f} safe balance!",
        })

    # Starter kits
    kits = [l for l in market if l.get("type") == "starter-kit"]
    if kits:
        avg_saving = sum((l.get("originalPrice", l["price"]) - l["price"]) for l in kits if l.get("originalPrice")) / max(len(kits), 1)
        insights.append({
            "emoji": "📦",
            "title": "Starter kit savings",
            "text": f"{len(kits)} starter kits available — average saving of €{avg_saving:.0f} vs buying new. Perfect for new students!",
        })

    # Barter based on course
    barters = [l for l in market if l.get("type") == "barter"]
    if barters:
        course = user.get("course", "")
        insights.append({
            "emoji": "🔄",
            "title": "Skill barter opportunity",
            "text": f"As a {course} student, you could offer tutoring/coding help. {len(barters)} barter listings available!",
        })

    return insights[:3]


def _insights_streaks(ctx: dict) -> list:
    streaks = ctx.get("streaks") or {}
    missions = ctx.get("missions") or []
    coins = ctx.get("coins") or {}
    insights = []

    current = streaks.get("currentStreak", 0)
    milestones = streaks.get("milestones", [])

    # Next milestone
    next_m = None
    for m in milestones:
        if not m.get("achieved") and m.get("days", 0) > current:
            next_m = m
            break

    if next_m:
        days_to = next_m["days"] - current
        insights.append({
            "emoji": "🎯",
            "title": f"{days_to} days to {next_m.get('emoji', '🏆')} {next_m.get('label', 'milestone')}",
            "text": f"Keep going! You'll unlock '{next_m.get('reward', 'reward')}' and earn {next_m.get('coins', 0)} coins.",
        })

    # Mission suggestions
    incomplete = [m for m in missions if not m.get("completed")]
    if incomplete:
        easiest = min(incomplete, key=lambda m: m.get("xp", 100))
        insights.append({
            "emoji": "⚡",
            "title": "Quick win available",
            "text": f"Complete '{easiest.get('title', 'mission')}' for {easiest.get('coins', easiest.get('xp', 0))} coins — easiest mission right now!",
        })

    # Coin earning rate
    completed = sum(1 for m in missions if m.get("completed"))
    total_earned = coins.get("lifetime", 0)
    insights.append({
        "emoji": "🪙",
        "title": "Coin progress",
        "text": f"You've earned {total_earned} lifetime coins from {completed} missions. Complete more to unlock premium rewards!",
    })

    return insights[:3]


def _insights_rewards(ctx: dict) -> list:
    coins = ctx.get("coins") or {}
    rewards_shop = ctx.get("rewards_shop") or []
    insights = []

    balance = coins.get("balance", 0)
    available = [r for r in rewards_shop if not r.get("purchased") and r.get("cost", 0) <= balance]
    almost = [r for r in rewards_shop if not r.get("purchased") and balance < r.get("cost", 0) <= balance + 100]

    if available:
        best = max(available, key=lambda r: r.get("cost", 0))
        insights.append({
            "emoji": "🛍️",
            "title": f"{len(available)} rewards available!",
            "text": f"You can afford {len(available)} rewards. Best value: {best.get('emoji', '')} {best.get('name', '')} ({best.get('cost', 0)} coins).",
        })

    if almost:
        closest = min(almost, key=lambda r: r.get("cost", 0) - balance)
        needed = closest.get("cost", 0) - balance
        insights.append({
            "emoji": "🎯",
            "title": f"Just {needed} coins away!",
            "text": f"You're only {needed} coins from '{closest.get('name', 'reward')}'. Complete 1-2 more missions!",
        })

    # Spending suggestions
    history = coins.get("history", [])
    spent_coins = sum(abs(h.get("amount", 0)) for h in history if h.get("type") == "spent")
    insights.append({
        "emoji": "💡",
        "title": "Smart redemption tip",
        "text": f"Coupons give the best real-world value. Save coins for food/transport coupons over cosmetic badges!",
    })

    return insights[:3]


def _insights_profile(ctx: dict) -> list:
    user = ctx.get("user") or {}
    budget = ctx.get("budget") or {}
    streaks = ctx.get("streaks") or {}
    transactions = ctx.get("transactions") or []
    coins = ctx.get("coins") or {}
    insights = []

    # Financial health score (0-100)
    daily_budget = budget.get("dailyBudget", 35)
    spent = budget.get("spentToday", 0)
    streak = streaks.get("currentStreak", 0)
    stats = user.get("stats", {})
    hit_rate = stats.get("budgetHitRate", 50)

    health = min(100, int(hit_rate * 0.4 + min(streak, 30) * 2 + (40 if spent < daily_budget else 10)))
    if health >= 80:
        grade = "A"
        msg = "Excellent financial health! You're in the top tier of student budgeters."
    elif health >= 60:
        grade = "B"
        msg = "Good financial health. A few tweaks could make you exceptional."
    elif health >= 40:
        grade = "C"
        msg = "Average financial health. Focus on streaks and reducing impulse buys."
    else:
        grade = "D"
        msg = "Needs attention. Let's build better habits — start with a 3-day streak."

    insights.append({
        "emoji": "📊",
        "title": f"Financial Health: {grade} ({health}/100)",
        "text": msg,
    })

    # Achievement progress
    total_saved = stats.get("totalSaved", 0)
    insights.append({
        "emoji": "🏆",
        "title": f"€{total_saved:.0f} saved so far",
        "text": f"You've saved €{total_saved:.0f} since joining. At this rate, you'll save €{total_saved * 2:.0f} by semester end!",
    })

    # Monthly recap
    coin_balance = coins.get("balance", 0)
    insights.append({
        "emoji": "📅",
        "title": "Monthly recap",
        "text": f"{streak}-day streak, {stats.get('transactionCount', 0)} transactions tracked, {coin_balance} coins earned. Keep growing!",
    })

    return insights[:3]


# ──────────────── Public API ────────────────


def get_feature_insights(feature: str) -> dict:
    """Get AI insights for a specific feature. Uses LLM if available, templates otherwise."""
    ctx = _load_full_user_context()

    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    ai_mode = os.getenv("AI_MODE", "mock")

    if api_key and ai_mode != "mock":
        return _llm_generate_insights(feature, ctx)
    else:
        return _template_generate_insights(feature, ctx)
