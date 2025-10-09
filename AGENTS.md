# AGENTS.md - Complete Context for AI Agents
# Path of Exile 2 - Currency Arbitrage Calculator

**Last Updated**: October 9, 2025  
**Version**: 2.0 (Dynamic Currency System)

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [File Structure](#file-structure)
5. [API Reference](#api-reference)
6. [Technical Implementation](#technical-implementation)
7. [UI/UX Design](#uiux-design)
8. [Configuration](#configuration)
9. [Deployment](#deployment)
10. [Development Guidelines](#development-guidelines)
11. [Troubleshooting](#troubleshooting)
12. [Future Roadmap](#future-roadmap)

---

## 📋 PROJECT OVERVIEW

### What This Project Does

**Path of Exile 2 Currency Arbitrage Calculator** is a sophisticated web application that helps players identify profitable currency trading opportunities by:

1. **Dynamically discovering** all available currencies from POE2Scout.com
2. **Ranking currencies** by trading volume and popularity  
3. **Finding arbitrage paths** (A→B→C→A) with real profit potential
4. **Providing user control** over currency selection complexity

### Key Features

#### ✨ Dynamic Currency System
- **Auto-discovery**: Finds ALL currencies on POE2Scout automatically
- **Smart ranking**: Sorts by trading volume + market position
- **User control**: Choose top 10% to 100% of currencies
- **Real-time updates**: Adapts as new currencies are added to game

#### 🎯 Advanced Arbitrage
- **3-step paths**: A→B→C→A arbitrage calculations
- **Live market data**: Real exchange rates via browser automation
- **Profit analysis**: Accounts for realistic trading constraints
- **Risk assessment**: Volume-based liquidity indicators
- **Multi-scale display**: Shows opportunities at different investment levels

#### 🎮 Dual Trading Modes
- **📍 Specific Currency**: Analyze arbitrage from a chosen starting currency
- **🏆 All Trades Ranked**: Find best opportunities across ALL currencies
- **💎 Budget Filtering**: Filter by investment level (Micro/Small/Medium/Large/Whale)

#### ⚙️ Configuration Options
- **Currency percentage**: Slider from 10% (fast) to 100% (comprehensive)
- **Popularity metrics**: Toggle volume/score display in UI
- **Advanced settings**: Collapsible panel for power users
- **Responsive design**: Works on desktop and mobile

### Quick Start

```bash
# 1. Start the backend
cd backend/
pip install -r requirements.txt
playwright install chromium
python app.py

# 2. Open frontend (new terminal)
cd ..
python -m http.server 3000

# 3. Use the app
open http://localhost:3000
```

### Production Deployment

**🌐 LIVE URL**: https://exalted-oolmal1u9-lifan-chens-projects.vercel.app

✅ **Status**: Fully operational with real-time data from poe2scout.com

---

## 🚀 CURRENT STATUS

### Production Status (October 2025)

- ✅ **Production Deployment**: LIVE with REAL-TIME DATA on Vercel
- ✅ **Frontend**: Beautiful PoE-themed UI with dark styling and gold accents
- ✅ **Backend API**: Fully functional Python serverless functions reading from static JSON
- ✅ **Live Data Integration**: GitHub Actions scrapes POE2Scout.com every 5 minutes
- ✅ **Currency Data**: Real-time currency discovery and exchange rates (auto-updated)
- ✅ **Arbitrage Calculations**: Working end-to-end with live market data
- ✅ **CSS Styling**: Dark theme loading properly in production
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **API Endpoints**: All endpoints working with live data from static files
- ✅ **Real Market Conditions**: Authentic trading opportunities based on current market efficiency
- ✅ **Completely Free**: $0/month cost using GitHub Actions + Vercel free tiers

### Recent Major Updates (September 2025)

#### ✅ Dynamic Real-World Value Calculation - COMPLETED
- **Real-Time Exchange Rate Integration**: Budget calculations use live exchange rates relative to Divine Orb ($1 baseline)
- **Accurate Value Estimation**: All currency values calculated dynamically based on current market rates
- **Intelligent Fallback System**: Graceful degradation to static values when live rates unavailable
- **Multi-Path Rate Discovery**: Finds exchange rates through intermediate currencies
- **Divine Orb Baseline**: Fixed 1 Divine = $1 as reference point for all budget categorizations

#### ✅ Budget Range Filtering - COMPLETED
- **Smart Budget Categorization**: Opportunities automatically categorized by investment level
- **Investment Level Filtering**: Budget range selector appears only in All Trades mode
- **Intelligent Budget Matching**: System analyzes actual trading scale requirements
- **Budget-Aware Display**: Results header shows selected budget filter and count
- **Flexible Range Options**: Five budget ranges from Micro ($1-5) to Whale ($500+)

#### ✅ All Trades Ranked Mode - COMPLETED
- **Dual Trading Modes**: Toggle between "Specific Currency" and "All Trades Ranked" modes
- **Cross-Currency Analysis**: Analyzes arbitrage opportunities from ALL currencies simultaneously
- **Intelligent Batch Processing**: Processes currencies in batches of 5
- **Global Profit Ranking**: Shows top 20 opportunities ranked by profit percentage
- **Enhanced UI Design**: New cross-currency display layout with profit-based color coding

#### ✅ Multi-Scale Display System - COMPLETED
- **Currency Tier Classification**: Automatic categorization into Budget/Moderate/Premium tiers
- **Investment Level Scaling**: Each opportunity shown at 3 scales - 🏠 Starter, 💎 Moderate, 🐋 Advanced
- **Budget-Aware Amounts**: Smart scaling prevents unrealistic amounts
- **Real-World Value Context**: Each scale shows approximate real-world value
- **Accessible Trading Options**: New players see starter amounts, whales see high-volume options

#### ✅ Dynamic Currency System - COMPLETED
- **Dynamic Currency Discovery**: Automatically extracts ALL currencies from POE2Scout.com
- **Volume Analysis & Ranking**: Popularity scoring based on trading volume and position
- **User-Configurable Selection**: Top X% currency selection (10%-100%)
- **Real-time Currency Updates**: System adapts as new currencies are introduced
- **Advanced Settings UI**: Configuration panel for currency percentage and metrics
- **Browser Automation**: Playwright-based scraping for JavaScript-rendered content

#### ✅ GitHub Actions Architecture - COMPLETED (October 2025)
- **Automated Data Collection**: GitHub Actions runs Playwright scraper every 5 minutes
- **Static JSON Storage**: Scraped data committed to repo (`api/data/*.json`)
- **Zero-Cost Deployment**: Completely free using GitHub Actions + Vercel free tiers
- **Serverless Compatible**: No browser automation needed in Vercel functions
- **Auto-Deployment**: Vercel automatically redeploys when data is updated
- **Reliable Updates**: 288 scrapes per day, ~576 minutes/month usage (within free 2000 min/month)
- **Simplified API**: FastAPI reads from static files instead of live scraping

---

## 🏗️ ARCHITECTURE

### System Overview (Current: GitHub Actions + Static JSON)

```
┌─────────────────────────────────────────────────────────────────┐
│                 GITHUB ACTIONS (Every 5 minutes)                 │
│  • Runs Playwright scraper                                      │
│  • Extracts live data from POE2Scout.com                        │
│  • Commits JSON files to repository                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Git commit/push
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      GITHUB REPOSITORY                           │
│  • api/data/currencies.json (auto-updated)                      │
│  • api/data/rates.json (auto-updated)                           │
│  • Triggers Vercel auto-deployment                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Auto-deployment on push
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              VERCEL (Static Hosting + Serverless)                │
│  • Serves frontend (HTML/CSS/JS)                                │
│  • API functions read from static JSON                          │
│  • No live scraping needed                                      │
│  • Fast response times (<100ms)                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS requests
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                              │
│  • Beautiful PoE-themed UI                                      │
│  • Real-time arbitrage calculations                             │
│  • Responsive design                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Layers

#### 🤖 Data Collection Layer (GitHub Actions)
- **Frequency**: Every 5 minutes (cron: `*/5 * * * *`)
- **Technology**: Python + Playwright in Ubuntu runner
- **Source**: poe2scout.com/exchange live market data
- **Output**: JSON files committed to repo
- **Cost**: FREE (2000 minutes/month free tier, using ~576/month)
- **Reliability**: Auto-retry on failure, comprehensive error logging

#### 📦 Data Storage Layer (GitHub Repository)
- **Location**: `/api/data/` directory
- **Files**: 
  - `currencies.json` - Currency metadata and popularity scores
  - `rates.json` - Exchange rate matrix
- **Format**: JSON with metadata (source, timestamp, league)
- **Update Method**: Git commits from GitHub Actions
- **History**: Full version control of data changes

#### 🐍 API Layer (Vercel Serverless Functions)
- **Framework**: FastAPI (simplified for static data)
- **Functions**:
  - `/api/currencies` - List available currencies
  - `/api/rates/{league}` - Get exchange rates
  - `/api/arbitrage/{league}` - Calculate arbitrage opportunities
  - `/api/health` - Health check and data freshness
- **Data Source**: Reads from static JSON files
- **Processing**: Arbitrage calculations done server-side
- **Response Time**: <100ms (no browser automation needed)

#### 🌐 Frontend Layer (Vanilla JavaScript)
- **Hosting**: Vercel CDN (static files)
- **UI Framework**: Vanilla JavaScript (no dependencies)
- **Styling**: Dark PoE-themed CSS
- **Features**:
  - Currency selection dropdown
  - Trading mode selector
  - Budget range filtering
  - Multi-scale opportunity display
  - Real-time status updates

### Data Flow

```
┌──────────────────── AUTOMATED DATA UPDATE (Every 5 min) ─────────────────────┐
│                                                                               │
│  GitHub Actions → Playwright Scrape → Extract Data → Commit JSON → Vercel    │
│  Deploy                                                                       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────────── USER REQUEST FLOW (Realtime) ────────────────────────────┐
│                                                                               │
│  User → Frontend → API Request → Read JSON File → Calculate Arbitrage →      │
│  Return Results → Display in UI                                              │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. CurrencyRateMatrix (`backend/models/rates.py`)
```python
class CurrencyRateMatrix:
    """
    Dynamic currency rate storage with O(1) lookups
    """
    - Automatic inverse calculation (if A→B, then B→A = 1/(A→B))
    - Transitive rate computation using Floyd-Warshall algorithm
    - JSON serializable for API responses
    - TTL-based expiration for intelligent caching
    - Factory methods for different data sources
```

#### 2. ArbitrageFinder (`backend/models/arbitrage.py`)
```python
class ArbitrageFinder:
    """
    Multi-step arbitrage path discovery
    """
    - Configurable parameters (min profit, slippage, max results)
    - Efficient path finding with early termination
    - Sorted results by profitability
    - Detailed step tracking for each conversion
    - Summary statistics for analysis
```

#### 3. POE2ScoutService (`backend/services/poe2scout.py`)
```python
class POE2ScoutService:
    """
    Live data extraction from poe2scout.com
    """
    - Browser automation with Playwright
    - Volume analysis for popularity scoring
    - Currency discovery and ranking
    - Rate extraction with validation
    - Error recovery and fallback handling
```

### Performance Characteristics

#### Scalability
- **10-15 currencies**: ~200ms response (mobile-friendly)
- **20-30 currencies**: ~1-2s response (balanced - default)
- **40-50 currencies**: ~3-5s response (comprehensive analysis)

#### Memory Usage
- **Base backend**: ~50MB (without browser)
- **Playwright browser**: ~100MB (per browser instance)
- **Rate matrix (20 currencies)**: ~5MB (in-memory cache)
- **Rate matrix (40 currencies)**: ~20MB (quadratic growth)
- **Total production**: ~200MB (comfortable deployment limit)

---

## 📁 FILE STRUCTURE

### Complete Project Layout

```
exalted/                              # Project root
├── AGENTS.md                         # 🤖 This file - Complete AI context
├── SETUP_GITHUB_ACTIONS.md           # 📖 Setup guide for GitHub Actions deployment
│
├── .github/                          # 🤖 GitHub Actions automation
│   ├── workflows/
│   │   └── scrape-poe2scout.yml      # ⏰ Cron job (every 5 minutes)
│   └── scripts/
│       └── scrape_poe2scout.py       # 🎭 Playwright scraper script
│
├── index.html                        # 🌐 Main frontend HTML page
├── app.js                            # ⚡ Frontend JavaScript (dynamic currency)
├── styles.css                        # 🎨 UI styling (PoE theme + config UI)
│
├── backend/                          # 🐍 Python backend (development/reference)
│   ├── __init__.py
│   ├── app.py                        # 🚀 FastAPI server (local dev)
│   ├── requirements.txt              # 📦 Python dependencies
│   ├── models/                       # 📊 Data models
│   │   ├── __init__.py
│   │   ├── rates.py                  # 💱 Currency rate matrix
│   │   └── arbitrage.py              # 📈 Arbitrage finder
│   └── services/                     # 🌐 External integrations
│       ├── __init__.py
│       └── poe2scout.py              # 🎭 POE2Scout data service
│
├── api/                              # 🔧 Vercel serverless functions
│   ├── data/                         # 📦 Static JSON data (auto-updated by GitHub Actions)
│   │   ├── currencies.json           # 💰 Currency list with metadata
│   │   └── rates.json                # 💱 Exchange rate matrix
│   ├── __init__.py
│   ├── static_data.py                # 📖 Static data loader
│   ├── simple_app.py                 # 🚀 Simplified FastAPI (reads static JSON)
│   ├── index.py                      # 🔌 Vercel entry point
│   └── requirements.txt              # 📦 Serverless dependencies
│
├── public/                           # 🌐 Public static files
│   ├── index.html                    # Production frontend
│   ├── app.js                        # Production JavaScript
│   └── styles.css                    # Production CSS
│
├── vercel.json                       # ⚙️ Vercel deployment config
├── package.json                      # 📦 Node.js metadata
└── requirements.txt                  # 📦 Root Python dependencies
```

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

## 📡 API REFERENCE

### Base URL

**Local Development**: `http://localhost:8000/api`  
**Production**: `https://exalted-oolmal1u9-lifan-chens-projects.vercel.app/api`

### Core Endpoints

#### GET /api/currencies

Get list of supported currencies with dynamic discovery and popularity ranking.

**Parameters**:
- `league` (string, optional): POE2 league name (default: "Rise of the Abyssal")
- `top_percentage` (float, optional): Percentage of top currencies to include (0.1-1.0, default: 0.8)
- `force_refresh` (boolean, optional): Force refresh currency data (default: false)

**Response**:
```json
{
  "league": "Rise of the Abyssal",
  "top_percentage": 0.8,
  "total_discovered": 45,
  "currencies": [
    {
      "id": "divine",
      "name": "Divine Orb",
      "supported": true,
      "volume": 15000000,
      "pair_count": 12,
      "popularity_score": 185.5,
      "position": 1
    }
  ],
  "data_source": {
    "source": "poe2scout",
    "fetched_at": "2025-10-08T10:30:00Z",
    "is_expired": false
  }
}
```

#### GET /api/arbitrage/{league}

Find arbitrage opportunities for a specific currency and amount.

**URL**: `/api/arbitrage/{league}`

**Parameters**:
- `starting_currency` (string): Starting currency for arbitrage (default: "chaos")
- `amount` (float): Starting amount (default: 100.0)
- `min_profit` (float): Minimum profit percentage (0-1.0, default: 0.01)
- `max_results` (int): Maximum results to return (1-50, default: 10)
- `slippage` (float): Slippage per trading step (0-0.1, default: 0.0)
- `top_percentage` (float): Percentage of top currencies to include (default: 0.8)

**Response**:
```json
{
  "league": "Rise of the Abyssal",
  "starting_currency": "chaos",
  "starting_amount": 100,
  "parameters": {
    "min_profit_percentage": 0.01,
    "slippage_per_step": 0.0,
    "max_results": 10,
    "top_percentage": 0.8
  },
  "summary": {
    "total_opportunities": 5,
    "best_profit_percentage": 2.85,
    "average_profit_percentage": 1.42
  },
  "opportunities": [
    {
      "path_description": "Chaos Orb → Divine Orb → Mirror of Kalandra → Chaos Orb",
      "profit_percentage": 2.85,
      "final_amount": 102.85,
      "profit_amount": 2.85,
      "steps": [...]
    }
  ]
}
```

#### GET /api/rates/{league}

Get current exchange rates with complete rate matrix.

**Parameters**:
- `top_percentage` (float): Percentage of top currencies to include (default: 0.8)

**Response**:
```json
{
  "metadata": {
    "source": "poe2scout",
    "league": "Rise of the Abyssal",
    "fetched_at": "2025-10-08T10:30:00Z",
    "ttl_seconds": 300,
    "is_expired": false
  },
  "rates": {
    "chaos": {
      "divine": 0.0336,
      "exalted": 4.87
    }
  }
}
```

#### POST /api/refresh/{league}

Force refresh currency rates for a league.

**Parameters**:
- `top_percentage` (float): Percentage of top currencies to include (default: 0.8)

**Response**:
```json
{
  "league": "Rise of the Abyssal",
  "top_percentage": 0.8,
  "refresh_initiated": true,
  "message": "Rate refresh initiated in background"
}
```

#### GET /health

Health check endpoint with cache status information.

**Response**:
```json
{
  "status": "healthy",
  "cache_info": {
    "rise-of-the-abyssal_0.8": {
      "fetched_at": "2025-10-08T10:30:00Z",
      "is_expired": false,
      "source": "poe2scout"
    }
  },
  "supported_currencies": 28
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "detail": "Unsupported currency: invalid_currency"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Failed to fetch currency rates: Connection timeout"
}
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### Currency Data Structure

```javascript
// Exchange rate matrix (backend)
CURRENCY_RATES = {
  currencyA: {
    currencyB: rate,  // 1 currencyA = rate currencyB
    currencyC: rate
  }
}

// Currency metadata
CURRENCY_METADATA = {
  currencyKey: {
    name: "Display Name",
    volume: 15000000,
    pair_count: 12,
    popularity_score: 185.5,
    position: 1
  }
}
```

### Supported Currencies (Dynamic Discovery)

**Dynamic Currency Discovery**: The system automatically discovers and ranks currencies from POE2Scout.com by trading volume and popularity.

**Default Configuration**: Top 80% of currencies (typically 20-30 currencies)

**Core Currencies** (always included):
1. **Exalted Orb** (`exalted`) - High-value currency
2. **Divine Orb** (`divine`) - Premium currency
3. **Chaos Orb** (`chaos`) - Common trading currency (default selection)

**Popular Currencies** (auto-discovered by volume):
- Mirror of Kalandra, Perfect Exalted Orb, Orb of Annulment
- Orb of Chance, Perfect Chaos Orb, Fracturing Orb
- Greater Exalted Orb, Perfect Jeweller's Orb
- Uncut Skill Gems, Various Omens, Special Items

### Arbitrage Algorithm

#### Specific Currency Mode
1. **Input**: Starting currency and amount
2. **Process**: For each possible 3-step path (A→B→C→A):
   - Convert initial amount: A → B
   - Convert intermediate amount: B → C
   - Convert back to original: C → A
3. **Output**: Sorted list of profitable opportunities (by profit percentage)
4. **Display**: Shows top 5 most profitable paths with multi-scale examples

#### All Trades Ranked Mode
1. **Input**: All available currencies (from dynamic currency discovery)
2. **Process**: For each currency in parallel batches:
   - Use dynamic default amount based on currency tier
   - Calculate arbitrage opportunities using same 3-step algorithm
   - Collect and merge results from all currencies
3. **Output**: Global ranking of all opportunities by profit percentage
4. **Display**: Shows top 20 opportunities across all starting currencies
5. **Performance**: Batched processing (5 currencies per batch) with error handling

### Dynamic Default System

The system automatically determines sensible base amounts for calculations based on currency tiers:

**Premium Tier** (1-5 units): Ultra-expensive currencies
- Divine Orb (2), Mirror of Kalandra (1), Perfect Exalted (5)
- Rakiata's Flow (1), Hinekora's Lock (1), Farrul's Rune (1)

**Moderate Tier** (8-25 units): Expensive but accessible currencies
- Exalted Orb (10), Greater Exalted (8), Perfect Chaos (15)
- Orb of Annulment (20), Fracturing Orb (25)

**Budget Tier** (50-800 units): Common/stackable currencies
- Chaos Orb (100), Jeweller's Orb (150), Orb of Chance (80)
- Omens (250-800 depending on rarity), Uncut Gems (50)

**Fallback**: Unrecognized currencies default to 25 units (moderate tier)

### Budget Range System

**Budget Categories**:
- **💰 Micro ($1-5)**: Starter-friendly amounts
- **💵 Small ($5-25)**: Casual trading amounts
- **💸 Medium ($25-100)**: Moderate investment
- **💎 Large ($100-500)**: Serious trading
- **🐋 Whale ($500+)**: High-roller amounts

**Value Calculation**:
- Base currency: Divine Orb = $1.00
- All other currencies valued relative to Divine
- Real-time exchange rates used when available
- Fallback to static rates when live data unavailable

### Multi-Scale Display Format

```
#1 Chaos Orb → Jeweller's Orb → Ancient Orb → Chaos Orb [Best: +2.6% profit]

🏠 Starter (Perfect for beginners) [≈ $1-3 value]
   100 → 103 Chaos Orb (+3 profit, +3.0%)
   1. 100 Chaos Orb → 45 Jeweller's Orb (0.450)
   2. 45 Jeweller's Orb → 52 Ancient Orb (1.156)
   3. 52 Ancient Orb → 103 Chaos Orb (1.981)

💎 Moderate (Solid investment) [≈ $5-15 value]
   500 → 513 Chaos Orb (+13 profit, +2.6%)
   [steps displayed similarly]

🐋 Advanced (Maximum efficiency) [≈ $20-60 value]
   2000 → 2052 Chaos Orb (+52 profit, +2.6%)
   [steps displayed similarly]
```

### Exchange Rate Data

- **Primary Source**: poe2scout.com/exchange live market data via HTTP extraction
- **Live Data**: Real trading pairs from poe2scout.com exchange rates
- **Fallback**: Current market rates observed from poe2scout.com
- **Static Backup**: Hardcoded rates with realistic PoE2 market values
- **Update frequency**: 5-minute cache TTL for live data
- **Rate relationships**: Direct market rates between all currency pairs

### Caching Strategy

#### Multi-Layer Caching
1. **In-memory cache**: Latest `RateMap` with `fetchedAt` timestamp
2. **localStorage**: Persist `{ provider, league, fetchedAt, ttlMs, rates }`
3. **Cache keys**: Include `top_percentage` for proper isolation

#### Cache Behavior
- **TTL**: 5 minutes (300 seconds)
- **Cache hit**: Use immediately + refresh in background
- **Cache miss**: Fetch fresh data
- **On failure**: Use last good cached; if none, fall back to static

### Slippage and Spread Handling

- User-configurable slippage (basis points) per hop (default 1.0% per hop)
- Effective rate per hop: `rateEffective = rateRaw * (1 - slippageBps/10000)`
- Conservative calculations using integer rounding for premium currencies

---

## 🎨 UI/UX DESIGN

### Design Philosophy

- **Dark theme**: Matches Path of Exile's aesthetic
- **Gold accents**: Uses PoE's signature color (#d4af37)
- **Clear hierarchy**: Important information (profit %) prominently displayed
- **Mobile-first**: Responsive design for all screen sizes
- **Loading states**: Smooth animations and status updates

### HTML Structure

#### Main Components

```html
<body>
  <div class="container">
    <!-- Header -->
    <h1>🔥 Path of Exile 2 - Currency Arbitrage Calculator</h1>
    
    <!-- Advanced Settings Panel (Collapsible) -->
    <div class="advanced-settings">
      <div class="settings-header">⚙️ Advanced Settings</div>
      <div class="settings-content">
        <!-- Currency Percentage Slider -->
        <!-- Popularity Metrics Toggle -->
      </div>
    </div>
    
    <!-- Configuration Section -->
    <div class="configuration-section">
      <!-- Trading Mode Selection -->
      <!-- Currency Selection (conditional) -->
      <!-- Budget Range Selection (conditional) -->
      <!-- Minimum Profit Input -->
    </div>
    
    <!-- Action Buttons -->
    <div class="button-container">
      <button id="calculateBtn">Calculate</button>
      <button id="refreshBtn">Refresh Data</button>
    </div>
    
    <!-- Status Display -->
    <div id="status"></div>
    
    <!-- Results Display -->
    <div id="results"></div>
  </div>
</body>
```

### CSS Styling

#### Color Scheme
```css
:root {
  --poe-gold: #d4af37;        /* Signature gold accent */
  --poe-dark: #1a1a1a;        /* Dark background */
  --poe-medium: #2d2d2d;      /* Medium background */
  --poe-light: #404040;       /* Light elements */
  --success-color: #22c55e;   /* Profit indicators */
  --warning-color: #fbbf24;   /* Warnings */
  --error-color: #ef4444;     /* Errors */
}
```

#### Key Design Elements
- **Container**: Max-width 1200px, centered, with padding
- **Cards**: Rounded corners, subtle shadows, dark backgrounds
- **Buttons**: Gold gradient, hover effects, disabled states
- **Results**: Grid layout, color-coded profit indicators
- **Loading**: Spinning animation, smooth transitions
- **Mobile**: Single column, larger touch targets

### User Flow

#### Specific Currency Mode
1. User selects "📍 Specific Currency" trading mode
2. User selects starting currency (defaults to Chaos Orb)
3. User clicks "🚀 Calculate Arbitrage Opportunities"
4. Results display multi-scale opportunities (Starter/Moderate/Advanced) ranked by profitability

#### All Trades Ranked Mode
1. User selects "🏆 All Trades Ranked" trading mode
2. Currency selection automatically hidden (not needed)
3. Budget range selector appears with options
4. User optionally selects budget range to filter opportunities
5. User clicks "🏆 Find All Best Trades"
6. System analyzes ALL currencies in parallel batches
7. Results display opportunities ranked by profit, filtered by budget
8. Each result shows best trading scale and complete path

### Interactive Elements

#### Configuration Controls
- **Currency Percentage Slider**: 10% to 100%, updates in real-time
- **Popularity Metrics Toggle**: Show/hide volume and scores
- **Trading Mode Radio**: Specific Currency vs All Trades Ranked
- **Budget Range Dropdown**: Filter opportunities by investment level
- **Minimum Profit Input**: Decimal input with validation

#### Dynamic Behavior
- **Currency dropdown updates**: When percentage slider changes
- **Conditional visibility**: Currency/budget controls based on mode
- **Loading animations**: Smooth state transitions
- **Status messages**: Real-time feedback on operations
- **Error handling**: Clear error messages with recovery suggestions

### Accessibility

- **Semantic HTML**: Proper heading hierarchy, form labels
- **Keyboard navigation**: All controls accessible via keyboard
- **ARIA labels**: Screen reader support for dynamic content
- **Color contrast**: WCAG AA compliant contrast ratios
- **Focus indicators**: Visible focus states for all interactive elements

---

## ⚙️ CONFIGURATION

### Backend Configuration

#### Environment Variables

Create `.env` file in `backend/` directory:

```env
# Server Settings
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Currency Discovery
DEFAULT_TOP_PERCENTAGE=0.8
DEFAULT_LEAGUE="Rise of the Abyssal"
CACHE_TTL_SECONDS=300

# Browser Automation
BROWSER_HEADLESS=True
BROWSER_TIMEOUT=15000
REQUEST_TIMEOUT=10

# API Limits
MAX_RESULTS_LIMIT=50
MIN_PROFIT_LIMIT=0.001
MAX_AMOUNT_LIMIT=1000000

# Logging
LOG_LEVEL=INFO
LOG_FILE=arbitrage.log
```

#### Currency Selection Configuration

```python
CURRENCY_CONFIGS = {
    'fast': {
        'top_percentage': 0.4,      # Top 40% - fastest
        'description': 'Most liquid currencies only'
    },
    'balanced': {
        'top_percentage': 0.8,      # Top 80% - default
        'description': 'Good balance of choice and performance'
    },
    'comprehensive': {
        'top_percentage': 1.0,      # 100% - all currencies
        'description': 'Maximum arbitrage opportunities'
    }
}
```

#### Popularity Scoring Weights

```python
def calculate_popularity_score(volume, position, pair_count):
    """
    Custom popularity scoring algorithm
    """
    # Volume component (0-100 scale)
    volume_score = min(volume / 1_000_000, 100)
    
    # Position component (earlier = better)
    position_score = max(0, 100 - position)
    
    # Pair count bonus (more pairs = more liquid)
    pair_bonus = min(pair_count * 2, 20)
    
    # Weighted combination
    return (volume_score * 0.6) + (position_score * 0.3) + (pair_bonus * 0.1)
```

### Frontend Configuration

```javascript
// app.js configuration
const FRONTEND_CONFIG = {
    currency_loading: {
        batch_size: 20,           // Load currencies in batches
        delay_ms: 100,           // Delay between batches
        show_loading: true       // Show loading indicators
    },
    api_optimization: {
        debounce_ms: 300,        // Debounce user input
        cache_duration: 300000,  // 5 minutes client cache
        max_concurrent: 3        // Max simultaneous API calls
    },
    ui_performance: {
        result_pagination: 10,    // Results per page
        animation_duration: 200   // UI animation speed
    }
};
```

### Performance Optimization

#### Backend Optimization

```python
# Recommended currency counts by scenario
PERFORMANCE_TIERS = {
    'mobile': 15,        # Mobile app - fast response
    'web_fast': 20,      # Web app - quick calculations
    'web_standard': 30,  # Web app - balanced
    'analysis': 50,      # Deep analysis - comprehensive
}
```

#### Memory Management

```python
# Efficient rate matrix storage
import numpy as np

class OptimizedRateMatrix:
    def __init__(self, currencies):
        self.currencies = currencies
        self.currency_index = {curr: i for i, curr in enumerate(currencies)}
        # Use numpy for efficient storage
        self.rates = np.zeros((len(currencies), len(currencies)), dtype=np.float32)
```

---

## 🚀 DEPLOYMENT

### Local Development

```bash
# 1. Install Python dependencies
cd backend/
pip install -r requirements.txt

# 2. Install Playwright browser
playwright install chromium

# 3. Start backend server
python app.py
# Backend runs at: http://localhost:8000

# 4. Serve frontend (new terminal)
cd ..
python -m http.server 3000
# Frontend runs at: http://localhost:3000
```

### Production Deployment (Vercel)

#### Status: ✅ LIVE AND WORKING

**🌐 Production URL**: https://exalted-oolmal1u9-lifan-chens-projects.vercel.app

**Deployed**: October 2025  
**Platform**: Vercel Serverless Functions  
**Status**: Fully operational with live data

#### Deployment Steps

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from project directory**:
```bash
cd /Users/lfan/exalted
vercel
```

4. **Production deployment**:
```bash
vercel --prod
```

#### Configuration Files

**vercel.json**:
```json
{
  "version": 2,
  "builds": [
    {"src": "api/**/*.py", "use": "@vercel/python"},
    {"src": "public/**", "use": "@vercel/static"}
  ],
  "routes": [
    {"src": "/api/(.*)", "dest": "/api/index.py"},
    {"src": "/(.*)", "dest": "/public/$1"}
  ]
}
```

**package.json**:
```json
{
  "name": "poe2-arbitrage-calculator",
  "version": "2.0.0",
  "description": "Path of Exile 2 Currency Arbitrage Calculator",
  "main": "index.html"
}
```

#### Production Considerations

- **Serverless Functions**: 30-second timeout limit
- **Memory Limit**: 1GB per function
- **Cold Starts**: First request may be slower
- **Playwright Limitation**: May not work in serverless (fallback to static rates)
- **Static Assets**: Served from Vercel CDN
- **CORS**: Handled automatically for same-origin requests

### Docker Deployment (Optional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - LOG_LEVEL=INFO
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./:/usr/share/nginx/html
```

---

## 👨‍💻 DEVELOPMENT GUIDELINES

### Code Patterns to Follow

#### Consistent Formatting
- **Indentation**: 2 spaces for JavaScript/CSS, 4 spaces for Python
- **Naming**: camelCase for JavaScript, snake_case for Python
- **Comments**: Clear function/class documentation

#### Error Handling

```python
# Backend - Comprehensive error handling
try:
    result = await fetch_data()
except ConnectionError as e:
    logger.error(f"Connection failed: {e}")
    raise HTTPException(status_code=503, detail="Service unavailable")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

```javascript
// Frontend - Graceful error handling
async function fetchArbitrage() {
    try {
        const response = await fetch('/api/arbitrage');
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        return null;
    }
}
```

### When Making Changes

1. **Preserve exchange rate balance** - Ensure rates create realistic arbitrage scenarios
2. **Maintain responsive design** - Test changes on mobile and desktop
3. **Keep profit calculations accurate** - Verify math on any rate changes
4. **Preserve PoE aesthetic** - Maintain dark theme and gold accent colors
5. **Test all currency combinations** - Ensure dropdown changes work correctly
6. **Update documentation** - Keep AGENT.md in sync with code changes

### Testing Guidelines

#### Backend Testing
```bash
# Test individual components
cd backend/models
python rates.py          # Test rate matrix
python arbitrage.py      # Test arbitrage finder

cd ../services
python poe2scout.py      # Test data service
```

#### API Testing
```bash
# Health check
curl http://localhost:8000/health

# Get currencies
curl "http://localhost:8000/api/currencies?top_percentage=0.8"

# Find arbitrage
curl "http://localhost:8000/api/arbitrage/Rise%20of%20the%20Abyssal?starting_currency=chaos&amount=100"
```

#### Frontend Testing
- Test all trading modes (Specific Currency, All Trades Ranked)
- Test budget filtering in All Trades mode
- Test currency percentage slider (10% to 100%)
- Test responsive design on mobile/tablet/desktop
- Test loading states and error handling
- Verify multi-scale display formatting

### Adding New Features

```bash
# 1. Update backend models/services
backend/models/        # Data structures
backend/services/      # External integrations

# 2. Update API endpoints
backend/app.py         # REST API

# 3. Update frontend
app.js                 # UI logic
index.html            # HTML structure
styles.css            # Styling

# 4. Update documentation
AGENTS.md             # This file - complete context (ONLY doc file)
```

### Debugging Tips

- **Rate verification**: Manually check A→B→C→A calculations
- **UI state**: Ensure results clear properly between calculations
- **Edge cases**: Test with very small/large amounts, zero values
- **Browser compatibility**: Verify modern JS features work across browsers
- **Cache inspection**: Check `/health` endpoint for cache status
- **Network debugging**: Use browser DevTools Network tab
- **Console logging**: Check browser console for frontend errors
- **Backend logging**: Check `backend/logs/arbitrage.log` for backend errors

---

## 🔧 TROUBLESHOOTING

### Common Issues

#### 1. Currency Loading Failures

**Problem**: Currencies not loading or incomplete data

**Debug**:
```bash
# Test currency discovery
cd backend/services
python poe2scout.py

# Check logs
tail -f ../logs/arbitrage.log | grep "currency"
```

**Solutions**:
- Check internet connection to poe2scout.com
- Verify Playwright browser: `playwright install chromium`
- Reduce `top_percentage`: `?top_percentage=0.5`
- Check cache directory permissions
- Restart backend server

#### 2. Performance Issues

**Problem**: Slow response times or timeouts

**Debug**:
```bash
# Check response time
curl -w "@curl-format.txt" http://localhost:8000/api/arbitrage/...

# Check memory usage
curl http://localhost:8000/health
```

**Solutions**:
- Reduce currency count: `top_percentage=0.6`
- Lower `max_results`: `max_results=5`
- Increase minimum profit: `min_profit=0.02`
- Clear cache: restart backend
- Check system memory usage

#### 3. Browser Automation Failures

**Problem**: Playwright errors or blocked requests

**Debug**:
```python
# Test browser directly
import asyncio
from playwright.async_api import async_playwright

async def test_browser():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        await page.goto("https://poe2scout.com/exchange")
        await page.screenshot(path="debug.png")
        await browser.close()

asyncio.run(test_browser())
```

**Solutions**:
- Update Playwright: `playwright install --force chromium`
- Check firewall/proxy settings
- Try different user agent
- Enable non-headless mode for debugging
- Use fallback rates temporarily

#### 4. Frontend Display Issues

**Problem**: UI not displaying correctly or missing data

**Debug**:
- Open browser DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for failed API requests
- Verify API responses in Network tab

**Solutions**:
- Clear browser cache (Ctrl+Shift+Delete)
- Check API endpoints are responding
- Verify JSON response format
- Test in different browser
- Check CSS loading (Network tab)

#### 5. Deployment Issues (Vercel)

**Problem**: Deployment failing or functions timing out

**Debug**:
```bash
# Check deployment logs
vercel logs

# Test locally with Vercel dev server
vercel dev
```

**Solutions**:
- Check function timeout (30s limit)
- Verify requirements.txt is correct
- Test API endpoints locally first
- Check Vercel dashboard for errors
- Simplify function complexity
- Use fallback rates in production

### Performance Metrics

#### Response Time Targets

| Operation | Target Time | Currency Count | Notes |
|-----------|-------------|----------------|-------|
| `/currencies` | < 500ms | 10-50 | First load may be slower |
| `/arbitrage` | < 2s | 20 currencies | 8,000 path calculations |
| `/arbitrage` | < 5s | 40 currencies | 64,000 path calculations |
| `/rates` | < 300ms | Any | Cached response |

#### Memory Usage Guidelines

| Component | Memory Usage | Notes |
|-----------|--------------|-------|
| Base backend | ~50MB | Without browser |
| Playwright browser | ~100MB | Per browser instance |
| Rate matrix (20 curr) | ~5MB | In-memory cache |
| Rate matrix (40 curr) | ~20MB | Quadratic growth |
| Total system | ~200MB | Production limit |

---

## 🔮 FUTURE ROADMAP

### Planned Features

#### Data & Accuracy
- [ ] Historical rate tracking and trend analysis
- [ ] Multi-exchange data aggregation (beyond POE2Scout)
- [ ] Predictive analytics for market trends
- [ ] Real-time WebSocket data feeds
- [ ] Cross-league arbitrage opportunities

#### Advanced Arbitrage Features
- [ ] Multi-step arbitrage paths (4+, 5+ steps)
- [ ] Risk assessment based on market volatility
- [ ] Volume-weighted profit calculations
- [ ] Favorite currency pair watchlists
- [ ] Export results to CSV/JSON

#### User Experience Improvements
- [ ] Interactive rate relationship visualization charts
- [ ] Official currency icons from PoE2 assets
- [ ] Advanced filtering and sorting options
- [ ] Multiple UI themes (blue, green, purple variants)
- [ ] Keyboard shortcuts for power users
- [ ] User accounts for saved preferences

#### Platform Expansion
- [ ] Mobile app version with push notifications
- [ ] Discord bot integration for trading alerts
- [ ] Browser extension for quick access
- [ ] API authentication and rate limiting
- [ ] Public API for third-party integrations

### Technical Improvements

#### Backend Enhancements
- [ ] Database integration (PostgreSQL) for historical data
- [ ] Redis for distributed caching
- [ ] GraphQL API alongside REST
- [ ] Microservices architecture
- [ ] Horizontal scaling support

#### Frontend Enhancements
- [ ] Progressive Web App (PWA) support
- [ ] Offline mode with cached data
- [ ] Real-time updates via WebSocket
- [ ] Advanced charting library integration
- [ ] Customizable dashboard layouts

---

## 📝 IMPORTANT NOTES FOR AI AGENTS

### Critical Information

1. **Data Source**: Live data from poe2scout.com via HTTP extraction (serverless-compatible)
2. **Currency Discovery**: Dynamic - system finds ALL currencies automatically
3. **Default Configuration**: Top 80% of currencies provides optimal balance
4. **Caching**: 5-minute TTL with background refresh
5. **Fallback**: Static rates used when live data unavailable

### Key Design Decisions

1. **Why Dynamic Currency System?**
   - PoE2 frequently adds new currencies
   - Different leagues have different currency availability
   - User preference for performance vs comprehensiveness

2. **Why Backend-Heavy Architecture?**
   - No CORS issues with server-side fetching
   - Robust error handling and retry logic
   - Easier to test and maintain
   - Better performance with caching

3. **Why Multi-Scale Display?**
   - Different players have different budgets
   - Same opportunity can be profitable at multiple scales
   - Helps new players and whales alike

4. **Why Budget Filtering?**
   - Players want opportunities matching their investment level
   - Reduces information overload
   - More targeted trading recommendations

### Integration Points

1. **POE2Scout.com**: Primary data source (be respectful of their service)
2. **Playwright**: Browser automation (may not work in serverless)
3. **FastAPI**: Backend framework (auto-generates docs)
4. **Vercel**: Deployment platform (serverless functions)

### Maintenance Priorities

1. **Keep AGENTS.md updated**: This is the ONLY documentation file - it must always reflect reality
2. **Single source of truth**: All documentation consolidated here for simplicity
3. **Test across currency percentages**: 10%, 50%, 80%, 100%
4. **Monitor performance**: Response times, memory usage
5. **Update fallback rates**: Periodically update static rates
6. **Check dependencies**: Keep Python packages updated

### Code Quality Standards

1. **Type hints**: Use throughout Python code
2. **Error handling**: Comprehensive try/catch with logging
3. **Documentation**: Docstrings for all functions/classes
4. **Testing**: Unit tests for critical logic
5. **Performance**: Profile before optimizing

### Contact Context

This project was built for Path of Exile 2 players looking to identify currency arbitrage opportunities in the current challenge league. The focus is on **live market data accuracy**, usability, and visual appeal that matches the game's aesthetic.

---

**Last Updated**: October 9, 2025  
**Maintained By**: AI Agents + Human Oversight  
**Version**: 2.0 (Dynamic Currency System)

**Remember**: This is the ONLY documentation file. Always keep it updated when making changes to the project!