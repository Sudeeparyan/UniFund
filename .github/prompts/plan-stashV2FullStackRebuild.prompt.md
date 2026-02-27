# Plan: Stash v2 — Full-Stack React + FastAPI + LangGraph Rebuild

## TL;DR

Rebuild the existing vanilla JS "Stash" prototype into a production-grade monorepo: **React (Vite + TypeScript)** frontend with a dark Revolt/Discord-inspired UI, **FastAPI** backend serving JSON data files, and **LangGraph** powering AI features (chatbot, NLP community matchmaker, receipt OCR, FX alerts). All data lives in structured JSON files initially — no database. The app is fully responsive (mobile-first bottom-tab nav, desktop sidebar nav). Priority A/B/C features are all scaffolded, with dummy data driving every screen.

---

## Project Structure

```
studentweb/
├── ref-stash-prototype/          # (existing — keep as reference)
├── frontend/                 # React + Vite + TypeScript
│   ├── public/
│   ├── src/
│   │   ├── assets/           # icons, images, lottie animations
│   │   ├── components/       # shared UI components
│   │   │   ├── layout/       # Sidebar, BottomNav, TopBar, AppShell
│   │   │   ├── common/       # Card, Modal, Button, Badge, Avatar, Toast
│   │   │   └── charts/       # FuelGauge, RunwayChart, SpendGraph
│   │   ├── pages/            # one per tab/route
│   │   │   ├── Dashboard/    # Safe Zone — runway, burn rate, vibe
│   │   │   ├── Feed/         # Transaction feed with AI roasts
│   │   │   ├── Community/    # Posts, AI matchmaker, free items
│   │   │   ├── Squad/        # Splitwise, leaderboard, nudges
│   │   │   ├── Perks/        # Deals hub, student offers
│   │   │   ├── Market/       # Secondhand, starter kits, skill barter
│   │   │   ├── Grocery/      # Price comparison (Tesco vs Lidl)
│   │   │   ├── FXRates/      # Currency exchange + timing alerts
│   │   │   └── Chat/         # AI chatbot interface
│   │   ├── hooks/            # useApi, useBreakpoint, useTheme
│   │   ├── context/          # AuthContext, UserContext, ThemeContext
│   │   ├── services/         # api.ts — all fetch calls to backend
│   │   ├── types/            # TypeScript interfaces for all data
│   │   ├── utils/            # formatCurrency, dateHelpers, calculations
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry, CORS, mount routers
│   │   ├── routers/          # one router per domain
│   │   │   ├── dashboard.py
│   │   │   ├── transactions.py
│   │   │   ├── community.py
│   │   │   ├── squad.py
│   │   │   ├── perks.py
│   │   │   ├── market.py
│   │   │   ├── grocery.py
│   │   │   ├── fx.py
│   │   │   └── chat.py       # LangGraph chatbot endpoint
│   │   ├── services/         # business logic
│   │   │   ├── runway.py     # runway calculator, burn rate
│   │   │   ├── matchmaker.py # NLP community matching (LangGraph)
│   │   │   ├── ocr.py        # receipt scanning stub
│   │   │   └── fx_service.py # exchange rate logic
│   │   ├── ai/               # LangGraph agents & graphs
│   │   │   ├── chatbot.py    # general Q&A agent
│   │   │   ├── matchmaker.py # community post NLP agent
│   │   │   ├── roast.py      # transaction roast generator
│   │   │   └── graphs/       # LangGraph state graphs
│   │   └── models/           # Pydantic schemas
│   ├── data/                 # ← ALL JSON DATA FILES (the "database")
│   │   ├── user_profile.json
│   │   ├── transactions.json
│   │   ├── budget.json
│   │   ├── squad_members.json
│   │   ├── squad_activity.json
│   │   ├── perks.json
│   │   ├── community_posts.json
│   │   ├── grocery_prices.json     # Tesco vs Lidl dummy data
│   │   ├── fx_rates.json
│   │   ├── market_listings.json    # secondhand items
│   │   ├── starter_kits.json
│   │   ├── skill_barter.json
│   │   ├── streaks.json
│   │   ├── survival_missions.json
│   │   ├── ghost_budget.json
│   │   └── roasts.json
│   ├── requirements.txt
│   └── .env
```

---

## Steps

### Step 1 — Scaffold the monorepo

- Initialize `frontend/` with `npm create vite@latest` (React + TypeScript template)
- Install dependencies: `tailwindcss`, `react-router-dom`, `lucide-react` (icons), `recharts` (charts), `framer-motion` (animations), `axios`
- Initialize `backend/` with FastAPI, uvicorn, `python-dotenv`, `pydantic`, `langgraph`, `langchain-openai`
- Configure Tailwind with the existing Stash dark palette (`#0a0a0f` bg, `#6c5ce7` primary, `#00d9a5` success, `#ffc107` warning, `#ff6b6b` danger)
- Set up CORS middleware in FastAPI to allow the React dev server

### Step 2 — Create all JSON data files in `backend/data/`

Extract every hardcoded value from the existing `ref-stash-prototype/index.html` and `ref-stash-prototype/app.js` into structured JSON.

Key files:

- `user_profile.json` — name, avatar, home currency (INR), host currency (EUR), monthly budget, loan date, university
- `transactions.json` — array of `{id, merchant, category, amount, currency, date, aiRoast, perkMissed}`
- `budget.json` — `{totalBalance, lockedFunds: [{name, amount}], dailyBudget, spentToday, ghostItems: [{purpose, amount, unlockDate}]}`
- `grocery_prices.json` — `{items: [{name, category, stores: [{store, price, unit, onSale}]}]}` with Tesco/Lidl/Aldi prices for Dublin staples (curd, milk, bread, rice, eggs, etc.)
- `fx_rates.json` — `{baseCurrency: "INR", targetCurrency: "EUR", currentRate, historicalRates: [{date, rate}], alerts: [{type, message, threshold}]}`
- `community_posts.json` — posts with `{id, author, avatar, content, tags, intent: "OFFERING"|"SEEKING", aiMatch, upvotes, comments}`
- `market_listings.json` — secondhand items, starter kits, skill barter listings
- `perks.json`, `squad_members.json`, `streaks.json`, `survival_missions.json`, `roasts.json`

### Step 3 — Build FastAPI backend routers

One router per domain, each reading from the corresponding JSON file:

- `GET /api/dashboard` — returns merged budget + user profile + runway calculation
- `GET /api/transactions` — returns transactions with AI roasts
- `GET /api/community` — returns community posts with AI match suggestions
- `POST /api/community` — add a new post, LangGraph agent auto-tags intent and finds matches
- `GET /api/squad` — returns squad members, balances, activity
- `GET /api/perks` — returns all perks, filterable by category
- `GET /api/grocery?item=curd` — returns price comparison across stores
- `GET /api/fx` — returns current rates + historical + alert recommendations
- `GET /api/market` — returns secondhand listings, starter kits, skill barter
- `POST /api/chat` — streams LangGraph chatbot responses (SSE or WebSocket)
- `POST /api/expense/scan` — stub for receipt OCR (returns mock parsed data for now)
- Pydantic models for every request/response to enforce structure

### Step 4 — Build responsive layout shell (React)

`AppShell` component with two layouts:

- **Mobile (< 768px):** Bottom tab navigation (Home / Feed / + / Community / More), full-width content, swipeable tabs. Inspired by Revolut/Stash prototype's phone-frame UI
- **Desktop (≥ 768px):** Left sidebar navigation (collapsible), main content center, optional right panel for quick stats or chat. Inspired by Revolt/Discord's sidebar + channel layout

Shared `TopBar` with user avatar, notification bell, search.

Theme: CSS variables via Tailwind config — dark mode default, matching the existing `#0a0a0f` background, purple gradients, glassmorphism cards (`backdrop-filter: blur`).

`react-router-dom` routes for each page, with a bottom sheet modal system for overlays.

### Step 5 — Implement Priority A pages

#### 5a. Dashboard (Safe Zone)

- Reimplement the fuel gauge as an SVG React component with `framer-motion` animations
- Runway calculator card: days until broke, visual countdown, "Fix It" suggestions modal
- Daily allowance hero with burn rate progress bar
- Locked funds and ghost budget sections
- Quick action buttons (Log Expense, Analytics)
- Vibe indicator based on budget health
- Connect to `GET /api/dashboard`

#### 5b. FX Rates page

- INR→EUR converter with live rate display (from JSON)
- Historical rate chart using `recharts` (line chart, 30-day view)
- "Best time to transfer" AI alert cards
- Connect to `GET /api/fx`

#### 5c. Grocery Comparison page

- Search/browse items (curd, milk, bread, etc.)
- Side-by-side store price cards (Tesco vs Lidl vs Aldi)
- "Cheapest basket" calculator — select items, see total per store
- Savings badge ("Save €3.20 at Lidl this week")
- Connect to `GET /api/grocery`

#### 5d. Expense Tracking (Feed page)

- Transaction cards with merchant icon, amount, category badge, AI roast comment
- Filter by category, date range
- "Add Expense" FAB → opens modal with amount, category picker, optional photo upload
- Receipt scan button (calls stub OCR endpoint, shows mock parsed data)
- Connect to `GET /api/transactions`

#### 5e. Scoreboard / Streaks (integrated into Dashboard)

- Daily budget streak counter with fire emoji progression
- Leaderboard of friends ranked by streak length
- Milestone rewards display (coupon cards)

### Step 6 — Implement Priority B pages

#### 6a. AI Chatbot page

- Full-screen chat interface (dark theme, message bubbles)
- User sends text → `POST /api/chat` → LangGraph processes → streams response
- The LangGraph chatbot agent has tools for: querying user budget, looking up FX rates, searching grocery prices, answering Dublin-specific questions (IRP card, airport transport, etc.)
- Suggested quick prompts: "How do I apply for IRP?", "What's the cheapest way to get groceries?", "When should I transfer money?"
- Backend: LangGraph `StateGraph` with a router node that delegates to specialized tool-nodes

#### 6b. Community page

- Reddit/Facebook-style feed with post cards
- Post creation with rich text
- AI-generated tags on each post: `[OFFERING]`, `[SEEKING]`, location, dates, price
- AI Matchmaker automated comments (rendered as a special "AI Bot" comment with purple accent)
- Upvote/downvote system, comment threads
- Filter by: All / Accommodation / Free Items / Events
- Connect to `GET/POST /api/community`

#### 6c. Streaks & Rewards

- Standalone streak tracker (integrated into dashboard + dedicated section)
- Daily/weekly missions from `survival_missions.json`
- Reward coupon cards (mock coupons for campus coffee, etc.)

### Step 7 — Implement Priority C pages

#### 7a. Secondhand Market page

- Grid/list toggle for listings
- Categories: Furniture, Electronics, Books, Bikes, Clothing
- Seniors' "Starter Kit" section — bundled packages with original vs discounted price
- Listing cards with image placeholder, price, distance, seller rating
- Connect to `GET /api/market?type=secondhand`

#### 7b. Splitwise (Squad page)

- Reimplemented Squad tab: balance summary ("You owe" / "You're owed")
- Friend list with individual balances
- "Split Expense" flow: enter amount → select members → auto-calculate shares
- Nudge button with toast notification
- "Deadbeat Leaderboard" with share-to-WhatsApp
- Activity feed showing recent splits/payments
- Connect to `GET /api/squad`

#### 7c. Skill Barter Board

- Card-based listings: "Offering: 1hr coding help" ↔ "Seeking: home-cooked meal"
- Category tags, skill-match suggestions
- Connect to `GET /api/market?type=barter`

### Step 8 — LangGraph AI integration

- **Chatbot Agent** (`backend/app/ai/chatbot.py`): LangGraph `StateGraph` with nodes for intent classification → tool selection → response generation. Tools: `budget_lookup`, `fx_lookup`, `grocery_search`, `dublin_info` (hardcoded FAQ), `community_search`
- **Community Matchmaker** (`backend/app/ai/matchmaker.py`): On new community post, runs NLP pipeline: intent recognition (OFFERING/SEEKING) → entity extraction (location, dates, budget) → database query for matches → generates automated comment
- **Roast Generator** (`backend/app/ai/roast.py`): Given a transaction category + amount, generates a witty roast comment. Falls back to the existing roasts from `roasts.json` if AI is unavailable
- All AI agents use `langchain-openai` (GPT-4o-mini for cost efficiency) or `langchain-google-genai` (Gemini) — configurable via `.env`
- For hackathon/demo: AI calls can be mocked by returning pre-generated responses from JSON when no API key is set

### Step 9 — Responsive polish

- Test all pages at 375px (iPhone SE), 428px (iPhone 14), 768px (iPad), 1440px (desktop)
- Mobile: bottom nav with 5 tabs, swipe gestures between tabs, pull-to-refresh
- Desktop: collapsible sidebar (icon-only vs full), keyboard shortcuts, hover states
- Glassmorphism card style: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl`
- Smooth transitions with `framer-motion` — page enter/exit, modal slide-up, card hover lift
- Empty states with illustrations for pages with no data
- Loading skeletons for API calls

### Step 10 — Student Offers / Perks page (existing feature, enhanced)

- Reimplemented Perks tab with search, category filters (Food, Transport, Entertainment, Shopping, Tech)
- Perk cards: logo, discount %, code reveal on click, expiry date, "Near You" badge
- UNiDAYS/Student Beans aggregation section (dummy links)
- Location-based deal section (mock GPS notification cards)
- Transport Mode Optimizer card: "You spent €80 on Luas — switch to Dublin Bikes for €35/year"

---

## Verification

1. **Frontend runs:** `cd frontend && npm run dev` — opens at `localhost:5173`, all pages navigable
2. **Backend runs:** `cd backend && uvicorn app.main:app --reload` — Swagger docs at `localhost:8000/docs`, all endpoints return JSON
3. **Data separation confirmed:** Every piece of displayed data traces back to a JSON file in `backend/data/`, not hardcoded in React components
4. **Responsive check:** Chrome DevTools responsive mode — toggle between mobile (<768px) and desktop to verify layout switch (bottom nav ↔ sidebar)
5. **AI chatbot test:** Send a message via the chat page → receives a response (mocked or live depending on API key)
6. **Community AI test:** Create a new "SEEKING" post → AI matchmaker auto-comment appears with a matching "OFFERING" post

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI Framework | **LangGraph** over ADK | More model-agnostic, better for rapid prototyping without Google Cloud lock-in. Can swap between OpenAI/Gemini/Claude via env config |
| Backend | **FastAPI** over Flask/Django | Auto-generated Swagger docs for frontend devs, native async support for AI streaming, Pydantic validation for JSON data |
| Styling | **Tailwind CSS** over styled-components | Faster iteration, built-in responsive utilities (`md:`, `lg:` prefixes), matches the utility-first approach needed for a multi-layout app |
| Data layer | **JSON files** over SQLite | Zero setup, editable by hand, perfect for hackathon demos. Migration path to PostgreSQL is a later concern |
| Repo structure | **Monorepo** over separate repos | Single clone, simpler deployment, shared types can be referenced |
| Theme | **Dark theme default** | Matches existing Stash branding and the Revolt/Discord aesthetic. No light mode for v1 |
