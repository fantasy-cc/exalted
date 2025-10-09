"""
Function #1: Currency Rate Representation System

This module provides a clean, efficient way to represent and work with
currency exchange rates for Path of Exile 2 arbitrage calculations.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import json
import logging


@dataclass
class RateMetadata:
    """Metadata about the currency rates"""
    source: str  # 'poe2scout', 'test', etc.
    league: str  # 'Rise of the Abyssal', 'Standard', etc.
    game: str = 'poe2'
    fetched_at: datetime = None
    ttl_seconds: int = 300  # 5 minutes default
    
    def is_expired(self) -> bool:
        """Check if the data is expired based on TTL"""
        if not self.fetched_at:
            return True
        elapsed = (datetime.utcnow() - self.fetched_at).total_seconds()
        return elapsed > self.ttl_seconds


class CurrencyRateMatrix:
    """
    Represents currency exchange rates as a matrix for efficient arbitrage calculations.
    
    Key features:
    - O(1) lookups for any currency pair
    - Automatic inverse rate calculation
    - Supports transitive rate computation
    - JSON serializable for API responses
    """
    
    # Expanded currency support based on POE2Scout volume analysis (Sept 12, 2025)
    # Tier 1: Ultra-high volume currencies (core trading pairs)
    CORE_CURRENCIES = [
        'exalted', 'divine', 'chaos'
    ]
    
    # Tier 2: High volume popular currencies 
    POPULAR_CURRENCIES = [
        'mirror', 'perfect_exalted', 'orb_annulment', 'orb_chance', 'perfect_chaos',
        'fracturing_orb', 'greater_exalted', 'perfect_jeweller', 'uncut_gem_20'
    ]
    
    # Tier 3: Omens (very popular in POE2)
    OMEN_CURRENCIES = [
        'omen_light', 'omen_homogenising', 'omen_abyssal', 'omen_whittling', 
        'omen_chaotic', 'omen_amelioration', 'omen_chance', 'omen_corruption'
    ]
    
    # Tier 4: Runes & Special Items
    SPECIAL_CURRENCIES = [
        'rakiata_flow', 'talisman_sirrius', 'hinekora_lock', 'farrul_rune',
        'atalui_bloodletting', 'dialla_desire', 'ancient_jawbone'
    ]
    
    # All supported currencies (focus on high volume for good arbitrage liquidity)
    SUPPORTED_CURRENCIES = CORE_CURRENCIES + POPULAR_CURRENCIES + OMEN_CURRENCIES[:6] + SPECIAL_CURRENCIES[:5]
    
    CURRENCY_NAMES = {
        # Core currencies
        'exalted': 'Exalted Orb',
        'divine': 'Divine Orb', 
        'chaos': 'Chaos Orb',
        
        # Popular currencies
        'mirror': 'Mirror of Kalandra',
        'perfect_exalted': 'Perfect Exalted Orb',
        'orb_annulment': 'Orb of Annulment',
        'orb_chance': 'Orb of Chance',
        'perfect_chaos': 'Perfect Chaos Orb',
        'fracturing_orb': 'Fracturing Orb',
        'greater_exalted': 'Greater Exalted Orb',
        'perfect_jeweller': "Perfect Jeweller's Orb",
        'uncut_gem_20': 'Uncut Skill Gem (Level 20)',
        
        # Omens
        'omen_light': 'Omen of Light',
        'omen_homogenising': 'Omen of Homogenising Exaltation',
        'omen_abyssal': 'Omen of Abyssal Echoes',
        'omen_whittling': 'Omen of Whittling',
        'omen_chaotic': 'Omen of Chaotic Rarity',
        'omen_amelioration': 'Omen of Amelioration',
        
        # Special items
        'rakiata_flow': "Rakiata's Flow",
        'talisman_sirrius': 'Talisman of Sirrius',
        'hinekora_lock': "Hinekora's Lock",
        'farrul_rune': "Farrul's Rune of the Chase",
        'atalui_bloodletting': "Atalui's Bloodletting"
    }
    
    def __init__(self, metadata: RateMetadata, supported_currencies: List[str] = None):
        self.metadata = metadata
        self._rates: Dict[str, Dict[str, float]] = {}
        self.logger = logging.getLogger(__name__)
        
        # Use dynamic currencies if provided, otherwise fallback to hardcoded list
        if supported_currencies:
            self.SUPPORTED_CURRENCIES = supported_currencies
            # Build dynamic currency names mapping
            self.CURRENCY_NAMES = self._build_dynamic_currency_names(supported_currencies)
            self.logger.info(f"🔄 Using dynamic currency support: {len(supported_currencies)} currencies")
        else:
            # Use the original hardcoded currencies
            pass  # Keep existing SUPPORTED_CURRENCIES and CURRENCY_NAMES
            
        self._initialize_matrix()
    
    def _build_dynamic_currency_names(self, currencies: List[str]) -> Dict[str, str]:
        """
        Build currency names mapping for dynamic currencies.
        Uses hardcoded names where available, generates names for new currencies.
        """
        names = {}
        
        # Start with existing hardcoded names
        for currency in currencies:
            if currency in self.CURRENCY_NAMES:
                names[currency] = self.CURRENCY_NAMES[currency]
            else:
                # Generate a display name from the currency key
                display_name = self._generate_display_name(currency)
                names[currency] = display_name
                self.logger.debug(f"Generated name: {currency} -> {display_name}")
        
        return names
    
    def _generate_display_name(self, currency_key: str) -> str:
        """
        Generate a human-readable display name from a currency key.
        """
        # Convert snake_case to Title Case
        words = currency_key.split('_')
        
        # Capitalize each word
        capitalized = []
        for word in words:
            if word.lower() in ['of', 'the', 'and']:
                capitalized.append(word.lower())
            else:
                capitalized.append(word.capitalize())
        
        # Join with spaces
        display_name = ' '.join(capitalized)
        
        # Handle common patterns
        if display_name.endswith(' Orb'):
            pass  # Keep as is
        elif 'omen' in display_name.lower() and not display_name.startswith('Omen'):
            display_name = display_name.replace('Omen ', 'Omen of ')
        
        return display_name
    
    def _initialize_matrix(self):
        """Initialize the rate matrix with identity rates (currency to itself = 1.0)"""
        for from_currency in self.SUPPORTED_CURRENCIES:
            self._rates[from_currency] = {}
            for to_currency in self.SUPPORTED_CURRENCIES:
                if from_currency == to_currency:
                    self._rates[from_currency][to_currency] = 1.0
                else:
                    self._rates[from_currency][to_currency] = 0.0
    
    def set_rate(self, from_currency: str, to_currency: str, rate: float) -> None:
        """
        Set exchange rate: 1 from_currency = rate to_currency
        Automatically sets the inverse rate.
        """
        if from_currency not in self.SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {from_currency}")
        if to_currency not in self.SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {to_currency}")
        if rate <= 0:
            raise ValueError(f"Rate must be positive, got: {rate}")
        
        self._rates[from_currency][to_currency] = rate
        self._rates[to_currency][from_currency] = 1.0 / rate
    
    def get_rate(self, from_currency: str, to_currency: str) -> float:
        """Get exchange rate: 1 from_currency = ? to_currency"""
        if from_currency not in self.SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {from_currency}")
        if to_currency not in self.SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {to_currency}")
        
        return self._rates[from_currency][to_currency]
    
    def convert(self, amount: float, from_currency: str, to_currency: str) -> float:
        """Convert amount from one currency to another"""
        rate = self.get_rate(from_currency, to_currency)
        if rate <= 0:
            raise ValueError(f"No valid rate from {from_currency} to {to_currency}")
        return amount * rate
    
    def set_rates_from_base(self, base_currency: str, base_rates: Dict[str, float]) -> None:
        """
        Set rates using one currency as base. Automatically calculates all pairs.
        
        Args:
            base_currency: The currency to use as base (e.g., 'chaos')
            base_rates: Dict of {currency: rate} where rate is how much of that currency you get per 1 base currency
        """
        # Set direct rates from base currency
        for currency, rate in base_rates.items():
            if currency != base_currency:
                self.set_rate(base_currency, currency, rate)
        
        # Compute transitive rates for all pairs
        self._compute_transitive_rates()
    
    def _compute_transitive_rates(self):
        """
        Compute missing rates using transitive relationships (Floyd-Warshall style).
        If A -> B and B -> C are known, compute A -> C = (A -> B) * (B -> C)
        """
        currencies = self.SUPPORTED_CURRENCIES
        
        # Multiple passes to ensure all transitive relationships are found
        for _ in range(len(currencies)):
            for a in currencies:
                for b in currencies:
                    for c in currencies:
                        if (a != b and b != c and a != c and 
                            self._rates[a][b] > 0 and self._rates[b][c] > 0 and 
                            self._rates[a][c] == 0):
                            
                            computed_rate = self._rates[a][b] * self._rates[b][c]
                            self._rates[a][c] = computed_rate
                            self._rates[c][a] = 1.0 / computed_rate
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'metadata': {
                'source': self.metadata.source,
                'league': self.metadata.league,
                'game': self.metadata.game,
                'fetched_at': self.metadata.fetched_at.isoformat() if self.metadata.fetched_at else None,
                'ttl_seconds': self.metadata.ttl_seconds,
                'is_expired': self.metadata.is_expired()
            },
            'rates': self._rates,
            'currency_names': self.CURRENCY_NAMES
        }
    
    def get_price_table(self, base_currency: str = 'exalted') -> List[Dict]:
        """
        Get a price table with all currencies relative to base currency.
        Useful for the "Prices" tab display.
        """
        prices = []
        for currency in self.SUPPORTED_CURRENCIES:
            if currency != base_currency:
                rate = self.get_rate(currency, base_currency)
                prices.append({
                    'currency': currency,
                    'name': self.CURRENCY_NAMES[currency],
                    'price': rate,  # How many base_currency per 1 currency
                    'formatted_price': f"{rate:.4f}" if rate > 0 else "N/A"
                })
        
        # Sort by price (highest first)
        prices.sort(key=lambda x: x['price'], reverse=True)
        return prices
    
    @classmethod
    def from_poe2scout_data(cls, poe2scout_rates: Dict, league: str = "Rise of the Abyssal") -> 'CurrencyRateMatrix':
        """
        Factory method to create CurrencyRateMatrix from POE2 Scout data.
        
        Args:
            poe2scout_rates: Dict with direct trading pairs from poe2scout
            league: POE2 league name
        """
        metadata = RateMetadata(
            source='poe2scout',
            league=league,
            fetched_at=datetime.utcnow()
        )
        
        matrix = cls(metadata)
        
        # Set the direct rates from poe2scout data
        for from_currency, to_rates in poe2scout_rates.items():
            for to_currency, rate in to_rates.items():
                if rate > 0:
                    matrix.set_rate(from_currency, to_currency, rate)
        
        return matrix
    
    @classmethod  
    def create_test_data(cls) -> 'CurrencyRateMatrix':
        """Create test data for development"""
        metadata = RateMetadata(
            source='test',
            league='Test League',
            fetched_at=datetime.utcnow()
        )
        
        matrix = cls(metadata)
        
        # Use current market rates as test data (based on POE2Scout Sept 12, 2025)
        test_rates = {
            # Core currencies (highest volume)
            'divine': {'exalted': 139.48, 'chaos': 29.82},
            'chaos': {'exalted': 4.48},
            
            # Popular currencies
            'mirror': {'divine': 613.20},  # Ultra-rare item
            'perfect_exalted': {'exalted': 298.82, 'divine': 2.29},
            'orb_annulment': {'exalted': 38.12, 'divine': 0.28},
            'orb_chance': {'exalted': 9.67},
            'perfect_chaos': {'exalted': 207.44},
            'fracturing_orb': {'exalted': 48.47},
            'greater_exalted': {'exalted': 3.61},
            'perfect_jeweller': {'exalted': 41.07},
            'uncut_gem_20': {'exalted': 213.81},
            
            # Omens (very popular in POE2)
            'omen_light': {'exalted': 312.76, 'divine': 2.39},
            'omen_homogenising': {'exalted': 117.74, 'divine': 0.84},
            'omen_abyssal': {'exalted': 46.19},
            'omen_whittling': {'exalted': 154.76, 'divine': 1.17},
            'omen_chaotic': {'exalted': 25.64},
            'omen_amelioration': {'exalted': 18.46},
            
            # Special items
            'rakiata_flow': {'divine': 23.51},
            'talisman_sirrius': {'divine': 12.45},
            'hinekora_lock': {'divine': 78.16},
            'farrul_rune': {'divine': 11.52, 'exalted': 1504.13},
            'atalui_bloodletting': {'divine': 11.69}
        }
        
        for from_currency, to_rates in test_rates.items():
            for to_currency, rate in to_rates.items():
                matrix.set_rate(from_currency, to_currency, rate)
        
        matrix._compute_transitive_rates()
        return matrix


def main():
    """Example usage"""
    # Create test rate matrix
    rates = CurrencyRateMatrix.create_test_data()
    
    # Test conversions
    print(f"100 Chaos = {rates.convert(100, 'chaos', 'exalted'):.2f} Exalted")
    print(f"1 Divine = {rates.convert(1, 'divine', 'chaos'):.2f} Chaos")
    
    # Get price table
    price_table = rates.get_price_table('exalted')
    print("\nPrice Table (in Exalted):")
    for item in price_table:
        print(f"{item['name']}: {item['formatted_price']}")
    
    # Export to dict
    data = rates.to_dict()
    print(f"\nData source: {data['metadata']['source']}")
    print(f"Is expired: {data['metadata']['is_expired']}")


if __name__ == "__main__":
    main()
