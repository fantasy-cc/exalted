'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { TradeableCurrency } from '@/types'
import { searchCurrencies, getSuggestedCurrencies, formatPrice, CurrencyWithProfit } from '@/lib/currencies'

interface CurrencySelectorProps {
  currencies: TradeableCurrency[]
  selectedCurrency: TradeableCurrency | null
  onSelect: (currency: TradeableCurrency | null) => void
  isLoading?: boolean
  chaosToExalted?: number
  divineToExalted?: number
}

export function CurrencySelector({
  currencies,
  selectedCurrency,
  onSelect,
  isLoading = false,
  chaosToExalted = 19.92,
  divineToExalted = 652,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get suggested currencies (sorted by profit margin)
  const suggestedCurrencies = useMemo(
    () => getSuggestedCurrencies(currencies, chaosToExalted, divineToExalted, 5),
    [currencies, chaosToExalted, divineToExalted]
  )

  // Filter currencies based on search
  const filteredCurrencies = useMemo(
    () => searchCurrencies(currencies, searchQuery),
    [currencies, searchQuery]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (currency: TradeableCurrency) => {
    onSelect(currency)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Format profit margin for display
  const formatProfitMargin = (profit: number): string => {
    if (profit > 0) return `+${profit.toFixed(1)}%`
    if (profit < 0) return `${profit.toFixed(1)}%`
    return '0%'
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-poe-gold">Select Item to Trade</h2>
        {isLoading && (
          <span className="text-sm text-gray-400 animate-pulse">Loading currencies...</span>
        )}
      </div>

      {/* Suggested Currencies */}
      {!selectedCurrency && suggestedCurrencies.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">💡 Suggested currencies (by profit potential):</p>
          <div className="flex flex-wrap gap-2">
            {suggestedCurrencies.map((currency: CurrencyWithProfit) => (
              <button
                key={currency.id}
                onClick={() => handleSelect(currency)}
                className="px-3 py-1.5 bg-poe-dark border border-poe-gold/30 rounded-lg 
                         hover:border-poe-gold hover:bg-poe-gold/10 transition-all duration-200
                         text-sm text-gray-200 flex items-center gap-2"
              >
                <span className="font-medium">{currency.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  currency.profitMargin > 0 
                    ? 'bg-green-500/20 text-green-400' 
                    : currency.profitMargin < 0 
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {formatProfitMargin(currency.profitMargin)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Currency Selector Dropdown */}
      <div ref={dropdownRef} className="relative">
        {/* Selected Currency Display / Search Input */}
        <div
          className={`
            w-full p-4 bg-poe-dark border rounded-lg cursor-pointer
            transition-all duration-200
            ${isOpen ? 'border-poe-gold' : 'border-gray-700 hover:border-gray-500'}
            ${selectedCurrency ? '' : 'border-dashed'}
          `}
          onClick={() => {
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
        >
          {selectedCurrency ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{selectedCurrency.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  <span className="text-poe-gold">{formatPrice(selectedCurrency.prices.divine)} Div</span>
                  <span className="mx-2">•</span>
                  <span>{formatPrice(selectedCurrency.prices.exalted)} Ex</span>
                  <span className="mx-2">•</span>
                  <span>{formatPrice(selectedCurrency.prices.chaos)} C</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(null)
                }}
                className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="flex items-center text-gray-400">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Click to search and select a currency...
            </div>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-poe-card border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search currencies..."
                className="w-full px-3 py-2 bg-poe-dark border border-gray-600 rounded-lg
                         text-white placeholder-gray-500 focus:outline-none focus:border-poe-gold"
              />
            </div>

            {/* Currency List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredCurrencies.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No currencies found
                </div>
              ) : (
                filteredCurrencies.map((currency) => (
                  <button
                    key={currency.id}
                    onClick={() => handleSelect(currency)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-poe-gold/10 transition-colors
                      border-b border-gray-700/50 last:border-b-0
                      ${selectedCurrency?.id === currency.id ? 'bg-poe-gold/20' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{currency.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Vol: {(currency.volume / 1000000).toFixed(1)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-poe-gold font-medium">
                          {formatPrice(currency.prices.divine)} Div
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatPrice(currency.prices.exalted)} Ex
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CurrencySelector
