'use client'

import { useState, useEffect } from 'react'
import { BaseCurrency, CURRENCY_INFO } from '@/types'

interface ItemPriceInputProps {
  currency: BaseCurrency
  buyPrice: number
  sellPrice: number
  onBuyPriceChange: (value: number) => void
  onSellPriceChange: (value: number) => void
}

export default function ItemPriceInput({
  currency,
  buyPrice,
  sellPrice,
  onBuyPriceChange,
  onSellPriceChange,
}: ItemPriceInputProps) {
  const [buyInput, setBuyInput] = useState(buyPrice.toString())
  const [sellInput, setSellInput] = useState(sellPrice.toString())

  useEffect(() => {
    setBuyInput(buyPrice === 0 ? '' : buyPrice.toString())
  }, [buyPrice])

  useEffect(() => {
    setSellInput(sellPrice === 0 ? '' : sellPrice.toString())
  }, [sellPrice])

  const handleBuyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBuyInput(value)
    
    // Support ratio format "5:1" meaning 5 currency for 1 item
    if (value.includes(':')) {
      const parts = value.split(':')
      if (parts.length === 2) {
        const num = parseFloat(parts[0])
        const denom = parseFloat(parts[1])
        if (!isNaN(num) && !isNaN(denom) && denom > 0) {
          onBuyPriceChange(num / denom)
          return
        }
      }
    }
    
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed >= 0) {
      onBuyPriceChange(parsed)
    } else if (value === '') {
      onBuyPriceChange(0)
    }
  }

  const handleSellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSellInput(value)
    
    // Support ratio format
    if (value.includes(':')) {
      const parts = value.split(':')
      if (parts.length === 2) {
        const num = parseFloat(parts[0])
        const denom = parseFloat(parts[1])
        if (!isNaN(num) && !isNaN(denom) && denom > 0) {
          onSellPriceChange(num / denom)
          return
        }
      }
    }
    
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed >= 0) {
      onSellPriceChange(parsed)
    } else if (value === '') {
      onSellPriceChange(0)
    }
  }

  const spread = sellPrice - buyPrice
  const spreadClass = spread > 0 ? 'profit-positive' : spread < 0 ? 'profit-negative' : 'profit-neutral'

  const currencyInfo = CURRENCY_INFO[currency]

  return (
    <div className="poe-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-poe-gold">
          Item {currencyInfo.name} Price
        </h3>
        <span className="text-xs bg-poe-darker px-2 py-1 rounded text-poe-text-muted">
          {currencyInfo.shortName}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="poe-label">Buy Price</label>
          <input
            type="text"
            value={buyInput}
            onChange={handleBuyChange}
            placeholder="0"
            className="poe-input"
          />
          <p className="text-xs text-poe-text-muted mt-1">
            Cost to buy item
          </p>
        </div>

        <div>
          <label className="poe-label">Sell Price</label>
          <input
            type="text"
            value={sellInput}
            onChange={handleSellChange}
            placeholder="0"
            className="poe-input"
          />
          <p className="text-xs text-poe-text-muted mt-1">
            Price when selling
          </p>
        </div>
      </div>

      {(buyPrice > 0 || sellPrice > 0) && (
        <div className="mt-3 pt-3 border-t border-poe-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-poe-text-muted">Spread:</span>
            <span className={`font-semibold ${spreadClass}`}>
              {spread >= 0 ? '+' : ''}{spread.toFixed(2)} {currencyInfo.shortName}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-poe-text-muted mt-3">
        💡 Supports ratio format: &quot;5:1&quot; means 5 {currencyInfo.shortName} per item
      </p>
    </div>
  )
}

