import { useState, useEffect, useRef } from 'react'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useQuoteStore, type Quote } from '@/stores/quoteStore'
import { formatCurrency } from '@/utils/format'
import SparklineChart from './SparklineChart'
import PriceChart from './PriceChart'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface QuoteRowProps {
  symbol: string
  onTrade?: (symbol: string) => void
}

export default function QuoteRow({ symbol, onTrade }: QuoteRowProps) {
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

  if (!quote) {
    return (
      <TableRow>
        <TableCell className="font-medium">{symbol}</TableCell>
        <TableCell className="text-right text-muted-foreground">--</TableCell>
        <TableCell className="text-right">--</TableCell>
        <TableCell />
        <TableCell />
      </TableRow>
    )
  }

  const change = quote.sparkline.length > 1
    ? quote.price - quote.sparkline[0]
    : 0
  const changePct = quote.sparkline.length > 1 && quote.sparkline[0]
    ? (change / quote.sparkline[0]) * 100
    : 0
  const isUp = change >= 0

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
        <TableCell className="text-right font-mono">{formatCurrency(quote.price)}</TableCell>
        <TableCell className={`text-right font-mono ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          {isUp ? '+' : ''}{changePct.toFixed(2)}%
        </TableCell>
        <TableCell className="text-right">
          <SparklineChart data={quote.sparkline} />
        </TableCell>
        <TableCell className="text-right">
          {onTrade && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onTrade(symbol) }}
            >
              Trade
            </Button>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="p-0">
            <div className="p-4 bg-muted/20">
              <PriceChart symbol={symbol} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
