#!/usr/bin/env python3
"""
POE2Scout Scraper for GitHub Actions

This script runs in GitHub Actions every 5 minutes to scrape live currency data
from poe2scout.com and save it to JSON files that Vercel can serve statically.
"""

import asyncio
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from playwright.async_api import async_playwright
except ImportError:
    logger.error("❌ Playwright not installed. Install with: pip install playwright")
    sys.exit(1)


class POE2ScoutScraper:
    """Scraper for POE2Scout.com currency data"""
    
    BASE_URL = "https://poe2scout.com/exchange"
    DEFAULT_LEAGUE = "Rise of the Abyssal"
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    async def scrape_currency_data(self, league: str = None) -> Tuple[List[Dict], Dict[str, Dict], Dict[str, Dict[str, float]]]:
        """
        Scrape currency data from POE2Scout.com
        
        Returns:
            Tuple of (currencies, currency_metadata, exchange_rates)
        """
        league = league or self.DEFAULT_LEAGUE
        
        self.logger.info(f"🎭 Starting browser automation for league: {league}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            try:
                page = await browser.new_page()
                
                # Set user agent
                await page.set_extra_http_headers({
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                })
                
                self.logger.info(f"🌐 Navigating to {self.BASE_URL}")
                await page.goto(self.BASE_URL, wait_until='domcontentloaded', timeout=15000)
                
                # Wait for JavaScript to load
                await page.wait_for_timeout(3000)
                
                # Wait for table to load
                await page.wait_for_selector('table', timeout=10000)
                self.logger.info("✅ Table loaded successfully")
                
                # Extract trading pairs
                trading_pairs = await page.evaluate('''
                    () => {
                        const pairs = [];
                        const rows = document.querySelectorAll('table tbody tr');
                        
                        rows.forEach((row, index) => {
                            try {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 2) {
                                    const fullRowText = row.textContent.trim();
                                    const rateText = cells[0].textContent.trim();
                                    const volumeText = cells[1].textContent.trim();
                                    
                                    // Parse: "Divine Orb/ Exalted Orb1.00 = 139.913,608,138"
                                    const pairMatch = fullRowText.match(/^(.+?)\\s*\\/\\s*(.+?)1\\.00/);
                                    const rateMatch = rateText.match(/1\\.00\\s*=\\s*([0-9,]+(?:\\.[0-9]+)?)/);
                                    
                                    if (pairMatch && rateMatch) {
                                        const fromCurrency = pairMatch[1].trim();
                                        const toCurrency = pairMatch[2].trim();
                                        const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
                                        
                                        // Parse volume
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
                                                position: index + 1
                                            });
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('Error parsing row:', e);
                            }
                        });
                        
                        return pairs;
                    }
                ''')
                
                self.logger.info(f"✅ Extracted {len(trading_pairs)} trading pairs")
                
                # Process the data
                currencies, currency_metadata, exchange_rates = self._process_trading_pairs(trading_pairs)
                
                return currencies, currency_metadata, exchange_rates
                
            finally:
                await browser.close()
    
    def _process_trading_pairs(self, trading_pairs: List[Dict]) -> Tuple[List[Dict], Dict[str, Dict], Dict[str, Dict[str, float]]]:
        """Process raw trading pairs into structured data"""
        
        currency_metadata = {}
        exchange_rates = {}
        
        # Build metadata from all discovered currencies
        for pair in trading_pairs:
            from_currency = pair['from']
            to_currency = pair['to']
            volume = pair['volume']
            position = pair['position']
            rate = pair['rate']
            
            # Map to internal keys
            from_key = self._map_currency_name(from_currency)
            to_key = self._map_currency_name(to_currency)
            
            if not from_key or not to_key or from_key == to_key:
                continue
            
            # Update metadata for both currencies
            for currency_name, currency_key in [(from_currency, from_key), (to_currency, to_key)]:
                if currency_key not in currency_metadata:
                    currency_metadata[currency_key] = {
                        'name': currency_name,
                        'key': currency_key,
                        'total_volume': 0,
                        'pair_count': 0,
                        'best_position': float('inf'),
                        'popularity_score': 0
                    }
                
                currency_metadata[currency_key]['total_volume'] += volume
                currency_metadata[currency_key]['pair_count'] += 1
                currency_metadata[currency_key]['best_position'] = min(
                    currency_metadata[currency_key]['best_position'], position
                )
            
            # Store exchange rate
            if from_key not in exchange_rates:
                exchange_rates[from_key] = {}
            exchange_rates[from_key][to_key] = rate
        
        # Calculate popularity scores
        max_volume = max([meta['total_volume'] for meta in currency_metadata.values()], default=1)
        
        for currency_key, metadata in currency_metadata.items():
            volume_score = (metadata['total_volume'] / max_volume) * 50 if max_volume > 0 else 0
            position_score = max(0, 50 - metadata['best_position'] * 0.5)
            metadata['popularity_score'] = volume_score + position_score
        
        # Create currencies list sorted by popularity
        currencies = []
        sorted_currencies = sorted(
            currency_metadata.items(),
            key=lambda x: x[1]['popularity_score'],
            reverse=True
        )
        
        for currency_key, metadata in sorted_currencies:
            currencies.append({
                'id': currency_key,
                'name': metadata['name'],
                'volume': int(metadata['total_volume']),
                'pair_count': metadata['pair_count'],
                'popularity_score': round(metadata['popularity_score'], 2),
                'supported': True
            })
        
        # Log top currencies
        self.logger.info("🏆 Top 10 currencies by popularity:")
        for i, curr in enumerate(currencies[:10]):
            self.logger.info(f"  {i+1}. {curr['name']}: score={curr['popularity_score']}, volume={curr['volume']}")
        
        return currencies, currency_metadata, exchange_rates
    
    def _map_currency_name(self, poe2scout_name: str) -> Optional[str]:
        """Map POE2Scout names to internal currency keys"""
        
        # Static mapping for known currencies
        name_mapping = {
            'Divine Orb': 'divine',
            'Exalted Orb': 'exalted',
            'Chaos Orb': 'chaos',
            'Mirror of Kalandra': 'mirror',
            'Perfect Exalted Orb': 'perfect_exalted',
            'Orb of Annulment': 'annulment',
            'Orb of Chance': 'chance',
            'Perfect Chaos Orb': 'perfect_chaos',
            'Fracturing Orb': 'fracturing',
            'Greater Exalted Orb': 'greater_exalted',
            "Perfect Jeweller's Orb": 'perfect_jeweller',
            'Uncut Skill Gem (Level 20)': 'uncut_gem_20',
            'Omen of Light': 'omen_light',
            'Omen of Homogenising Exaltation': 'omen_homogenising',
            'Omen of Abyssal Echoes': 'omen_abyssal',
            'Omen of Whittling': 'omen_whittling',
            'Omen of Chaotic Rarity': 'omen_chaotic',
            'Omen of Amelioration': 'omen_amelioration',
            "Rakiata's Flow": 'rakiata_flow',
            'Talisman of Sirrius': 'talisman_sirrius',
            "Hinekora's Lock": 'hinekora_lock',
            "Farrul's Rune of the Chase": 'farrul_rune',
            "Atalui's Bloodletting": 'atalui_bloodletting',
            "Jeweller's Orb": 'jeweller',
            'Orb of Alchemy': 'alchemy',
            'Regal Orb': 'regal',
            'Ancient Orb': 'ancient',
            'Blessed Orb': 'blessed',
            'Orb of Alteration': 'alteration',
            'Chromatic Orb': 'chromatic',
            'Orb of Augmentation': 'augmentation',
            'Orb of Transmutation': 'transmutation',
            'Glassblower\'s Bauble': 'glassblower',
            "Gemcutter's Prism": 'gemcutter',
            'Orb of Fusing': 'fusing',
            'Orb of Scouring': 'scouring',
            'Orb of Regret': 'regret',
            'Vaal Orb': 'vaal',
        }
        
        # Try exact match
        if poe2scout_name in name_mapping:
            return name_mapping[poe2scout_name]
        
        # Try case-insensitive match
        poe2scout_lower = poe2scout_name.lower()
        for display_name, key in name_mapping.items():
            if display_name.lower() == poe2scout_lower:
                return key
        
        # Dynamic mapping for unknown currencies
        name_clean = re.sub(r"[''']", "", poe2scout_name)
        name_clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', name_clean)
        name_clean = re.sub(r'\s+', ' ', name_clean.strip())
        
        words = name_clean.lower().split()
        dynamic_key = '_'.join(words)
        
        self.logger.debug(f"Dynamic mapping: {poe2scout_name} -> {dynamic_key}")
        return dynamic_key


async def main():
    """Main function to run the scraper"""
    
    logger.info("=" * 60)
    logger.info("🚀 POE2Scout Currency Scraper - GitHub Actions")
    logger.info("=" * 60)
    
    # Ensure output directory exists
    output_dir = Path(__file__).parent.parent.parent / 'api' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"📁 Output directory: {output_dir}")
    
    try:
        # Scrape data
        scraper = POE2ScoutScraper()
        currencies, currency_metadata, exchange_rates = await scraper.scrape_currency_data()
        
        # Prepare output data
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        currencies_data = {
            'currencies': currencies,
            'total': len(currencies),
            'source': 'poe2scout',
            'league': scraper.DEFAULT_LEAGUE,
            'fetched_at': timestamp,
            'metadata': {
                'scraper': 'github-actions',
                'version': '1.0',
                'top_percentage': 1.0
            }
        }
        
        rates_data = {
            'rates': exchange_rates,
            'metadata': {
                'source': 'poe2scout',
                'league': scraper.DEFAULT_LEAGUE,
                'fetched_at': timestamp,
                'ttl_seconds': 300,
                'total_pairs': sum(len(pairs) for pairs in exchange_rates.values())
            }
        }
        
        # Write to files
        currencies_file = output_dir / 'currencies.json'
        rates_file = output_dir / 'rates.json'
        
        with open(currencies_file, 'w') as f:
            json.dump(currencies_data, f, indent=2)
        logger.info(f"✅ Wrote currencies data to {currencies_file}")
        
        with open(rates_file, 'w') as f:
            json.dump(rates_data, f, indent=2)
        logger.info(f"✅ Wrote exchange rates to {rates_file}")
        
        # Summary
        logger.info("")
        logger.info("=" * 60)
        logger.info("✅ SCRAPING COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        logger.info(f"📊 Total currencies: {len(currencies)}")
        logger.info(f"💱 Total exchange pairs: {rates_data['metadata']['total_pairs']}")
        logger.info(f"⏰ Timestamp: {timestamp}")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ SCRAPING FAILED: {str(e)}")
        logger.error("=" * 60)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
