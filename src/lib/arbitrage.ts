import {
  ArbitrageResult,
  ArbitrageStrategy,
  BaseCurrency,
  ItemPrices,
  TradeStep,
  CURRENCY_INFO,
} from '@/types'

/**
 * Calculate all possible arbitrage strategies for an item
 * 
 * Strategy paths (simplified):
 * 1. Exalted -> Buy Item -> Sell Item for Divine -> Convert Divine to Exalted
 * 2. Exalted -> Buy Item -> Sell Item for Chaos -> Convert Chaos to Exalted
 * 3. Chaos -> Buy Item -> Sell Item for Exalted -> Convert Exalted to Chaos
 * 4. Chaos -> Buy Item -> Sell Item for Divine -> Convert Divine to Chaos
 * 5. Divine -> Buy Item -> Sell Item for Exalted -> Convert Exalted to Divine
 * 6. Divine -> Buy Item -> Sell Item for Chaos -> Convert Chaos to Divine
 */

interface ConversionRates {
  chaosToExalted: number  // 1 Chaos = X Exalted
  divineToExalted: number // 1 Divine = X Exalted
}

/**
 * Calculate the conversion rate between any two base currencies
 */
function getConversionRate(
  from: BaseCurrency,
  to: BaseCurrency,
  rates: ConversionRates
): number {
  if (from === to) return 1

  // Everything is expressed in terms of Exalted
  // chaosToExalted: how many Exalted per Chaos
  // divineToExalted: how many Exalted per Divine

  const toExalted: Record<BaseCurrency, number> = {
    exalted: 1,
    chaos: rates.chaosToExalted,
    divine: rates.divineToExalted,
  }

  // Convert: from -> exalted -> to
  const fromInExalted = toExalted[from]
  const toInExalted = toExalted[to]

  // Rate: how much `to` currency you get for 1 `from` currency
  return fromInExalted / toInExalted
}

/**
 * Generate a unique strategy ID
 */
function generateStrategyId(
  startCurrency: BaseCurrency,
  endCurrency: BaseCurrency
): string {
  return `${startCurrency}_item_${endCurrency}_${startCurrency}`
}

/**
 * Calculate a single arbitrage strategy
 */
function calculateStrategy(
  startCurrency: BaseCurrency,
  sellCurrency: BaseCurrency,
  itemPrices: ItemPrices,
  rates: ConversionRates,
  goldFeePerTrade: number,
  startingAmount: number = 1
): ArbitrageStrategy | null {
  // Get the buy price in start currency
  const buyPriceData = itemPrices[startCurrency as keyof ItemPrices]
  if (!buyPriceData || buyPriceData.buyPrice <= 0) {
    return null
  }

  // Get the sell price in sell currency
  const sellPriceData = itemPrices[sellCurrency as keyof ItemPrices]
  if (!sellPriceData || sellPriceData.sellPrice <= 0) {
    return null
  }

  const steps: TradeStep[] = []
  let currentAmount = startingAmount
  let totalGoldFee = 0

  // Step 1: Buy item with start currency
  const buyPrice = buyPriceData.buyPrice
  const itemsBought = currentAmount / buyPrice
  
  steps.push({
    action: 'buy',
    from: startCurrency,
    to: 'item',
    amount: currentAmount,
    rate: 1 / buyPrice, // items per currency
    resultAmount: itemsBought,
    goldFee: goldFeePerTrade,
  })
  totalGoldFee += goldFeePerTrade
  currentAmount = itemsBought

  // Step 2: Sell item for sell currency
  const sellPrice = sellPriceData.sellPrice
  const sellCurrencyReceived = currentAmount * sellPrice

  steps.push({
    action: 'sell',
    from: 'item',
    to: sellCurrency,
    amount: currentAmount,
    rate: sellPrice,
    resultAmount: sellCurrencyReceived,
    goldFee: goldFeePerTrade,
  })
  totalGoldFee += goldFeePerTrade
  currentAmount = sellCurrencyReceived

  // Step 3: Convert back to start currency (if different)
  if (sellCurrency !== startCurrency) {
    const conversionRate = getConversionRate(sellCurrency, startCurrency, rates)
    const finalAmount = currentAmount * conversionRate

    steps.push({
      action: 'convert',
      from: sellCurrency,
      to: startCurrency,
      amount: currentAmount,
      rate: conversionRate,
      resultAmount: finalAmount,
      goldFee: goldFeePerTrade,
    })
    totalGoldFee += goldFeePerTrade
    currentAmount = finalAmount
  }

  const finalAmount = currentAmount
  const grossProfit = finalAmount - startingAmount
  const netProfit = grossProfit // Gold fee is tracked separately, not subtracted from currency profit
  const profitPercentage = (grossProfit / startingAmount) * 100
  const goldEfficiency = totalGoldFee > 0 ? (grossProfit / totalGoldFee) * 1000 : 0

  const pathDescription = sellCurrency === startCurrency
    ? `${CURRENCY_INFO[startCurrency].shortName} → Item → ${CURRENCY_INFO[startCurrency].shortName}`
    : `${CURRENCY_INFO[startCurrency].shortName} → Item → ${CURRENCY_INFO[sellCurrency].shortName} → ${CURRENCY_INFO[startCurrency].shortName}`

  return {
    id: generateStrategyId(startCurrency, sellCurrency),
    name: `${CURRENCY_INFO[startCurrency].name} Arbitrage via ${CURRENCY_INFO[sellCurrency].name}`,
    description: pathDescription,
    path: sellCurrency === startCurrency
      ? [startCurrency, 'item', startCurrency]
      : [startCurrency, 'item', sellCurrency, startCurrency],
    steps,
    startingAmount,
    startingCurrency: startCurrency,
    finalAmount,
    grossProfit,
    totalGoldFee,
    netProfit,
    profitPercentage,
    goldEfficiency,
    isViable: grossProfit > 0,
    viabilityReason: grossProfit <= 0 ? 'No profit after conversions' : undefined,
  }
}

/**
 * Calculate all arbitrage strategies for given item prices and exchange rates
 */
export function calculateArbitrage(
  itemPrices: ItemPrices,
  chaosToExalted: number,
  divineToExalted: number,
  goldFeePerTrade: number,
  startingAmount: number = 1
): ArbitrageResult {
  const rates: ConversionRates = {
    chaosToExalted,
    divineToExalted,
  }

  const strategies: ArbitrageStrategy[] = []

  // Define all possible strategy combinations
  // Start currency -> Sell currency (different combinations)
  const combinations: [BaseCurrency, BaseCurrency][] = [
    // Starting with Exalted
    ['exalted', 'exalted'], // Buy in Ex, sell in Ex (direct flip)
    ['exalted', 'chaos'],   // Buy in Ex, sell in Chaos, convert to Ex
    ['exalted', 'divine'],  // Buy in Ex, sell in Divine, convert to Ex
    
    // Starting with Chaos
    ['chaos', 'chaos'],     // Buy in Chaos, sell in Chaos (direct flip)
    ['chaos', 'exalted'],   // Buy in Chaos, sell in Ex, convert to Chaos
    ['chaos', 'divine'],    // Buy in Chaos, sell in Divine, convert to Chaos
    
    // Starting with Divine
    ['divine', 'divine'],   // Buy in Divine, sell in Divine (direct flip)
    ['divine', 'exalted'],  // Buy in Divine, sell in Ex, convert to Divine
    ['divine', 'chaos'],    // Buy in Divine, sell in Chaos, convert to Divine
  ]

  for (const [startCurrency, sellCurrency] of combinations) {
    // Only calculate if we have prices in the required currencies
    const buyPriceData = itemPrices[startCurrency as keyof ItemPrices]
    const sellPriceData = itemPrices[sellCurrency as keyof ItemPrices]
    
    if (buyPriceData && sellPriceData) {
      const strategy = calculateStrategy(
        startCurrency,
        sellCurrency,
        itemPrices,
        rates,
        goldFeePerTrade,
        startingAmount
      )
      
      if (strategy) {
        strategies.push(strategy)
      }
    }
  }

  // Sort by profit percentage (descending)
  strategies.sort((a, b) => b.profitPercentage - a.profitPercentage)

  // Find best viable strategy
  const bestStrategy = strategies.find(s => s.isViable) || null

  return {
    strategies,
    bestStrategy,
    calculatedAt: Date.now(),
    itemPrices,
    exchangeRates: {
      chaos: { exalted: chaosToExalted },
      divine: { exalted: divineToExalted },
    },
    goldFeePerTrade,
  }
}

/**
 * Calculate the spread (difference between buy and sell price)
 */
export function calculateSpread(buyPrice: number, sellPrice: number): number {
  return sellPrice - buyPrice
}

/**
 * Format profit for display
 */
export function formatProfit(profit: number, currency: string): string {
  const sign = profit >= 0 ? '+' : ''
  return `${sign}${profit.toFixed(2)} ${currency}`
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(2)}%`
}

/**
 * Determine profit class for styling
 */
export function getProfitClass(profit: number): 'positive' | 'negative' | 'neutral' {
  if (profit > 0) return 'positive'
  if (profit < 0) return 'negative'
  return 'neutral'
}

