"""
Minimal Vercel API for PoE2 Arbitrage Calculator
"""
import json

# Fallback currency data
CURRENCIES = [
    {"name": "Chaos Orb", "key": "chaos", "popularity": 100},
    {"name": "Exalted Orb", "key": "exalted", "popularity": 95},
    {"name": "Divine Orb", "key": "divine", "popularity": 90},
    {"name": "Orb of Fusing", "key": "fusing", "popularity": 85},
    {"name": "Jeweller's Orb", "key": "jeweller", "popularity": 80},
    {"name": "Ancient Orb", "key": "ancient", "popularity": 75},
]

# Fallback rates
RATES = {
    'chaos': {'exalted': 0.268, 'divine': 0.0302, 'fusing': 0.5, 'jeweller': 2.0, 'ancient': 0.8},
    'exalted': {'chaos': 3.73, 'divine': 0.112, 'fusing': 1.865, 'jeweller': 7.46, 'ancient': 2.98},
    'divine': {'chaos': 33.09, 'exalted': 8.93, 'fusing': 16.545, 'jeweller': 66.18, 'ancient': 26.47},
    'fusing': {'chaos': 2.0, 'exalted': 0.536, 'divine': 0.0604, 'jeweller': 4.0, 'ancient': 1.6},
    'jeweller': {'chaos': 0.5, 'exalted': 0.134, 'divine': 0.0151, 'fusing': 0.25, 'ancient': 0.4},
    'ancient': {'chaos': 1.25, 'exalted': 0.335, 'divine': 0.0378, 'fusing': 0.625, 'jeweller': 2.5},
}

def handler(request, response):
    """Vercel handler function"""
    
    # Set CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    
    if request.method == 'OPTIONS':
        response.status_code = 200
        return
    
    path = request.path
    
    if path == '/api/health':
        response.status_code = 200
        response.headers['Content-Type'] = 'application/json'
        return json.dumps({"status": "healthy", "source": "fallback"})
    
    elif path == '/api/currencies':
        response.status_code = 200
        response.headers['Content-Type'] = 'application/json'
        return json.dumps({
            "currencies": CURRENCIES,
            "total": len(CURRENCIES),
            "source": "fallback"
        })
    
    elif path.startswith('/api/rates/'):
        response.status_code = 200
        response.headers['Content-Type'] = 'application/json'
        league = path.split('/')[-1]
        return json.dumps({
            "rates": RATES,
            "league": league,
            "source": "fallback"
        })
    
    elif path.startswith('/api/arbitrage/'):
        # Simple arbitrage calculation
        opportunities = []
        starting_currency = "chaos"
        amount = 100
        
        if starting_currency in RATES:
            rates = RATES[starting_currency]
            
            for currency_b in rates:
                if currency_b == starting_currency:
                    continue
                    
                rate_a_to_b = rates[currency_b]
                amount_b = amount * rate_a_to_b
                
                if currency_b in RATES:
                    for currency_c in RATES[currency_b]:
                        if currency_c == currency_b or currency_c == starting_currency:
                            continue
                            
                        rate_b_to_c = RATES[currency_b][currency_c]
                        amount_c = amount_b * rate_b_to_c
                        
                        if currency_c in RATES and starting_currency in RATES[currency_c]:
                            rate_c_to_a = RATES[currency_c][starting_currency]
                            final_amount = amount_c * rate_c_to_a
                            
                            profit = final_amount - amount
                            profit_percent = (profit / amount) * 100
                            
                            if profit_percent >= 1.0:  # Min 1% profit
                                opportunities.append({
                                    "path": f"{starting_currency} → {currency_b} → {currency_c} → {starting_currency}",
                                    "profit_percent": round(profit_percent, 2),
                                    "profit_amount": round(profit, 2),
                                    "final_amount": round(final_amount, 2)
                                })
        
        # Sort by profit percentage
        opportunities.sort(key=lambda x: x["profit_percent"], reverse=True)
        
        response.status_code = 200
        response.headers['Content-Type'] = 'application/json'
        return json.dumps({
            "opportunities": opportunities[:10],
            "total_found": len(opportunities),
            "starting_currency": starting_currency,
            "amount": amount,
            "source": "fallback"
        })
    
    else:
        response.status_code = 404
        response.headers['Content-Type'] = 'application/json'
        return json.dumps({"error": "Not found"})
