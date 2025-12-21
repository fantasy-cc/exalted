// ==========================================
// Currency Types
// ==========================================

export type BaseCurrency = 'exalted' | 'chaos' | 'divine'

export const BASE_CURRENCIES: BaseCurrency[] = ['exalted', 'chaos', 'divine']

export interface Currency {
  id: string
  name: string
  shortName: string
  icon?: string
  isBase: boolean
}

export const CURRENCY_INFO: Record<BaseCurrency, Currency> = {
  exalted: {
    id: 'exalted',
    name: 'Exalted Orb',
    shortName: 'Ex',
    isBase: true,
  },
  chaos: {
    id: 'chaos',
    name: 'Chaos Orb',
    shortName: 'C',
    isBase: true,
  },
  divine: {
    id: 'divine',
    name: 'Divine Orb',
    shortName: 'Div',
    isBase: true,
  },
}

// ==========================================
// Exchange Rate Types
// ==========================================

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  source: 'scraped' | 'user_override'
  timestamp?: number
}

export interface ExchangeRates {
  // Rate from currency A to currency B
  // e.g., rates['chaos']['exalted'] = 50 means 1 Chaos = 50 Exalted
  [fromCurrency: string]: {
    [toCurrency: string]: number
  }
}

export interface RatesMetadata {
  source: string
  league: string
  fetched_at: string
  ttl_seconds: number
  total_pairs: number
}

export interface RatesResponse {
  rates: ExchangeRates
  metadata: RatesMetadata
}

// ==========================================
// User Override Types
// ==========================================

export interface PriceOverride {
  currencyPair: string // e.g., "chaos_exalted"
  rate: number
  timestamp: number
}

export interface UserSettings {
  goldFeePerTrade: number // Default: 1000
  priceOverrides: PriceOverride[]
  lastUpdated: number
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  goldFeePerTrade: 1000,
  priceOverrides: [],
  lastUpdated: Date.now(),
}

// ==========================================
// Tradeable Currency Types (scraped data)
// ==========================================

export interface TradeableCurrency {
  id: string
  name: string
  volume: number
  pair_count: number
  popularity_score: number
  supported: boolean
  // Calculated prices in base currencies
  prices: {
    divine: number | null    // Price in Divine Orbs
    exalted: number | null   // Price in Exalted Orbs
    chaos: number | null     // Price in Chaos Orbs
  }
}

export interface CurrenciesData {
  currencies: TradeableCurrency[]
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

// ==========================================
// Selected Item for Trading
// ==========================================

export interface SelectedItem {
  currency: TradeableCurrency
  // User-adjustable prices (defaults from scraped, user can override)
  buyPrices: {
    exalted: number
    chaos: number
    divine: number
  }
  sellPrices: {
    exalted: number
    chaos: number
    divine: number
  }
}

// ==========================================
// Item Price Types (for arbitrage calculation)
// ==========================================

export interface ItemPrice {
  buyPrice: number // Price to buy from market
  sellPrice: number // Price to sell to market
  currency: BaseCurrency
}

export interface ItemPrices {
  exalted: ItemPrice | null
  chaos: ItemPrice | null
  divine: ItemPrice | null
}

// ==========================================
// Arbitrage Types
// ==========================================

export interface TradeStep {
  action: 'buy' | 'sell' | 'convert'
  from: string
  to: string
  amount: number
  rate: number
  resultAmount: number
  goldFee: number
}

export interface ArbitrageStrategy {
  id: string
  name: string
  description: string
  path: string[] // e.g., ['exalted', 'item', 'divine', 'exalted']
  steps: TradeStep[]
  
  // Financial results
  startingAmount: number
  startingCurrency: BaseCurrency
  finalAmount: number
  
  // Profit calculations
  grossProfit: number
  totalGoldFee: number
  netProfit: number
  profitPercentage: number
  
  // Gold efficiency
  goldEfficiency: number // Profit per 1000 gold spent
  
  // Viability
  isViable: boolean
  viabilityReason?: string
}

export interface ArbitrageResult {
  strategies: ArbitrageStrategy[]
  bestStrategy: ArbitrageStrategy | null
  calculatedAt: number
  
  // Input parameters
  itemPrices: ItemPrices
  exchangeRates: ExchangeRates
  goldFeePerTrade: number
}

// ==========================================
// Calculator State Types
// ==========================================

export interface CalculatorState {
  // Exchange rates (base currency conversions)
  chaosToExalted: number
  divineToExalted: number
  
  // Gold fee setting
  goldFeePerTrade: number
  
  // Item prices
  itemExaltedBuy: number
  itemExaltedSell: number
  itemChaosBuy: number
  itemChaosSell: number
  itemDivineBuy: number
  itemDivineSell: number
  
  // UI state
  isCalculating: boolean
  hasCalculated: boolean
  error: string | null
}

export const DEFAULT_CALCULATOR_STATE: CalculatorState = {
  chaosToExalted: 50, // Default: 1 Chaos = 50 Exalted
  divineToExalted: 650, // Default: 1 Divine = 650 Exalted
  goldFeePerTrade: 1000,
  itemExaltedBuy: 0,
  itemExaltedSell: 0,
  itemChaosBuy: 0,
  itemChaosSell: 0,
  itemDivineBuy: 0,
  itemDivineSell: 0,
  isCalculating: false,
  hasCalculated: false,
  error: null,
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

// ==========================================
// Future: Authentication Types (placeholder)
// ==========================================

export interface User {
  id: string
  email: string
  displayName?: string
  createdAt: number
}

export interface SavedStrategy {
  id: string
  userId: string
  strategy: ArbitrageStrategy
  notes?: string
  savedAt: number
}

// ==========================================
// Future: Price History Types (placeholder)
// ==========================================

export interface PriceHistoryPoint {
  timestamp: number
  rate: number
}

export interface PriceHistory {
  currencyPair: string
  dataPoints: PriceHistoryPoint[]
  timeRange: {
    start: number
    end: number
  }
}

