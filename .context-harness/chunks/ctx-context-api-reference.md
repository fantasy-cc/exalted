# 📡 API REFERENCE


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
