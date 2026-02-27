"""
LangGraph-inspired AI Agent for Stash.

Uses a StateGraph pattern: state dict flows through nodes,
each node is a 'tool' that enriches the response.
Works fully offline with no API keys — mock-friendly for hackathon demo.
If OPENAI_API_KEY is set, can optionally call GPT for richer responses.
"""

import os
import re
from typing import Any
from app.services.data_loader import load_json


# ──────────────── State Graph ────────────────


class AgentState(dict):
    """State dictionary that flows through the graph nodes."""
    pass


class StateGraph:
    """Minimal LangGraph-style StateGraph executor."""

    def __init__(self):
        self.nodes: list[tuple[str, Any]] = []
        self.entry: str | None = None
        self.end: str | None = None

    def add_node(self, name: str, fn):
        self.nodes.append((name, fn))

    def set_entry_point(self, name: str):
        self.entry = name

    def set_finish_point(self, name: str):
        self.end = name

    def add_edge(self, _from: str, _to: str):
        """For documentation; execution is sequential."""
        pass

    def compile(self):
        return self

    def invoke(self, state: AgentState) -> AgentState:
        for name, fn in self.nodes:
            state = fn(state)
            if state.get("__done"):
                break
        return state


# ──────────────── Tool nodes ────────────────


def classify_intent(state: AgentState) -> AgentState:
    """Node 1: Classify user intent from the message."""
    msg = state["message"].lower()
    intent_map = [
        ("irp", ["irp", "residence permit", "visa", "immigration", "stamp 2"]),
        ("grocery", ["grocery", "groceries", "food price", "cheapest", "lidl", "tesco", "aldi", "milk", "bread", "rice", "eggs"]),
        ("fx", ["transfer", "fx", "exchange", "rate", "inr", "rupee", "wise", "remitly"]),
        ("budget", ["budget", "spend", "runway", "broke", "money left", "balance", "save"]),
        ("streak", ["streak", "mission", "reward", "coupon"]),
        ("transport", ["transport", "bus", "luas", "dart", "bike", "airport", "taxi", "leap card"]),
        ("accommodation", ["accommodation", "room", "apartment", "rent", "housing", "digs"]),
        ("community", ["community", "post", "connect", "people", "friends"]),
        ("perks", ["perk", "discount", "offer", "coupon", "student deal", "unidays"]),
        ("squad", ["squad", "split", "owe", "pay back", "roommate"]),
        ("market", ["market", "secondhand", "buy", "sell", "starter kit", "barter"]),
    ]

    for intent, keywords in intent_map:
        if any(kw in msg for kw in keywords):
            state["intent"] = intent
            state["matched_keywords"] = [kw for kw in keywords if kw in msg]
            return state

    state["intent"] = "general"
    state["matched_keywords"] = []
    return state


def load_context(state: AgentState) -> AgentState:
    """Node 2: Load ALL relevant data files for full user context."""
    intent = state.get("intent", "general")
    context = {}

    # Always load full user context for complete knowledge
    all_files = {
        "user": "user_profile.json",
        "budget": "budget.json",
        "transactions": "transactions.json",
        "streaks": "streaks.json",
        "missions": "survival_missions.json",
        "coins": "coins.json",
    }
    for key, filename in all_files.items():
        try:
            context[key] = load_json(filename)
        except Exception:
            pass

    # Also load intent-specific data
    intent_data_map = {
        "fx": ["fx_rates.json"],
        "grocery": ["grocery_prices.json"],
        "streak": ["streaks.json", "survival_missions.json"],
        "perks": ["perks.json"],
        "squad": ["squad_members.json", "squad_activity.json"],
        "market": ["market_listings.json"],
        "community": ["community_posts.json"],
    }

    for filename in intent_data_map.get(intent, []):
        try:
            key = filename.replace(".json", "").replace("_", "")
            context[key] = load_json(filename)
        except Exception:
            pass

    state["context"] = context
    return state


def generate_response(state: AgentState) -> AgentState:
    """Node 3: Generate a response using context + intent.
    If OPENAI_API_KEY is set, enrich with LLM. Otherwise use templates."""
    intent = state["intent"]
    ctx = state.get("context", {})
    msg = state["message"]

    # Build context string for LLM or template
    budget_summary = _format_budget(ctx)
    sources: list[str] = []

    # Check for LLM availability
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    ai_mode = os.getenv("AI_MODE", "mock")
    if api_key and ai_mode != "mock":
        response = _llm_generate(msg, intent, ctx, api_key)
        sources = ["Stash AI (Azure GPT-powered)", f"{intent.title()} data"]
    else:
        response, sources = _template_generate(intent, msg, ctx, budget_summary)

    state["response"] = response
    state["sources"] = sources
    state["__done"] = True
    return state


# ──────────────── Helpers ────────────────


def _format_budget(ctx: dict) -> str:
    budget = ctx.get("budget", {})
    user = ctx.get("user", {})
    if not budget:
        return ""
    total = budget.get("totalBalance", 0)
    locked = sum(f.get("amount", 0) for f in budget.get("lockedFunds", []))
    ghost = sum(g.get("amount", 0) for g in budget.get("ghostItems", []))
    safe = total - locked - ghost
    return (
        f"User: {user.get('name', 'Student')} at {user.get('university', 'university')}. "
        f"Balance: €{total}, Locked: €{locked}, Safe: €{safe:.2f}. "
        f"Daily budget: €{budget.get('dailyBudget', 0)}, Spent today: €{budget.get('spentToday', 0)}. "
    )


def _llm_generate(msg: str, intent: str, ctx: dict, api_key: str) -> str:
    """Azure OpenAI-powered response generation."""
    try:
        from openai import AzureOpenAI
        from app.services.ai_insights import _build_user_summary

        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "https://cityupstart.cognitiveservices.azure.com/")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        model = os.getenv("AI_MODEL", "gpt-4.1")

        client = AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=api_version,
        )

        user_summary = _build_user_summary(ctx)

        system_prompt = (
            "You are Stash AI, an intelligent financial assistant for international students in Dublin, Ireland. "
            "You have COMPLETE knowledge of this user's finances, spending habits, streaks, squad debts, grocery prices, "
            "FX rates, perks, and everything in their student life.\n\n"
            "RULES:\n"
            "- Be friendly, concise, and use relevant emojis\n"
            "- Give actionable advice with SPECIFIC numbers from their data\n"
            "- Reference their actual balance, spending, streaks, etc.\n"
            "- If they ask about something, connect it to their financial situation\n"
            "- Keep responses under 200 words\n\n"
            f"USER DATA:\n{user_summary}\n\n"
            f"Additional context: {_format_budget(ctx)}"
        )
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": msg},
            ],
            max_tokens=500,
            temperature=0.7,
        )
        return completion.choices[0].message.content or "I couldn't generate a response."
    except Exception as e:
        print(f"[Stash AI] LLM error: {e}")
        # Fallback to template if LLM fails
        response, _ = _template_generate(intent, msg, ctx, _format_budget(ctx))
        return response


def _template_generate(intent: str, msg: str, ctx: dict, budget_summary: str) -> tuple[str, list[str]]:
    """Template-based response generation (no API key needed)."""
    generators = {
        "irp": _gen_irp,
        "grocery": _gen_grocery,
        "fx": _gen_fx,
        "budget": _gen_budget,
        "streak": _gen_streak,
        "transport": _gen_transport,
        "accommodation": _gen_accommodation,
        "community": _gen_community,
        "perks": _gen_perks,
        "squad": _gen_squad,
        "market": _gen_market,
    }

    gen = generators.get(intent)
    if gen:
        return gen(msg, ctx, budget_summary)
    return _gen_general(msg, ctx, budget_summary)


def _gen_irp(msg, ctx, budget_summary):
    return (
        "To apply for your IRP (Irish Residence Permit):\n\n"
        "1️⃣ **Book an appointment** at burghquayregistrationoffice.inis.gov.ie\n"
        "2️⃣ **Bring these documents:**\n"
        "   • Valid passport\n"
        "   • College enrollment letter\n"
        "   • Proof of address (utility bill or bank statement)\n"
        "   • Proof of finances (€3,000 in bank for Stamp 2)\n"
        "   • €300 fee (card only)\n"
        "3️⃣ **Attend your appointment** — you'll get your IRP card in ~2 weeks\n\n"
        "⚠️ **Pro Tip:** Slots fill up fast! Check every morning at 10am for new releases. "
        "Some students use browser auto-refresh extensions to grab slots.",
        ["Immigration Service Delivery (ISD)", "INIS.gov.ie"],
    )


def _gen_grocery(msg, ctx, budget_summary):
    items = ctx.get("groceryprices", {}).get("items", [])
    item_keywords = ["milk", "bread", "rice", "eggs", "chicken", "curd", "yogurt", "butter", "cheese", "banana"]
    found = next((kw for kw in item_keywords if kw in msg.lower()), "")

    if found and items:
        matched = [i for i in items if found.lower() in i["name"].lower()]
        if matched:
            lines = []
            for it in matched[:5]:
                prices = ", ".join(f"{s['store']}: €{s['price']}" for s in it["stores"])
                cheapest = min(it["stores"], key=lambda s: s["price"])
                lines.append(f"• {it['name']}: {prices} → Cheapest at {cheapest['store']}")
            return (
                f"Here's what I found for **{found}** across Dublin stores:\n\n"
                + "\n".join(lines)
                + "\n\n💡 **Tip:** Check the **Grocery tab** for the full price comparison!",
                ["Grocery Prices Database"],
            )

    return (
        "For the cheapest groceries in Dublin:\n\n"
        "🥇 **Lidl** — Best overall prices\n"
        "🥈 **Aldi** — Very competitive, great weekly specials\n"
        "🥉 **Tesco** — More variety but pricier. Use your Clubcard!\n\n"
        "🛒 **Smart Shopping Tips:**\n"
        "• Shop in the evening for yellow sticker reductions\n"
        "• Buy own-brand products (30-50% cheaper)\n"
        "• Batch cook on Sundays\n\n"
        "💡 Use the **Grocery tab** for item-by-item comparisons!",
        ["Grocery Prices Database"],
    )


def _gen_fx(msg, ctx, budget_summary):
    fx = ctx.get("fxrates", {})
    rate = fx.get("currentRate", "N/A")
    best = fx.get("bestTimeToTransfer", "N/A")
    return (
        f"📊 **FX Update:**\n\n"
        f"Current rate: ₹1 = €{rate}\n"
        f"Best time: {best}\n\n"
        "🏦 **Best Services (by fees):**\n"
        "1. **Wise** — ~0.4% fee, mid-market rate\n"
        "2. **Remitly** — Fast, decent rates\n"
        "3. **Revolut** — Good for small amounts\n\n"
        "💡 Set rate alerts on the **FX tab** for optimal timing.",
        ["FX Rates Database", "User Profile"],
    )


def _gen_budget(msg, ctx, budget_summary):
    budget = ctx.get("budget", {})
    remaining = budget.get("dailyBudget", 0) - budget.get("spentToday", 0)
    if remaining > 20:
        status = "✅ You're doing great today!"
    elif remaining > 5:
        status = "⚠️ Getting tight — stick to essentials."
    else:
        status = "🚨 Almost out! Skip non-essentials."

    return (
        f"📊 **Budget Snapshot:**\n\n{budget_summary}\n\n{status}\n\n"
        "💡 **Quick Savings Tips:**\n"
        "• Cook at home — saves €8-15 per meal\n"
        "• Use student discounts (Perks tab)\n"
        "• Walk or cycle instead of transport",
        ["Budget Data", "User Profile"],
    )


def _gen_streak(msg, ctx, budget_summary):
    streaks = ctx.get("streaks", {})
    missions = ctx.get("survivalmissions", [])
    completed = sum(1 for m in missions if m.get("completed"))
    milestones = streaks.get("milestones", [])
    ms_text = ""
    for m in milestones:
        status = "✅" if m.get("achieved") else f"🔒 ({m['days']}d needed)"
        ms_text += f"• {m.get('emoji', '')} {m.get('label', '')} — {m.get('reward', '')} {status}\n"

    return (
        f"🔥 **Streak Status:**\n\n"
        f"• Current: **{streaks.get('currentStreak', 0)} days**\n"
        f"• Longest: **{streaks.get('longestStreak', 0)} days**\n"
        f"• Today under budget: {'✅ Yes!' if streaks.get('todayUnderBudget') else '❌ Not yet'}\n"
        f"• Missions: **{completed}/{len(missions)}** done\n\n"
        f"**Milestones:**\n{ms_text}\n"
        "Keep it going! 🎯",
        ["Streak Data", "Survival Missions"],
    )


def _gen_transport(msg, ctx, budget_summary):
    return (
        "🚌 **Getting Around Dublin on a Budget:**\n\n"
        "• **Student Leap Card** — 30% off bus/Luas/DART\n"
        "• **Dublin Bikes** — €35/year for trips under 30 min\n"
        "• **Walking** — City center is very walkable\n\n"
        "**Airport to City:**\n"
        "• Dublin Bus 16 — ~€3.30 (cheapest)\n"
        "• Airlink 747 — €7 (fast, direct)\n"
        "• Aircoach — €8 (24/7)\n"
        "• Taxi — €25-35 (share with friends)\n\n"
        "💡 If you spend >€40/month on transport, get Dublin Bikes!",
        ["Dublin Transport Guide"],
    )


def _gen_accommodation(msg, ctx, budget_summary):
    return (
        "🏠 **Finding Accommodation in Dublin:**\n\n"
        "**Where to Search:**\n"
        "• Daft.ie, Rent.ie, Facebook Groups\n"
        "• Stash Community tab for sublets!\n\n"
        "**Average Prices (shares):**\n"
        "• D1-2 (city): €800-1200/mo\n"
        "• D4-6 (Ranelagh): €700-1000/mo\n"
        "• D7-9 (Phibsboro): €600-900/mo\n\n"
        "⚠️ Never pay before viewing!",
        ["Dublin Housing Guide", "Community Posts"],
    )


def _gen_community(msg, ctx, budget_summary):
    return (
        "👥 **Community Features:**\n\n"
        "• **OFFERING** — Share items, sublets, tips\n"
        "• **SEEKING** — Find rooms, study groups, advice\n"
        "• **AI Matchmaker** — Auto-connects seekers & offerers!\n\n"
        "Go to the **Community tab** to browse or create a post!",
        ["Community System"],
    )


def _gen_perks(msg, ctx, budget_summary):
    perks = ctx.get("perks", [])
    hot = [p for p in perks if p.get("isHot")]
    text = f"🎁 **{len(perks)} active deals** for you!\n\n"
    if hot:
        text += "🔥 **Hot Deals:**\n"
        for p in hot:
            text += f"• {p.get('logo', '')} **{p.get('brand', '')}** — {p.get('deal', '')}\n"
        text += "\n"
    text += "Check the **Perks tab** for all deals!"
    return text, ["Perks Database"]


def _gen_squad(msg, ctx, budget_summary):
    members = ctx.get("squadmembers", [])
    owed = sum(m["amount"] for m in members if m["direction"] == "owes-you")
    owing = sum(m["amount"] for m in members if m["direction"] == "you-owe")
    return (
        f"👥 **Squad Summary:**\n\n"
        f"💚 Owed to you: **€{owed:.2f}**\n"
        f"🔴 You owe: **€{owing:.2f}**\n"
        f"📊 Net: **€{(owed - owing):.2f}**\n\n"
        "Use the **Squad tab** to split, nudge, and settle!",
        ["Squad Data"],
    )


def _gen_market(msg, ctx, budget_summary):
    return (
        "🛒 **Student Market:**\n\n"
        "• **Secondhand** — Save 50-80% on essentials\n"
        "• **📦 Starter Kits** — Bundled room setups from graduating students\n"
        "• **🔄 Skill Barter** — Trade favors, not money\n\n"
        "Browse the **Market tab** for deals!",
        ["Market Listings"],
    )


def _gen_general(msg, ctx, budget_summary):
    return (
        f"Hey! I'm **Stash AI** — your student finance buddy 🎓\n\n"
        f"I know your finances: {budget_summary}\n\n"
        "Here's what I can help with:\n\n"
        "💰 **Money** — Budget, FX rates, grocery prices\n"
        "🏙️ **Dublin Life** — IRP, transport, accommodation\n"
        "🎯 **Features** — Streaks, perks, community, squad\n\n"
        "Try: *\"How's my budget?\"* or *\"Where's the cheapest milk?\"*",
        ["User Profile", "Budget Data"],
    )


# ──────────────── Build & run graph ────────────────


def build_agent() -> StateGraph:
    """Build the LangGraph-style agent."""
    graph = StateGraph()
    graph.add_node("classify", classify_intent)
    graph.add_node("load_context", load_context)
    graph.add_node("generate", generate_response)
    graph.set_entry_point("classify")
    graph.add_edge("classify", "load_context")
    graph.add_edge("load_context", "generate")
    graph.set_finish_point("generate")
    return graph.compile()


# Singleton agent instance
_agent = build_agent()


def run_agent(message: str) -> dict:
    """Run the AI agent on a user message. Returns {response, sources}."""
    state = AgentState(message=message)
    result = _agent.invoke(state)
    return {
        "response": result.get("response", "I'm not sure how to help with that."),
        "sources": result.get("sources", []),
        "intent": result.get("intent", "general"),
    }
