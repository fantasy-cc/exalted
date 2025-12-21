import { NextResponse } from 'next/server'
import { TradeableCurrency, ExchangeRates } from '@/types'
import * as fs from 'fs'
import * as path from 'path'

// In-memory cache
interface CacheEntry {
  currencies: TradeableCurrency[]
  rates: ExchangeRates
  metadata: {
    source: 'live' | 'static' | 'cache'
    scrapedAt: string
    pairCount: number
    currencyCount: number
  }
  cachedAt: number
}

let priceCache: CacheEntry | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// POE2Scout scraping configuration
const POE2SCOUT_URL = 'https://poe2scout.com/exchange'
const SCRAPE_TIMEOUT = 8000 // 8 seconds (leave room for response processing)

// Name to key mapping
const NAME_TO_KEY_MAP: Record<string, string> = {
  'Divine Orb': 'divine',
  'Exalted Orb': 'exalted',
  'Chaos Orb': 'chaos',
  'Mirror of Kalandra': 'mirror',
  'Perfect Exalted Orb': 'perfect_exalted',
  'Orb of Annulment': 'orb_annulment',
  'Orb of Chance': 'orb_chance',
  'Perfect Chaos Orb': 'perfect_chaos',
  'Fracturing Orb': 'fracturing_orb',
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
  'Essence of Horror': 'essence_horror',
}

const KEY_TO_NAME_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_KEY_MAP).map(([name, key]) => [key, name])
)

function mapCurrencyName(displayName: string): string | null {
  if (NAME_TO_KEY_MAP[displayName]) {
    return NAME_TO_KEY_MAP[displayName]
  }
  
  const lowerName = displayName.toLowerCase()
  for (const [name, key] of Object.entries(NAME_TO_KEY_MAP)) {
    if (name.toLowerCase() === lowerName) {
      return key
    }
  }
  
  // Create dynamic key
  return displayName
    .replace(/['']/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function extractTradingPairRate(html: string, fromCurrency: string, toCurrency: string): number | null {
  try {
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
    
    // Reverse pair pattern
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

async function scrapeLivePrices(): Promise<CacheEntry> {
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
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    // Parse trading pairs
    const rates: Record<string, Record<string, number>> = {}
    const priorityPairs = [
      ['Divine Orb', 'Exalted Orb'],
      ['Divine Orb', 'Chaos Orb'],
      ['Chaos Orb', 'Exalted Orb'],
      ['Exalted Orb', 'Divine Orb'],
      ['Chaos Orb', 'Divine Orb'],
      ['Exalted Orb', 'Chaos Orb'],
    ]
    
    for (const [fromName, toName] of priorityPairs) {
      const rate = extractTradingPairRate(html, fromName, toName)
      if (rate !== null) {
        const fromKey = mapCurrencyName(fromName)
        const toKey = mapCurrencyName(toName)
        if (fromKey && toKey) {
          if (!rates[fromKey]) rates[fromKey] = {}
          rates[fromKey][toKey] = rate
        }
      }
    }
    
    // Extract rates for all known currencies to Exalted
    for (const currencyName of Object.keys(NAME_TO_KEY_MAP)) {
      if (currencyName !== 'Exalted Orb') {
        const rate = extractTradingPairRate(html, currencyName, 'Exalted Orb')
        if (rate !== null) {
          const fromKey = mapCurrencyName(currencyName)
          if (fromKey) {
            if (!rates[fromKey]) rates[fromKey] = {}
            rates[fromKey]['exalted'] = rate
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
            if (!rates[fromKey]) rates[fromKey] = {}
            rates[fromKey]['divine'] = rate
          }
        }
      }
    }
    
    // Build currency list
    const divineToExalted = rates['divine']?.['exalted'] || 652
    const chaosToExalted = rates['chaos']?.['exalted'] || 19.92
    
    const currencies: TradeableCurrency[] = []
    const seenKeys = new Set<string>()
    
    for (const [fromKey, toRates] of Object.entries(rates)) {
      if (!seenKeys.has(fromKey)) {
        seenKeys.add(fromKey)
        
        const exaltedPrice = toRates['exalted'] || null
        const divinePrice = toRates['divine'] || null
        let chaosPrice: number | null = null
        
        if (exaltedPrice !== null) {
          chaosPrice = exaltedPrice / chaosToExalted
        } else if (divinePrice !== null) {
          chaosPrice = divinePrice * divineToExalted / chaosToExalted
        }
        
        currencies.push({
          id: fromKey,
          name: KEY_TO_NAME_MAP[fromKey] || fromKey,
          volume: 0,
          pair_count: Object.keys(toRates).length,
          popularity_score: Object.keys(toRates).length * 10,
          supported: true,
          prices: {
            exalted: exaltedPrice,
            divine: divinePrice,
            chaos: chaosPrice,
          }
        })
      }
    }
    
    currencies.sort((a, b) => b.pair_count - a.pair_count)
    
    const pairCount = Object.values(rates).reduce((sum, r) => sum + Object.keys(r).length, 0)
    
    if (pairCount < 3) {
      throw new Error(`Insufficient data: only ${pairCount} pairs found`)
    }
    
    return {
      currencies,
      rates,
      metadata: {
        source: 'live',
        scrapedAt: new Date().toISOString(),
        pairCount,
        currencyCount: currencies.length,
      },
      cachedAt: Date.now(),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function loadStaticPrices(): Promise<CacheEntry> {
  // Read from static JSON files in api/data
  const dataDir = path.join(process.cwd(), 'api', 'data')
  
  const currenciesPath = path.join(dataDir, 'currencies.json')
  const ratesPath = path.join(dataDir, 'rates.json')
  
  const currenciesData = JSON.parse(fs.readFileSync(currenciesPath, 'utf-8'))
  const ratesData = JSON.parse(fs.readFileSync(ratesPath, 'utf-8'))
  
  return {
    currencies: currenciesData.currencies || [],
    rates: ratesData.rates || {},
    metadata: {
      source: 'static',
      scrapedAt: currenciesData.fetched_at || new Date().toISOString(),
      pairCount: ratesData.metadata?.total_pairs || 0,
      currencyCount: currenciesData.currencies?.length || 0,
    },
    cachedAt: Date.now(),
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('refresh') === 'true'
  
  try {
    // Check cache
    if (!forceRefresh && priceCache && (Date.now() - priceCache.cachedAt) < CACHE_TTL) {
      return NextResponse.json({
        ...priceCache,
        metadata: {
          ...priceCache.metadata,
          source: 'cache' as const,
        }
      })
    }
    
    // Try live scraping first
    try {
      priceCache = await scrapeLivePrices()
      return NextResponse.json(priceCache)
    } catch (scrapeError) {
      console.warn('Live scraping failed, using static data:', scrapeError)
      
      // Fall back to static data
      priceCache = await loadStaticPrices()
      return NextResponse.json(priceCache)
    }
  } catch (error) {
    console.error('Failed to get prices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices', message: String(error) },
      { status: 500 }
    )
  }
}

