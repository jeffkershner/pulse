import { useState, useMemo } from 'react'
import AppShell from '@/components/layout/AppShell'
import PortfolioSummaryCards from '@/components/portfolio/PortfolioSummary'
import PositionsTable from '@/components/portfolio/PositionsTable'
import AllocationChart from '@/components/portfolio/AllocationChart'
import TradeHistory from '@/components/trading/TradeHistory'
import TradeModal from '@/components/trading/TradeModal'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useQuoteStream } from '@/hooks/useQuoteStream'

export default function PortfolioPage() {
  const { data, loading, refresh } = usePortfolio()
  const [tradeSymbol, setTradeSymbol] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const positionSymbols = useMemo(
    () => data?.positions.map((p) => p.symbol) ?? [],
    [data?.positions],
  )

  useQuoteStream(positionSymbols)

  const handleTradeSuccess = () => {
    refresh()
    setRefreshKey((k) => k + 1)
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PortfolioSummaryCards summary={data?.summary ?? null} loading={loading} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PositionsTable
              positions={data?.positions ?? []}
              onTrade={(sym) => setTradeSymbol(sym)}
            />
          </div>
          <div>
            {data && (
              <AllocationChart
                positions={data.positions}
                summary={data.summary}
              />
            )}
          </div>
        </div>
        <TradeHistory refreshKey={refreshKey} />
      </div>

      <TradeModal
        symbol={tradeSymbol}
        cashBalance={data?.summary.cash_balance}
        onClose={() => setTradeSymbol(null)}
        onSuccess={handleTradeSuccess}
      />
    </AppShell>
  )
}
