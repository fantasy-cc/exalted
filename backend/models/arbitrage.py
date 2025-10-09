"""
Function #2: Arbitrage Opportunity Finder

This module finds profitable currency arbitrage opportunities using the 
CurrencyRateMatrix from rates.py.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from itertools import permutations
import logging

try:
    from .rates import CurrencyRateMatrix
except ImportError:
    from rates import CurrencyRateMatrix


@dataclass
class ArbitrageStep:
    """Represents one step in an arbitrage path"""
    from_currency: str
    to_currency: str
    rate: float  # Exchange rate for this step
    amount_before: float  # Amount before this conversion
    amount_after: float   # Amount after this conversion


@dataclass
class ArbitrageOpportunity:
    """Represents a complete arbitrage opportunity"""
    starting_currency: str
    starting_amount: float
    final_amount: float
    profit_amount: float
    profit_percentage: float
    steps: List[ArbitrageStep] = field(default_factory=list)
    
    @property
    def path_description(self) -> str:
        """Human-readable description of the arbitrage path"""
        currency_names = CurrencyRateMatrix.CURRENCY_NAMES
        path_parts = []
        for step in self.steps:
            if not path_parts:  # First step
                path_parts.append(currency_names[step.from_currency])
            path_parts.append(currency_names[step.to_currency])
        return " → ".join(path_parts)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'starting_currency': self.starting_currency,
            'starting_amount': self.starting_amount,
            'final_amount': round(self.final_amount, 6),
            'profit_amount': round(self.profit_amount, 6),
            'profit_percentage': round(self.profit_percentage, 6),
            'path_description': self.path_description,
            'steps': [
                {
                    'from_currency': step.from_currency,
                    'to_currency': step.to_currency,
                    'from_name': CurrencyRateMatrix.CURRENCY_NAMES[step.from_currency],
                    'to_name': CurrencyRateMatrix.CURRENCY_NAMES[step.to_currency],
                    'rate': round(step.rate, 6),
                    'amount_before': round(step.amount_before, 6),
                    'amount_after': round(step.amount_after, 6)
                }
                for step in self.steps
            ]
        }


class ArbitrageFinder:
    """
    Finds profitable arbitrage opportunities in currency exchange markets.
    
    Key features:
    - Configurable profit thresholds and path lengths
    - Efficient path finding with early termination
    - Sorted results by profitability
    - Support for slippage and trading fees
    """
    
    def __init__(self, 
                 min_profit_percentage: float = 0.01,  # 0.01% minimum profit
                 max_steps: int = 3,  # Maximum steps in arbitrage path  
                 slippage_per_step: float = 0.0,  # Slippage per trading step
                 max_results: int = 10):  # Maximum results to return
        
        self.min_profit_percentage = min_profit_percentage
        self.max_steps = max_steps
        self.slippage_per_step = slippage_per_step
        self.max_results = max_results
        self.logger = logging.getLogger(__name__)
    
    def find_opportunities(self, 
                          rate_matrix: CurrencyRateMatrix,
                          starting_currency: str,
                          starting_amount: float = 100.0) -> List[ArbitrageOpportunity]:
        """
        Find all profitable arbitrage opportunities starting with given currency.
        
        Args:
            rate_matrix: Currency exchange rate matrix
            starting_currency: Currency to start arbitrage with
            starting_amount: Amount to start with
            
        Returns:
            List of ArbitrageOpportunity objects sorted by profit percentage (descending)
        """
        if starting_currency not in rate_matrix.SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported starting currency: {starting_currency}")
        
        opportunities = []
        
        # Generate all possible paths of the specified length
        other_currencies = [c for c in rate_matrix.SUPPORTED_CURRENCIES if c != starting_currency]
        
        if self.max_steps == 3:
            # For 3-step arbitrage: Start → A → B → Start
            for intermediate_path in permutations(other_currencies, 2):
                path = [starting_currency] + list(intermediate_path) + [starting_currency]
                opportunity = self._evaluate_path(rate_matrix, path, starting_amount)
                if opportunity and opportunity.profit_percentage >= self.min_profit_percentage:
                    opportunities.append(opportunity)
        else:
            # For other path lengths, use recursive approach (future enhancement)
            self.logger.warning(f"Path length {self.max_steps} not yet implemented")
        
        # Sort by profit percentage (descending)
        opportunities.sort(key=lambda x: x.profit_percentage, reverse=True)
        
        # Return top results
        return opportunities[:self.max_results]
    
    def _evaluate_path(self, 
                      rate_matrix: CurrencyRateMatrix,
                      path: List[str],
                      starting_amount: float) -> Optional[ArbitrageOpportunity]:
        """
        Evaluate a specific arbitrage path for profitability.
        
        Args:
            rate_matrix: Currency exchange rate matrix
            path: List of currencies representing the arbitrage path
            starting_amount: Starting amount
            
        Returns:
            ArbitrageOpportunity if profitable, None otherwise
        """
        if len(path) < 2:
            return None
        
        steps = []
        current_amount = starting_amount
        
        # Execute each step in the path
        for i in range(len(path) - 1):
            from_currency = path[i]
            to_currency = path[i + 1]
            
            # Get the exchange rate
            try:
                rate = rate_matrix.get_rate(from_currency, to_currency)
                if rate <= 0:
                    return None  # Invalid rate, path not viable
            except ValueError:
                return None  # Currency not supported
            
            # Apply slippage if configured
            effective_rate = rate * (1 - self.slippage_per_step)
            
            # Calculate amount after this step
            amount_after = current_amount * effective_rate
            
            # Record this step
            step = ArbitrageStep(
                from_currency=from_currency,
                to_currency=to_currency,
                rate=effective_rate,
                amount_before=current_amount,
                amount_after=amount_after
            )
            steps.append(step)
            
            current_amount = amount_after
        
        # Check if this is a profitable arbitrage
        final_amount = current_amount
        profit_amount = final_amount - starting_amount
        profit_percentage = (profit_amount / starting_amount) * 100
        
        if profit_percentage < self.min_profit_percentage:
            return None
        
        return ArbitrageOpportunity(
            starting_currency=path[0],
            starting_amount=starting_amount,
            final_amount=final_amount,
            profit_amount=profit_amount,
            profit_percentage=profit_percentage,
            steps=steps
        )
    
    def find_best_opportunity(self,
                             rate_matrix: CurrencyRateMatrix,
                             starting_currency: str,
                             starting_amount: float = 100.0) -> Optional[ArbitrageOpportunity]:
        """
        Find the single best arbitrage opportunity for a given starting currency.
        
        Returns:
            Best ArbitrageOpportunity or None if no profitable opportunities found
        """
        opportunities = self.find_opportunities(rate_matrix, starting_currency, starting_amount)
        return opportunities[0] if opportunities else None
    
    def analyze_all_currencies(self,
                              rate_matrix: CurrencyRateMatrix,
                              amount_per_currency: float = 100.0) -> Dict[str, List[ArbitrageOpportunity]]:
        """
        Analyze arbitrage opportunities for all supported currencies.
        
        Returns:
            Dict mapping each currency to its arbitrage opportunities
        """
        results = {}
        
        for currency in rate_matrix.SUPPORTED_CURRENCIES:
            try:
                opportunities = self.find_opportunities(
                    rate_matrix, 
                    currency, 
                    amount_per_currency
                )
                results[currency] = opportunities
                
                self.logger.info(f"Found {len(opportunities)} opportunities for {currency}")
                
            except Exception as e:
                self.logger.error(f"Error analyzing {currency}: {str(e)}")
                results[currency] = []
        
        return results
    
    def get_summary_stats(self, opportunities: List[ArbitrageOpportunity]) -> Dict:
        """Get summary statistics for a list of arbitrage opportunities"""
        if not opportunities:
            return {
                'total_opportunities': 0,
                'best_profit_percentage': 0.0,
                'average_profit_percentage': 0.0,
                'total_profit_amount': 0.0
            }
        
        profits = [op.profit_percentage for op in opportunities]
        profit_amounts = [op.profit_amount for op in opportunities]
        
        return {
            'total_opportunities': len(opportunities),
            'best_profit_percentage': max(profits),
            'average_profit_percentage': sum(profits) / len(profits),
            'total_profit_amount': sum(profit_amounts),
            'worst_profit_percentage': min(profits)
        }


def main():
    """Example usage and testing"""
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Create test rate matrix
    rates = CurrencyRateMatrix.create_test_data()
    
    # Create arbitrage finder
    finder = ArbitrageFinder(
        min_profit_percentage=0.1,  # 0.1% minimum
        max_steps=3,
        slippage_per_step=0.01,  # 1% slippage per step
        max_results=5
    )
    
    # Find opportunities for Chaos Orb
    print("=== Chaos Orb Arbitrage Opportunities ===")
    opportunities = finder.find_opportunities(rates, 'chaos', 100.0)
    
    for i, op in enumerate(opportunities, 1):
        print(f"\n#{i} [{op.profit_percentage:.2f}%] {op.path_description}")
        print(f"  Initial: {op.starting_amount} {CurrencyRateMatrix.CURRENCY_NAMES[op.starting_currency]}")
        print(f"  Final: {op.final_amount:.2f} {CurrencyRateMatrix.CURRENCY_NAMES[op.starting_currency]}")
        print(f"  Profit: +{op.profit_amount:.2f} ({op.profit_percentage:.2f}%)")
    
    # Get summary stats
    stats = finder.get_summary_stats(opportunities)
    print(f"\n=== Summary ===")
    print(f"Total opportunities: {stats['total_opportunities']}")
    print(f"Best profit: {stats['best_profit_percentage']:.2f}%")
    print(f"Average profit: {stats['average_profit_percentage']:.2f}%")
    
    # Analyze all currencies
    print("\n=== All Currency Analysis ===")
    all_results = finder.analyze_all_currencies(rates, 100.0)
    
    for currency, ops in all_results.items():
        currency_name = CurrencyRateMatrix.CURRENCY_NAMES[currency]
        if ops:
            best_profit = ops[0].profit_percentage
            print(f"{currency_name}: {len(ops)} opportunities, best: {best_profit:.2f}%")
        else:
            print(f"{currency_name}: No profitable opportunities")


if __name__ == "__main__":
    main()
