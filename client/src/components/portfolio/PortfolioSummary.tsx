import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/utils/format'
import type { PortfolioSummary as PortfolioSummaryType } from '@/api/portfolio'
import { DollarSign, Wallet, TrendingUp } from 'lucide-react'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType | null
  loading: boolean
}

export default function PortfolioSummaryCards({ summary, loading }: PortfolioSummaryProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const isUp = summary.total_return >= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Total Value
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary.total_value)}</div>
          <div className="text-sm text-muted-foreground">
            Invested: {formatCurrency(summary.invested_value)}
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
            {isUp ? '+' : ''}{formatCurrency(summary.total_return)}
          </div>
          <div className={`text-sm ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            {isUp ? '+' : ''}{summary.total_return_percent.toFixed(2)}%
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
