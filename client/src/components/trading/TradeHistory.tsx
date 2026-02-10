import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchTradeHistory, type TradeResponse } from '@/api/trades'
import { formatCurrency } from '@/utils/format'
import { History } from 'lucide-react'

interface TradeHistoryProps {
  refreshKey?: number
}

export default function TradeHistory({ refreshKey }: TradeHistoryProps) {
  const [trades, setTrades] = useState<TradeResponse[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  const load = async (p: number) => {
    setLoading(true)
    try {
      const data = await fetchTradeHistory(p, pageSize)
      setTrades(data.trades)
      setTotal(data.total)
      setPage(p)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [refreshKey])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Trade History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : trades.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No trades yet.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={t.side === 'BUY' ? 'default' : 'destructive'}>
                        {t.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(t.price)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(t.total)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(t.executed_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => load(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
