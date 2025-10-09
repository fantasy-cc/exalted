from http.server import BaseHTTPRequestHandler
import json
import urllib.parse
import asyncio
import logging
import sys
import os
from typing import Dict, Optional

try:
    import httpx
    HTTPX_AVAILABLE = True
    print("✅ HTTP client available for live data fetching")
except ImportError as e:
    print(f"⚠️ HTTP client not available: {e}")
    HTTPX_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        # Parse path and query parameters
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query_params = urllib.parse.parse_qs(parsed_path.query)
        
        # Route handlers
        if path == '/api/health':
            response = {"status": "healthy", "source": "fallback"}
        elif path == '/api/currencies':
            response = self.handle_currencies_endpoint(query_params)
        elif path.startswith('/api/arbitrage/'):
            # Extract league from path like /api/arbitrage/Rise%20of%20the%20Abyssal
            league = urllib.parse.unquote(path.split('/api/arbitrage/')[-1])
            response = self.handle_arbitrage_endpoint(league, query_params)
        else:
            response = {"message": "PoE2 Arbitrage Calculator API", "path": self.path, "available_endpoints": ["/api/health", "/api/currencies", "/api/arbitrage/{league}"]}
        
        self.wfile.write(json.dumps(response).encode())
    
    def handle_currencies_endpoint(self, query_params):
        """Handle /api/currencies endpoint with query parameters"""
        if HTTPX_AVAILABLE:
            try:
                # Use async handler for live data
                return self.run_async_handler(self._fetch_live_currencies, query_params)
            except Exception as e:
                print(f"⚠️ Live currencies failed: {e}")
        
        # Fallback to static currencies if HTTP client unavailable
        currencies = [
            {"name": "Chaos Orb", "id": "chaos", "key": "chaos", "popularity": 100, "popularity_score": 100.0, "volume": 15000, "pair_count": 25},
            {"name": "Exalted Orb", "id": "exalted", "key": "exalted", "popularity": 95, "popularity_score": 95.0, "volume": 8500, "pair_count": 22},
            {"name": "Divine Orb", "id": "divine", "key": "divine", "popularity": 90, "popularity_score": 90.0, "volume": 5200, "pair_count": 20},
            {"name": "Mirror of Kalandra", "id": "mirror", "key": "mirror", "popularity": 85, "popularity_score": 85.0, "volume": 150, "pair_count": 12},
            {"name": "Orb of Annulment", "id": "orb_annulment", "key": "orb_annulment", "popularity": 80, "popularity_score": 80.0, "volume": 3200, "pair_count": 18},
            {"name": "Jeweller's Orb", "id": "jeweller", "key": "jeweller", "popularity": 75, "popularity_score": 75.0, "volume": 12000, "pair_count": 24},
            {"name": "Ancient Orb", "id": "ancient", "key": "ancient", "popularity": 70, "popularity_score": 70.0, "volume": 2800, "pair_count": 16},
            {"name": "Orb of Fusing", "id": "orb_fusing", "key": "orb_fusing", "popularity": 68, "popularity_score": 68.0, "volume": 9500, "pair_count": 21},
            {"name": "Perfect Exalted Orb", "id": "perfect_exalted", "key": "perfect_exalted", "popularity": 65, "popularity_score": 65.0, "volume": 480, "pair_count": 14},
            {"name": "Greater Exalted Orb", "id": "greater_exalted", "key": "greater_exalted", "popularity": 60, "popularity_score": 60.0, "volume": 720, "pair_count": 15},
        ]
        
        return {
            "currencies": currencies,
            "total": len(currencies),
            "source": "fallback",
            "league": query_params.get('league', ['Standard'])[0],
            "top_percentage": float(query_params.get('top_percentage', ['0.8'])[0]),
            "fetched_at": self.get_current_time(),
            "error": "Backend unavailable - using fallback data"
        }
    
    async def _fetch_live_currencies(self, query_params):
        """Fetch live currency data from poe2scout.com API"""
        league = query_params.get('league', ['Rise of the Abyssal'])[0]
        top_percentage = float(query_params.get('top_percentage', ['0.8'])[0])
        
        print(f"🌐 Fetching LIVE data from poe2scout.com API for {league}")
        
        # Fetch live data from poe2scout's real API
        currency_pairs = await self._fetch_poe2scout_api(league)
        
        if currency_pairs:
            currencies = self._extract_currencies_from_pairs(currency_pairs, top_percentage)
            print(f"✅ Successfully extracted {len(currencies)} currencies from poe2scout.com API")
            
            return {
                "currencies": currencies,
                "total": len(currencies),
                "source": "poe2scout",
                "league": league,
                "top_percentage": top_percentage,
                "fetched_at": self.get_current_time(),
            }
        else:
            raise Exception("Failed to fetch live data from poe2scout.com API")
    
    async def _fetch_poe2scout_api(self, league):
        """Fetch live currency data from poe2scout.com API"""
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(15.0),
                headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; poe2-arbitrage-calculator/1.0)'
                }
            ) as client:
                url = f"https://poe2scout.com/api/currencyExchange/SnapshotPairs?league={league}"
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                print(f"✅ Fetched {len(data)} live currency pairs from poe2scout.com API")
                return data
        except Exception as e:
            print(f"❌ Failed to fetch API data from poe2scout.com: {e}")
            return None
    
    def _extract_currencies_from_pairs(self, currency_pairs, top_percentage):
        """Extract currency list from live poe2scout API currency pairs"""
        from collections import defaultdict
        
        currency_stats = defaultdict(lambda: {
            'name': '',
            'id': '',
            'volume': 0.0,
            'pair_count': 0,
            'icon_url': '',
            'total_traded': 0.0
        })
        
        print(f"🔍 Processing {len(currency_pairs)} live currency pairs from poe2scout API")
        
        # Process each currency pair
        for pair in currency_pairs:
            try:
                # Extract currency one
                curr_one = pair.get('CurrencyOne', {})
                curr_one_data = pair.get('CurrencyOneData', {})
                
                if curr_one.get('apiId'):
                    id1 = curr_one['apiId']
                    currency_stats[id1]['name'] = curr_one.get('text', id1)
                    currency_stats[id1]['id'] = id1
                    currency_stats[id1]['icon_url'] = curr_one.get('iconUrl', '')
                    currency_stats[id1]['volume'] += float(curr_one_data.get('VolumeTraded', 0))
                    currency_stats[id1]['total_traded'] += float(curr_one_data.get('ValueTraded', 0))
                    currency_stats[id1]['pair_count'] += 1
                
                # Extract currency two  
                curr_two = pair.get('CurrencyTwo', {})
                curr_two_data = pair.get('CurrencyTwoData', {})
                
                if curr_two.get('apiId'):
                    id2 = curr_two['apiId']
                    currency_stats[id2]['name'] = curr_two.get('text', id2)
                    currency_stats[id2]['id'] = id2
                    currency_stats[id2]['icon_url'] = curr_two.get('iconUrl', '')
                    currency_stats[id2]['volume'] += float(curr_two_data.get('VolumeTraded', 0))
                    currency_stats[id2]['total_traded'] += float(curr_two_data.get('ValueTraded', 0))
                    currency_stats[id2]['pair_count'] += 1
                    
            except Exception as e:
                print(f"⚠️ Error processing pair: {e}")
                continue
        
        # Convert to list and calculate popularity scores
        currencies = []
        for curr_id, stats in currency_stats.items():
            if stats['pair_count'] > 0:  # Only include currencies with actual trading pairs
                popularity_score = min(100, (stats['volume'] / 100) + (stats['pair_count'] * 2))
                currencies.append({
                    'id': curr_id,
                    'name': stats['name'],
                    'popularity_score': round(popularity_score, 2),
                    'volume': int(stats['volume']),
                    'pair_count': stats['pair_count'],
                    'total_traded': round(stats['total_traded'], 4),
                    'icon_url': stats['icon_url'],
                    'supported': True
                })
        
        # Sort by popularity and take top percentage
        currencies.sort(key=lambda x: x['popularity_score'], reverse=True)
        num_to_take = max(3, int(len(currencies) * top_percentage))
        top_currencies = currencies[:num_to_take]
        
        print(f"✅ Extracted {len(top_currencies)} top currencies (top {top_percentage*100:.0f}%) from {len(currencies)} total")
        return top_currencies
    
    def handle_arbitrage_endpoint(self, league, query_params):
        """Handle /api/arbitrage/{league} endpoint"""
        if HTTPX_AVAILABLE:
            try:
                # Use async handler for live arbitrage calculations
                return self.run_async_handler(self._fetch_live_arbitrage, league, query_params)
            except Exception as e:
                print(f"⚠️ Live arbitrage failed: {e}")
        
        # Fallback arbitrage calculation
        starting_currency = query_params.get('starting_currency', ['chaos'])[0]
        amount = float(query_params.get('amount', ['100'])[0])
        min_profit = float(query_params.get('min_profit', ['0.01'])[0])
        max_results = int(query_params.get('max_results', ['10'])[0])
        
        # Mock arbitrage opportunities based on realistic PoE2 rates
        opportunities = []
        
        # Generate some realistic arbitrage paths
        if starting_currency == 'chaos':
            opportunities = [
                {
                    "path_description": "Chaos Orb → Jeweller's Orb → Ancient Orb → Chaos Orb",
                    "profit_percentage": 2.6,
                    "profit_amount": amount * 0.026,
                    "final_amount": amount * 1.026,
                    "starting_amount": amount,
                    "steps": [
                        {"from_name": "Chaos Orb", "to_name": "Jeweller's Orb", "rate": 0.45, "amount_before": amount, "amount_after": amount * 0.45},
                        {"from_name": "Jeweller's Orb", "to_name": "Ancient Orb", "rate": 1.156, "amount_before": amount * 0.45, "amount_after": amount * 0.45 * 1.156},
                        {"from_name": "Ancient Orb", "to_name": "Chaos Orb", "rate": 1.981, "amount_before": amount * 0.45 * 1.156, "amount_after": amount * 1.026}
                    ]
                },
                {
                    "path_description": "Chaos Orb → Orb of Fusing → Exalted Orb → Chaos Orb",
                    "profit_percentage": 1.8,
                    "profit_amount": amount * 0.018,
                    "final_amount": amount * 1.018,
                    "starting_amount": amount,
                    "steps": [
                        {"from_name": "Chaos Orb", "to_name": "Orb of Fusing", "rate": 0.32, "amount_before": amount, "amount_after": amount * 0.32},
                        {"from_name": "Orb of Fusing", "to_name": "Exalted Orb", "rate": 0.89, "amount_before": amount * 0.32, "amount_after": amount * 0.32 * 0.89},
                        {"from_name": "Exalted Orb", "to_name": "Chaos Orb", "rate": 3.57, "amount_before": amount * 0.32 * 0.89, "amount_after": amount * 1.018}
                    ]
                }
            ]
        # ... other currency fallback logic omitted for brevity
        
        # Filter by minimum profit
        profitable_opportunities = [opp for opp in opportunities if opp['profit_percentage'] >= min_profit * 100]
        
        # Limit results
        limited_opportunities = profitable_opportunities[:max_results]
        
        return {
            "opportunities": limited_opportunities,
            "total_found": len(limited_opportunities),
            "starting_currency": starting_currency,
            "league": league,
            "summary": {
                "best_profit_percentage": max([opp['profit_percentage'] for opp in limited_opportunities], default=0),
                "average_profit_percentage": sum([opp['profit_percentage'] for opp in limited_opportunities]) / len(limited_opportunities) if limited_opportunities else 0,
                "total_opportunities": len(limited_opportunities)
            },
            "data_source": {
                "source": "fallback", 
                "fetched_at": self.get_current_time(),
                "league": league,
                "error": "Backend unavailable - using fallback data"
            }
        }
    
    async def _fetch_live_arbitrage(self, league, query_params):
        """Fetch live arbitrage data from poe2scout.com API"""
        starting_currency = query_params.get('starting_currency', ['chaos'])[0]
        amount = float(query_params.get('amount', ['100'])[0])
        min_profit = float(query_params.get('min_profit', ['0.01'])[0])
        max_results = int(query_params.get('max_results', ['10'])[0])
        
        print(f"🌐 Fetching LIVE arbitrage data from poe2scout.com API for {starting_currency}")
        
        # Fetch live currency pairs from poe2scout API
        currency_pairs = await self._fetch_poe2scout_api(league)
        
        if currency_pairs:
            # Extract exchange rates from API currency pairs
            exchange_rates = self._extract_exchange_rates_from_pairs(currency_pairs)
            
            # Calculate arbitrage opportunities using the live rates
            opportunities = self._calculate_arbitrage_opportunities(
                exchange_rates, starting_currency, amount, min_profit, max_results
            )
            
            print(f"✅ Found {len(opportunities)} arbitrage opportunities using LIVE API data")
            
            return {
                "opportunities": opportunities,
                "total_found": len(opportunities),
                "starting_currency": starting_currency,
                "league": league,
                "summary": {
                    "best_profit_percentage": max([opp['profit_percentage'] for opp in opportunities], default=0),
                    "average_profit_percentage": sum([opp['profit_percentage'] for opp in opportunities]) / len(opportunities) if opportunities else 0,
                    "total_opportunities": len(opportunities)
                },
                "data_source": {
                    "source": "poe2scout",
                    "fetched_at": self.get_current_time(),
                    "league": league
                }
            }
        else:
            raise Exception("Failed to fetch live arbitrage data from poe2scout.com")
    
    def _extract_exchange_rates_from_pairs(self, currency_pairs):
        """Extract exchange rates from live poe2scout API currency pairs"""
        from collections import defaultdict
        
        rates = defaultdict(dict)
        currency_mapping = {}  # Map API IDs to clean names
        
        print(f"🔍 Extracting exchange rates from {len(currency_pairs)} live currency pairs")
        
        # Process currency pairs to build rate matrix
        for pair in currency_pairs:
            try:
                curr_one = pair.get('CurrencyOne', {})
                curr_two = pair.get('CurrencyTwo', {})
                curr_one_data = pair.get('CurrencyOneData', {})
                curr_two_data = pair.get('CurrencyTwoData', {})
                
                id1 = curr_one.get('apiId')
                id2 = curr_two.get('apiId')
                
                if id1 and id2:
                    # Store currency names for mapping
                    currency_mapping[id1] = curr_one.get('text', id1)
                    currency_mapping[id2] = curr_two.get('text', id2)
                    
                    # Extract rates - RelativePrice shows how much of currency two you get for one of currency one
                    price_one_to_two = float(curr_one_data.get('RelativePrice', 0))
                    price_two_to_one = float(curr_two_data.get('RelativePrice', 0))
                    
                    if price_one_to_two > 0:
                        rates[id1][id2] = price_one_to_two
                    if price_two_to_one > 0:
                        rates[id2][id1] = price_two_to_one
                        
            except Exception as e:
                print(f"⚠️ Error processing exchange rate pair: {e}")
                continue
        
        # Convert to regular dict for consistency
        rates_dict = dict(rates)
        print(f"✅ Extracted exchange rates for {len(rates_dict)} currencies with live API data")
        return rates_dict
    
    def _calculate_arbitrage_opportunities(self, rates, starting_currency, amount, min_profit, max_results):
        """Calculate arbitrage opportunities from exchange rates"""
        opportunities = []
        
        # Simple arbitrage calculation - this is a basic implementation
        # In production, you'd want the full arbitrage algorithm
        if starting_currency == 'chaos' and 'chaos' in rates:
            chaos_rates = rates['chaos']
            
            # Example opportunity: Chaos → Exalted → Divine → Chaos
            if 'exalted' in chaos_rates and 'exalted' in rates and 'divine' in rates['exalted'] and 'divine' in rates and 'chaos' in rates['divine']:
                step1_amount = amount * chaos_rates['exalted']  # Chaos to Exalted
                step2_amount = step1_amount * rates['exalted']['divine']  # Exalted to Divine
                final_amount = step2_amount * rates['divine']['chaos']  # Divine back to Chaos
                
                profit = final_amount - amount
                profit_pct = (profit / amount) * 100 if amount > 0 else 0
                
                if profit_pct >= min_profit * 100:
                    opportunities.append({
                        "path_description": "Chaos Orb → Exalted Orb → Divine Orb → Chaos Orb",
                        "profit_percentage": profit_pct,
                        "profit_amount": profit,
                        "final_amount": final_amount,
                        "starting_amount": amount,
                        "steps": [
                            {"from_name": "Chaos Orb", "to_name": "Exalted Orb", "rate": chaos_rates['exalted'], "amount_before": amount, "amount_after": step1_amount},
                            {"from_name": "Exalted Orb", "to_name": "Divine Orb", "rate": rates['exalted']['divine'], "amount_before": step1_amount, "amount_after": step2_amount},
                            {"from_name": "Divine Orb", "to_name": "Chaos Orb", "rate": rates['divine']['chaos'], "amount_before": step2_amount, "amount_after": final_amount}
                        ]
                    })
        
        return opportunities[:max_results]
    
    def run_async_handler(self, coro_func, *args):
        """Run an async function in the synchronous context"""
        try:
            # Create new event loop for this request
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(coro_func(*args))
                return result
            finally:
                loop.close()
        except Exception as e:
            print(f"Async handler error: {e}")
            raise
    
    def get_current_time(self):
        """Get current time in ISO format"""
        import time
        return time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
