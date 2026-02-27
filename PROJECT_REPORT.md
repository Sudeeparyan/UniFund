# Stash — Student Finance App: Complete Project Report

> **Date:** 27 February 2026  
> **Stack:** FastAPI (Python) + React 19 (TypeScript) + Vite + TailwindCSS  
> **Purpose:** An AI-powered personal finance and lifestyle web app built for international students in Ireland (Dublin-focused). Helps students track budgets, split costs with flatmates, find grocery deals, monitor FX rates, earn rewards, and chat with an AI financial assistant.

---

## Table of Contents

1. [Project Architecture Overview](#1-project-architecture-overview)
2. [Backend — File-by-File](#2-backend--file-by-file)
   - 2.1 [Entry Points](#21-entry-points)
   - 2.2 [App Initialization](#22-app-initialization)
   - 2.3 [Routers](#23-routers)
   - 2.4 [Services](#24-services)
   - 2.5 [Data Layer](#25-data-layer)
3. [Frontend — File-by-File](#3-frontend--file-by-file)
   - 3.1 [Entry & Bootstrapping](#31-entry--bootstrapping)
   - 3.2 [Routing (App.tsx)](#32-routing-apptsx)
   - 3.3 [Pages](#33-pages)
   - 3.4 [Components](#34-components)
   - 3.5 [Hooks](#35-hooks)
   - 3.6 [Services / API Client](#36-services--api-client)
   - 3.7 [Types](#37-types)
   - 3.8 [Utils](#38-utils)
   - 3.9 [Context](#39-context)
   - 3.10 [Config Files](#310-config-files)
4. [Data Files](#4-data-files)
5. [End-to-End Request Flow](#5-end-to-end-request-flow)
6. [AI Layer Deep Dive](#6-ai-layer-deep-dive)
7. [Dependency Summary](#7-dependency-summary)

---

## 1. Project Architecture Overview

```
studentweb/
├── backend/                  ← Python FastAPI REST API
│   ├── run.py                ← Dev server launcher
│   ├── requirements.txt      ← Python dependencies
│   ├── .env                  ← API keys (OPENAI / Azure)
│   ├── app/
│   │   ├── main.py           ← FastAPI app factory, CORS, router registration
│   │   ├── __init__.py
│   │   ├── routers/          ← One file per feature endpoint group
│   │   ├── services/         ← Business logic, AI engine, data loader
│   │   └── models/           ← (Pydantic model definitions)
│   └── data/                 ← JSON flat-file "database"
│
├── frontend/                 ← React 19 + TypeScript SPA
│   ├── index.html
│   ├── vite.config.ts        ← Vite dev server + /api proxy → backend
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx          ← React DOM mount
│       ├── App.tsx           ← Route declarations
│       ├── index.css         ← Tailwind base + custom design tokens
│       ├── pages/            ← One component per screen
│       ├── components/       ← Reusable UI building blocks
│       ├── hooks/            ← Custom React hooks
│       ├── services/api.ts   ← Axios API client (all backend calls)
│       ├── types/index.ts    ← TypeScript interfaces for all data shapes
│       ├── utils/index.ts    ← Pure helper functions
│       └── context/          ← React context providers
│
└── test_receipts/            ← Sample receipt images for OCR testing
```

The frontend Vite dev server proxies all requests starting with `/api` to the FastAPI backend running on `http://127.0.0.1:8000`, so the two layers run in separate processes but appear as one origin to the browser.

---

## 2. Backend — File-by-File

### 2.1 Entry Points

#### `backend/run.py`
The development launcher. Calls `uvicorn.run()` pointing at `app.main:app` with hot-reload enabled on `127.0.0.1:8000`. Running `python run.py` is all that's needed to start the API server.

#### `backend/requirements.txt`
Declares all Python dependencies:

| Package | Purpose |
|---|---|
| `fastapi==0.115.0` | Web framework / router |
| `uvicorn[standard]==0.30.0` | ASGI server |
| `python-dotenv==1.0.1` | Loads `.env` into `os.environ` |
| `pydantic==2.9.0` | Request/response validation |
| `openai>=1.40.0` | GPT-4o chat completions (optional) |
| `azure-ai-inference>=1.0.0b1` | Azure AI / GitHub Models (optional) |
| `python-multipart>=0.0.9` | File upload support (receipt OCR) |
| `rapidocr-onnxruntime>=1.3.0` | On-device OCR for receipt scanning |
| `Pillow>=10.0.0` | Image pre-processing for OCR |

#### `backend/.env`
Environment file (not committed). May contain:
- `OPENAI_API_KEY` — enables GPT-powered AI responses in chat and insights
- `AZURE_INFERENCE_ENDPOINT` / `AZURE_INFERENCE_CREDENTIAL` — for Azure-hosted model access

---

### 2.2 App Initialization

#### `backend/app/__init__.py`
Empty package marker. Makes `app` a Python package so routers can use `from app.routers import ...`.

#### `backend/app/main.py`
The FastAPI application factory. Does the following in order:
1. Calls `load_dotenv()` to read `.env` before any router code runs.
2. Creates the `FastAPI` app instance with title `"Stash API"` and version `"2.0.0"`.
3. Attaches `CORSMiddleware` allowing requests from `http://localhost:5173` and `http://127.0.0.1:5173` (Vite's default dev ports).
4. Registers every feature router under the `/api` prefix — 13 routers in total.
5. Exposes a health-check root `GET /` returning `{"message": "Stash API v2.0 🚀"}`.

---

### 2.3 Routers

Each router file lives in `backend/app/routers/` and handles one feature domain.

#### `routers/__init__.py`
Empty package marker.

---

#### `routers/dashboard.py`
**Endpoint:** `GET /api/dashboard`

The most complex read endpoint. Aggregates data from multiple JSON files and computes:

| Computed Field | Description |
|---|---|
| `greeting` | Time-aware greeting (morning / afternoon / evening / etc.) |
| `safeToSpend` | `totalBalance − lockedFunds − ghostItems` |
| `runway.daysLeft` | `safeToSpend ÷ dailyAvgSpend` |
| `runway.brokeDate` | Date when money runs out |
| `runway.gapDays` | Days between broke date and next loan date |
| `avgBurnPerHour` | `spentToday ÷ hoursElapsed` |
| `savedVsAvg` | `dailyAvgSpend − spentToday` |
| `vibe` | Emotional summary object (percentRemaining, message, emoji) |
| `streak` | Current streak count and today's budget status |
| `coins` | Current coin balance |
| `recentTransactions` | Last 5 transactions |
| `lockedFunds` | List of locked savings goals |
| `ghostItems` | Upcoming scheduled expenses |
| `survivalTip` | Rotating daily student tip |

---

#### `routers/transactions.py`
**Endpoints:**
- `GET /api/transactions` — Returns full transaction list from `transactions.json`
- `POST /api/transactions` — Adds a new expense; picks a category-specific roast message and awards 2 coins per transaction; updates `budget.spentToday`
- `POST /api/transactions/receipt` — Accepts an image file upload, runs RapidOCR on it to extract text, then uses regex pattern matching to guess the merchant and amount from the receipt text. Falls back gracefully if OCR fails.

---

#### `routers/community.py`
**Endpoints:**
- `GET /api/community` — Returns all posts with optional `intent` filter (e.g. `OFFER`, `REQUEST`, `ROOMMATE`)
- `POST /api/community` — Creates a new post with auto-detected intent (NLP via regex keyword matching for Dublin locations, offering/requesting patterns)
- `POST /api/community/{post_id}/comment` — Adds a comment to a post
- `POST /api/community/{post_id}/vote` — Upvote or downvote a post

**NLP helpers inside the file:**
- `LOCATION_KEYWORDS` — 30+ Dublin area names for location extraction
- `OFFERING_PATTERNS` / `REQUESTING_PATTERNS` — regex lists used to classify a post as `OFFER`, `REQUEST`, `ROOMMATE`, `EVENT`, or `GENERAL`
- `detect_intent()` — Runs keyword matching to auto-tag each new post

---

#### `routers/chat.py`
**Endpoint:** `POST /api/chat`

Accepts a `{ message: string }` body. Delegates entirely to `services/ai_agent.py`'s `run_agent()` function and returns:
- `response` — AI-generated text answer
- `sources` — which data files were consulted
- `intent` — detected intent label (e.g. `grocery`, `fx`, `budget`)

---

#### `routers/ai_insights.py`
**Endpoint:** `GET /api/ai/insights?feature=<name>`

Returns 3 context-aware AI insight cards for a given app screen. The `feature` query param maps to one of: `dashboard`, `feed`, `fx`, `grocery`, `community`, `squad`, `perks`, `market`, `streaks`, `rewards`, `profile`. Delegates to `services/ai_insights.py`.

---

#### `routers/fx.py`
**Endpoint:** `GET /api/fx`

Simple passthrough — loads and returns `fx_rates.json` which contains current EUR/INR rate, rate history, provider comparisons (Wise, Revolut, Remitly), and a "best time to transfer" recommendation.

---

#### `routers/grocery.py`
**Endpoint:** `GET /api/grocery?item=<search>`

Loads `grocery_prices.json` and returns the items list. If the optional `item` query param is provided, filters by case-insensitive name match. Helps students compare grocery prices across Lidl, Aldi, Tesco, Dunnes.

---

#### `routers/market.py`
**Endpoint:** `GET /api/market?type=<type>`

Loads `market_listings.json` — a student secondhand marketplace. Optionally filters by listing type (e.g. `sell`, `buy`, `barter`).

---

#### `routers/perks.py`
**Endpoint:** `GET /api/perks?category=<category>`

Loads `perks.json` — student discounts and deals. Optionally filters by category string (e.g. `Food`, `Transport`, `Tech`).

---

#### `routers/profile.py`
**Endpoint:** `GET /api/profile`

Combines `user_profile.json`, `budget.json`, and `streaks.json` into a single profile response including computed `safeToSpend`, `currentStreak`, and `longestStreak` fields.

---

#### `routers/rewards.py`
**Endpoints:**
- `GET /api/coins` — Full coins data including balance, lifetime total, and transaction history
- `GET /api/coins/balance` — Quick balance-only response
- `GET /api/rewards-shop` — Returns available rewards from `rewards_shop.json`
- `POST /api/rewards-shop/purchase` — Purchases a reward by ID; deducts coins, marks as purchased, records history

Internal helpers `_get_coins()`, `_save_coins()`, and `_add_history()` abstract coin data reads/writes.

---

#### `routers/squad.py`
**Endpoints:**
- `GET /api/squad` — Returns squad members and recent split/activity log
- `POST /api/squad/split` — Splits an expense among selected member IDs; calculates per-person share; creates debt records; logs to activity feed
- `POST /api/squad/nudge` — Sends a "nudge" notification to a member who owes money; logs to activity
- `POST /api/squad/settle` — Marks a debt as partially or fully settled; updates balances; awards 5 coins for settling

---

#### `routers/streaks.py`
**Endpoints:**
- `GET /api/streaks` — Returns streak data with milestone coin rewards attached
- `GET /api/streaks/rewards` — Returns unlocked streak rewards
- `POST /api/streaks/rewards/{reward_id}/claim` — Claims a streak reward
- `GET /api/survival-missions` — Returns daily survival missions list
- `POST /api/survival-missions/toggle` — Marks a mission complete/incomplete; awards coins on completion; updates streak counter if daily target is met

Internal `_award_coins()` helper updates `coins.json` balance and appends to history, keeping only the last 50 entries.

---

### 2.4 Services

#### `services/__init__.py`
Empty package marker.

---

#### `services/data_loader.py`
The data access layer. All routers use this — no router directly imports `json` or `pathlib`.

- `DATA_DIR` — Resolves to `backend/data/` using `Path(__file__).resolve().parent.parent.parent / "data"`.
- `load_json(filename)` — Opens a JSON file from `DATA_DIR` and returns parsed Python object.
- `save_json(filename, data)` — Serializes data back to the JSON file with 2-space indent and UTF-8 encoding.

This centralization means changing the storage backend (e.g. to a real database) only requires modifying this one file.

---

#### `services/ai_agent.py`
The conversational AI engine powering the floating chat widget. Implements a **LangGraph-inspired StateGraph** pattern with three sequential nodes:

**Node 1 — `classify_intent(state)`**  
Uses a keyword lookup table (`intent_map`) with 11 intent categories to classify the user message. Categories include: `irp` (visa/immigration), `grocery`, `fx`, `budget`, `streak`, `transport`, `accommodation`, `community`, `perks`, `squad`, `market`. Falls back to `"general"`.

**Node 2 — `load_context(state)`**  
Loads the full user data context (profile, budget, transactions, streaks, coins, missions) plus intent-specific data (e.g. `grocery_prices.json` for a grocery query). Builds a rich context dictionary.

**Node 3 — `generate_response(state)`**  
Constructs a detailed system prompt embedding all user data, then either:
- Calls **OpenAI GPT** (if `OPENAI_API_KEY` is set) for a natural language response
- Calls **Azure AI Inference** (if Azure credentials are set)
- Falls back to a **rules-based template engine** that produces detailed pre-written responses for each intent using the loaded data

The `run_agent(message)` function is the public entry point that builds the graph, invokes it, and returns `{ response, sources, intent }`.

---

#### `services/ai_insights.py`
The contextual insights engine powering the AI insight cards shown on every screen.

**`_load_full_user_context()`**  
Loads all 16 data files into a single dict. Any missing file silently returns `None`.

**`_build_user_summary(ctx)`**  
Converts the raw context dict into a rich multi-line text string covering: balance snapshot, spending by category, streak status, mission progress, coin balance, squad debts, FX rates, and next loan date. This becomes the LLM system prompt.

**`_build_feature_prompt(feature, ctx)`**  
Builds a feature-specific prompt asking the AI for exactly 3 insight items (emoji + title + text) tailored to that screen's data.

**`get_feature_insights(feature)`**  
Orchestrates the full pipeline:
1. Loads full context
2. Builds user summary + feature prompt
3. Tries Azure OpenAI → falls back to GPT → falls back to smart templates
4. Parses and validates the 3-item response
5. Returns `{ insights: [...], source: "openai"|"template", feature }`

Smart template fallbacks exist for every feature, using actual user data values interpolated into pre-written insight strings.

---

### 2.5 Data Layer

All data lives as JSON files in `backend/data/`. This acts as a lightweight flat-file database — no SQL, no migrations.

| File | Contents |
|---|---|
| `user_profile.json` | Name, initials, avatar, email, phone, university, course, year, bio, location, home/host currency, loan date, achievements, stats, preferences |
| `budget.json` | `totalBalance`, `dailyBudget`, `spentToday`, `lockedFunds[]`, `ghostItems[]` |
| `transactions.json` | Array of expense records with id, date, merchant, category, amount, icon, roast |
| `coins.json` | `balance`, `lifetime`, `history[]` — the gamification currency |
| `streaks.json` | `currentStreak`, `longestStreak`, `todayUnderBudget`, `milestones[]`, `rewards[]` |
| `survival_missions.json` | Array of daily "missions" with id, title, emoji, description, coins, completed flag |
| `squad_members.json` | Array of flatmates/friends with name, amount owed, direction (owes-you / you-owe) |
| `squad_activity.json` | Timestamped log of splits, settlements, nudges |
| `community_posts.json` | Posts with author, content, tags, intent, upvotes, comments, timestamp |
| `perks.json` | Student discounts with title, description, category, discount, expiry |
| `grocery_prices.json` | Prices for common grocery items across Dublin supermarkets |
| `fx_rates.json` | EUR/INR rate, history, provider comparison table, transfer tips |
| `market_listings.json` | Secondhand items/services posted by students |
| `rewards_shop.json` | Redeemable rewards available for coins |
| `ghost_budget.json` | Upcoming scheduled "ghost" expenses (bills, subscriptions) |
| `roasts.json` | Category-keyed arrays of funny spending commentary strings |

---

## 3. Frontend — File-by-File

### 3.1 Entry & Bootstrapping

#### `frontend/index.html`
The single HTML shell. Contains a `<div id="root">` mount point and a `<script type="module" src="/src/main.tsx">` tag. Vite injects bundled assets here at build time.

#### `frontend/src/main.tsx`
The React bootstrapping entry point. Mounts the app in strict mode with three wrapping providers:
1. `BrowserRouter` — enables client-side routing via React Router
2. `ThemeProvider` — provides dark/light theme context throughout the tree
3. `App` — the route declaration tree

#### `frontend/src/index.css`
Global stylesheet. Imports Tailwind CSS directives (`@tailwind base/components/utilities`) and defines custom CSS variables for the Stash design system: brand colors (`--stash-accent`, `--stash-accent-dark`), background layers, card surfaces, text tokens, shadow utilities, and animation keyframes. Acts as the single source of truth for visual identity.

---

### 3.2 Routing (App.tsx)

Declares all client-side routes wrapped inside a single `<AppShell>` layout route (which renders the persistent nav bars). All routes:

| Path | Component |
|---|---|
| `/` or `/dashboard` | `Dashboard` |
| `/feed` | `Feed` |
| `/fx` | `FXRates` |
| `/grocery` | `Grocery` |
| `/community` | `Community` |
| `/squad` | `Squad` |
| `/perks` | `Perks` |
| `/market` | `Market` |
| `/streaks` | `Streaks` |
| `/rewards` | `Rewards` |
| `/more` | `MoreMenu` |
| `/profile` | `Profile` |

---

### 3.3 Pages

Each page is a React component that fetches its own data via `useApi` and renders a full screen.

#### `pages/Dashboard.tsx`
The app home screen — the most feature-rich page. Renders:
- **Coin toast** — animated notification when coins are earned
- **Header** — greeting + username + coin balance badge
- **Fuel Gauge** — visual representation of `safeToSpend` vs total balance
- **Budget burn bar** — daily progress with percentage remaining
- **Runway card** — days until broke, broke date, gap to next loan
- **Quick stats** — locked funds total, ghost items, avg hourly burn, saved vs avg
- **Locked funds** — expandable list of named savings locks
- **Survival missions** — tap-to-complete daily challenge list with coin awards
- **Recent transactions** — last 5 with merchant, category, amount, roast
- **Ghost budget** — upcoming expenses with unlock dates
- **AI Insight card** — personalized suggestions from `ai_insights` service
- **Floating action button** — shortcut to log a new expense

Uses `framer-motion` for staggered card reveal animations.

---

#### `pages/Feed.tsx`
A transaction-focused activity feed. Displays all transactions grouped by date with formatted amounts, category icons, merchant names, and roast messages. Serves as the full transaction history view.

---

#### `pages/FXRates.tsx`
Foreign exchange screen for students sending money home. Shows:
- Current EUR/INR live rate
- 30-day rate sparkline chart (Recharts `LineChart`)
- Provider comparison table (Wise, Revolut, Remitly) with fees and transfer times
- "Best time to transfer" AI recommendation
- AI insight card for FX-specific tips

---

#### `pages/Grocery.tsx`
Price comparison tool for Dublin supermarkets. Features:
- Search bar to filter grocery items by name
- Price comparison cards per item showing costs at Lidl, Aldi, Tesco, Dunnes
- Cheapest store highlight badge
- AI insights for grocery savings tips

---

#### `pages/Community.tsx`
Student notice board / social feed. Features:
- Intent filter tabs (All / Offer / Request / Roommate / Event)
- Post cards with upvote/downvote buttons, comment count, author, tags
- "New Post" modal with content, tags, and intent fields
- Comment threads expandable on each post
- Real-time vote updates via API calls

---

#### `pages/Squad.tsx`
Expense splitting and debt tracking with flatmates. Features:
- Squad member list with owed/owing amounts and direction indicators
- "Split Expense" modal — enter description, amount, select members
- Per-person share calculation displayed before confirming
- Nudge button to remind a member who owes money
- Settle debt flow with amount input
- Activity feed showing recent splits and settlements
- AI insights for squad financial health

---

#### `pages/Perks.tsx`
Student discount directory. Features:
- Category filter chips (All, Food, Transport, Tech, Entertainment, etc.)
- Perk cards with title, discount amount/percentage, description, expiry date
- "Claim" or "View" action buttons
- AI insights suggesting relevant deals based on spending patterns

---

#### `pages/Market.tsx`
Student secondhand marketplace. Features:
- Type filter tabs (All / Sell / Buy / Barter)
- Listing cards with item name, price, description, seller info, condition
- Contact / message seller action
- AI insights for secondhand deals relevant to current needs

---

#### `pages/Streaks.tsx`
Habit and engagement tracking. Features:
- Current streak counter with animated flame icon
- Streak calendar visualization
- Milestone markers (3, 7, 14, 30, 60, 90 days) with coin reward amounts
- Survival missions list with tap-to-complete
- Coins earned today counter
- AI insights for streak motivation

---

#### `pages/Rewards.tsx`
Coin-powered rewards shop. Features:
- Current coin balance display
- Coin earn history list
- Rewards shop grid — purchasable items with coin costs
- Purchase flow with confirmation and balance deduction
- AI insights for reward redemption recommendations

---

#### `pages/Profile.tsx`
User profile and settings screen. Features:
- Avatar, name, university, course, year, location display
- Financial stats summary (total saved, avg daily spend, budget hit rate)
- Achievements badge gallery
- Preferences toggles (notifications, weekly report, roast level, currency)
- Balance and streak overview
- AI insights personalized to the user

---

#### `pages/MoreMenu.tsx`
Overflow navigation screen accessible from the bottom nav "More" tab. Provides a menu of additional links and settings options not in the primary bottom navigation.

---

### 3.4 Components

#### `components/layout/AppShell.tsx`
The persistent layout wrapper rendered for all routes. Contains:
- `TopBar` (mobile header)
- `Sidebar` (desktop left nav)
- `<Outlet />` — renders the active page's content
- `BottomNav` (mobile bottom navigation)
- `FloatingChat` — the AI assistant chat bubble (always visible)

Manages layout breakpoints to switch between mobile and desktop navigation.

---

#### `components/layout/TopBar.tsx`
Mobile-only top header bar. Shows:
- App logo / "Stash" branding
- Current page title
- User avatar or initials
- Quick action icons (notifications, etc.)

---

#### `components/layout/Sidebar.tsx`
Desktop-only left navigation sidebar. Renders:
- App logo
- Navigation links with icons (using Lucide React icons)
- Active route highlight
- User profile mini-card at the bottom
- All 12 navigation destinations

---

#### `components/layout/BottomNav.tsx`
Mobile bottom tab bar (visible on small screens). Shows 5 primary navigation items: Dashboard, Feed, Community, Streaks, More. Uses React Router's `useLocation` to highlight the active tab.

---

#### `components/common/FloatingChat.tsx`
The persistent AI assistant chat widget. Always rendered on screen. Features:
- Collapsed state — a floating action button with a chat icon
- Expanded state — a chat panel sliding up with message history
- Sends user messages to `POST /api/chat` and displays streamed responses
- Shows intent badges and source indicators on responses
- Displays typing indicator while waiting for AI response
- Maintains local message history for the session

---

#### `components/common/Card.tsx`
Base card component. Renders a `div` with rounded corners, background, border, and optional padding using the Stash design tokens from `index.css`. Accepts `className` and `children` props. Used as the visual container for almost every UI section across all pages.

---

#### `components/common/AiInsightCard.tsx`
Renders the AI insights panel shown on each feature screen. Accepts `feature: string` prop, calls `GET /api/ai/insights?feature=<feature>` via `useApi`, and renders 3 insight items each with an emoji, bold title, and description text. Shows a loading skeleton while fetching and a "Powered by AI" badge on the source label.

---

#### `components/common/Badge.tsx`
Small pill/chip component for status indicators. Accepts `variant` (`success`, `warning`, `danger`, `info`, `accent`) and `children`. Applies the corresponding Tailwind color classes. Used for things like streak counts, budget status, and intent tags.

---

#### `components/common/LoadingSkeleton.tsx`
Animated placeholder shown while data is loading. Accepts a `count` prop and renders `count` number of skeleton card shapes using Tailwind's `animate-pulse`. Prevents layout shift while API calls resolve.

---

#### `components/charts/FuelGauge.tsx`
Custom SVG gauge chart (fuel-gauge / speedometer style). Accepts:
- `value` — fill percentage (0–1)
- `label` — center label text
- `amount` — euro amount to display
- `variant` — `success` / `warning` / `danger` → maps to green/yellow/red color scheme

Renders as an SVG arc path that fills proportionally to the value. Used on the Dashboard to visualize `safeToSpend`.

---

### 3.5 Hooks

#### `hooks/useApi.ts`
Generic data-fetching hook. Signature: `useApi<T>(fetcher: () => Promise<T>)`.

- Calls `fetcher()` on mount using `useEffect`
- Returns `{ data: T | null, loading: boolean, error: Error | null, refetch: () => void }`
- `refetch` re-runs the fetcher and re-triggers the loading state
- Re-fetches when the `fetcher` reference changes (works with `useCallback`)

Used on every single page to load its data from the backend.

---

#### `hooks/useBreakpoint.ts`
Returns the current responsive breakpoint string (`"sm"`, `"md"`, `"lg"`, `"xl"`) by reading `window.innerWidth` and listening for `resize` events. Used by `AppShell` to decide whether to render `Sidebar` (desktop) or `BottomNav` (mobile).

---

### 3.6 Services / API Client

#### `services/api.ts`
The centralized Axios API client. Creates one Axios instance with `baseURL: '/api'` (proxied to FastAPI by Vite). Exports named async functions for every backend endpoint:

| Function | Method | Endpoint |
|---|---|---|
| `getDashboard()` | GET | `/dashboard` |
| `getTransactions()` | GET | `/transactions` |
| `addTransaction(expense)` | POST | `/transactions` |
| `uploadReceipt(file)` | POST | `/transactions/receipt` |
| `getCommunityPosts(intent?)` | GET | `/community` |
| `createCommunityPost(post)` | POST | `/community` |
| `addCommunityComment(id, comment)` | POST | `/community/{id}/comment` |
| `voteCommunityPost(id, dir)` | POST | `/community/{id}/vote` |
| `getSquad()` | GET | `/squad` |
| `splitExpense(data)` | POST | `/squad/split` |
| `nudgeMember(memberId)` | POST | `/squad/nudge` |
| `settleDebt(memberId, amount)` | POST | `/squad/settle` |
| `getPerks(category?)` | GET | `/perks` |
| `getGroceryItems(item?)` | GET | `/grocery` |
| `getFXRates()` | GET | `/fx` |
| `getMarketListings(type?)` | GET | `/market` |
| `getStreaks()` | GET | `/streaks` |
| `getSurvivalMissions()` | GET | `/survival-missions` |
| `toggleMission(missionId)` | POST | `/survival-missions/toggle` |
| `getCoins()` | GET | `/coins` |
| `getCoinBalance()` | GET | `/coins/balance` |
| `getRewardsShop()` | GET | `/rewards-shop` |
| `purchaseReward(rewardId)` | POST | `/rewards-shop/purchase` |
| `getProfile()` | GET | `/profile` |
| `getAiInsights(feature)` | GET | `/ai/insights?feature=...` |
| `sendChatMessage(message)` | POST | `/chat` |

---

### 3.7 Types

#### `types/index.ts`
Single TypeScript type definition file for the entire frontend. Declares interfaces for every data shape returned by the API:

- `UserProfile`, `ProfileData`, `ProfileAchievement`, `ProfileStats`, `ProfilePreferences`
- `Budget`, `LockedFund`, `GhostItem`, `DashboardData`
- `Transaction`
- `CommunityPost`, `Comment`
- `SquadMember`, `SquadActivity`
- `Perk`
- `GroceryItem`
- `FXData`, `FXProvider`, `FXRate`
- `MarketListing`
- `StreakData`, `StreakMilestone`, `SurvivalMission`
- `CoinsData`, `CoinHistoryEntry`
- `RewardsShopData`, `RewardItem`
- `AiInsight`, `AiInsightsResponse`
- `ChatMessage`, `ChatResponse`

These types flow from `api.ts` into every page component, ensuring end-to-end type safety.

---

### 3.8 Utils

#### `utils/index.ts`
Pure utility functions with no side effects:

| Function | Purpose |
|---|---|
| `formatCurrency(amount, currency?)` | Formats a number to `€12.50`, `₹1,200.00` etc. using a symbol lookup map |
| `formatDate(dateStr)` | Returns human-relative strings: "Today, 3:45 PM", "Yesterday", "3 days ago", or "Jan 15" |
| `timeUntilReset()` | Calculates remaining time until midnight (daily budget reset) as "Xh Ym until reset" |
| `clamp(value, min, max)` | Standard numeric clamping — used for gauge/bar percentage calculations |

---

### 3.9 Context

#### `context/ThemeContext.tsx`
React context providing dark/light mode state. Exports:
- `ThemeProvider` — wraps the app; reads initial preference from `localStorage`; applies `dark` class to `document.documentElement`
- `useTheme()` — hook returning `{ theme: 'dark'|'light', toggleTheme: () => void }`

The Tailwind dark mode variant (`dark:`) is used throughout the component tree to apply theme-appropriate colors.

---

### 3.10 Config Files

#### `frontend/vite.config.ts`
Vite build and dev server configuration:
- Registers the `@vitejs/plugin-react` plugin for JSX transform
- Registers `@tailwindcss/vite` plugin for Tailwind CSS processing
- Configures a dev server proxy: all requests to `/api/*` are forwarded to `http://127.0.0.1:8000` — this is what allows the frontend to call the FastAPI backend without CORS issues in development

#### `frontend/tsconfig.json`
TypeScript compiler configuration. Targets ES2020, enables strict mode, JSX set to `react-jsx`, path aliases configured for `src/`. `moduleResolution` set to `bundler` for Vite compatibility.

#### `frontend/package.json`
Node.js project manifest. Key dependencies:

| Package | Purpose |
|---|---|
| `react` / `react-dom` v19 | Core UI library |
| `react-router-dom` v7 | Client-side routing |
| `axios` | HTTP client for API calls |
| `framer-motion` | Page and card animations |
| `lucide-react` | Icon library (600+ icons) |
| `recharts` | Chart components (line, bar, area) |
| `tailwindcss` v4 | Utility-first CSS framework |
| `vite` v7 | Build tool and dev server |
| `typescript` | Static typing |

---

## 4. Data Files

JSON flat-file data serves as the project's database. All reads/writes go through `services/data_loader.py`.

```
backend/data/
├── user_profile.json       ← Student identity + preferences + achievements
├── budget.json             ← Balance, daily budget, locked funds, ghost items
├── transactions.json       ← Expense history with roasts
├── coins.json              ← Gamification currency: balance + history
├── streaks.json            ← Streak progress + milestones + rewards
├── survival_missions.json  ← Daily challenge missions
├── squad_members.json      ← Flatmate debt tracking
├── squad_activity.json     ← Splits / settlements / nudges log
├── community_posts.json    ← Student notice board posts + comments
├── perks.json              ← Student discount listings
├── grocery_prices.json     ← Dublin supermarket price comparisons
├── fx_rates.json           ← EUR/INR exchange rates + providers
├── market_listings.json    ← Secondhand marketplace items
├── rewards_shop.json       ← Coin-purchasable rewards
├── ghost_budget.json       ← Scheduled upcoming expenses
└── roasts.json             ← Humorous spending commentary by category
```

---

## 5. End-to-End Request Flow

### Example: User opens the Dashboard

```
1. Browser loads / → React Router renders <Dashboard> inside <AppShell>
2. Dashboard calls getDashboard() from services/api.ts
3. Axios sends GET /api/dashboard (proxied by Vite to FastAPI)
4. FastAPI routes to routers/dashboard.py → get_dashboard()
5. get_dashboard() calls load_json() 4 times:
   user_profile.json, budget.json, streaks.json, transactions.json
6. Computes: safeToSpend, runway, burn rate, vibe score, greeting
7. Returns JSON response with all computed fields
8. React receives data, useApi sets data state
9. LoadingSkeleton unmounts, Dashboard renders FuelGauge, cards, missions
10. AiInsightCard independently fetches GET /api/ai/insights?feature=dashboard
11. ai_insights.py loads ALL 16 data files, builds user summary, calls AI (or template)
12. Returns 3 insight items → rendered in AiInsightCard
```

### Example: User sends a chat message

```
1. User types in FloatingChat, hits send
2. sendChatMessage(text) → POST /api/chat { message: text }
3. routers/chat.py → run_agent(text)
4. services/ai_agent.py runs StateGraph:
   Node 1: classify_intent → detects "grocery"
   Node 2: load_context → loads budget + transactions + grocery_prices.json
   Node 3: generate_response → calls OpenAI GPT (or template)
5. Returns { response, sources: ["grocery_prices.json"], intent: "grocery" }
6. FloatingChat renders bot message with intent badge
```

---

## 6. AI Layer Deep Dive

The project has **two separate AI systems**:

### AI Chat Agent (`services/ai_agent.py`)
- **Pattern:** LangGraph-style StateGraph (custom minimal implementation)
- **Flow:** classify_intent → load_context → generate_response
- **Online mode:** OpenAI `gpt-4o-mini` or Azure GitHub Models
- **Offline mode:** Rule-based template responses using live user data
- **Intent coverage:** 11 categories + general fallback
- **Context:** Always loads full user financial profile for personalization

### AI Insights Engine (`services/ai_insights.py`)
- **Pattern:** Single-shot LLM prompt with structured output
- **Trigger:** Every feature screen loads 3 personalized insights on mount
- **Online mode:** Azure OpenAI → GPT fallback
- **Offline mode:** Per-feature smart templates with live data interpolation
- **Output:** Always exactly 3 `{ emoji, title, text }` insight objects
- **Features covered:** dashboard, feed, fx, grocery, community, squad, perks, market, streaks, rewards, profile (11 screens)

Both systems are designed to **degrade gracefully** — the app works completely without any API keys, using rich template fallbacks that still use real user data values.

---

## 7. Dependency Summary

### Backend (Python)
| Package | Version | Role |
|---|---|---|
| fastapi | 0.115.0 | REST API framework |
| uvicorn[standard] | 0.30.0 | ASGI web server |
| python-dotenv | 1.0.1 | `.env` loading |
| pydantic | 2.9.0 | Data validation |
| openai | ≥1.40.0 | GPT chat completions |
| azure-ai-inference | ≥1.0.0b1 | Azure-hosted models |
| python-multipart | ≥0.0.9 | File upload parsing |
| rapidocr-onnxruntime | ≥1.3.0 | On-device OCR |
| Pillow | ≥10.0.0 | Image processing |

### Frontend (Node.js)
| Package | Version | Role |
|---|---|---|
| react / react-dom | 19.x | UI library |
| react-router-dom | 7.x | Client-side routing |
| axios | 1.x | HTTP client |
| framer-motion | 12.x | Animations |
| lucide-react | 0.575 | Icons |
| recharts | 3.x | Charts |
| tailwindcss | 4.x | CSS framework |
| vite | 7.x | Build tool |
| typescript | 5.9 | Static typing |

---

*End of report. Total files documented: 57 source files + 16 data files.*
