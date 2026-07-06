# 🔧 TECHNICAL IMPLEMENTATION


### Currency Data Structure

```javascript
// Exchange rate matrix (backend)
CURRENCY_RATES = {
  currencyA: {
    currencyB: rate,  // 1 currencyA = rate currencyB
    currencyC: rate
  }
}

// Currency metadata
CURRENCY_METADATA = {
  currencyKey: {
    name: "Display Name",
    volume: 15000000,
    pair_count: 12,
    popularity_score: 185.5,
    position: 1
  }
}
```

### Supported Currencies (Dynamic Discovery)

**Dynamic Currency Discovery**: The system automatically discovers and ranks currencies from POE2Scout.com by trading volume and popularity.

**Default Configuration**: Top 80% of currencies (typically 20-30 currencies)

**Core Currencies** (always included):
1. **Exalted Orb** (`exalted`) - High-value currency
2. **Divine Orb** (`divine`) - Premium currency
3. **Chaos Orb** (`chaos`) - Common trading currency (default selection)

**Popular Currencies** (auto-discovered by volume):
- Mirror of Kalandra, Perfect Exalted Orb, Orb of Annulment
- Orb of Chance, Perfect Chaos Orb, Fracturing Orb
- Greater Exalted Orb, Perfect Jeweller's Orb
- Uncut Skill Gems, Various Omens, Special Items

### Arbitrage Algorithm

#### Specific Currency Mode
1. **Input**: Starting currency and amount
2. **Process**: For each possible 3-step path (A→B→C→A):
   - Convert initial amount: A → B
   - Convert intermediate amount: B → C
   - Convert back to original: C → A
3. **Output**: Sorted list of profitable opportunities (by profit percentage)
4. **Display**: Shows top 5 most profitable paths with multi-scale examples

#### All Trades Ranked Mode
1. **Input**: All available currencies (from dynamic currency discovery)
2. **Process**: For each currency in parallel batches:
   - Use dynamic default amount based on currency tier
   - Calculate arbitrage opportunities using same 3-step algorithm
   - Collect and merge results from all currencies
3. **Output**: Global ranking of all opportunities by profit percentage
4. **Display**: Shows top 20 opportunities across all starting currencies
5. **Performance**: Batched processing (5 currencies per batch) with error handling

### Dynamic Default System

The system automatically determines sensible base amounts for calculations based on currency tiers:

**Premium Tier** (1-5 units): Ultra-expensive currencies
- Divine Orb (2), Mirror of Kalandra (1), Perfect Exalted (5)
- Rakiata's Flow (1), Hinekora's Lock (1), Farrul's Rune (1)

**Moderate Tier** (8-25 units): Expensive but accessible currencies
- Exalted Orb (10), Greater Exalted (8), Perfect Chaos (15)
- Orb of Annulment (20), Fracturing Orb (25)

**Budget Tier** (50-800 units): Common/stackable currencies
- Chaos Orb (100), Jeweller's Orb (150), Orb of Chance (80)
- Omens (250-800 depending on rarity), Uncut Gems (50)

**Fallback**: Unrecognized currencies default to 25 units (moderate tier)

### Budget Range System

**Budget Categories**:
- **💰 Micro ($1-5)**: Starter-friendly amounts
- **💵 Small ($5-25)**: Casual trading amounts
- **💸 Medium ($25-100)**: Moderate investment
- **💎 Large ($100-500)**: Serious trading
- **🐋 Whale ($500+)**: High-roller amounts

**Value Calculation**:
- Base currency: Divine Orb = $1.00
- All other currencies valued relative to Divine
- Real-time exchange rates used when available
- Fallback to static rates when live data unavailable

### Multi-Scale Display Format

```
#1 Chaos Orb → Jeweller's Orb → Ancient Orb → Chaos Orb [Best: +2.6% profit]

🏠 Starter (Perfect for beginners) [≈ $1-3 value]
   100 → 103 Chaos Orb (+3 profit, +3.0%)
   1. 100 Chaos Orb → 45 Jeweller's Orb (0.450)
   2. 45 Jeweller's Orb → 52 Ancient Orb (1.156)
   3. 52 Ancient Orb → 103 Chaos Orb (1.981)

💎 Moderate (Solid investment) [≈ $5-15 value]
   500 → 513 Chaos Orb (+13 profit, +2.6%)
   [steps displayed similarly]

🐋 Advanced (Maximum efficiency) [≈ $20-60 value]
   2000 → 2052 Chaos Orb (+52 profit, +2.6%)
   [steps displayed similarly]
```

### Exchange Rate Data

- **Primary Source**: poe2scout.com/exchange live market data via HTTP extraction
- **Live Data**: Real trading pairs from poe2scout.com exchange rates
- **Fallback**: Current market rates observed from poe2scout.com
- **Static Backup**: Hardcoded rates with realistic PoE2 market values
- **Update frequency**: 5-minute cache TTL for live data
- **Rate relationships**: Direct market rates between all currency pairs

### Caching Strategy

#### Multi-Layer Caching
1. **In-memory cache**: Latest `RateMap` with `fetchedAt` timestamp
2. **localStorage**: Persist `{ provider, league, fetchedAt, ttlMs, rates }`
3. **Cache keys**: Include `top_percentage` for proper isolation

#### Cache Behavior
- **TTL**: 5 minutes (300 seconds)
- **Cache hit**: Use immediately + refresh in background
- **Cache miss**: Fetch fresh data
- **On failure**: Use last good cached; if none, fall back to static

### Slippage and Spread Handling

- User-configurable slippage (basis points) per hop (default 1.0% per hop)
- Effective rate per hop: `rateEffective = rateRaw * (1 - slippageBps/10000)`
- Conservative calculations using integer rounding for premium currencies

---
