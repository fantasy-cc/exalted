import { TradeableCurrency, CurrenciesData, ExchangeRates, BASE_CURRENCIES } from '@/types'

// ==========================================
// Load Scraped Currency Data
// ==========================================

interface RawCurrency {
  id: string
  name: string
  volume: number
  pair_count: number
  popularity_score: number
  supported: boolean
}

interface RawCurrenciesResponse {
  currencies: RawCurrency[]
  total: number
  source: string
  league: string
  fetched_at: string
  metadata: {
    scraper: string
    version: string
    top_percentage: number
  }
}

interface RawRatesResponse {
  rates: {
    [currency: string]: {
      [targetCurrency: string]: number
    }
  }
  metadata: {
    source: string
    league: string
    fetched_at: string
    ttl_seconds: number
    total_pairs: number
  }
}

/**
 * Load currencies from the scraped data
 */
export async function loadCurrencies(): Promise<CurrenciesData> {
  try {
    const [currenciesRes, ratesRes] = await Promise.all([
      fetch('/api/data/currencies.json'),
      fetch('/api/data/rates.json'),
    ])

    if (!currenciesRes.ok || !ratesRes.ok) {
      throw new Error('Failed to load currency data')
    }

    const currenciesData: RawCurrenciesResponse = await currenciesRes.json()
    const ratesData: RawRatesResponse = await ratesRes.json()

    // Process currencies with their prices
    const processedCurrencies = processCurrenciesWithPrices(
      currenciesData.currencies,
      ratesData.rates
    )

    return {
      currencies: processedCurrencies,
      total: currenciesData.total,
      source: currenciesData.source,
      league: currenciesData.league,
      fetched_at: currenciesData.fetched_at,
      metadata: currenciesData.metadata,
    }
  } catch (error) {
    console.error('Error loading currencies:', error)
    throw error
  }
}

/**
 * Process raw currencies and calculate prices in all base currencies
 */
function processCurrenciesWithPrices(
  currencies: RawCurrency[],
  rates: RawRatesResponse['rates']
): TradeableCurrency[] {
  // Get divine to exalted and divine to chaos rates
  const divineToExalted = rates.divine?.exalted || 652
  const divineToChaos = rates.divine?.chaos || 32.74

  return currencies
    .filter(c => !BASE_CURRENCIES.includes(c.id as any)) // Exclude base currencies
    .map(currency => {
      // Get the divine price for this currency
      const divinePrice = rates[currency.id]?.divine || null

      // Calculate prices in other base currencies
      let exaltedPrice: number | null = null
      let chaosPrice: number | null = null

      if (divinePrice !== null) {
        // Price in Divine means: 1 Divine = X items
        // So 1 item = 1/X Divine
        // In Exalted: 1 item = (1/X) * divineToExalted Exalted
        exaltedPrice = divinePrice * divineToExalted
        chaosPrice = divinePrice * divineToChaos
      }

      // Check if there's a direct exalted rate
      if (rates[currency.id]?.exalted) {
        exaltedPrice = rates[currency.id].exalted
      }

      return {
        id: currency.id,
        name: currency.name,
        volume: currency.volume,
        pair_count: currency.pair_count,
        popularity_score: currency.popularity_score,
        supported: currency.supported,
        prices: {
          divine: divinePrice,
          exalted: exaltedPrice,
          chaos: chaosPrice,
        },
      }
    })
    .sort((a, b) => b.popularity_score - a.popularity_score)
}

// ==========================================
// Currency Suggestions
// ==========================================

/**
 * Count how many valid prices a currency has (out of 3: divine, exalted, chaos)
 */
function countValidPrices(prices: TradeableCurrency['prices']): number {
  let count = 0
  if (prices.divine !== null && prices.divine > 0) count++
  if (prices.exalted !== null && prices.exalted > 0) count++
  if (prices.chaos !== null && prices.chaos > 0) count++
  return count
}

/**
 * Calculate the best round-trip profit margin for a currency
 * Round-trip: Base → Item → Other Base → Back to Base
 * 
 * Returns the best profit percentage across all possible round trips
 */
function calculateBestProfitMargin(
  currency: TradeableCurrency,
  chaosToExalted: number,
  divineToExalted: number
): number {
  const { prices } = currency
  
  // Exchange rates (to convert between base currencies)
  // 1 Chaos = chaosToExalted Exalted
  // 1 Divine = divineToExalted Exalted
  // Therefore: 1 Divine = divineToExalted / chaosToExalted Chaos
  const divineToChaos = divineToExalted / chaosToExalted
  
  let bestProfit = -Infinity
  
  // Calculate profit for each round-trip path
  // We assume buy = sell for scraped prices (no spread in scraped data)
  // The profit comes from exchange rate differences
  
  // Path 1: Exalted → Item → Divine → Exalted
  if (prices.exalted && prices.divine) {
    // 1 Ex → (1/exPrice) items → (1/exPrice * divPrice) Div → (1/exPrice * divPrice * divToEx) Ex
    const itemsFromEx = 1 / prices.exalted
    const divFromItems = itemsFromEx * prices.divine
    const exBack = divFromItems * divineToExalted
    const profit = (exBack - 1) * 100 // percentage
    bestProfit = Math.max(bestProfit, profit)
  }
  
  // Path 2: Exalted → Item → Chaos → Exalted
  if (prices.exalted && prices.chaos) {
    const itemsFromEx = 1 / prices.exalted
    const chaosFromItems = itemsFromEx * prices.chaos
    const exBack = chaosFromItems * chaosToExalted
    const profit = (exBack - 1) * 100
    bestProfit = Math.max(bestProfit, profit)
  }
  
  // Path 3: Chaos → Item → Divine → Chaos
  if (prices.chaos && prices.divine) {
    const itemsFromChaos = 1 / prices.chaos
    const divFromItems = itemsFromChaos * prices.divine
    const chaosBack = divFromItems * divineToChaos
    const profit = (chaosBack - 1) * 100
    bestProfit = Math.max(bestProfit, profit)
  }
  
  // Path 4: Chaos → Item → Exalted → Chaos
  if (prices.chaos && prices.exalted) {
    const itemsFromChaos = 1 / prices.chaos
    const exFromItems = itemsFromChaos * prices.exalted
    const chaosBack = exFromItems / chaosToExalted
    const profit = (chaosBack - 1) * 100
    bestProfit = Math.max(bestProfit, profit)
  }
  
  // Path 5: Divine → Item → Exalted → Divine
  if (prices.divine && prices.exalted) {
    const itemsFromDiv = 1 / prices.divine
    const exFromItems = itemsFromDiv * prices.exalted
    const divBack = exFromItems / divineToExalted
    const profit = (divBack - 1) * 100
    bestProfit = Math.max(bestProfit, profit)
  }
  
  // Path 6: Divine → Item → Chaos → Divine
  if (prices.divine && prices.chaos) {
    const itemsFromDiv = 1 / prices.divine
    const chaosFromItems = itemsFromDiv * prices.chaos
    const divBack = chaosFromItems / divineToChaos
    const profit = (divBack - 1) * 100
    bestProfit = Math.max(bestProfit, profit)
  }
  
  return bestProfit === -Infinity ? 0 : bestProfit
}

export interface CurrencyWithProfit extends TradeableCurrency {
  profitMargin: number
}

/**
 * Get suggested currencies for trading based on profit margin
 * 
 * @param currencies - List of tradeable currencies
 * @param chaosToExalted - Exchange rate: 1 Chaos = X Exalted
 * @param divineToExalted - Exchange rate: 1 Divine = X Exalted
 * @param limit - Maximum number of suggestions to return
 */
export function getSuggestedCurrencies(
  currencies: TradeableCurrency[],
  chaosToExalted: number = 19.92,
  divineToExalted: number = 652,
  limit: number = 5
): CurrencyWithProfit[] {
  // Filter currencies that have at least 2 valid prices
  const withEnoughPrices = currencies.filter(
    c => countValidPrices(c.prices) >= 2
  )

  // Calculate profit margin for each currency and sort by it
  const withProfits: CurrencyWithProfit[] = withEnoughPrices.map(currency => ({
    ...currency,
    profitMargin: calculateBestProfitMargin(currency, chaosToExalted, divineToExalted)
  }))

  // Sort by profit margin (highest first), then by volume as tiebreaker
  return withProfits
    .sort((a, b) => {
      // Primary sort: profit margin (higher is better)
      const profitDiff = b.profitMargin - a.profitMargin
      if (Math.abs(profitDiff) > 0.01) return profitDiff
      
      // Tiebreaker: volume (higher is better for liquidity)
      return b.volume - a.volume
    })
    .slice(0, limit)
}

/**
 * Search currencies by name or id
 */
export function searchCurrencies(
  currencies: TradeableCurrency[],
  query: string
): TradeableCurrency[] {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return currencies

  return currencies.filter(
    c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.id.toLowerCase().includes(lowerQuery)
  )
}

// ==========================================
// Price Formatting Helpers
// ==========================================

/**
 * Format a price for display
 */
export function formatPrice(price: number | null, decimals: number = 2): string {
  if (price === null) return '—'
  if (price >= 1000) {
    return price.toFixed(0)
  }
  if (price >= 100) {
    return price.toFixed(1)
  }
  return price.toFixed(decimals)
}

/**
 * Get the best base currency to display price in based on the price magnitude
 */
export function getBestDisplayCurrency(
  prices: TradeableCurrency['prices']
): 'divine' | 'exalted' | 'chaos' {
  if (prices.divine !== null && prices.divine >= 1 && prices.divine <= 100) {
    return 'divine'
  }
  if (prices.exalted !== null && prices.exalted >= 1 && prices.exalted <= 1000) {
    return 'exalted'
  }
  return 'chaos'
}

/**
 * Calculate potential arbitrage spread for a currency
 * (This helps suggest currencies with better profit potential)
 */
export function calculateSpreadPotential(
  currency: TradeableCurrency,
  exchangeRates: ExchangeRates
): number {
  // Simple heuristic: currencies with higher volume and multiple trading pairs
  // tend to have more arbitrage opportunities
  const volumeScore = Math.log10(currency.volume + 1)
  const pairScore = currency.pair_count * 10
  return volumeScore + pairScore
}

