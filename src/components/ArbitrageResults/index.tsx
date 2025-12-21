'use client'

import { ArbitrageResult, ArbitrageStrategy, TradeStep, CURRENCY_INFO, BaseCurrency } from '@/types'
import { formatProfit, formatPercentage, getProfitClass } from '@/lib/arbitrage'

interface ArbitrageResultsProps {
  result: ArbitrageResult
  itemName?: string
}

function StepDisplay({ step, index }: { step: TradeStep; index: number }) {
  const actionEmoji = step.action === 'buy' ? '🛒' : step.action === 'sell' ? '💰' : '🔄'
  const actionLabel = step.action === 'buy' ? 'Buy' : step.action === 'sell' ? 'Sell' : 'Convert'
  
  const fromLabel = step.from === 'item' ? 'Item' : 
    (CURRENCY_INFO[step.from as BaseCurrency]?.shortName || step.from)
  const toLabel = step.to === 'item' ? 'Item' : 
    (CURRENCY_INFO[step.to as BaseCurrency]?.shortName || step.to)

  return (
    <div className="flex items-center gap-3 py-2 border-b border-poe-border/50 last:border-0">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-poe-darker text-xs text-poe-text-muted">
        {index + 1}
      </span>
      <span className="text-lg">{actionEmoji}</span>
      <div className="flex-1">
        <span className="text-poe-text">{actionLabel}</span>
        <span className="mx-2 text-poe-text-muted">:</span>
        <span className="text-poe-gold">{step.amount.toFixed(2)} {fromLabel}</span>
        <span className="mx-2 text-poe-text-muted">→</span>
        <span className="text-poe-gold">{step.resultAmount.toFixed(2)} {toLabel}</span>
      </div>
      <div className="text-right text-xs">
        <span className="text-poe-text-muted">Rate: </span>
        <span className="text-poe-text">{step.rate.toFixed(4)}</span>
      </div>
      <div className="text-right text-xs text-poe-text-muted">
        <span>⛏️ {step.goldFee}</span>
      </div>
    </div>
  )
}

function StrategyCard({ strategy, rank, isBest }: { strategy: ArbitrageStrategy; rank: number; isBest: boolean }) {
  const profitClass = getProfitClass(strategy.netProfit)
  const profitColorClass = profitClass === 'positive' ? 'profit-positive' : 
                          profitClass === 'negative' ? 'profit-negative' : 'profit-neutral'
  
  const startCurrencyInfo = CURRENCY_INFO[strategy.startingCurrency]

  return (
    <div className={`poe-card p-5 ${isBest ? 'border-poe-gold' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`
            flex items-center justify-center w-8 h-8 rounded-lg font-bold
            ${isBest ? 'bg-poe-gold text-poe-darker' : 'bg-poe-darker text-poe-text-muted'}
          `}>
            {rank}
          </span>
          <div>
            <h3 className="font-semibold text-poe-text">{strategy.name}</h3>
            <p className="text-sm text-poe-text-muted">{strategy.description}</p>
          </div>
        </div>
        {isBest && (
          <span className="px-2 py-1 bg-poe-gold/20 text-poe-gold text-xs rounded-full">
            ⭐ Best Strategy
          </span>
        )}
      </div>

      {/* Path Visualization */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-poe-darker rounded-lg mb-4">
        {strategy.path.map((step, idx) => (
          <div key={idx} className="flex items-center">
            <span className={`
              px-3 py-1 rounded text-sm font-medium
              ${step === 'item' 
                ? 'bg-poe-blue/20 text-poe-blue' 
                : 'bg-poe-gold/20 text-poe-gold'}
            `}>
              {step === 'item' ? '📦 Item' : CURRENCY_INFO[step as BaseCurrency]?.shortName || step}
            </span>
            {idx < strategy.path.length - 1 && (
              <span className="mx-2 text-poe-text-muted">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-poe-text-muted mb-2">Trade Steps</h4>
        <div className="bg-poe-darker rounded-lg p-3">
          {strategy.steps.map((step, idx) => (
            <StepDisplay key={idx} step={step} index={idx} />
          ))}
        </div>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-poe-border">
        <div className="text-center">
          <div className="text-xs text-poe-text-muted mb-1">Starting</div>
          <div className="font-semibold text-poe-text">
            {strategy.startingAmount} {startCurrencyInfo.shortName}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-poe-text-muted mb-1">Final</div>
          <div className="font-semibold text-poe-text">
            {strategy.finalAmount.toFixed(2)} {startCurrencyInfo.shortName}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-poe-text-muted mb-1">Net Profit</div>
          <div className={`font-semibold ${profitColorClass}`}>
            {formatProfit(strategy.netProfit, startCurrencyInfo.shortName)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-poe-text-muted mb-1">Profit %</div>
          <div className={`font-semibold ${profitColorClass}`}>
            {formatPercentage(strategy.profitPercentage)}
          </div>
        </div>
      </div>

      {/* Gold Efficiency */}
      <div className="mt-4 pt-4 border-t border-poe-border flex items-center justify-between">
        <div>
          <span className="text-xs text-poe-text-muted">Total Gold Fee: </span>
          <span className="text-poe-gold font-semibold">⛏️ {strategy.totalGoldFee} gold</span>
        </div>
        <div>
          <span className="text-xs text-poe-text-muted">Gold Efficiency: </span>
          <span className={`font-semibold ${strategy.goldEfficiency > 0 ? 'text-poe-green' : 'text-poe-red'}`}>
            {strategy.goldEfficiency > 0 ? '+' : ''}{strategy.goldEfficiency.toFixed(4)} {startCurrencyInfo.shortName}/1k gold
          </span>
        </div>
      </div>

      {/* Viability Warning */}
      {!strategy.isViable && (
        <div className="mt-4 p-3 bg-poe-red/10 border border-poe-red/30 rounded-lg">
          <p className="text-sm text-poe-red">
            ⚠️ {strategy.viabilityReason || 'This strategy is not profitable'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ArbitrageResults({ result, itemName }: ArbitrageResultsProps) {
  const viableStrategies = result.strategies.filter(s => s.isViable)
  const nonViableStrategies = result.strategies.filter(s => !s.isViable)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold poe-heading">Strategy Analysis Results</h2>
          {itemName && (
            <p className="text-sm text-poe-text-muted">
              Trading: <span className="text-poe-gold">{itemName}</span>
            </p>
          )}
        </div>
        <span className="text-sm text-poe-text-muted">
          Calculated at {new Date(result.calculatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="poe-card p-4 text-center">
          <div className="text-2xl font-bold text-poe-gold">{result.strategies.length}</div>
          <div className="text-xs text-poe-text-muted">Strategies Analyzed</div>
        </div>
        <div className="poe-card p-4 text-center">
          <div className="text-2xl font-bold text-poe-green">{viableStrategies.length}</div>
          <div className="text-xs text-poe-text-muted">Profitable</div>
        </div>
        <div className="poe-card p-4 text-center">
          <div className="text-2xl font-bold text-poe-gold">
            {result.bestStrategy ? formatPercentage(result.bestStrategy.profitPercentage) : 'N/A'}
          </div>
          <div className="text-xs text-poe-text-muted">Best Profit</div>
        </div>
        <div className="poe-card p-4 text-center">
          <div className="text-2xl font-bold text-poe-text">
            {result.goldFeePerTrade}
          </div>
          <div className="text-xs text-poe-text-muted">Gold Fee/Trade</div>
        </div>
      </div>

      {/* Best Strategy Highlight */}
      {result.bestStrategy && (
        <div>
          <h3 className="text-lg font-medium text-poe-gold mb-3">🏆 Best Strategy</h3>
          <StrategyCard 
            strategy={result.bestStrategy} 
            rank={1} 
            isBest={true} 
          />
        </div>
      )}

      {/* Other Viable Strategies */}
      {viableStrategies.length > 1 && (
        <div>
          <h3 className="text-lg font-medium text-poe-text mb-3">
            Other Profitable Strategies ({viableStrategies.length - 1})
          </h3>
          <div className="space-y-4">
            {viableStrategies.slice(1).map((strategy, idx) => (
              <StrategyCard 
                key={strategy.id} 
                strategy={strategy} 
                rank={idx + 2} 
                isBest={false} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Non-Viable Strategies (collapsed) */}
      {nonViableStrategies.length > 0 && (
        <details className="poe-card p-4">
          <summary className="cursor-pointer text-poe-text-muted hover:text-poe-text">
            ⚠️ Non-Profitable Strategies ({nonViableStrategies.length})
          </summary>
          <div className="mt-4 space-y-4">
            {nonViableStrategies.map((strategy, idx) => (
              <StrategyCard 
                key={strategy.id} 
                strategy={strategy} 
                rank={viableStrategies.length + idx + 1} 
                isBest={false} 
              />
            ))}
          </div>
        </details>
      )}

      {/* No Strategies Warning */}
      {result.strategies.length === 0 && (
        <div className="poe-card p-8 text-center">
          <div className="text-4xl mb-4">🤔</div>
          <h3 className="text-lg font-semibold text-poe-gold mb-2">
            No Strategies Available
          </h3>
          <p className="text-poe-text-muted">
            Please enter both buy and sell prices for at least one currency to calculate arbitrage strategies.
          </p>
        </div>
      )}
    </div>
  )
}

