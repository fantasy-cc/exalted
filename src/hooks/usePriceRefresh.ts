'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TradeableCurrency, ExchangeRates } from '@/types'

// ==========================================
// Types
// ==========================================

export interface PriceData {
  currencies: TradeableCurrency[]
  rates: ExchangeRates
  metadata: {
    source: 'live' | 'static' | 'cache'
    scrapedAt: string
    pairCount: number
    currencyCount: number
  }
  cachedAt?: number
}

export interface UsePriceRefreshOptions {
  refreshInterval?: number // in milliseconds, default 5 minutes
  pauseWhenHidden?: boolean // pause refresh when tab is hidden
  onRefresh?: (data: PriceData) => void
  onError?: (error: Error) => void
}

export interface UsePriceRefreshResult {
  data: PriceData | null
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  lastUpdated: Date | null
  source: 'live' | 'static' | 'cache' | null
  nextRefreshIn: number | null // seconds until next refresh
  refresh: () => Promise<void>
}

// ==========================================
// Constants
// ==========================================

const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
const API_ENDPOINT = '/api/prices'

// ==========================================
// Hook Implementation
// ==========================================

export function usePriceRefresh(options: UsePriceRefreshOptions = {}): UsePriceRefreshResult {
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    pauseWhenHidden = true,
    onRefresh,
    onError,
  } = options

  // State
  const [data, setData] = useState<PriceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null)

  // Refs for interval management
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<number>(0)
  const isVisibleRef = useRef(true)

  // Fetch prices from API
  const fetchPrices = useCallback(async (forceRefresh = false): Promise<void> => {
    const isInitialLoad = !data
    
    if (isInitialLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    
    setError(null)

    try {
      const url = forceRefresh 
        ? `${API_ENDPOINT}?refresh=true` 
        : API_ENDPOINT
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`)
      }

      const priceData: PriceData = await response.json()
      
      setData(priceData)
      setLastUpdated(new Date())
      lastFetchTimeRef.current = Date.now()
      
      // Start countdown to next refresh
      setNextRefreshIn(Math.floor(refreshInterval / 1000))
      
      // Call onRefresh callback
      if (onRefresh) {
        onRefresh(priceData)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      
      if (onError) {
        onError(error)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [data, refreshInterval, onRefresh, onError])

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await fetchPrices(true)
  }, [fetchPrices])

  // Handle visibility change
  useEffect(() => {
    if (!pauseWhenHidden) return

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      isVisibleRef.current = isVisible

      if (isVisible) {
        // Check if we should refresh (if enough time has passed)
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current
        if (timeSinceLastFetch >= refreshInterval) {
          fetchPrices(false)
        } else {
          // Update countdown
          const remaining = refreshInterval - timeSinceLastFetch
          setNextRefreshIn(Math.floor(remaining / 1000))
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pauseWhenHidden, refreshInterval, fetchPrices])

  // Setup auto-refresh interval
  useEffect(() => {
    // Initial fetch
    fetchPrices(false)

    // Setup refresh interval
    intervalRef.current = setInterval(() => {
      // Skip if tab is hidden and pauseWhenHidden is true
      if (pauseWhenHidden && !isVisibleRef.current) {
        return
      }
      fetchPrices(false)
    }, refreshInterval)

    // Setup countdown timer (updates every second)
    countdownRef.current = setInterval(() => {
      if (pauseWhenHidden && !isVisibleRef.current) {
        return
      }
      
      setNextRefreshIn(prev => {
        if (prev === null || prev <= 0) return null
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [refreshInterval, pauseWhenHidden, fetchPrices])

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    source: data?.metadata.source || null,
    nextRefreshIn,
    refresh,
  }
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Format seconds into human-readable time string
 */
export function formatTimeUntilRefresh(seconds: number | null): string {
  if (seconds === null || seconds <= 0) {
    return 'Refreshing...'
  }
  
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

/**
 * Format last updated time
 */
export function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Never'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  
  if (diffSeconds < 60) {
    return 'Just now'
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

