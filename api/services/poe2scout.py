"""
POE2 Scout Data Service

This service handles fetching live currency data from poe2scout.com
without needing a CORS proxy since it runs server-side.
"""

import re
import logging
import json
from typing import Dict, Optional, Tuple, List
from datetime import datetime
import httpx
import asyncio

# Try to import playwright for browser automation
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("⚠️  Playwright not available. Install with: pip install playwright")

try:
    from ..models.rates import CurrencyRateMatrix, RateMetadata
except ImportError:
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from models.rates import CurrencyRateMatrix, RateMetadata


class POE2ScoutService:
    """
    Service for fetching currency exchange rates from POE2 Scout.
    
    Benefits of server-side approach:
    - No CORS issues
    - Better error handling and retries  
    - Centralized caching
    - Rate limiting protection
    """
    
    BASE_URL = "https://poe2scout.com/exchange"
    TIMEOUT = 10.0  # 10 second timeout
    MAX_RETRIES = 3
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.session = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = httpx.AsyncClient(
            timeout=httpx.Timeout(self.TIMEOUT),
            headers={
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; poe2-arbitrage-backend/1.0)'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.aclose()
    
    async def fetch_currency_rates(self, league: str = "Rise of the Abyssal", 
                                   top_percentage: float = 0.8) -> CurrencyRateMatrix:
        """
        Fetch current currency rates from POE2 Scout.
        
        Args:
            league: POE2 league name
            top_percentage: Percentage of top currencies to include (0.8 = top 80%)
            
        Returns:
            CurrencyRateMatrix with current rates
            
        Raises:
            httpx.RequestError: Network/HTTP errors
            ValueError: Data parsing errors
        """
        # LIVE DATA ONLY - Try multiple approaches for live data
        
        # Approach 1: Browser automation (preferred when available)
        if PLAYWRIGHT_AVAILABLE:
            try:
                self.logger.info("🎭 Using browser automation for live data extraction")
                raw_rates, currency_metadata = await self._fetch_with_browser()
                
                if len(raw_rates) >= 3:
                    self.logger.info(f"✅ Browser automation successful: {len(raw_rates)} currency pairs extracted")
                    return self._build_rate_matrix(raw_rates, league, currency_metadata, top_percentage)
                else:
                    self.logger.warning(f"⚠️ Browser automation extracted insufficient data: {len(raw_rates)} pairs (need ≥3). Trying HTTP approach.")
                    
            except Exception as e:
                self.logger.warning(f"⚠️ Browser automation failed: {str(e)}. Trying HTTP approach.")
        else:
            self.logger.info("🌐 Playwright not available in serverless environment. Using HTTP-based live data extraction.")
        
        # Approach 2: HTTP-based live data extraction (serverless-friendly)
        try:
            self.logger.info("🌐 Using HTTP-based live data extraction from poe2scout.com")
            raw_rates, currency_metadata = await self._fetch_with_http()
            
            if len(raw_rates) >= 3:
                self.logger.info(f"✅ HTTP extraction successful: {len(raw_rates)} currency pairs extracted")
                return self._build_rate_matrix(raw_rates, league, currency_metadata, top_percentage)
            else:
                raise ValueError(f"❌ HTTP extraction extracted insufficient data: {len(raw_rates)} pairs (need ≥3)")
                
        except Exception as e:
            self.logger.error(f"❌ HTTP-based live data extraction failed: {str(e)}")
            raise ValueError(f"Live data extraction failed via both browser and HTTP methods: {str(e)}. No fallback available - live data only mode.")
    
    async def _fetch_html_with_retry(self) -> str:
        """Fetch HTML with retry logic"""
        last_error = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                self.logger.debug(f"Fetching POE2 Scout data (attempt {attempt + 1}/{self.MAX_RETRIES})")
                
                response = await self.session.get(self.BASE_URL)
                response.raise_for_status()
                
                return response.text
                
            except httpx.RequestError as e:
                last_error = e
                self.logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(1.0 * (attempt + 1))  # Exponential backoff
        
        raise last_error or httpx.RequestError("All retry attempts failed")
    
    def _parse_trading_pairs(self, html: str) -> Dict[str, Dict[str, float]]:
        """
        Parse trading pairs from POE2 Scout HTML.
        
        Returns:
            Dict of direct trading pairs: {from_currency: {to_currency: rate}}
        """
        rates = {}
        
        # Comprehensive mapping of POE2Scout names to our internal currency keys
        name_to_key_mapping = {
            # Core currencies
            'Divine Orb': 'divine',
            'Exalted Orb': 'exalted', 
            'Chaos Orb': 'chaos',
            
            # Popular currencies
            'Mirror of Kalandra': 'mirror',
            'Perfect Exalted Orb': 'perfect_exalted',
            'Orb of Annulment': 'orb_annulment',
            'Orb of Chance': 'orb_chance',
            'Perfect Chaos Orb': 'perfect_chaos',
            'Fracturing Orb': 'fracturing_orb',
            'Greater Exalted Orb': 'greater_exalted',
            "Perfect Jeweller's Orb": 'perfect_jeweller',
            'Uncut Skill Gem (Level 20)': 'uncut_gem_20',
            
            # Omens
            'Omen of Light': 'omen_light',
            'Omen of Homogenising Exaltation': 'omen_homogenising',
            'Omen of Abyssal Echoes': 'omen_abyssal',
            'Omen of Whittling': 'omen_whittling',
            'Omen of Chaotic Rarity': 'omen_chaotic',
            'Omen of Amelioration': 'omen_amelioration',
            
            # Special items
            "Rakiata's Flow": 'rakiata_flow',
            'Talisman of Sirrius': 'talisman_sirrius',
            "Hinekora's Lock": 'hinekora_lock',
            "Farrul's Rune of the Chase": 'farrul_rune',
            "Atalui's Bloodletting": 'atalui_bloodletting'
        }
        
        # Priority trading pairs (highest volume pairs to extract first)
        priority_pairs = [
            ('Divine Orb', 'Exalted Orb'),
            ('Divine Orb', 'Chaos Orb'),
            ('Chaos Orb', 'Exalted Orb'),
            ('Mirror of Kalandra', 'Divine Orb'),
            ('Perfect Exalted Orb', 'Exalted Orb'),
            ('Orb of Annulment', 'Exalted Orb'),
            ('Omen of Light', 'Exalted Orb'),
            ('Omen of Light', 'Divine Orb'),
        ]
        
        extracted_count = 0
        
        # First, extract the priority high-volume pairs
        for from_name, to_name in priority_pairs:
            if from_name in name_to_key_mapping and to_name in name_to_key_mapping:
                from_key = name_to_key_mapping[from_name]
                to_key = name_to_key_mapping[to_name]
                
                rate = self._extract_trading_pair_rate(html, from_name, to_name)
                if rate and rate > 0:
                    if from_key not in rates:
                        rates[from_key] = {}
                    rates[from_key][to_key] = rate
                    extracted_count += 1
                    
                    self.logger.debug(f"Extracted: {from_name} → {to_name} = {rate}")
        
        # Then try to extract additional pairs from any currency to Exalted (most liquid)
        for currency_name, currency_key in name_to_key_mapping.items():
            if currency_key not in ['exalted']:  # Don't extract Exalted -> Exalted
                rate = self._extract_trading_pair_rate(html, currency_name, 'Exalted Orb')
                if rate and rate > 0:
                    if currency_key not in rates:
                        rates[currency_key] = {}
                    rates[currency_key]['exalted'] = rate
                    extracted_count += 1
                    
                    self.logger.debug(f"Extracted: {currency_name} → Exalted Orb = {rate}")
        
        # Also try Divine Orb pairs (second most liquid)
        for currency_name, currency_key in name_to_key_mapping.items():
            if currency_key not in ['divine']:  # Don't extract Divine -> Divine
                rate = self._extract_trading_pair_rate(html, currency_name, 'Divine Orb')
                if rate and rate > 0:
                    if currency_key not in rates:
                        rates[currency_key] = {}
                    rates[currency_key]['divine'] = rate
                    extracted_count += 1
                    
                    self.logger.debug(f"Extracted: {currency_name} → Divine Orb = {rate}")
        
        self.logger.info(f"Successfully extracted {extracted_count} trading pairs from POE2Scout")
        
        if extracted_count < 3:
            raise ValueError(f"Could not extract sufficient trading pairs. Got {extracted_count}, need at least 3.")
        
        return rates
    
    def _extract_trading_pair_rate(self, html: str, from_currency: str, to_currency: str) -> Optional[float]:
        """
        Extract a specific trading pair rate from HTML.
        
        POE2Scout uses this structure:
        <td>Divine Orb Divine Orb / Exalted Orb Exalted Orb</td>
        <td>1.00 = 139.48</td>
        """
        try:
            # Pattern 1: Direct pair (from -> to)
            pair_pattern = rf'{re.escape(from_currency)}.*?/.*?{re.escape(to_currency)}'
            pair_matches = list(re.finditer(pair_pattern, html, re.DOTALL | re.IGNORECASE))
            
            for pair_match in pair_matches:
                # Look for rate pattern after this pair match
                remaining_html = html[pair_match.end():pair_match.end() + 500]  # Look ahead 500 chars
                rate_pattern = r'1\.00.*?=.*?([0-9]+(?:\.[0-9]+)?)'
                rate_match = re.search(rate_pattern, remaining_html)
                
                if rate_match:
                    rate_str = rate_match.group(1)
                    self.logger.debug(f"Found direct rate {from_currency} -> {to_currency}: {rate_str}")
                    return float(rate_str)
            
            # Pattern 2: Reverse pair (to -> from) - need to invert
            pair_pattern = rf'{re.escape(to_currency)}.*?/.*?{re.escape(from_currency)}'
            pair_matches = list(re.finditer(pair_pattern, html, re.DOTALL | re.IGNORECASE))
            
            for pair_match in pair_matches:
                # Look for rate pattern after this pair match
                remaining_html = html[pair_match.end():pair_match.end() + 500]  # Look ahead 500 chars
                rate_pattern = r'1\.00.*?=.*?([0-9]+(?:\.[0-9]+)?)'
                rate_match = re.search(rate_pattern, remaining_html)
                
                if rate_match:
                    rate_str = rate_match.group(1)
                    rate = 1.0 / float(rate_str)  # Invert the rate
                    self.logger.debug(f"Found inverse rate {to_currency} -> {from_currency}: {rate_str}, inverted to: {rate}")
                    return rate
            
            # Pattern 3: Try a more flexible approach - look for both currencies anywhere in a trading row
            # This catches cases where exact names don't match
            flexible_pattern = rf'(?=.*{re.escape(from_currency.lower())})(?=.*{re.escape(to_currency.lower())}).*?1\.00.*?=.*?([0-9]+(?:\.[0-9]+)?)'
            match = re.search(flexible_pattern, html.lower(), re.DOTALL)
            
            if match:
                rate_str = match.group(1)
                self.logger.debug(f"Found flexible rate {from_currency} <-> {to_currency}: {rate_str}")
                return float(rate_str)
                
        except (ValueError, AttributeError) as e:
            self.logger.warning(f"Failed to parse rate for {from_currency}/{to_currency}: {str(e)}")
        
        self.logger.debug(f"No rate found for {from_currency} -> {to_currency}")
        return None
    
    async def _fetch_with_http(self) -> Tuple[Dict[str, Dict[str, float]], Dict[str, Dict]]:
        """
        Use HTTP requests to fetch live data from POE2Scout.com.
        This is a serverless-friendly approach that works without browser automation.
        
        Returns:
            Tuple of (exchange_rates, currency_metadata) where currency_metadata contains
            basic information about discovered currencies.
        """
        extracted_rates = {}
        currency_metadata = {}
        
        try:
            # Fetch the HTML content
            html_content = await self._fetch_html_with_retry()
            self.logger.debug(f"Fetched {len(html_content)} characters of HTML content")
            
            # Parse trading pairs from HTML
            raw_trading_pairs = self._parse_trading_pairs(html_content)
            self.logger.info(f"🌐 HTTP extraction found {len(raw_trading_pairs)} raw trading pairs")
            
            # Convert to our format and build metadata
            pair_count = 0
            for from_currency, to_rates in raw_trading_pairs.items():
                # Map currency names to our internal keys
                from_key = self._map_currency_name_dynamic(from_currency)
                if not from_key:
                    continue
                
                # Add to metadata
                if from_key not in currency_metadata:
                    currency_metadata[from_key] = {
                        'name': from_currency,
                        'key': from_key,
                        'total_volume': 0,  # Not available via HTTP parsing
                        'pair_count': 0,
                        'popularity_score': 50.0,  # Default score for HTTP-discovered currencies
                        'source': 'http'
                    }
                
                for to_currency, rate in to_rates.items():
                    to_key = self._map_currency_name_dynamic(to_currency)
                    if not to_key or from_key == to_key:
                        continue
                    
                    # Add to extracted rates
                    if from_key not in extracted_rates:
                        extracted_rates[from_key] = {}
                    extracted_rates[from_key][to_key] = rate
                    
                    # Update metadata
                    if to_key not in currency_metadata:
                        currency_metadata[to_key] = {
                            'name': to_currency,
                            'key': to_key,
                            'total_volume': 0,
                            'pair_count': 0,
                            'popularity_score': 50.0,
                            'source': 'http'
                        }
                    
                    currency_metadata[from_key]['pair_count'] += 1
                    currency_metadata[to_key]['pair_count'] += 1
                    pair_count += 1
                    
                    self.logger.debug(f"HTTP mapped: {from_currency} ({from_key}) -> {to_currency} ({to_key}) = {rate}")
            
            # Assign popularity scores based on pair count (more pairs = more popular)
            max_pairs = max([meta['pair_count'] for meta in currency_metadata.values()], default=1)
            for currency_key, metadata in currency_metadata.items():
                # Score based on how many trading pairs this currency appears in
                pair_score = (metadata['pair_count'] / max_pairs) * 100
                # Core currencies get bonus points
                if currency_key in ['exalted', 'divine', 'chaos']:
                    pair_score += 25
                metadata['popularity_score'] = min(100.0, pair_score)
            
            self.logger.info(f"🌐 HTTP extraction successful: {len(extracted_rates)} currency pairs, {len(currency_metadata)} currencies discovered")
            
            # Log top currencies by popularity
            sorted_currencies = sorted(
                currency_metadata.items(), 
                key=lambda x: x[1]['popularity_score'], 
                reverse=True
            )
            self.logger.info("🏆 Top HTTP-discovered currencies:")
            for i, (currency_key, metadata) in enumerate(sorted_currencies[:5]):
                self.logger.info(
                    f"  {i+1}. {metadata['name']} ({currency_key}): "
                    f"pairs={metadata['pair_count']}, "
                    f"score={metadata['popularity_score']:.1f}"
                )
            
            return extracted_rates, currency_metadata
            
        except Exception as e:
            self.logger.error(f"❌ HTTP-based live data extraction failed: {str(e)}")
            raise ValueError(f"Failed to extract live data via HTTP: {str(e)}")
    
    async def _fetch_with_browser(self) -> Tuple[Dict[str, Dict[str, float]], Dict[str, Dict]]:
        """
        Use browser automation to fetch live data from POE2Scout.com.
        This handles JavaScript-loaded content that static HTML parsing can't access.
        
        Returns:
            Tuple of (exchange_rates, currency_metadata) where currency_metadata contains
            volume and popularity information for dynamic currency discovery.
        """
        if not PLAYWRIGHT_AVAILABLE:
            self.logger.warning("⚠️  Playwright not available. Using fallback data.")
            return {}, {}
        
        extracted_rates = {}
        currency_metadata = {}
        
        async with async_playwright() as p:
            # Launch browser in headless mode
            browser = await p.chromium.launch(headless=True)
            
            try:
                page = await browser.new_page()
                
                # Set user agent to look like a real browser
                await page.set_extra_http_headers({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                })
                
                self.logger.debug(f"Navigating to {self.BASE_URL}")
                await page.goto(self.BASE_URL, wait_until='domcontentloaded', timeout=15000)
                
                # Wait a bit for JavaScript to load the content
                await page.wait_for_timeout(3000)
                
                # Wait for the trading pairs table to load
                await page.wait_for_selector('table', timeout=10000)
                self.logger.debug("Table found, extracting trading pairs...")
                
                # Extract all trading pairs from the table
                trading_pairs = await page.evaluate('''
                    () => {
                        const pairs = [];
                        const rows = document.querySelectorAll('table tbody tr');
                        
                        rows.forEach((row, index) => {
                            try {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 2) {
                                    // Get the full row text (contains currency pair)
                                    const fullRowText = row.textContent.trim();
                                    // Get rate from first cell
                                    const rateText = cells[0].textContent.trim();
                                    // Get volume from second cell 
                                    const volumeText = cells[1].textContent.trim();
                                    
                                    console.log(`Row ${index}: Full="${fullRowText}"`);
                                    console.log(`  Rate cell: "${rateText}"`);
                                    console.log(`  Volume cell: "${volumeText}"`);
                                    
                                    // Parse format: "Divine Orb/ Exalted Orb1.00 = 139.913,608,138"
                                    // Extract currency pair from the beginning, rate from rate cell
                                    const pairMatch = fullRowText.match(/^(.+?)\\s*\\/\\s*(.+?)1\\.00/);
                                    const rateMatch = rateText.match(/1\\.00\\s*=\\s*([0-9,]+(?:\\.[0-9]+)?)/);
                                    
                                    if (pairMatch && rateMatch) {
                                        const fromCurrency = pairMatch[1].trim();
                                        const toCurrency = pairMatch[2].trim();
                                        const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
                                        
                                        console.log(`✅ Parsed: ${fromCurrency} -> ${toCurrency} = ${rate}`);
                                        
                                        // Parse volume - extract numeric value from volume text
                                        let volumeValue = 0;
                                        const volumeMatch = volumeText.match(/([0-9,]+(?:\\.[0-9]+)?)/);
                                        if (volumeMatch) {
                                            volumeValue = parseFloat(volumeMatch[1].replace(/,/g, ''));
                                        }
                                        
                                        if (rate > 0 && fromCurrency && toCurrency) {
                                            pairs.push({
                                                from: fromCurrency,
                                                to: toCurrency,
                                                rate: rate,
                                                volume: volumeValue,
                                                volumeText: volumeText,
                                                position: index + 1  // Position in the list (higher = more popular)
                                            });
                                        }
                                    } else {
                                        console.log(`❌ Failed to parse row ${index}`);
                                        console.log(`  Pair match: ${pairMatch ? 'YES' : 'NO'}`);
                                        console.log(`  Rate match: ${rateMatch ? 'YES' : 'NO'}`);
                                    }
                                }
                            } catch (e) {
                                console.log('Error parsing row:', e);
                            }
                        });
                        
                        console.log(`🎯 Total pairs extracted: ${pairs.length}`);
                        return pairs;
                    }
                ''')
                
                self.logger.info(f"🎭 Browser automation extracted {len(trading_pairs)} raw trading pairs")
                
                # Build currency metadata from all discovered currencies
                self._build_currency_metadata(trading_pairs, currency_metadata)
                
                # Convert browser results to our format
                for pair in trading_pairs:
                    from_currency = pair['from']
                    to_currency = pair['to']
                    rate = pair['rate']
                    
                    # Map POE2Scout names to our internal currency keys
                    from_key = self._map_currency_name_dynamic(from_currency)
                    to_key = self._map_currency_name_dynamic(to_currency)
                    
                    if from_key and to_key and from_key != to_key:
                        if from_key not in extracted_rates:
                            extracted_rates[from_key] = {}
                        extracted_rates[from_key][to_key] = rate
                        
                        self.logger.debug(f"Mapped: {from_currency} ({from_key}) -> {to_currency} ({to_key}) = {rate}")
                
                self.logger.info(f"🎭 Successfully mapped {len(extracted_rates)} currency pairs")
                self.logger.info(f"📊 Discovered {len(currency_metadata)} unique currencies")
                
            finally:
                await browser.close()
        
        return extracted_rates, currency_metadata
    
    def _build_currency_metadata(self, trading_pairs: List[Dict], currency_metadata: Dict[str, Dict]) -> None:
        """
        Build metadata for all discovered currencies including volume analysis.
        
        Args:
            trading_pairs: List of trading pair data from browser automation
            currency_metadata: Dict to populate with currency metadata
        """
        # Track volume and frequency for each currency
        for pair in trading_pairs:
            from_currency = pair['from']
            to_currency = pair['to']
            volume = pair['volume']
            position = pair['position']
            
            # Update metadata for both currencies in the pair
            for currency_name in [from_currency, to_currency]:
                currency_key = self._map_currency_name_dynamic(currency_name)
                if not currency_key:
                    continue
                    
                if currency_key not in currency_metadata:
                    currency_metadata[currency_key] = {
                        'name': currency_name,
                        'key': currency_key,
                        'total_volume': 0,
                        'pair_count': 0,
                        'best_position': float('inf'),
                        'avg_position': 0,
                        'popularity_score': 0
                    }
                
                # Update volume and statistics
                currency_metadata[currency_key]['total_volume'] += volume
                currency_metadata[currency_key]['pair_count'] += 1
                currency_metadata[currency_key]['best_position'] = min(
                    currency_metadata[currency_key]['best_position'], position
                )
        
        # Calculate popularity scores (lower position + higher volume = higher score)
        for currency_key, metadata in currency_metadata.items():
            if metadata['pair_count'] > 0:
                metadata['avg_position'] = metadata['best_position']  # Use best position for now
                
                # Popularity score: combination of volume and position
                # Higher volume = better, lower position = better
                volume_score = min(metadata['total_volume'] / 1000000, 100)  # Cap at 100
                position_score = max(0, 100 - metadata['best_position'])  # Better positions get higher scores
                
                metadata['popularity_score'] = volume_score + position_score
        
        # Sort currencies by popularity score
        sorted_currencies = sorted(
            currency_metadata.items(),
            key=lambda x: x[1]['popularity_score'],
            reverse=True
        )
        
        # Log top currencies for debugging
        self.logger.info("🏆 Top 10 most popular currencies:")
        for i, (currency_key, metadata) in enumerate(sorted_currencies[:10]):
            self.logger.info(
                f"  {i+1}. {metadata['name']} ({currency_key}): "
                f"volume={metadata['total_volume']:.0f}, "
                f"pairs={metadata['pair_count']}, "
                f"pos={metadata['best_position']}, "
                f"score={metadata['popularity_score']:.1f}"
            )
    
    def _map_currency_name_dynamic(self, poe2scout_name: str) -> Optional[str]:
        """
        Dynamically map POE2Scout currency names to internal keys.
        This creates new keys for unknown currencies instead of ignoring them.
        """
        # First try the static mapping for known currencies
        static_key = self._map_currency_name(poe2scout_name)
        if static_key:
            return static_key
        
        # For unknown currencies, create a dynamic key
        # Convert name to snake_case key
        import re
        
        # Basic name cleanup and conversion to snake_case
        name_clean = re.sub(r"[''']", "", poe2scout_name)  # Remove apostrophes
        name_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', name_clean)  # Replace special chars with spaces
        name_clean = re.sub(r'\s+', ' ', name_clean.strip())  # Normalize spaces
        
        # Convert to snake_case
        words = name_clean.lower().split()
        dynamic_key = '_'.join(words)
        
        # Handle some common patterns
        if 'orb' in dynamic_key and 'orb' != dynamic_key:
            dynamic_key = dynamic_key.replace('_orb', '').strip('_') + '_orb'
        if 'omen' in dynamic_key and dynamic_key != 'omen':
            dynamic_key = dynamic_key.replace('omen_of_', 'omen_').strip('_')
        
        self.logger.debug(f"Dynamic mapping: {poe2scout_name} -> {dynamic_key}")
        return dynamic_key
    
    def _map_currency_name(self, poe2scout_name: str) -> Optional[str]:
        """
        Map POE2Scout currency names to our internal currency keys.
        """
        # Comprehensive mapping from POE2Scout display names to our keys
        name_mapping = {
            # Core currencies
            'Divine Orb': 'divine',
            'Exalted Orb': 'exalted', 
            'Chaos Orb': 'chaos',
            
            # Popular currencies
            'Mirror of Kalandra': 'mirror',
            'Perfect Exalted Orb': 'perfect_exalted',
            'Orb of Annulment': 'orb_annulment',
            'Orb of Chance': 'orb_chance',
            'Perfect Chaos Orb': 'perfect_chaos',
            'Fracturing Orb': 'fracturing_orb',
            'Greater Exalted Orb': 'greater_exalted',
            "Perfect Jeweller's Orb": 'perfect_jeweller',
            'Uncut Skill Gem (Level 20)': 'uncut_gem_20',
            
            # Omens
            'Omen of Light': 'omen_light',
            'Omen of Homogenising Exaltation': 'omen_homogenising',
            'Omen of Abyssal Echoes': 'omen_abyssal',
            'Omen of Whittling': 'omen_whittling',
            'Omen of Chaotic Rarity': 'omen_chaotic',
            'Omen of Amelioration': 'omen_amelioration',
            
            # Special items
            "Rakiata's Flow": 'rakiata_flow',
            'Talisman of Sirrius': 'talisman_sirrius',
            "Hinekora's Lock": 'hinekora_lock',
            "Farrul's Rune of the Chase": 'farrul_rune',
            "Atalui's Bloodletting": 'atalui_bloodletting'
        }
        
        # Try exact match first
        if poe2scout_name in name_mapping:
            return name_mapping[poe2scout_name]
        
        # Try case-insensitive partial matches
        poe2scout_lower = poe2scout_name.lower()
        for display_name, key in name_mapping.items():
            if display_name.lower() in poe2scout_lower or poe2scout_lower in display_name.lower():
                self.logger.debug(f"Fuzzy matched: {poe2scout_name} -> {key}")
                return key
        
        # Log unmapped currencies for debugging
        self.logger.debug(f"Unmapped currency: {poe2scout_name}")
        return None
    
    def _build_rate_matrix(self, raw_rates: Dict[str, Dict[str, float]], league: str, 
                          currency_metadata: Dict[str, Dict] = None, 
                          top_percentage: float = 0.8) -> CurrencyRateMatrix:
        """
        Build a complete CurrencyRateMatrix from parsed trading pairs.
        
        Args:
            raw_rates: Exchange rates between currency pairs
            league: POE2 league name
            currency_metadata: Metadata about discovered currencies including popularity scores
        """
        metadata = RateMetadata(
            source='poe2scout',
            league=league,
            game='poe2',
            fetched_at=datetime.utcnow(),
            ttl_seconds=300  # 5 minutes
        )
        
        # Create dynamic currency list if metadata is provided
        supported_currencies = None
        if currency_metadata:
            supported_currencies = self._get_top_currencies(currency_metadata, top_percentage)
        
        matrix = CurrencyRateMatrix(metadata, supported_currencies=supported_currencies)
        
        # Store currency metadata for later use
        if currency_metadata:
            matrix._currency_metadata = currency_metadata
        
        # Set all the direct rates we extracted
        for from_currency, to_rates in raw_rates.items():
            for to_currency, rate in to_rates.items():
                try:
                    matrix.set_rate(from_currency, to_currency, rate)
                except ValueError as e:
                    # Skip unsupported currencies (not in top percentage)
                    self.logger.debug(f"Skipping unsupported currency rate: {e}")
        
        # If we don't have enough direct rates, add fallback estimates
        self._add_fallback_rates(matrix)
        
        return matrix
    
    def _get_top_currencies(self, currency_metadata: Dict[str, Dict], 
                           top_percentage: float = 0.8) -> List[str]:
        """
        Get the top X% of currencies by popularity score.
        
        Args:
            currency_metadata: Currency metadata with popularity scores
            top_percentage: Percentage of top currencies to include (0.8 = top 80%)
            
        Returns:
            List of currency keys for the top currencies
        """
        # Sort currencies by popularity score
        sorted_currencies = sorted(
            currency_metadata.items(),
            key=lambda x: x[1]['popularity_score'],
            reverse=True
        )
        
        # Calculate how many currencies to include
        total_currencies = len(sorted_currencies)
        min_currencies = 10  # Always include at least 10 currencies
        max_currencies = 50  # Cap at 50 to avoid UI clutter
        
        target_count = max(min_currencies, int(total_currencies * top_percentage))
        target_count = min(target_count, max_currencies)
        
        # Get the top currencies
        top_currencies = [currency_key for currency_key, _ in sorted_currencies[:target_count]]
        
        # Always ensure core currencies are included
        core_currencies = ['exalted', 'divine', 'chaos']
        for core in core_currencies:
            if core not in top_currencies and core in currency_metadata:
                top_currencies.append(core)
        
        self.logger.info(f"🎯 Selected top {len(top_currencies)} currencies ({top_percentage*100:.0f}% of {total_currencies})")
        self.logger.info(f"   Top currencies: {', '.join(top_currencies[:10])}...")
        
        return top_currencies
    
    def _add_fallback_rates(self, matrix: CurrencyRateMatrix):
        """
        Add estimated rates for currencies we couldn't get direct data for.
        
        Uses standard PoE ratios to estimate missing pairs.
        """
        try:
            # Get exalted rates for the major currencies
            chaos_to_exalted = matrix.get_rate('chaos', 'exalted')
            divine_to_exalted = matrix.get_rate('divine', 'exalted')
            
            if chaos_to_exalted > 0 and divine_to_exalted > 0:
                # Add estimated rates for minor currencies based on typical PoE ratios
                estimates = {
                    'fusing': chaos_to_exalted * 2.34,    # ~2.34x Chaos rate
                    'jeweller': chaos_to_exalted * 0.16,  # ~0.16x Chaos rate  
                    'ancient': divine_to_exalted * 2.4    # ~2.4x Divine rate
                }
                
                for currency, estimated_rate in estimates.items():
                    current_rate = matrix.get_rate(currency, 'exalted')
                    if current_rate <= 0:
                        matrix.set_rate(currency, 'exalted', estimated_rate)
                        self.logger.info(f"Added estimated rate: {currency} → exalted = {estimated_rate}")
                        
        except Exception as e:
            self.logger.warning(f"Could not add fallback rates: {str(e)}")

    def _get_fallback_rates(self, league: str, top_percentage: float) -> CurrencyRateMatrix:
        """Get fallback rates when Playwright is not available"""
        self.logger.info("🔄 Using fallback rates for serverless environment")
        
        # Create a simple fallback rate matrix with basic currencies
        fallback_rates = {
            'chaos': {
                'exalted': 0.268,  # 1 chaos = 0.268 exalted
                'divine': 0.0302,  # 1 chaos = 0.0302 divine
                'fusing': 0.5,     # 1 chaos = 0.5 fusing
                'jeweller': 2.0,   # 1 chaos = 2 jeweller
                'ancient': 0.8,    # 1 chaos = 0.8 ancient
            },
            'exalted': {
                'chaos': 3.73,     # 1 exalted = 3.73 chaos
                'divine': 0.112,   # 1 exalted = 0.112 divine
                'fusing': 1.865,   # 1 exalted = 1.865 fusing
                'jeweller': 7.46,  # 1 exalted = 7.46 jeweller
                'ancient': 2.98,   # 1 exalted = 2.98 ancient
            },
            'divine': {
                'chaos': 33.09,    # 1 divine = 33.09 chaos
                'exalted': 8.93,   # 1 divine = 8.93 exalted
                'fusing': 16.545,  # 1 divine = 16.545 fusing
                'jeweller': 66.18, # 1 divine = 66.18 jeweller
                'ancient': 26.47,  # 1 divine = 26.47 ancient
            },
            'fusing': {
                'chaos': 2.0,      # 1 fusing = 2 chaos
                'exalted': 0.536,  # 1 fusing = 0.536 exalted
                'divine': 0.0604,  # 1 fusing = 0.0604 divine
                'jeweller': 4.0,   # 1 fusing = 4 jeweller
                'ancient': 1.6,    # 1 fusing = 1.6 ancient
            },
            'jeweller': {
                'chaos': 0.5,      # 1 jeweller = 0.5 chaos
                'exalted': 0.134,  # 1 jeweller = 0.134 exalted
                'divine': 0.0151,  # 1 jeweller = 0.0151 divine
                'fusing': 0.25,    # 1 jeweller = 0.25 fusing
                'ancient': 0.4,    # 1 jeweller = 0.4 ancient
            },
            'ancient': {
                'chaos': 1.25,     # 1 ancient = 1.25 chaos
                'exalted': 0.335,  # 1 ancient = 0.335 exalted
                'divine': 0.0378,  # 1 ancient = 0.0378 divine
                'fusing': 0.625,   # 1 ancient = 0.625 fusing
                'jeweller': 2.5,   # 1 ancient = 2.5 jeweller
            }
        }
        
        # Create metadata for fallback
        from datetime import datetime
        metadata = RateMetadata(
            source="fallback",
            league=league,
            fetched_at=datetime.now(),
            ttl_minutes=60,  # 1 hour TTL for fallback
            total_currencies=len(fallback_rates),
            top_percentage=top_percentage
        )
        
        return CurrencyRateMatrix(fallback_rates, metadata)


# Synchronous wrapper for compatibility
class SyncPOE2ScoutService:
    """Synchronous wrapper around the async POE2ScoutService"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def fetch_currency_rates(self, league: str = "Rise of the Abyssal") -> CurrencyRateMatrix:
        """Synchronous version of fetch_currency_rates"""
        return asyncio.run(self._async_fetch(league))
    
    async def _async_fetch(self, league: str) -> CurrencyRateMatrix:
        """Internal async implementation"""
        async with POE2ScoutService() as service:
            return await service.fetch_currency_rates(league)


async def main():
    """Test the service"""
    logging.basicConfig(level=logging.INFO)
    
    async with POE2ScoutService() as service:
        try:
            rates = await service.fetch_currency_rates("Rise of the Abyssal")
            
            print("=== Fetched Rates ===")
            print(f"Source: {rates.metadata.source}")
            print(f"League: {rates.metadata.league}")
            print(f"Fetched at: {rates.metadata.fetched_at}")
            print(f"Expired: {rates.metadata.is_expired()}")
            
            # Test some conversions
            print(f"\n=== Sample Conversions ===")
            print(f"100 Chaos = {rates.convert(100, 'chaos', 'exalted'):.2f} Exalted")
            print(f"1 Divine = {rates.convert(1, 'divine', 'chaos'):.2f} Chaos")
            print(f"1 Divine = {rates.convert(1, 'divine', 'exalted'):.2f} Exalted")
            
            # Test price table
            price_table = rates.get_price_table('exalted')
            print(f"\n=== Price Table (in Exalted) ===")
            for item in price_table[:3]:
                print(f"{item['name']}: {item['formatted_price']}")
                
        except Exception as e:
            print(f"Error: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())
