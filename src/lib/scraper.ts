/**
 * Lightweight POE2Scout scraper for serverless environments
 * Uses fetch + HTML parsing (no Playwright required)
 */

import { TradeableCurrency, ExchangeRates } from '@/types'

const POE2SCOUT_URL = 'https://poe2scout.com/exchange'
const SCRAPE_TIMEOUT = 10000 // 10 seconds

// Mapping from POE2Scout display names to our internal keys
const NAME_TO_KEY_MAP: Record<string, string> = {
  // Core currencies
  'Divine Orb': 'divine',
  'Exalted Orb': 'exalted',
  'Chaos Orb': 'chaos',
  
  // Popular currencies
  'Mirror of Kalandra': 'mirror',
  'Perfect Exalted Orb': 'perfect_exalted',
  'Orb of Annulment': 'orb_annulment',
  'Orb of Chance': 'orb_chance',
  'Perfect Chaos Orb': 'perfect_chaos',
  'Fracturing Orb': 'fracturing_orb',
  'Greater Exalted Orb': 'greater_exalted',
  "Perfect Jeweller's Orb": 'perfect_jeweller',
  'Uncut Skill Gem (Level 20)': 'uncut_gem_20',
  
  // Omens
  'Omen of Light': 'omen_light',
  'Omen of Homogenising Exaltation': 'omen_homogenising',
  'Omen of Abyssal Echoes': 'omen_abyssal',
  'Omen of Whittling': 'omen_whittling',
  'Omen of Chaotic Rarity': 'omen_chaotic',
  'Omen of Amelioration': 'omen_amelioration',
  
  // Special items
  "Rakiata's Flow": 'rakiata_flow',
  'Talisman of Sirrius': 'talisman_sirrius',
  "Hinekora's Lock": 'hinekora_lock',
  "Farrul's Rune of the Chase": 'farrul_rune',
  "Atalui's Bloodletting": 'atalui_bloodletting',
  'Essence of Horror': 'essence_horror',
}

// Reverse mapping for display names
const KEY_TO_NAME_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_KEY_MAP).map(([name, key]) => [key, name])
)

export interface ScrapeResult {
  currencies: TradeableCurrency[]
  rates: ExchangeRates
  metadata: {
    source: 'live' | 'static'
    scrapedAt: string
    pairCount: number
    currencyCount: number
  }
}

/**
 * Map a currency display name to internal key
 */
function mapCurrencyName(displayName: string): string | null {
  // Try exact match first
  if (NAME_TO_KEY_MAP[displayName]) {
    return NAME_TO_KEY_MAP[displayName]
  }
  
  // Try case-insensitive match
  const lowerName = displayName.toLowerCase()
  for (const [name, key] of Object.entries(NAME_TO_KEY_MAP)) {
    if (name.toLowerCase() === lowerName) {
      return key
    }
  }
  
  // Create a dynamic key for unknown currencies
  return createDynamicKey(displayName)
}

/**
 * Create a snake_case key from a display name
 */
function createDynamicKey(displayName: string): string {
  return displayName
    .replace(/['']/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/**
 * Parse trading pair rate from HTML content
 */
function extractTradingPairRate(
  html: string, 
  fromCurrency: string, 
  toCurrency: string
): number | null {
  try {
    // Pattern: "Divine Orb/ Exalted Orb1.00 = 139.91"
    // We look for the pattern with both currencies and extract the rate
    
    const fromEscaped = fromCurrency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const toEscaped = toCurrency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Direct pair pattern
    const directPattern = new RegExp(
      `${fromEscaped}[^/]*\\/[^1]*${toEscaped}[^1]*1\\.00\\s*=\\s*([0-9,]+(?:\\.[0-9]+)?)`,
      'i'
    )
    
    let match = html.match(directPattern)
    if (match) {
      const rate = parseFloat(match[1].replace(/,/g, ''))
      if (rate > 0) return rate
    }
    
    // Reverse pair pattern (need to invert)
    const reversePattern = new RegExp(
      `${toEscaped}[^/]*\\/[^1]*${fromEscaped}[^1]*1\\.00\\s*=\\s*([0-9,]+(?:\\.[0-9]+)?)`,
      'i'
    )
    
    match = html.match(reversePattern)
    if (match) {
      const rate = parseFloat(match[1].replace(/,/g, ''))
      if (rate > 0) return 1 / rate
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Parse all trading pairs from HTML
 */
function parseTradingPairs(html: string): Map<string, Map<string, number>> {
  const rates = new Map<string, Map<string, number>>()
  
  // Priority pairs to extract
  const priorityPairs = [
    ['Divine Orb', 'Exalted Orb'],
    ['Divine Orb', 'Chaos Orb'],
    ['Chaos Orb', 'Exalted Orb'],
    ['Exalted Orb', 'Divine Orb'],
    ['Chaos Orb', 'Divine Orb'],
    ['Exalted Orb', 'Chaos Orb'],
  ]
  
  // Extract priority pairs first
  for (const [fromName, toName] of priorityPairs) {
    const rate = extractTradingPairRate(html, fromName, toName)
    if (rate !== null) {
      const fromKey = mapCurrencyName(fromName)
      const toKey = mapCurrencyName(toName)
      
      if (fromKey && toKey) {
        if (!rates.has(fromKey)) {
          rates.set(fromKey, new Map())
        }
        rates.get(fromKey)!.set(toKey, rate)
      }
    }
  }
  
  // Extract rates for all known currencies to Exalted (most common base)
  for (const currencyName of Object.keys(NAME_TO_KEY_MAP)) {
    if (currencyName !== 'Exalted Orb') {
      const rate = extractTradingPairRate(html, currencyName, 'Exalted Orb')
      if (rate !== null) {
        const fromKey = mapCurrencyName(currencyName)
        if (fromKey) {
          if (!rates.has(fromKey)) {
            rates.set(fromKey, new Map())
          }
          rates.get(fromKey)!.set('exalted', rate)
        }
      }
    }
  }
  
  // Extract rates for all known currencies to Divine
  for (const currencyName of Object.keys(NAME_TO_KEY_MAP)) {
    if (currencyName !== 'Divine Orb') {
      const rate = extractTradingPairRate(html, currencyName, 'Divine Orb')
      if (rate !== null) {
        const fromKey = mapCurrencyName(currencyName)
        if (fromKey) {
          if (!rates.has(fromKey)) {
            rates.set(fromKey, new Map())
          }
          rates.get(fromKey)!.set('divine', rate)
        }
      }
    }
  }
  
  return rates
}

/**
 * Build currency list from scraped rates
 */
function buildCurrencyList(
  rates: Map<string, Map<string, number>>,
  divineToExalted: number,
  chaosToExalted: number
): TradeableCurrency[] {
  const currencies: TradeableCurrency[] = []
  const seenKeys = new Set<string>()
  
  // Add all currencies that appear in rates
  for (const [fromKey, toRates] of rates) {
    if (!seenKeys.has(fromKey)) {
      seenKeys.add(fromKey)
      
      const exaltedPrice = toRates.get('exalted') || null
      const divinePrice = toRates.get('divine') || null
      
      // Calculate chaos price from exalted if available
      let chaosPrice: number | null = null
      if (exaltedPrice !== null) {
        chaosPrice = exaltedPrice / chaosToExalted
      } else if (divinePrice !== null) {
        chaosPrice = divinePrice * divineToExalted / chaosToExalted
      }
      
      currencies.push({
        id: fromKey,
        name: KEY_TO_NAME_MAP[fromKey] || fromKey,
        volume: 0, // Not available from HTML scraping
        pair_count: toRates.size,
        popularity_score: toRates.size * 10, // Simple score based on pair count
        supported: true,
        prices: {
          exalted: exaltedPrice,
          divine: divinePrice,
          chaos: chaosPrice,
        }
      })
    }
    
    // Also add target currencies
    for (const toKey of toRates.keys()) {
      if (!seenKeys.has(toKey)) {
        seenKeys.add(toKey)
        // Will be filled in later with reverse rates
      }
    }
  }
  
  // Sort by popularity (pair count)
  currencies.sort((a, b) => b.pair_count - a.pair_count)
  
  return currencies
}

/**
 * Convert rates map to ExchangeRates object
 */
function convertRatesToObject(rates: Map<string, Map<string, number>>): ExchangeRates {
  const result: ExchangeRates = {}
  
  for (const [fromKey, toRates] of rates) {
    result[fromKey] = {}
    for (const [toKey, rate] of toRates) {
      result[fromKey][toKey] = rate
    }
  }
  
  return result
}

/**
 * Scrape live prices from POE2Scout
 */
export async function scrapeLivePrices(): Promise<ScrapeResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT)
  
  try {
    const response = await fetch(POE2SCOUT_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; poe2-arbitrage/2.0)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const ratesMap = parseTradingPairs(html)
    
    if (ratesMap.size < 3) {
      throw new Error(`Insufficient data: only ${ratesMap.size} currency pairs found`)
    }
    
    // Get key exchange rates for calculations
    const divineToExalted = ratesMap.get('divine')?.get('exalted') || 652
    const chaosToExalted = ratesMap.get('chaos')?.get('exalted') || 19.92
    
    const currencies = buildCurrencyList(ratesMap, divineToExalted, chaosToExalted)
    const rates = convertRatesToObject(ratesMap)
    
    return {
      currencies,
      rates,
      metadata: {
        source: 'live',
        scrapedAt: new Date().toISOString(),
        pairCount: ratesMap.size,
        currencyCount: currencies.length,
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Scrape timeout: POE2Scout took too long to respond')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Load prices from static JSON files (fallback)
 */
export async function loadStaticPrices(): Promise<ScrapeResult> {
  // In Next.js, we can load from the public folder
  const [currenciesRes, ratesRes] = await Promise.all([
    fetch('/api/data/currencies.json'),
    fetch('/api/data/rates.json'),
  ])
  
  if (!currenciesRes.ok || !ratesRes.ok) {
    throw new Error('Failed to load static price data')
  }
  
  const currenciesData = await currenciesRes.json()
  const ratesData = await ratesRes.json()
  
  return {
    currencies: currenciesData.currencies || [],
    rates: ratesData.rates || {},
    metadata: {
      source: 'static',
      scrapedAt: currenciesData.fetched_at || new Date().toISOString(),
      pairCount: ratesData.metadata?.total_pairs || 0,
      currencyCount: currenciesData.currencies?.length || 0,
    }
  }
}

