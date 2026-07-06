# ⚙️ CONFIGURATION


### Backend Configuration

#### Environment Variables

Create `.env` file in `backend/` directory:

```env
# Server Settings
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Currency Discovery
DEFAULT_TOP_PERCENTAGE=0.8
DEFAULT_LEAGUE="Rise of the Abyssal"
CACHE_TTL_SECONDS=300

# Browser Automation
BROWSER_HEADLESS=True
BROWSER_TIMEOUT=15000
REQUEST_TIMEOUT=10

# API Limits
MAX_RESULTS_LIMIT=50
MIN_PROFIT_LIMIT=0.001
MAX_AMOUNT_LIMIT=1000000

# Logging
LOG_LEVEL=INFO
LOG_FILE=arbitrage.log
```

#### Currency Selection Configuration

```python
CURRENCY_CONFIGS = {
    'fast': {
        'top_percentage': 0.4,      # Top 40% - fastest
        'description': 'Most liquid currencies only'
    },
    'balanced': {
        'top_percentage': 0.8,      # Top 80% - default
        'description': 'Good balance of choice and performance'
    },
    'comprehensive': {
        'top_percentage': 1.0,      # 100% - all currencies
        'description': 'Maximum arbitrage opportunities'
    }
}
```

#### Popularity Scoring Weights

```python
def calculate_popularity_score(volume, position, pair_count):
    """
    Custom popularity scoring algorithm
    """
    # Volume component (0-100 scale)
    volume_score = min(volume / 1_000_000, 100)
    
    # Position component (earlier = better)
    position_score = max(0, 100 - position)
    
    # Pair count bonus (more pairs = more liquid)
    pair_bonus = min(pair_count * 2, 20)
    
    # Weighted combination
    return (volume_score * 0.6) + (position_score * 0.3) + (pair_bonus * 0.1)
```

### Frontend Configuration

```javascript
// app.js configuration
const FRONTEND_CONFIG = {
    currency_loading: {
        batch_size: 20,           // Load currencies in batches
        delay_ms: 100,           // Delay between batches
        show_loading: true       // Show loading indicators
    },
    api_optimization: {
        debounce_ms: 300,        // Debounce user input
        cache_duration: 300000,  // 5 minutes client cache
        max_concurrent: 3        // Max simultaneous API calls
    },
    ui_performance: {
        result_pagination: 10,    // Results per page
        animation_duration: 200   // UI animation speed
    }
};
```

### Performance Optimization

#### Backend Optimization

```python
# Recommended currency counts by scenario
PERFORMANCE_TIERS = {
    'mobile': 15,        # Mobile app - fast response
    'web_fast': 20,      # Web app - quick calculations
    'web_standard': 30,  # Web app - balanced
    'analysis': 50,      # Deep analysis - comprehensive
}
```

#### Memory Management

```python
# Efficient rate matrix storage
import numpy as np

class OptimizedRateMatrix:
    def __init__(self, currencies):
        self.currencies = currencies
        self.currency_index = {curr: i for i, curr in enumerate(currencies)}
        # Use numpy for efficient storage
        self.rates = np.zeros((len(currencies), len(currencies)), dtype=np.float32)
```

---
