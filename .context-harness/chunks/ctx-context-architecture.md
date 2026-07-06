# 🏗️ ARCHITECTURE


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
