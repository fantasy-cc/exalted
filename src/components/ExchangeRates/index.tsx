'use client'

import { useState, useEffect } from 'react'
import { formatRate, parseRateInput } from '@/lib/rates'
import { setPriceOverride, removePriceOverride, getPriceOverride } from '@/lib/storage'

interface ExchangeRatesProps {
  chaosToExalted: number
  divineToExalted: number
  goldFeePerTrade: number
  onChaosToExaltedChange: (value: number) => void
  onDivineToExaltedChange: (value: number) => void
  onGoldFeeChange: (value: number) => void
  dataSource?: string
  lastUpdated?: string
}

interface RateInputProps {
  label: string
  currencyFrom: string
  currencyTo: string
  value: number
  scrapedValue: number
  onChange: (value: number) => void
  currencyPair: string
}

function RateInput({
  label,
  currencyFrom,
  currencyTo,
  value,
  scrapedValue,
  onChange,
  currencyPair,
}: RateInputProps) {
  const [inputValue, setInputValue] = useState(formatRate(value))
  const [isEditing, setIsEditing] = useState(false)
  const [hasOverride, setHasOverride] = useState(false)

  useEffect(() => {
    // Check if there's a stored override
    const override = getPriceOverride(currencyPair)
    setHasOverride(!!override)
  }, [currencyPair])

  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatRate(value))
    }
  }, [value, isEditing])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleBlur = () => {
    setIsEditing(false)
    const parsed = parseRateInput(inputValue)
    if (parsed !== null && parsed !== value) {
      onChange(parsed)
      setPriceOverride(currencyPair, parsed)
      setHasOverride(true)
    } else {
      setInputValue(formatRate(value))
    }
  }

  const handleFocus = () => {
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      setInputValue(formatRate(value))
      setIsEditing(false)
    }
  }

  const handleReset = () => {
    removePriceOverride(currencyPair)
    onChange(scrapedValue)
    setInputValue(formatRate(scrapedValue))
    setHasOverride(false)
  }

  const incrementValue = (delta: number) => {
    const newValue = value + delta
    if (newValue > 0) {
      onChange(newValue)
      setPriceOverride(currencyPair, newValue)
      setHasOverride(true)
    }
  }

  return (
    <div className="poe-card p-4">
      <label className="poe-label">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-poe-gold font-semibold">1 {currencyFrom} =</span>
        
        <div className="flex items-center">
          <button
            onClick={() => incrementValue(-1)}
            className="px-2 py-1 bg-poe-darker border border-poe-border rounded-l hover:border-poe-gold transition-colors"
            type="button"
          >
            −
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className="w-24 px-3 py-1 bg-poe-darker border-y border-poe-border text-center text-poe-text focus:outline-none focus:border-poe-gold"
          />
          <button
            onClick={() => incrementValue(1)}
            className="px-2 py-1 bg-poe-darker border border-poe-border rounded-r hover:border-poe-gold transition-colors"
            type="button"
          >
            +
          </button>
        </div>
        
        <span className="text-poe-gold font-semibold">{currencyTo}</span>
      </div>
      
      {hasOverride && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-poe-gold">
            ✏️ Custom rate (scraped: {formatRate(scrapedValue)})
          </span>
          <button
            onClick={handleReset}
            className="text-poe-text-muted hover:text-poe-gold transition-colors"
            type="button"
          >
            Reset to live
          </button>
        </div>
      )}
    </div>
  )
}

export default function ExchangeRates({
  chaosToExalted,
  divineToExalted,
  goldFeePerTrade,
  onChaosToExaltedChange,
  onDivineToExaltedChange,
  onGoldFeeChange,
  dataSource = 'live',
  lastUpdated,
}: ExchangeRatesProps) {
  const [scrapedChaos, setScrapedChaos] = useState(chaosToExalted)
  const [scrapedDivine, setScrapedDivine] = useState(divineToExalted)

  useEffect(() => {
    // Store scraped values for reference
    setScrapedChaos(chaosToExalted)
    setScrapedDivine(divineToExalted)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold poe-heading">Exchange Rate Settings</h2>
        {dataSource && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                dataSource === 'live' ? 'bg-poe-green animate-pulse' : 'bg-poe-gold'
              }`}
            />
            <span className="text-xs text-poe-text-muted">
              {dataSource === 'live' ? 'Live Data' : 'Custom Rates'}
            </span>
          </div>
        )}
      </div>

      {lastUpdated && (
        <p className="text-xs text-poe-text-muted">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RateInput
          label="Chaos to Exalted Rate"
          currencyFrom="Chaos"
          currencyTo="Exalted"
          value={chaosToExalted}
          scrapedValue={scrapedChaos}
          onChange={onChaosToExaltedChange}
          currencyPair="chaos_exalted"
        />

        <RateInput
          label="Divine to Exalted Rate"
          currencyFrom="Divine"
          currencyTo="Exalted"
          value={divineToExalted}
          scrapedValue={scrapedDivine}
          onChange={onDivineToExaltedChange}
          currencyPair="divine_exalted"
        />
      </div>

      {/* Gold Fee Setting */}
      <div className="poe-card p-4">
        <label className="poe-label">Gold Fee Per Trade</label>
        <div className="flex items-center gap-2">
          <span className="text-poe-gold font-semibold">Trading Fee:</span>
          
          <div className="flex items-center">
            <button
              onClick={() => onGoldFeeChange(Math.max(0, goldFeePerTrade - 100))}
              className="px-2 py-1 bg-poe-darker border border-poe-border rounded-l hover:border-poe-gold transition-colors"
              type="button"
            >
              −
            </button>
            <input
              type="number"
              value={goldFeePerTrade}
              onChange={(e) => onGoldFeeChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 px-3 py-1 bg-poe-darker border-y border-poe-border text-center text-poe-text focus:outline-none focus:border-poe-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => onGoldFeeChange(goldFeePerTrade + 100)}
              className="px-2 py-1 bg-poe-darker border border-poe-border rounded-r hover:border-poe-gold transition-colors"
              type="button"
            >
              +
            </button>
          </div>
          
          <span className="text-poe-gold font-semibold">Gold</span>
        </div>
        <p className="text-xs text-poe-text-muted mt-2">
          Gold cost per trade action. Used to calculate gold efficiency.
        </p>
      </div>

      <p className="text-xs text-poe-text-muted text-center">
        💡 Tip: You can override the scraped rates with your in-game observed prices.
        Click the input to edit, or use +/- buttons.
      </p>
    </div>
  )
}

