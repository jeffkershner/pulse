import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fetchWatchlist, addToWatchlist, removeFromWatchlist } from '@/api/watchlist'
import WatchlistRow from './WatchlistRow'
import AddTickerModal from './AddTickerModal'
import { Plus, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface WatchlistPanelProps {
  onSymbolsChange: (symbols: string[]) => void
  onTrade?: (symbol: string) => void
}

export default function WatchlistPanel({ onSymbolsChange, onTrade }: WatchlistPanelProps) {
  const [symbols, setSymbols] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    try {
      const data = await fetchWatchlist()
      const syms = data.items.map((i) => i.symbol)
      setSymbols(syms)
      onSymbolsChange(syms)
    } catch { /* ignore */ }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (symbol: string) => {
    try {
      await addToWatchlist(symbol)
      const updated = [...symbols, symbol]
      setSymbols(updated)
      onSymbolsChange(updated)
      toast.success(`${symbol} added to watchlist`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    }
  }

  const handleRemove = async (symbol: string) => {
    try {
      await removeFromWatchlist(symbol)
      const updated = symbols.filter((s) => s !== symbol)
      setSymbols(updated)
      onSymbolsChange(updated)
      toast.success(`${symbol} removed from watchlist`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Watchlist
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Ticker
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {symbols.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No symbols in your watchlist. Click "Add Ticker" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                  <TableHead className="text-right w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {symbols.map((sym) => (
                  <WatchlistRow
                    key={sym}
                    symbol={sym}
                    onRemove={handleRemove}
                    onTrade={onTrade}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <AddTickerModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
    </>
  )
}
