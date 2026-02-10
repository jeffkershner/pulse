import { useState, useEffect, useRef } from 'react'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useQuoteStore, type Quote } from '@/stores/quoteStore'
import { formatCurrency } from '@/utils/format'
import SparklineChart from '@/components/market/SparklineChart'
import PriceChart from '@/components/market/PriceChart'
import { ChevronDown, ChevronRight, X } from 'lucide-react'

interface WatchlistRowProps {
  symbol: string
  onRemove: (symbol: string) => void
  onTrade?: (symbol: string) => void
}

export default function WatchlistRow({ symbol, onRemove, onTrade }: WatchlistRowProps) {
  const quote = useQuoteStore((s) => s.quotes[symbol]) as Quote | undefined
  const [expanded, setExpanded] = useState(false)
  const [flashClass, setFlashClass] = useState('')
  const prevPriceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!quote) return
    if (prevPriceRef.current !== null && prevPriceRef.current !== quote.price) {
      setFlashClass(quote.price > prevPriceRef.current ? 'flash-green' : 'flash-red')
      const timer = setTimeout(() => setFlashClass(''), 600)
      return () => clearTimeout(timer)
    }
    prevPriceRef.current = quote.price
  }, [quote?.price])

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-muted/50 ${flashClass}`}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {symbol}
          </div>
        </TableCell>
        <TableCell className="text-right font-mono">
          {quote ? formatCurrency(quote.price) : '--'}
        </TableCell>
        <TableCell className="text-right">
          {quote ? <SparklineChart data={quote.sparkline} /> : null}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {onTrade && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onTrade(symbol) }}>
                Trade
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onRemove(symbol) }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={4} className="p-0">
            <div className="p-4 bg-muted/20">
              <PriceChart symbol={symbol} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
