from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import dashboard, transactions, community, squad, perks, grocery, fx, market, chat, streaks, profile, rewards, ai_insights

app = FastAPI(title="Stash API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(squad.router, prefix="/api")
app.include_router(perks.router, prefix="/api")
app.include_router(grocery.router, prefix="/api")
app.include_router(fx.router, prefix="/api")
app.include_router(market.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(streaks.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(rewards.router, prefix="/api")
app.include_router(ai_insights.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Stash API v2.0 🚀"}
