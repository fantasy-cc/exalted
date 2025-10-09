"""
Static Data API for PoE2 Arbitrage Calculator

This module provides functions to read currency data from static JSON files
that are populated by the GitHub Actions scraper.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# Get the directory where this file is located
API_DIR = Path(__file__).parent
DATA_DIR = API_DIR / 'data'


def load_currencies() -> Dict:
    """
    Load currency data from currencies.json
    
    Returns:
        Dict with currencies list and metadata
    """
    currencies_file = DATA_DIR / 'currencies.json'
    
    if not currencies_file.exists():
        # Return minimal fallback data
        return {
            'currencies': [
                {'id': 'chaos', 'name': 'Chaos Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True},
                {'id': 'exalted', 'name': 'Exalted Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True},
                {'id': 'divine', 'name': 'Divine Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True}
            ],
            'total': 3,
            'source': 'fallback',
            'league': 'Rise of the Abyssal',
            'fetched_at': datetime.utcnow().isoformat() + 'Z'
        }
    
    try:
        with open(currencies_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading currencies: {e}")
        # Return minimal fallback
        return {
            'currencies': [
                {'id': 'chaos', 'name': 'Chaos Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True},
                {'id': 'exalted', 'name': 'Exalted Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True},
                {'id': 'divine', 'name': 'Divine Orb', 'volume': 15000, 'pair_count': 25, 'popularity_score': 100.0, 'supported': True}
            ],
            'total': 3,
            'source': 'fallback',
            'league': 'Rise of the Abyssal',
            'fetched_at': datetime.utcnow().isoformat() + 'Z'
        }


def load_rates() -> Dict:
    """
    Load exchange rate data from rates.json
    
    Returns:
        Dict with rates and metadata
    """
    rates_file = DATA_DIR / 'rates.json'
    
    if not rates_file.exists():
        # Return minimal fallback data
        return {
            'rates': {
                'chaos': {'exalted': 0.268, 'divine': 0.0302},
                'exalted': {'chaos': 3.73, 'divine': 0.112},
                'divine': {'chaos': 33.09, 'exalted': 8.93}
            },
            'metadata': {
                'source': 'fallback',
                'league': 'Rise of the Abyssal',
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'ttl_seconds': 300,
                'total_pairs': 6
            }
        }
    
    try:
        with open(rates_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading rates: {e}")
        # Return minimal fallback
        return {
            'rates': {
                'chaos': {'exalted': 0.268, 'divine': 0.0302},
                'exalted': {'chaos': 3.73, 'divine': 0.112},
                'divine': {'chaos': 33.09, 'exalted': 8.93}
            },
            'metadata': {
                'source': 'fallback',
                'league': 'Rise of the Abyssal',
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'ttl_seconds': 300,
                'total_pairs': 6
            }
        }


def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    """
    Get exchange rate between two currencies
    
    Args:
        from_currency: Source currency ID
        to_currency: Target currency ID
        
    Returns:
        Exchange rate, or 0 if not found
    """
    rates_data = load_rates()
    rates = rates_data.get('rates', {})
    
    # Direct rate
    if from_currency in rates and to_currency in rates[from_currency]:
        return rates[from_currency][to_currency]
    
    # Inverse rate
    if to_currency in rates and from_currency in rates[to_currency]:
        inverse_rate = rates[to_currency][from_currency]
        return 1.0 / inverse_rate if inverse_rate > 0 else 0
    
    return 0


def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    """
    Convert an amount from one currency to another
    
    Args:
        amount: Amount to convert
        from_currency: Source currency ID
        to_currency: Target currency ID
        
    Returns:
        Converted amount
    """
    if from_currency == to_currency:
        return amount
    
    rate = get_exchange_rate(from_currency, to_currency)
    return amount * rate if rate > 0 else 0


def find_arbitrage_opportunities(
    starting_currency: str,
    amount: float = 100.0,
    min_profit: float = 0.01
) -> List[Dict]:
    """
    Find 3-step arbitrage opportunities
    
    Args:
        starting_currency: Currency to start with
        amount: Amount to start with
        min_profit: Minimum profit percentage (0.01 = 1%)
        
    Returns:
        List of arbitrage opportunities
    """
    currencies_data = load_currencies()
    rates_data = load_rates()
    
    currencies = [c['id'] for c in currencies_data.get('currencies', [])]
    rates = rates_data.get('rates', {})
    
    opportunities = []
    
    # Try all 3-step paths: A → B → C → A
    for currency_b in currencies:
        if currency_b == starting_currency:
            continue
            
        for currency_c in currencies:
            if currency_c == starting_currency or currency_c == currency_b:
                continue
            
            # Calculate the path
            # Step 1: starting_currency → currency_b
            rate_ab = get_exchange_rate(starting_currency, currency_b)
            if rate_ab <= 0:
                continue
            amount_b = amount * rate_ab
            
            # Step 2: currency_b → currency_c
            rate_bc = get_exchange_rate(currency_b, currency_c)
            if rate_bc <= 0:
                continue
            amount_c = amount_b * rate_bc
            
            # Step 3: currency_c → starting_currency
            rate_ca = get_exchange_rate(currency_c, starting_currency)
            if rate_ca <= 0:
                continue
            final_amount = amount_c * rate_ca
            
            # Calculate profit
            profit = final_amount - amount
            profit_percentage = (profit / amount) if amount > 0 else 0
            
            # Check if profitable
            if profit_percentage >= min_profit:
                # Get currency names
                currency_names = {c['id']: c['name'] for c in currencies_data.get('currencies', [])}
                
                opportunities.append({
                    'path': [starting_currency, currency_b, currency_c, starting_currency],
                    'path_description': f"{currency_names.get(starting_currency, starting_currency)} → {currency_names.get(currency_b, currency_b)} → {currency_names.get(currency_c, currency_c)} → {currency_names.get(starting_currency, starting_currency)}",
                    'starting_amount': amount,
                    'final_amount': round(final_amount, 4),
                    'profit_amount': round(profit, 4),
                    'profit_percentage': round(profit_percentage * 100, 2),
                    'steps': [
                        {
                            'from': starting_currency,
                            'to': currency_b,
                            'rate': rate_ab,
                            'amount_in': amount,
                            'amount_out': round(amount_b, 4)
                        },
                        {
                            'from': currency_b,
                            'to': currency_c,
                            'rate': rate_bc,
                            'amount_in': round(amount_b, 4),
                            'amount_out': round(amount_c, 4)
                        },
                        {
                            'from': currency_c,
                            'to': starting_currency,
                            'rate': rate_ca,
                            'amount_in': round(amount_c, 4),
                            'amount_out': round(final_amount, 4)
                        }
                    ]
                })
    
    # Sort by profit percentage
    opportunities.sort(key=lambda x: x['profit_percentage'], reverse=True)
    
    return opportunities


if __name__ == "__main__":
    # Test the functions
    print("Testing static data loading...")
    
    currencies = load_currencies()
    print(f"\n✅ Loaded {len(currencies.get('currencies', []))} currencies")
    
    rates = load_rates()
    print(f"✅ Loaded {rates['metadata']['total_pairs']} exchange rates")
    
    # Test conversion
    chaos_to_exalted = get_exchange_rate('chaos', 'exalted')
    print(f"\n💱 1 Chaos = {chaos_to_exalted} Exalted")
    
    # Test arbitrage
    opportunities = find_arbitrage_opportunities('chaos', 100.0, 0.01)
    print(f"\n📈 Found {len(opportunities)} arbitrage opportunities")
    if opportunities:
        best = opportunities[0]
        print(f"   Best: {best['path_description']} (+{best['profit_percentage']}%)")

