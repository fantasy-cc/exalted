import { UserSettings, DEFAULT_USER_SETTINGS, PriceOverride, BaseCurrency } from '@/types'

const STORAGE_KEY = 'poe2_calculator_settings'
const CURRENCY_OVERRIDES_KEY = 'poe2_currency_overrides'
const STORAGE_VERSION = 1

// ==========================================
// Currency Override Types
// ==========================================

export interface CurrencyPriceOverride {
  currencyId: string
  prices: {
    divine: { buy: number; sell: number } | null
    exalted: { buy: number; sell: number } | null
    chaos: { buy: number; sell: number } | null
  }
  updatedAt: number
}

export interface CurrencyOverridesData {
  version: number
  overrides: Record<string, CurrencyPriceOverride>
}

interface StoredData {
  version: number
  settings: UserSettings
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const test = '__storage_test__'
    window.localStorage.setItem(test, test)
    window.localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Load user settings from localStorage
 */
export function loadSettings(): UserSettings {
  if (!isStorageAvailable()) {
    return { ...DEFAULT_USER_SETTINGS }
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { ...DEFAULT_USER_SETTINGS }
    }

    const data: StoredData = JSON.parse(stored)
    
    // Handle version migrations if needed
    if (data.version !== STORAGE_VERSION) {
      // For now, just return defaults if version mismatch
      return { ...DEFAULT_USER_SETTINGS }
    }

    return {
      ...DEFAULT_USER_SETTINGS,
      ...data.settings,
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error)
    return { ...DEFAULT_USER_SETTINGS }
  }
}

/**
 * Save user settings to localStorage
 */
export function saveSettings(settings: UserSettings): boolean {
  if (!isStorageAvailable()) {
    return false
  }

  try {
    const data: StoredData = {
      version: STORAGE_VERSION,
      settings: {
        ...settings,
        lastUpdated: Date.now(),
      },
    }
    
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error)
    return false
  }
}

/**
 * Update gold fee setting
 */
export function updateGoldFee(goldFee: number): UserSettings {
  const settings = loadSettings()
  settings.goldFeePerTrade = goldFee
  settings.lastUpdated = Date.now()
  saveSettings(settings)
  return settings
}

/**
 * Add or update a price override
 */
export function setPriceOverride(
  currencyPair: string,
  rate: number
): UserSettings {
  const settings = loadSettings()
  
  // Remove existing override for this pair if exists
  settings.priceOverrides = settings.priceOverrides.filter(
    (o) => o.currencyPair !== currencyPair
  )
  
  // Add new override
  settings.priceOverrides.push({
    currencyPair,
    rate,
    timestamp: Date.now(),
  })
  
  settings.lastUpdated = Date.now()
  saveSettings(settings)
  return settings
}

/**
 * Remove a price override
 */
export function removePriceOverride(currencyPair: string): UserSettings {
  const settings = loadSettings()
  settings.priceOverrides = settings.priceOverrides.filter(
    (o) => o.currencyPair !== currencyPair
  )
  settings.lastUpdated = Date.now()
  saveSettings(settings)
  return settings
}

/**
 * Get a specific price override
 */
export function getPriceOverride(currencyPair: string): PriceOverride | null {
  const settings = loadSettings()
  return settings.priceOverrides.find((o) => o.currencyPair === currencyPair) || null
}

/**
 * Clear all price overrides
 */
export function clearAllOverrides(): UserSettings {
  const settings = loadSettings()
  settings.priceOverrides = []
  settings.lastUpdated = Date.now()
  saveSettings(settings)
  return settings
}

/**
 * Reset all settings to defaults
 */
export function resetSettings(): UserSettings {
  const settings = { ...DEFAULT_USER_SETTINGS, lastUpdated: Date.now() }
  saveSettings(settings)
  return settings
}

/**
 * Export settings as JSON (for backup)
 */
export function exportSettings(): string {
  const settings = loadSettings()
  return JSON.stringify(settings, null, 2)
}

/**
 * Import settings from JSON (for restore)
 */
export function importSettings(json: string): UserSettings | null {
  try {
    const imported = JSON.parse(json) as UserSettings
    
    // Validate required fields
    if (typeof imported.goldFeePerTrade !== 'number') {
      throw new Error('Invalid goldFeePerTrade')
    }
    if (!Array.isArray(imported.priceOverrides)) {
      throw new Error('Invalid priceOverrides')
    }
    
    const settings: UserSettings = {
      goldFeePerTrade: imported.goldFeePerTrade,
      priceOverrides: imported.priceOverrides,
      lastUpdated: Date.now(),
    }
    
    saveSettings(settings)
    return settings
  } catch (error) {
    console.error('Failed to import settings:', error)
    return null
  }
}

/**
 * Hook-friendly settings manager
 */
export const settingsManager = {
  load: loadSettings,
  save: saveSettings,
  updateGoldFee,
  setPriceOverride,
  removePriceOverride,
  getPriceOverride,
  clearAllOverrides,
  reset: resetSettings,
  export: exportSettings,
  import: importSettings,
}

// ==========================================
// Currency-Specific Override Functions
// ==========================================

/**
 * Load all currency overrides from localStorage
 */
export function loadCurrencyOverrides(): Record<string, CurrencyPriceOverride> {
  if (!isStorageAvailable()) {
    return {}
  }

  try {
    const stored = window.localStorage.getItem(CURRENCY_OVERRIDES_KEY)
    if (!stored) {
      return {}
    }

    const data: CurrencyOverridesData = JSON.parse(stored)
    return data.overrides || {}
  } catch (error) {
    console.error('Failed to load currency overrides:', error)
    return {}
  }
}

/**
 * Save all currency overrides to localStorage
 */
function saveCurrencyOverrides(overrides: Record<string, CurrencyPriceOverride>): boolean {
  if (!isStorageAvailable()) {
    return false
  }

  try {
    const data: CurrencyOverridesData = {
      version: STORAGE_VERSION,
      overrides,
    }
    window.localStorage.setItem(CURRENCY_OVERRIDES_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Failed to save currency overrides:', error)
    return false
  }
}

/**
 * Get override for a specific currency
 */
export function getCurrencyOverride(currencyId: string): CurrencyPriceOverride | null {
  const overrides = loadCurrencyOverrides()
  return overrides[currencyId] || null
}

/**
 * Save override for a specific currency
 */
export function saveCurrencyOverride(
  currencyId: string,
  prices: {
    divine?: { buy: number; sell: number } | null
    exalted?: { buy: number; sell: number } | null
    chaos?: { buy: number; sell: number } | null
  }
): CurrencyPriceOverride {
  const overrides = loadCurrencyOverrides()
  
  const existing = overrides[currencyId]
  const override: CurrencyPriceOverride = {
    currencyId,
    prices: {
      divine: prices.divine !== undefined ? prices.divine : existing?.prices.divine || null,
      exalted: prices.exalted !== undefined ? prices.exalted : existing?.prices.exalted || null,
      chaos: prices.chaos !== undefined ? prices.chaos : existing?.prices.chaos || null,
    },
    updatedAt: Date.now(),
  }
  
  overrides[currencyId] = override
  saveCurrencyOverrides(overrides)
  
  return override
}

/**
 * Update a single price for a currency
 */
export function updateCurrencyPrice(
  currencyId: string,
  baseCurrency: BaseCurrency,
  priceType: 'buy' | 'sell',
  value: number
): CurrencyPriceOverride | null {
  const overrides = loadCurrencyOverrides()
  const existing = overrides[currencyId] || {
    currencyId,
    prices: { divine: null, exalted: null, chaos: null },
    updatedAt: Date.now(),
  }
  
  // Ensure the price object exists
  if (!existing.prices[baseCurrency]) {
    existing.prices[baseCurrency] = { buy: 0, sell: 0 }
  }
  
  existing.prices[baseCurrency]![priceType] = value
  existing.updatedAt = Date.now()
  
  overrides[currencyId] = existing
  saveCurrencyOverrides(overrides)
  
  return existing
}

/**
 * Clear override for a specific currency
 */
export function clearCurrencyOverride(currencyId: string): void {
  const overrides = loadCurrencyOverrides()
  delete overrides[currencyId]
  saveCurrencyOverrides(overrides)
}

/**
 * Clear all currency overrides
 */
export function clearAllCurrencyOverrides(): void {
  if (!isStorageAvailable()) return
  window.localStorage.removeItem(CURRENCY_OVERRIDES_KEY)
}

/**
 * Check if a currency has any overrides
 */
export function hasCurrencyOverride(currencyId: string): boolean {
  const override = getCurrencyOverride(currencyId)
  if (!override) return false
  
  // Check if any price is set
  return (
    override.prices.divine !== null ||
    override.prices.exalted !== null ||
    override.prices.chaos !== null
  )
}

/**
 * Get merged prices (market + overrides)
 * Returns the override price if available, otherwise the market price
 */
export function getMergedPrices(
  currencyId: string,
  marketPrices: {
    divine: number | null
    exalted: number | null
    chaos: number | null
  }
): {
  prices: {
    divine: { buy: number; sell: number; isOverride: boolean } | null
    exalted: { buy: number; sell: number; isOverride: boolean } | null
    chaos: { buy: number; sell: number; isOverride: boolean } | null
  }
  hasOverrides: boolean
} {
  const override = getCurrencyOverride(currencyId)
  
  const result = {
    prices: {
      divine: null as { buy: number; sell: number; isOverride: boolean } | null,
      exalted: null as { buy: number; sell: number; isOverride: boolean } | null,
      chaos: null as { buy: number; sell: number; isOverride: boolean } | null,
    },
    hasOverrides: false,
  }
  
  // Process each base currency
  const baseCurrencies: BaseCurrency[] = ['divine', 'exalted', 'chaos']
  
  for (const currency of baseCurrencies) {
    const marketPrice = marketPrices[currency]
    const overridePrice = override?.prices[currency]
    
    if (overridePrice !== null && overridePrice !== undefined) {
      // Use override
      result.prices[currency] = {
        buy: overridePrice.buy,
        sell: overridePrice.sell,
        isOverride: true,
      }
      result.hasOverrides = true
    } else if (marketPrice !== null) {
      // Use market price (same for buy and sell initially)
      result.prices[currency] = {
        buy: marketPrice,
        sell: marketPrice,
        isOverride: false,
      }
    }
  }
  
  return result
}

/**
 * Currency overrides manager
 */
export const currencyOverridesManager = {
  load: loadCurrencyOverrides,
  get: getCurrencyOverride,
  save: saveCurrencyOverride,
  updatePrice: updateCurrencyPrice,
  clear: clearCurrencyOverride,
  clearAll: clearAllCurrencyOverrides,
  has: hasCurrencyOverride,
  getMerged: getMergedPrices,
}

export default settingsManager

