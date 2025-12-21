import { RatesResponse, ExchangeRates, PriceOverride } from '@/types'
import { getPriceOverride } from './storage'

const API_BASE_URL = '/api/data'

/**
 * Fetch exchange rates from the static JSON data
 */
export async function fetchRates(): Promise<RatesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/rates.json`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rates: ${response.status}`)
    }
    
    const data: RatesResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching rates:', error)
    // Return fallback rates if fetch fails
    return getFallbackRates()
  }
}

/**
 * Get fallback rates when API is unavailable
 */
function getFallbackRates(): RatesResponse {
  return {
    rates: {
      divine: {
        chaos: 32.74,
        exalted: 652.02,
      },
      chaos: {
        divine: 1 / 32.74,
        exalted: 652.02 / 32.74, // ~19.91
      },
      exalted: {
        divine: 1 / 652.02,
        chaos: 32.74 / 652.02, // ~0.05
      },
    },
    metadata: {
      source: 'fallback',
      league: 'Rise of the Abyssal',
      fetched_at: new Date().toISOString(),
      ttl_seconds: 300,
      total_pairs: 6,
    },
  }
}

/**
 * Extract the Chaos to Exalted rate from rates data
 * This represents: 1 Chaos = X Exalted
 */
export function getChaosToExaltedRate(rates: ExchangeRates): number {
  // Check if we have divine -> chaos and divine -> exalted
  if (rates.divine?.chaos && rates.divine?.exalted) {
    // 1 Divine = X Chaos, 1 Divine = Y Exalted
    // Therefore: 1 Chaos = Y/X Exalted
    return rates.divine.exalted / rates.divine.chaos
  }
  
  // Direct rate if available
  if (rates.chaos?.exalted) {
    return rates.chaos.exalted
  }
  
  // Fallback
  return 19.91
}

/**
 * Extract the Divine to Exalted rate from rates data
 * This represents: 1 Divine = X Exalted
 */
export function getDivineToExaltedRate(rates: ExchangeRates): number {
  // Direct rate
  if (rates.divine?.exalted) {
    return rates.divine.exalted
  }
  
  // Fallback
  return 652.02
}

/**
 * Apply user overrides to fetched rates
 */
export function applyOverrides(
  chaosToExalted: number,
  divineToExalted: number
): { chaosToExalted: number; divineToExalted: number } {
  // Check for user overrides
  const chaosOverride = getPriceOverride('chaos_exalted')
  const divineOverride = getPriceOverride('divine_exalted')
  
  return {
    chaosToExalted: chaosOverride?.rate ?? chaosToExalted,
    divineToExalted: divineOverride?.rate ?? divineToExalted,
  }
}

/**
 * Check if a rate has a user override
 */
export function hasOverride(currencyPair: string): boolean {
  return getPriceOverride(currencyPair) !== null
}

/**
 * Format rate for display
 */
export function formatRate(rate: number, decimals: number = 2): string {
  if (rate >= 1000) {
    return rate.toFixed(0)
  }
  if (rate >= 100) {
    return rate.toFixed(1)
  }
  return rate.toFixed(decimals)
}

/**
 * Parse a rate string input (supports formats like "1:50" or "50")
 */
export function parseRateInput(input: string): number | null {
  const trimmed = input.trim()
  
  // Handle ratio format "1:50" or "1:50.5"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0])
      const denominator = parseFloat(parts[1])
      if (!isNaN(numerator) && !isNaN(denominator) && numerator > 0) {
        return denominator / numerator
      }
    }
    return null
  }
  
  // Handle simple number
  const value = parseFloat(trimmed)
  if (!isNaN(value) && value > 0) {
    return value
  }
  
  return null
}

/**
 * Convert rate to ratio string for display
 */
export function rateToRatio(rate: number): string {
  if (rate >= 1) {
    return `1:${formatRate(rate)}`
  }
  // For rates less than 1, invert
  return `${formatRate(1 / rate)}:1`
}

/**
 * Calculate data freshness
 */
export function getDataFreshness(fetchedAt: string): {
  isStale: boolean
  ageMinutes: number
  ageText: string
} {
  const fetchedTime = new Date(fetchedAt).getTime()
  const now = Date.now()
  const ageMs = now - fetchedTime
  const ageMinutes = Math.floor(ageMs / 60000)
  
  // Data is considered stale after 10 minutes
  const isStale = ageMinutes > 10
  
  let ageText: string
  if (ageMinutes < 1) {
    ageText = 'Just now'
  } else if (ageMinutes === 1) {
    ageText = '1 minute ago'
  } else if (ageMinutes < 60) {
    ageText = `${ageMinutes} minutes ago`
  } else {
    const hours = Math.floor(ageMinutes / 60)
    ageText = hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  
  return { isStale, ageMinutes, ageText }
}

