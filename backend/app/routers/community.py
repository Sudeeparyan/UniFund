from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.data_loader import load_json, save_json
import uuid
from datetime import datetime
import re

router = APIRouter()


class NewPost(BaseModel):
    author: str
    content: str
    tags: list[str] = []
    intent: str = "GENERAL"


class NewComment(BaseModel):
    author: str
    content: str


class VoteRequest(BaseModel):
    direction: str = "up"  # "up" or "down"


# ── NLP Helpers ──────────────────────────────────────────────────

LOCATION_KEYWORDS = [
    "dublin 1", "dublin 2", "dublin 3", "dublin 4", "dublin 5", "dublin 6",
    "dublin 7", "dublin 8", "dublin 9", "dublin 10", "dublin 11", "dublin 12",
    "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9",
    "rathmines", "ranelagh", "phibsborough", "drumcondra", "glasnevin",
    "ballsbridge", "sandymount", "clontarf", "howth", "dun laoghaire",
    "tallaght", "blanchardstown", "city centre", "parnell", "smithfield",
    "stoneybatter", "portobello", "harold's cross", "terenure",
]

OFFERING_PATTERNS = [
    r"\b(giving away|for free|free\b|selling|subletting|leaving|offering|available)",
    r"\b(take over|handover|starter kit|moving out|graduating)\b",
]

SEEKING_PATTERNS = [
    r"\b(looking for|need|seeking|wanted|anyone know|searching)\b",
    r"\b(where can i|help me find|recommendation)\b",
]


def _detect_intent(content: str) -> str:
    """Detect post intent using keyword patterns."""
    text = content.lower()
    offer_score = sum(1 for p in OFFERING_PATTERNS if re.search(p, text))
    seek_score = sum(1 for p in SEEKING_PATTERNS if re.search(p, text))
    if offer_score > seek_score:
        return "OFFERING"
    elif seek_score > offer_score:
        return "SEEKING"
    return "GENERAL"


def _extract_locations(content: str) -> list[str]:
    """Extract Dublin locations from post content."""
    text = content.lower()
    return [loc for loc in LOCATION_KEYWORDS if loc in text]


def _extract_budget(content: str) -> Optional[dict]:
    """Extract budget/price information from post content."""
    match = re.search(r'€\s*(\d+)(?:\s*[-–to]+\s*€?\s*(\d+))?', content)
    if match:
        low = int(match.group(1))
        high = int(match.group(2)) if match.group(2) else low
        return {"low": low, "high": high}
    return None


def _extract_duration(content: str) -> Optional[str]:
    """Extract time duration from post."""
    text = content.lower()
    patterns = [
        r'(\d+)\s*months?',
        r'(summer|winter|spring|semester|term)',
        r'(short[- ]term|long[- ]term|temporary)',
        r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(?:to|[-–])\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*',
    ]
    for p in patterns:
        match = re.search(p, text)
        if match:
            return match.group(0)
    return None


def _auto_generate_tags(content: str, intent: str) -> list[str]:
    """Generate tags from content using NLP."""
    tags = []
    text = content.lower()
    locs = _extract_locations(content)
    if locs:
        tags.extend(locs[:2])

    keyword_tags = {
        "accommodation": ["room", "apartment", "flat", "rent", "sublet", "accommodation"],
        "free-stuff": ["free", "giving away", "giveaway"],
        "food": ["food", "meal", "curry", "cook", "eat"],
        "events": ["event", "party", "meetup", "gathering"],
        "study": ["study", "library", "exam", "assignment", "tutor"],
        "transport": ["bus", "luas", "dart", "bike", "transport"],
        "jobs": ["job", "internship", "work", "hiring", "part-time"],
    }
    for tag, keywords in keyword_tags.items():
        if any(kw in text for kw in keywords):
            tags.append(tag)

    return list(dict.fromkeys(tags))  # dedupe preserving order


def _find_matches(post: dict, all_posts: list) -> Optional[str]:
    """Find matching posts (OFFERING↔SEEKING) using NLP."""
    if post["intent"] == "GENERAL":
        return None

    target_intent = "OFFERING" if post["intent"] == "SEEKING" else "SEEKING"
    candidates = [p for p in all_posts if p["intent"] == target_intent and p["id"] != post["id"]]
    if not candidates:
        return None

    post_locs = set(_extract_locations(post["content"]))
    post_budget = _extract_budget(post["content"])
    post_tags = set(tag.lower() for tag in post.get("tags", []))

    best_match = None
    best_score = 0

    for candidate in candidates:
        score = 0
        cand_locs = set(_extract_locations(candidate["content"]))
        cand_budget = _extract_budget(candidate["content"])
        cand_tags = set(tag.lower() for tag in candidate.get("tags", []))

        # Location overlap
        if post_locs & cand_locs:
            score += 3

        # Budget compatibility
        if post_budget and cand_budget:
            if (post_budget["low"] <= cand_budget["high"] and
                    post_budget["high"] >= cand_budget["low"]):
                score += 2

        # Tag overlap
        tag_overlap = post_tags & cand_tags
        score += len(tag_overlap)

        # Content keyword overlap
        post_words = set(post["content"].lower().split())
        cand_words = set(candidate["content"].lower().split())
        common = post_words & cand_words - {"the", "a", "an", "in", "for", "to", "of", "and", "or", "i", "is", "my"}
        score += min(len(common), 3) * 0.5

        if score > best_score:
            best_score = score
            best_match = candidate

    if best_match and best_score >= 1.5:
        if post["intent"] == "SEEKING":
            return (
                f"🔍 Found a potential match! @{best_match['author']} posted about: "
                f"\"{best_match['content'][:100]}...\" — Check their post for details!"
            )
        else:
            return (
                f"🤝 Someone might need this! @{best_match['author']} is looking for: "
                f"\"{best_match['content'][:100]}...\" — They could be a match!"
            )
    return None


def _generate_ai_comment(post: dict, match_text: str) -> dict:
    """Generate an AI matchmaker comment."""
    locations = _extract_locations(post["content"])
    budget = _extract_budget(post["content"])
    duration = _extract_duration(post["content"])

    details = []
    if locations:
        details.append(f"📍 Location: {', '.join(locations).title()}")
    if budget:
        price = f"€{budget['low']}" if budget['low'] == budget['high'] else f"€{budget['low']}-€{budget['high']}"
        details.append(f"💰 Budget: {price}")
    if duration:
        details.append(f"📅 Duration: {duration}")

    detail_str = "\n".join(details)
    content = f"{match_text}"
    if detail_str:
        content += f"\n\n**Extracted Details:**\n{detail_str}"
    content += "\n\n⚠️ Safety Reminder: Always verify in person before transferring any money!"

    return {
        "id": f"cc-ai-{uuid.uuid4().hex[:6]}",
        "author": "Stash AI",
        "avatar": "🤖",
        "content": content,
        "isAI": True,
        "createdAt": datetime.now().isoformat(),
    }


# ── Endpoints ────────────────────────────────────────────────────

@router.get("/community")
def get_community(intent: Optional[str] = None):
    posts = load_json("community_posts.json")
    if intent and intent != "All":
        posts = [p for p in posts if p.get("intent") == intent]
    return posts


@router.post("/community")
def create_post(post: NewPost):
    posts = load_json("community_posts.json")

    # Auto-detect intent if GENERAL
    detected_intent = _detect_intent(post.content)
    final_intent = post.intent if post.intent != "GENERAL" else detected_intent

    # Auto-generate tags
    auto_tags = _auto_generate_tags(post.content, final_intent)
    merged_tags = list(dict.fromkeys(post.tags + auto_tags))

    new_post = {
        "id": f"cp-{uuid.uuid4().hex[:6]}",
        "author": post.author,
        "avatar": "".join(w[0].upper() for w in post.author.split()[:2]),
        "content": post.content,
        "tags": merged_tags,
        "intent": final_intent,
        "aiMatch": None,
        "upvotes": 0,
        "comments": [],
        "createdAt": datetime.now().isoformat(),
    }

    # AI Matchmaker: find matches and add AI comment
    match_text = _find_matches(new_post, posts)
    if match_text:
        new_post["aiMatch"] = match_text
        ai_comment = _generate_ai_comment(new_post, match_text)
        new_post["comments"].append(ai_comment)

    posts.insert(0, new_post)
    save_json("community_posts.json", posts)
    return new_post


@router.post("/community/{post_id}/comment")
def add_comment(post_id: str, comment: NewComment):
    """Add a user comment to a community post."""
    posts = load_json("community_posts.json")
    for post in posts:
        if post["id"] == post_id:
            new_comment = {
                "id": f"cc-{uuid.uuid4().hex[:6]}",
                "author": comment.author,
                "avatar": "".join(w[0].upper() for w in comment.author.split()[:2]),
                "content": comment.content,
                "isAI": False,
                "createdAt": datetime.now().isoformat(),
            }
            post["comments"].append(new_comment)
            save_json("community_posts.json", posts)
            return new_comment
    return {"error": "Post not found"}


@router.post("/community/{post_id}/vote")
def vote_post(post_id: str, vote: VoteRequest):
    """Upvote or downvote a community post."""
    posts = load_json("community_posts.json")
    for post in posts:
        if post["id"] == post_id:
            if vote.direction == "up":
                post["upvotes"] = post.get("upvotes", 0) + 1
            else:
                post["upvotes"] = max(0, post.get("upvotes", 0) - 1)
            save_json("community_posts.json", posts)
            return {"upvotes": post["upvotes"]}
    return {"error": "Post not found"}
