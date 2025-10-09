"""
Vercel serverless function entry point for PoE2 Arbitrage Calculator
Simplified version with inline FastAPI app
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import json
import urllib.request
from typing import Dict, List

# GitHub raw content URLs
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/fantasy-cc/exalted/main/api/data"
CURRENCIES_URL = f"{GITHUB_RAW_BASE}/currencies.json"
RATES_URL = f"{GITHUB_RAW_BASE}/rates.json"

# Create FastAPI app
app = FastAPI(title="PoE2 Arbitrage API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_currencies_from_github():
    """Load currencies from GitHub"""
    try:
        with urllib.request.urlopen(CURRENCIES_URL, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        # Fallback data
        return {
            'currencies': [
                {'id': 'chaos', 'name': 'Chaos Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True},
                {'id': 'exalted', 'name': 'Exalted Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True},
                {'id': 'divine', 'name': 'Divine Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True}
            ],
            'total': 3,
            'source': 'fallback',
            'fetched_at': '2025-10-09T00:00:00Z'
        }

@app.get("/")
async def root():
    return {"message": "PoE2 Arbitrage API", "status": "operational"}

@app.get("/api/health")
async def health():
    data = load_currencies_from_github()
    return {
        "status": "healthy",
        "currencies_count": data.get('total', 0),
        "data_source": data.get('source', 'unknown'),
        "last_update": data.get('fetched_at', 'unknown')
    }

@app.get("/api/currencies")
async def get_currencies():
    data = load_currencies_from_github()
    return {
        "currencies": data.get('currencies', []),
        "total": data.get('total', 0),
        "source": data.get('source', 'github'),
        "league": "Rise of the Abyssal",
        "fetched_at": data.get('fetched_at', 'unknown')
    }

# Vercel handler
handler = app
