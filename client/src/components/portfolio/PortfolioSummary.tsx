import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/utils/format'
import type { PortfolioSummary as PortfolioSummaryType, PositionResponse } from '@/api/portfolio'
import { useQuoteStore } from '@/stores/quoteStore'
import { DollarSign, Wallet, TrendingUp } from 'lucide-react'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType | null
  positions: PositionResponse[]
  loading: boolean
}

export default function PortfolioSummaryCards({ summary, positions, loading }: PortfolioSummaryProps) {
  const quotes = useQuoteStore((s) => s.quotes)

  const liveValues = useMemo(() => {
    if (!summary || positions.length === 0) return null

    let totalValue = summary.cash_balance
    let investedValue = 0
    for (const pos of positions) {
      const livePrice = quotes[pos.symbol]?.price ?? pos.current_price
      totalValue += livePrice * pos.quantity
      investedValue += pos.avg_cost_basis * pos.quantity
    }
    const startingBalance = summary.total_value - summary.total_return
    const totalReturnPct = startingBalance ? ((totalValue - startingBalance) / startingBalance) * 100 : 0

    return {
      total_value: totalValue,
      invested_value: investedValue,
      total_return: totalValue - startingBalance,
      total_return_percent: totalReturnPct,
    }
  }, [quotes, summary, positions])

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const displayValues = liveValues ?? summary
  const isUp = displayValues.total_return >= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Total Value
          </div>
          <div className="text-2xl font-bold">{formatCurrency(displayValues.total_value)}</div>
          <div className="text-sm text-muted-foreground">
            Invested: {formatCurrency(displayValues.invested_value)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            Cash Balance
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.cash_balance)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            Total Return
          </div>
          <div className={`text-2xl font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            {isUp ? '+' : ''}{formatCurrency(displayValues.total_return)}
          </div>
          <div className={`text-sm ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            {isUp ? '+' : ''}{displayValues.total_return_percent.toFixed(2)}%
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
