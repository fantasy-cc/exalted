import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PoE2 Currency Arbitrage Calculator',
  description: 'Find profitable currency trading opportunities in Path of Exile 2. Calculate arbitrage paths between Exalted, Chaos, and Divine Orbs with gold efficiency tracking.',
  keywords: ['Path of Exile 2', 'PoE2', 'currency', 'arbitrage', 'trading', 'calculator', 'Exalted Orb', 'Divine Orb', 'Chaos Orb'],
  authors: [{ name: 'PoE2 Community' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b border-poe-border bg-poe-darker/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="poe-heading text-2xl md:text-3xl font-bold">
                    PoE2 Currency Calculator
                  </h1>
                  <p className="text-poe-text-muted text-sm mt-1">
                    Find the best arbitrage strategies for Exalted, Chaos & Divine
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  <span className="px-3 py-1 bg-poe-green/20 text-poe-green text-xs rounded-full">
                    Live Data
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-poe-border bg-poe-darker/50 py-6">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <p className="text-poe-text-muted text-sm">
                PoE2 Currency Arbitrage Calculator • Data updated every 5 minutes
              </p>
              <p className="text-poe-text-muted text-xs mt-2">
                Not affiliated with Grinding Gear Games
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}

