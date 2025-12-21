'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ExchangeRates from '@/components/ExchangeRates'
import { CurrencySelector } from '@/components/CurrencySelector'
import ArbitrageResults from '@/components/ArbitrageResults'
import { PriceInput, RefreshStatus } from '@/components/PriceInput'
import { calculateArbitrage } from '@/lib/arbitrage'
import { applyOverrides } from '@/lib/rates'
import { loadSettings, updateGoldFee, saveCurrencyOverride, getCurrencyOverride, clearCurrencyOverride } from '@/lib/storage'
import { usePriceRefresh } from '@/hooks/usePriceRefresh'
import { ArbitrageResult, ItemPrices, TradeableCurrency } from '@/types'

export default function Calculator() {
  // Exchange rates
  const [chaosToExalted, setChaosToExalted] = useState(19.91)
  const [divineToExalted, setDivineToExalted] = useState(652.02)
  const [goldFeePerTrade, setGoldFeePerTrade] = useState(1000)
  
  // Currency selection
  const [selectedCurrency, setSelectedCurrency] = useState<TradeableCurrency | null>(null)
  
  // Market prices for selected currency (from API)
  const [marketPrices, setMarketPrices] = useState<{
    divine: number | null
    exalted: number | null
    chaos: number | null
  }>({ divine: null, exalted: null, chaos: null })
  
  // User-editable prices (can differ from market)
  const [itemPrices, setItemPrices] = useState<{
    divine: { buy: number; sell: number }
    exalted: { buy: number; sell: number }
    chaos: { buy: number; sell: number }
  }>({
    divine: { buy: 0, sell: 0 },
    exalted: { buy: 0, sell: 0 },
    chaos: { buy: 0, sell: 0 },
  })
  
  // Results and state
  const [result, setResult] = useState<ArbitrageResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // Use price refresh hook
  const {
    data: priceData,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    source,
    nextRefreshIn,
    refresh,
  } = usePriceRefresh({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    pauseWhenHidden: true,
    onRefresh: (data) => {
      // Update exchange rates when prices refresh
      if (data.rates) {
        const chaos = data.rates['chaos']?.['exalted'] || chaosToExalted
        const divine = data.rates['divine']?.['exalted'] || divineToExalted
        
        // Apply user overrides if any
        const overridden = applyOverrides(chaos, divine)
        setChaosToExalted(overridden.chaosToExalted)
        setDivineToExalted(overridden.divineToExalted)
      }
      
      // Update market prices for selected currency if it exists
      if (selectedCurrency && data.currencies) {
        const updatedCurrency = data.currencies.find(c => c.id === selectedCurrency.id)
        if (updatedCurrency) {
          setMarketPrices({
            divine: updatedCurrency.prices.divine,
            exalted: updatedCurrency.prices.exalted,
            chaos: updatedCurrency.prices.chaos,
          })
        }
      }
    },
  })

  // Load settings on mount
  useEffect(() => {
    const settings = loadSettings()
    setGoldFeePerTrade(settings.goldFeePerTrade)
  }, [])

  // Update exchange rates when price data loads initially
  useEffect(() => {
    if (priceData?.rates) {
      const chaos = priceData.rates['chaos']?.['exalted'] || chaosToExalted
      const divine = priceData.rates['divine']?.['exalted'] || divineToExalted
      
      const overridden = applyOverrides(chaos, divine)
      setChaosToExalted(overridden.chaosToExalted)
      setDivineToExalted(overridden.divineToExalted)
    }
  }, [priceData])

  // Helper to round to 2 decimal places
  const round2 = (n: number | null) => n ? Math.round(n * 100) / 100 : 0

  // When a currency is selected, load market prices and any saved overrides
  const handleCurrencySelect = useCallback((currency: TradeableCurrency | null) => {
    setSelectedCurrency(currency)
    setResult(null)
    
    if (currency) {
      // Set market prices from the currency data
      setMarketPrices({
        divine: currency.prices.divine,
        exalted: currency.prices.exalted,
        chaos: currency.prices.chaos,
      })
      
      // Check for saved overrides
      const savedOverride = getCurrencyOverride(currency.id)
      
      if (savedOverride) {
        // Use saved overrides
        setItemPrices({
          divine: savedOverride.prices.divine || { buy: round2(currency.prices.divine), sell: round2(currency.prices.divine) },
          exalted: savedOverride.prices.exalted || { buy: round2(currency.prices.exalted), sell: round2(currency.prices.exalted) },
          chaos: savedOverride.prices.chaos || { buy: round2(currency.prices.chaos), sell: round2(currency.prices.chaos) },
        })
      } else {
        // Use market prices (same for buy and sell initially)
        setItemPrices({
          divine: { buy: round2(currency.prices.divine), sell: round2(currency.prices.divine) },
          exalted: { buy: round2(currency.prices.exalted), sell: round2(currency.prices.exalted) },
          chaos: { buy: round2(currency.prices.chaos), sell: round2(currency.prices.chaos) },
        })
      }
    } else {
      setMarketPrices({ divine: null, exalted: null, chaos: null })
      setItemPrices({
        divine: { buy: 0, sell: 0 },
        exalted: { buy: 0, sell: 0 },
        chaos: { buy: 0, sell: 0 },
      })
    }
  }, [])

  // Handle gold fee change with persistence
  const handleGoldFeeChange = useCallback((value: number) => {
    setGoldFeePerTrade(value)
    updateGoldFee(value)
  }, [])

  // Handle price changes and persist overrides
  const handlePriceChange = useCallback((
    currency: 'divine' | 'exalted' | 'chaos',
    type: 'buy' | 'sell',
    value: number
  ) => {
    setItemPrices(prev => {
      const newPrices = {
        ...prev,
        [currency]: {
          ...prev[currency],
          [type]: value,
        },
      }
      
      // Save override if we have a selected currency
      if (selectedCurrency) {
        saveCurrencyOverride(selectedCurrency.id, {
          [currency]: newPrices[currency],
        })
      }
      
      return newPrices
    })
  }, [selectedCurrency])

  // Reset prices to market values
  const handleResetToMarket = useCallback((currency: 'divine' | 'exalted' | 'chaos') => {
    const marketPrice = marketPrices[currency]
    if (marketPrice !== null) {
      setItemPrices(prev => ({
        ...prev,
        [currency]: { buy: round2(marketPrice), sell: round2(marketPrice) },
      }))
      
      // Clear the override for this currency
      if (selectedCurrency) {
        const override = getCurrencyOverride(selectedCurrency.id)
        if (override) {
          saveCurrencyOverride(selectedCurrency.id, {
            ...override.prices,
            [currency]: null,
          })
        }
      }
    }
  }, [marketPrices, selectedCurrency])

  // Reset all prices to market
  const handleResetAllToMarket = useCallback(() => {
    if (selectedCurrency) {
      setItemPrices({
        divine: { buy: round2(marketPrices.divine), sell: round2(marketPrices.divine) },
        exalted: { buy: round2(marketPrices.exalted), sell: round2(marketPrices.exalted) },
        chaos: { buy: round2(marketPrices.chaos), sell: round2(marketPrices.chaos) },
      })
      clearCurrencyOverride(selectedCurrency.id)
    }
  }, [selectedCurrency, marketPrices])

  // Calculate arbitrage
  const handleCalculate = useCallback(() => {
    setIsCalculating(true)
    
    const prices: ItemPrices = {
      exalted: itemPrices.exalted.buy > 0 || itemPrices.exalted.sell > 0 
        ? { buyPrice: itemPrices.exalted.buy, sellPrice: itemPrices.exalted.sell, currency: 'exalted' }
        : null,
      chaos: itemPrices.chaos.buy > 0 || itemPrices.chaos.sell > 0
        ? { buyPrice: itemPrices.chaos.buy, sellPrice: itemPrices.chaos.sell, currency: 'chaos' }
        : null,
      divine: itemPrices.divine.buy > 0 || itemPrices.divine.sell > 0
        ? { buyPrice: itemPrices.divine.buy, sellPrice: itemPrices.divine.sell, currency: 'divine' }
        : null,
    }
    
    const arbitrageResult = calculateArbitrage(
      prices,
      chaosToExalted,
      divineToExalted,
      goldFeePerTrade,
      1
    )
    
    setResult(arbitrageResult)
    setIsCalculating(false)
  }, [chaosToExalted, divineToExalted, goldFeePerTrade, itemPrices])

  // Clear results
  const handleClear = useCallback(() => {
    setSelectedCurrency(null)
    setMarketPrices({ divine: null, exalted: null, chaos: null })
    setItemPrices({
      divine: { buy: 0, sell: 0 },
      exalted: { buy: 0, sell: 0 },
      chaos: { buy: 0, sell: 0 },
    })
    setResult(null)
  }, [])

  // Check if we have any prices entered
  const hasPrices = Object.values(itemPrices).some(p => p.buy > 0 || p.sell > 0)

  // Check if any prices differ from market
  const hasOverrides = useMemo(() => {
    if (!selectedCurrency) return false
    return (
      (marketPrices.divine !== null && (itemPrices.divine.buy !== round2(marketPrices.divine) || itemPrices.divine.sell !== round2(marketPrices.divine))) ||
      (marketPrices.exalted !== null && (itemPrices.exalted.buy !== round2(marketPrices.exalted) || itemPrices.exalted.sell !== round2(marketPrices.exalted))) ||
      (marketPrices.chaos !== null && (itemPrices.chaos.buy !== round2(marketPrices.chaos) || itemPrices.chaos.sell !== round2(marketPrices.chaos)))
    )
  }, [selectedCurrency, marketPrices, itemPrices])

  // Get currencies from price data
  const currencies = priceData?.currencies || []

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="poe-card p-8 text-center">
          <div className="animate-pulse-gold">
            <div className="text-4xl mb-4">⚙️</div>
            <p className="text-poe-gold">Loading exchange rates and currencies...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Refresh Status Bar */}
      <RefreshStatus
        source={source}
        lastUpdated={lastUpdated}
        nextRefreshIn={nextRefreshIn}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          ⚠️ {error.message}
        </div>
      )}

      {/* Exchange Rates Section */}
      <section>
        <ExchangeRates
          chaosToExalted={chaosToExalted}
          divineToExalted={divineToExalted}
          goldFeePerTrade={goldFeePerTrade}
          onChaosToExaltedChange={setChaosToExalted}
          onDivineToExaltedChange={setDivineToExalted}
          onGoldFeeChange={handleGoldFeeChange}
          dataSource={source || 'loading'}
          lastUpdated={lastUpdated?.toISOString()}
        />
      </section>

      {/* Divider */}
      <div className="poe-divider flex items-center justify-center">
        <span className="bg-poe-dark px-4 text-poe-text-muted text-sm">
          Item Selection • Choose an item and adjust prices
        </span>
      </div>

      {/* Currency Selector */}
      <section>
        <CurrencySelector
          currencies={currencies}
          selectedCurrency={selectedCurrency}
          onSelect={handleCurrencySelect}
          isLoading={isLoading}
          chaosToExalted={chaosToExalted}
          divineToExalted={divineToExalted}
        />
      </section>

      {/* Price Editor with Market Comparison */}
      {selectedCurrency && (
        <section className="poe-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-poe-gold">
                📊 {selectedCurrency.name} Prices
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Prices auto-update every 5 minutes • Your adjustments are preserved
              </p>
            </div>
            {hasOverrides && (
              <button
                onClick={handleResetAllToMarket}
                className="text-sm px-3 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              >
                Reset All to Market
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Divine Price */}
            <PriceInput
              label="Divine Orb"
              symbol="Div"
              buyPrice={itemPrices.divine.buy}
              sellPrice={itemPrices.divine.sell}
              marketBuyPrice={marketPrices.divine ?? undefined}
              marketSellPrice={marketPrices.divine ?? undefined}
              onBuyChange={(v) => handlePriceChange('divine', 'buy', v)}
              onSellChange={(v) => handlePriceChange('divine', 'sell', v)}
              onReset={() => handleResetToMarket('divine')}
              highlight={true}
            />
            
            {/* Exalted Price */}
            <PriceInput
              label="Exalted Orb"
              symbol="Ex"
              buyPrice={itemPrices.exalted.buy}
              sellPrice={itemPrices.exalted.sell}
              marketBuyPrice={marketPrices.exalted ?? undefined}
              marketSellPrice={marketPrices.exalted ?? undefined}
              onBuyChange={(v) => handlePriceChange('exalted', 'buy', v)}
              onSellChange={(v) => handlePriceChange('exalted', 'sell', v)}
              onReset={() => handleResetToMarket('exalted')}
            />
            
            {/* Chaos Price */}
            <PriceInput
              label="Chaos Orb"
              symbol="C"
              buyPrice={itemPrices.chaos.buy}
              sellPrice={itemPrices.chaos.sell}
              marketBuyPrice={marketPrices.chaos ?? undefined}
              marketSellPrice={marketPrices.chaos ?? undefined}
              onBuyChange={(v) => handlePriceChange('chaos', 'buy', v)}
              onSellChange={(v) => handlePriceChange('chaos', 'sell', v)}
              onReset={() => handleResetToMarket('chaos')}
            />
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <section className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleCalculate}
          disabled={!hasPrices || isCalculating}
          className="poe-button text-lg px-8 py-4"
        >
          {isCalculating ? '⏳ Calculating...' : '🧮 Calculate Strategy'}
        </button>
        
        {(hasPrices || selectedCurrency) && (
          <button
            onClick={handleClear}
            className="poe-button-secondary px-6 py-4"
          >
            🗑️ Clear
          </button>
        )}
      </section>

      {/* Results Section */}
      {result && (
        <section>
          <ArbitrageResults result={result} itemName={selectedCurrency?.name} />
        </section>
      )}

      {/* Empty State */}
      {!result && !selectedCurrency && (
        <section className="poe-card p-8 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-poe-gold mb-2">
            Select an Item to Trade
          </h3>
          <p className="text-poe-text-muted">
            Choose a currency from the suggestions above or search for the item you want to trade.
            Prices will auto-populate from live market data and refresh every 5 minutes.
          </p>
        </section>
      )}
    </div>
  )
}
