import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useQuoteStore } from '@/stores/quoteStore'
import PnlBadge from './PnlBadge'
import { formatCurrency } from '@/utils/format'
import type { PositionResponse } from '@/api/portfolio'
import { Briefcase } from 'lucide-react'

interface PositionsTableProps {
  positions: PositionResponse[]
  onTrade?: (symbol: string) => void
}

export default function PositionsTable({ positions, onTrade }: PositionsTableProps) {
  const quotes = useQuoteStore((s) => s.quotes)

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            No open positions. Start trading to build your portfolio.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Positions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Unrealized P&L</TableHead>
              <TableHead className="text-right">Realized P&L</TableHead>
              <TableHead className="text-right w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos) => {
              const liveQuote = quotes[pos.symbol]
              const currentPrice = liveQuote?.price ?? pos.current_price
              const marketValue = currentPrice * pos.quantity
              const unrealizedPnl = (currentPrice - pos.avg_cost_basis) * pos.quantity
              const unrealizedPct = pos.total_cost ? (unrealizedPnl / pos.total_cost) * 100 : 0

              return (
                <TableRow key={pos.symbol}>
                  <TableCell className="font-medium">{pos.symbol}</TableCell>
                  <TableCell className="text-right">{pos.quantity}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(pos.avg_cost_basis)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(currentPrice)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(marketValue)}</TableCell>
                  <TableCell className="text-right">
                    <PnlBadge value={unrealizedPnl} percent={unrealizedPct} />
                  </TableCell>
                  <TableCell className="text-right">
                    <PnlBadge value={pos.realized_pnl} showPercent={false} />
                  </TableCell>
                  <TableCell className="text-right">
                    {onTrade && (
                      <Button size="sm" variant="outline" onClick={() => onTrade(pos.symbol)}>
                        Trade
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
