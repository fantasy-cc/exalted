"""
Simple Vercel API for PoE2 Arbitrage Calculator
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json

app = FastAPI(title="PoE2 Arbitrage Calculator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fallback currency data
FALLBACK_CURRENCIES = [
    {"name": "Chaos Orb", "key": "chaos", "popularity": 100},
    {"name": "Exalted Orb", "key": "exalted", "popularity": 95},
    {"name": "Divine Orb", "key": "divine", "popularity": 90},
    {"name": "Orb of Fusing", "key": "fusing", "popularity": 85},
    {"name": "Jeweller's Orb", "key": "jeweller", "popularity": 80},
    {"name": "Ancient Orb", "key": "ancient", "popularity": 75},
]

# Fallback rates
FALLBACK_RATES = {
    'chaos': {
        'exalted': 0.268,
        'divine': 0.0302,
        'fusing': 0.5,
        'jeweller': 2.0,
        'ancient': 0.8,
    },
    'exalted': {
        'chaos': 3.73,
        'divine': 0.112,
        'fusing': 1.865,
        'jeweller': 7.46,
        'ancient': 2.98,
    },
    'divine': {
        'chaos': 33.09,
        'exalted': 8.93,
        'fusing': 16.545,
        'jeweller': 66.18,
        'ancient': 26.47,
    },
    'fusing': {
        'chaos': 2.0,
        'exalted': 0.536,
        'divine': 0.0604,
        'jeweller': 4.0,
        'ancient': 1.6,
    },
    'jeweller': {
        'chaos': 0.5,
        'exalted': 0.134,
        'divine': 0.0151,
        'fusing': 0.25,
        'ancient': 0.4,
    },
    'ancient': {
        'chaos': 1.25,
        'exalted': 0.335,
        'divine': 0.0378,
        'fusing': 0.625,
        'jeweller': 2.5,
    }
}

@app.get("/")
async def root():
    return {"message": "PoE2 Arbitrage Calculator API", "status": "running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "source": "fallback"}

@app.get("/api/currencies")
async def get_currencies():
    """Get list of supported currencies"""
    return {
        "currencies": FALLBACK_CURRENCIES,
        "total": len(FALLBACK_CURRENCIES),
        "source": "fallback"
    }

@app.get("/api/rates/{league}")
async def get_rates(league: str):
    """Get exchange rates for a league"""
    return {
        "rates": FALLBACK_RATES,
        "league": league,
        "source": "fallback"
    }

@app.get("/api/arbitrage/{league}")
async def find_arbitrage(
    league: str,
    starting_currency: str = "chaos",
    amount: int = 100,
    min_profit: float = 1.0
):
    """Find arbitrage opportunities"""
    
    # Simple arbitrage calculation
    opportunities = []
    
    if starting_currency in FALLBACK_RATES:
        rates = FALLBACK_RATES[starting_currency]
        
        for currency_b in rates:
            if currency_b == starting_currency:
                continue
                
            rate_a_to_b = rates[currency_b]
            amount_b = amount * rate_a_to_b
            
            if currency_b in FALLBACK_RATES:
                for currency_c in FALLBACK_RATES[currency_b]:
                    if currency_c == currency_b or currency_c == starting_currency:
                        continue
                        
                    rate_b_to_c = FALLBACK_RATES[currency_b][currency_c]
                    amount_c = amount_b * rate_b_to_c
                    
                    if currency_c in FALLBACK_RATES and starting_currency in FALLBACK_RATES[currency_c]:
                        rate_c_to_a = FALLBACK_RATES[currency_c][starting_currency]
                        final_amount = amount_c * rate_c_to_a
                        
                        profit = final_amount - amount
                        profit_percent = (profit / amount) * 100
                        
                        if profit_percent >= min_profit:
                            opportunities.append({
                                "path": f"{starting_currency} → {currency_b} → {currency_c} → {starting_currency}",
                                "profit_percent": round(profit_percent, 2),
                                "profit_amount": round(profit, 2),
                                "final_amount": round(final_amount, 2),
                                "steps": [
                                    {"from": starting_currency, "to": currency_b, "rate": rate_a_to_b, "amount": round(amount_b, 2)},
                                    {"from": currency_b, "to": currency_c, "rate": rate_b_to_c, "amount": round(amount_c, 2)},
                                    {"from": currency_c, "to": starting_currency, "rate": rate_c_to_a, "amount": round(final_amount, 2)}
                                ]
                            })
    
    # Sort by profit percentage
    opportunities.sort(key=lambda x: x["profit_percent"], reverse=True)
    
    return {
        "opportunities": opportunities[:10],  # Top 10
        "total_found": len(opportunities),
        "starting_currency": starting_currency,
        "amount": amount,
        "min_profit": min_profit,
        "league": league,
        "source": "fallback"
    }

# Vercel handler
handler = app
