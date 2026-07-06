# 📁 FILE STRUCTURE


### Complete Project Layout (v3.0 - Next.js)

```
exalted/                              # Project root
├── AGENTS.md                         # 🤖 This file - Complete AI context
├── SETUP_GITHUB_ACTIONS.md           # 📖 Setup guide for GitHub Actions deployment
│
├── src/                              # 🚀 Next.js App (v3.0)
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout with PoE theme
│   │   ├── page.tsx                  # Main calculator page
│   │   └── globals.css               # Global styles (Tailwind)
│   ├── components/                   # React components
│   │   ├── Calculator/               # Main calculator container
│   │   │   ├── index.tsx             # Calculator logic & state
│   │   │   └── ItemPriceInput.tsx    # Item price input component
│   │   ├── ExchangeRates/            # Exchange rate inputs
│   │   │   └── index.tsx             # Editable rate inputs
│   │   ├── ArbitrageResults/         # Results display
│   │   │   └── index.tsx             # Strategy cards & details
│   │   └── ui/                       # Shared UI components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   ├── lib/                          # Utility functions
│   │   ├── arbitrage.ts              # Arbitrage calculation logic
│   │   ├── rates.ts                  # Rate fetching & parsing
│   │   └── storage.ts                # LocalStorage utilities
│   └── types/                        # TypeScript types
│       └── index.ts                  # All type definitions
│
├── public/                           # Static assets
│   └── api/data/                     # Static JSON data (copied from api/data)
│       ├── currencies.json           # Currency metadata
│       └── rates.json                # Exchange rates
│
├── api/data/                         # 📦 Source data (updated by GitHub Actions)
│   ├── currencies.json               # Currency list with metadata
│   └── rates.json                    # Exchange rate matrix
│
├── backend/                          # 🐍 Legacy Python backend (reference only)
│   └── ...                           # Old Python implementation
│
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
├── postcss.config.mjs                # PostCSS configuration
├── vercel.json                       # ⚙️ Vercel deployment config
├── package.json                      # 📦 Node.js dependencies
└── .gitignore                        # Git ignore patterns
```

### Legacy Files (kept for reference)
- `index.html`, `app.js`, `styles.css` - Old vanilla JS frontend
- `backend/` - Old Python FastAPI backend

### Core Files

#### Documentation
- **`AGENTS.md`** - This file - Complete context for AI agents
- **`SETUP_GITHUB_ACTIONS.md`** - Setup guide for GitHub Actions deployment

#### GitHub Actions Automation (.github/)
- **`workflows/scrape-poe2scout.yml`** - Cron workflow (runs every 5 minutes)
- **`scripts/scrape_poe2scout.py`** (~5KB) - Playwright scraper script

#### Frontend (Root Directory)
- **`index.html`** (~3KB) - Main HTML structure with Advanced Settings
- **`app.js`** (~40KB) - Frontend JavaScript with dynamic currency support
- **`styles.css`** (~25KB) - CSS styling with dark PoE-inspired theme

#### Backend (backend/) - Reference/Development Only
- **`app.py`** (~15KB) - FastAPI server for local development
- **`models/rates.py`** (~12KB) - Currency rate matrix
- **`models/arbitrage.py`** (~8KB) - Arbitrage finder
- **`services/poe2scout.py`** (~20KB) - POE2Scout data service (used by GitHub Actions)

#### Production API (api/) - Vercel Serverless
- **`data/currencies.json`** - Auto-updated by GitHub Actions
- **`data/rates.json`** - Auto-updated by GitHub Actions
- **`static_data.py`** (~5KB) - Static JSON file loader
- **`simple_app.py`** (~7KB) - Simplified FastAPI (reads static files)
- **`index.py`** - Vercel entry point
- **`requirements.txt`** - Serverless dependencies (minimal)

---
