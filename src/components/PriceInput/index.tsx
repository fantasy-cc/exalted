'use client'

import { useState, useEffect, useCallback } from 'react'

interface PriceInputProps {
  label: string
  symbol: string
  buyPrice: number
  sellPrice: number
  marketBuyPrice?: number
  marketSellPrice?: number
  onBuyChange: (value: number) => void
  onSellChange: (value: number) => void
  onReset?: () => void
  highlight?: boolean
  disabled?: boolean
}

export function PriceInput({
  label,
  symbol,
  buyPrice,
  sellPrice,
  marketBuyPrice,
  marketSellPrice,
  onBuyChange,
  onSellChange,
  onReset,
  highlight = false,
  disabled = false,
}: PriceInputProps) {
  // Check if values differ from market
  const buyDiffersFromMarket = marketBuyPrice !== undefined && 
    Math.abs(buyPrice - marketBuyPrice) > 0.001
  const sellDiffersFromMarket = marketSellPrice !== undefined && 
    Math.abs(sellPrice - marketSellPrice) > 0.001
  const hasDifference = buyDiffersFromMarket || sellDiffersFromMarket
  
  // Calculate spread
  const spread = sellPrice - buyPrice
  const spreadPercent = buyPrice > 0 ? ((spread / buyPrice) * 100) : 0

  return (
    <div className={`
      p-3 rounded-lg transition-all
      ${highlight 
        ? 'bg-poe-gold/10 border border-poe-gold/30' 
        : 'bg-poe-dark border border-gray-700'
      }
      ${hasDifference ? 'ring-2 ring-amber-500/30' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{label}</span>
          {hasDifference && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              Modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`
            text-xs px-2 py-0.5 rounded
            ${highlight ? 'bg-poe-gold text-black' : 'bg-gray-700 text-gray-300'}
          `}>
            {symbol}
          </span>
          {hasDifference && onReset && (
            <button
              onClick={onReset}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Price Inputs */}
      <div className="grid grid-cols-2 gap-2">
        {/* Buy Price */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Buy</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={buyPrice || ''}
              onChange={(e) => onBuyChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className={`
                w-full px-2 py-1.5 bg-poe-dark border rounded
                text-white text-sm focus:outline-none focus:border-poe-gold
                disabled:opacity-50 disabled:cursor-not-allowed
                ${buyDiffersFromMarket ? 'border-amber-500/50' : 'border-gray-600'}
              `}
              placeholder="0"
            />
          </div>
          {buyDiffersFromMarket && marketBuyPrice !== undefined && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span className="text-gray-500">Market:</span>
              <span className="text-gray-400">{formatNumber(marketBuyPrice)}</span>
            </div>
          )}
        </div>

        {/* Sell Price */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Sell</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={sellPrice || ''}
              onChange={(e) => onSellChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className={`
                w-full px-2 py-1.5 bg-poe-dark border rounded
                text-white text-sm focus:outline-none focus:border-poe-gold
                disabled:opacity-50 disabled:cursor-not-allowed
                ${sellDiffersFromMarket ? 'border-amber-500/50' : 'border-gray-600'}
              `}
              placeholder="0"
            />
          </div>
          {sellDiffersFromMarket && marketSellPrice !== undefined && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span className="text-gray-500">Market:</span>
              <span className="text-gray-400">{formatNumber(marketSellPrice)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Spread Display */}
      {(buyPrice > 0 || sellPrice > 0) && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Spread:</span>
            <span className={spread >= 0 ? 'text-green-400' : 'text-red-400'}>
              {spread >= 0 ? '+' : ''}{formatNumber(spread)} ({spreadPercent >= 0 ? '+' : ''}{spreadPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// Refresh Status Component
// ==========================================

interface RefreshStatusProps {
  source: 'live' | 'static' | 'cache' | null
  lastUpdated: Date | null
  nextRefreshIn: number | null
  isRefreshing: boolean
  onRefresh: () => void
}

export function RefreshStatus({
  source,
  lastUpdated,
  nextRefreshIn,
  isRefreshing,
  onRefresh,
}: RefreshStatusProps) {
  const sourceLabel = {
    live: { text: 'Live', color: 'text-green-400', bg: 'bg-green-400/10' },
    static: { text: 'Static', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    cache: { text: 'Cached', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  }

  const sourceInfo = source ? sourceLabel[source] : null

  return (
    <div className="flex items-center justify-between bg-poe-card border border-gray-700 rounded-lg px-4 py-2">
      <div className="flex items-center gap-3">
        {/* Source Badge */}
        {sourceInfo && (
          <span className={`text-xs px-2 py-0.5 rounded ${sourceInfo.bg} ${sourceInfo.color}`}>
            {sourceInfo.text}
          </span>
        )}
        
        {/* Last Updated */}
        <span className="text-sm text-gray-400">
          {lastUpdated 
            ? `Updated ${formatTimeAgo(lastUpdated)}`
            : 'Loading...'
          }
        </span>

        {/* Next Refresh Countdown */}
        {nextRefreshIn !== null && nextRefreshIn > 0 && (
          <span className="text-xs text-gray-500">
            (next in {formatSeconds(nextRefreshIn)})
          </span>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className={`
          flex items-center gap-1.5 px-3 py-1 rounded text-sm
          transition-colors
          ${isRefreshing 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-poe-gold/20 text-poe-gold hover:bg-poe-gold/30'
          }
        `}
      >
        <RefreshIcon spinning={isRefreshing} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  )
}

// ==========================================
// Helper Components
// ==========================================

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg 
      className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
      />
    </svg>
  )
}

// ==========================================
// Utility Functions
// ==========================================

function formatNumber(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  if (value >= 1) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 60) {
    return 'just now'
  }

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  return date.toLocaleDateString()
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (remainingSeconds === 0) {
    return `${minutes}m`
  }
  
  return `${minutes}m ${remainingSeconds}s`
}

export default PriceInput

