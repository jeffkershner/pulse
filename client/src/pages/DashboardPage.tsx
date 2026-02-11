import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import IndexCards from '@/components/market/IndexCards'
import SparklineChart from '@/components/market/SparklineChart'
import AddTickerModal from '@/components/watchlist/AddTickerModal'
import TradeModal from '@/components/trading/TradeModal'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { useQuoteStream } from '@/hooks/useQuoteStream'
import { useQuoteStore, type Quote } from '@/stores/quoteStore'
import { useAuthStore } from '@/stores/authStore'
import { fetchWatchlist, addToWatchlist, removeFromWatchlist } from '@/api/watchlist'
import { fetchMarketStatus } from '@/api/market'
import {
  ALL_DASHBOARD_SYMBOLS,
  ALL_STOCK_SYMBOLS,
  EXCHANGE_SYMBOLS,
  COMPANY_NAMES,
  SYMBOL_EXCHANGE,
} from '@/utils/constants'
import { formatVolume } from '@/utils/format'
import { cn } from '@/lib/utils'
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, X, Briefcase, LogOut } from 'lucide-react'
import { toast } from 'sonner'

type SortField = 'symbol' | 'price' | 'change' | 'volume'
type SortDir = 'asc' | 'desc'
type ExchangeFilter = 'ALL' | 'NYSE' | 'NASDAQ' | 'S&P 500'

const FILTER_TABS: ExchangeFilter[] = ['ALL', 'NYSE', 'NASDAQ', 'S&P 500']

function useCurrentTime() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  return time
}

function useMarketStatus() {
  const [isOpen, setIsOpen] = useState(false)
  const [holiday, setHoliday] = useState<string | null>(null)
  useEffect(() => {
    const check = async () => {
      try {
        const status = await fetchMarketStatus()
        setIsOpen(status.is_open)
        setHoliday(status.holiday)
      } catch { /* ignore */ }
    }
    check()
    const interval = setInterval(check, 60_000) // re-check every minute
    return () => clearInterval(interval)
  }, [])
  return { isOpen, holiday }
}

// --- MarketRow ---

interface MarketRowProps {
  symbol: string
  isWatchlistItem: boolean
  onRemove?: (symbol: string) => void
  onTrade?: (symbol: string) => void
}

function MarketRow({ symbol, isWatchlistItem, onRemove, onTrade }: MarketRowProps) {
  const quote = useQuoteStore((s) => s.quotes[symbol]) as Quote | undefined
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

  const companyName = COMPANY_NAMES[symbol] || symbol

  const change = quote && quote.sparkline.length > 1
    ? quote.price - quote.sparkline[0]
    : 0
  const changePct = quote && quote.sparkline.length > 1 && quote.sparkline[0]
    ? (change / quote.sparkline[0]) * 100
    : 0
  const isUp = change >= 0

  return (
    <TableRow
      className={cn('hover:bg-muted/30', flashClass)}
    >
      {/* Symbol + Company Name */}
      <TableCell className="py-5">
        <div className="flex items-center gap-3">
          <div className={cn('w-1 h-10 rounded-full', isUp ? 'bg-green-500' : 'bg-red-500')} />
          <div>
            <div className="font-bold text-[15px]">{symbol}</div>
            <div className="text-sm text-muted-foreground">{companyName}</div>
          </div>
        </div>
      </TableCell>

      {/* Price */}
      <TableCell className="text-right py-5">
        <span className="font-mono text-[15px] border border-border rounded px-2.5 py-1">
          ${quote ? quote.price.toFixed(2) : '--'}
        </span>
      </TableCell>

      {/* Change */}
      <TableCell className="text-center py-5">
        {quote ? (
          <div className={cn('inline-flex flex-col items-center', isUp ? 'text-green-500' : 'text-red-500')}>
            <span className="font-mono text-sm font-medium">
              {isUp ? '+' : ''}{change.toFixed(2)}
            </span>
            <span
              className={cn(
                'text-xs mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium',
                isUp ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
              )}
            >
              {isUp ? '\u25B2' : '\u25BC'} {Math.abs(changePct).toFixed(2)}%
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">--</span>
        )}
      </TableCell>

      {/* Trend */}
      <TableCell className="text-center py-5">
        {quote ? <SparklineChart data={quote.sparkline} /> : null}
      </TableCell>

      {/* Volume */}
      <TableCell className="text-right py-5 font-mono text-muted-foreground">
        {quote ? formatVolume(quote.volume) : '--'}
      </TableCell>

      {/* Trade */}
      <TableCell className="text-center py-5">
        {onTrade && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTrade(symbol)}
          >
            Trade
          </Button>
        )}
      </TableCell>

      {/* Remove */}
      <TableCell className="text-right py-5 w-[40px]">
        {isWatchlistItem && onRemove ? (
          <button
            onClick={() => onRemove(symbol)}
            className="text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-muted-foreground/20">
            <X className="h-4 w-4" />
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}

// --- SortIcon ---

function SortIcon({ field, current, direction }: { field: SortField; current: SortField; direction: SortDir }) {
  if (field !== current) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />
  return direction === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 ml-1" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1" />
}

// --- DashboardPage ---

export default function DashboardPage() {
  const { email, logout } = useAuthStore()
  const now = useCurrentTime()
  const { isOpen: marketOpen, holiday } = useMarketStatus()
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'America/New_York' })

  const [filter, setFilter] = useState<ExchangeFilter>('ALL')
  const [sortField, setSortField] = useState<SortField>('symbol')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [tradeSymbol, setTradeSymbol] = useState<string | null>(null)

  const allSymbols = useMemo(
    () => [...new Set([...ALL_DASHBOARD_SYMBOLS, ...watchlistSymbols])],
    [watchlistSymbols],
  )

  useQuoteStream(allSymbols)

  const quotes = useQuoteStore((s) => s.quotes)

  // Load watchlist
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchWatchlist()
        setWatchlistSymbols(data.items.map((i) => i.symbol))
      } catch { /* ignore */ }
    }
    load()
  }, [])

  const handleAddTicker = useCallback(async (symbol: string) => {
    try {
      await addToWatchlist(symbol)
      setWatchlistSymbols((prev) => [...prev, symbol])
      toast.success(`${symbol} added to watchlist`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    }
  }, [])

  const handleRemoveTicker = useCallback(async (symbol: string) => {
    try {
      await removeFromWatchlist(symbol)
      setWatchlistSymbols((prev) => prev.filter((s) => s !== symbol))
      toast.success(`${symbol} removed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove')
    }
  }, [])

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir(field === 'symbol' ? 'asc' : 'desc')
      return field
    })
  }, [])

  // Filtered + sorted stock symbols (exclude index ETFs)
  const displaySymbols = useMemo(() => {
    let symbols: string[]
    if (filter === 'ALL') {
      symbols = [...ALL_STOCK_SYMBOLS, ...watchlistSymbols.filter(
        (s) => !(ALL_STOCK_SYMBOLS as readonly string[]).includes(s)
      )]
    } else {
      const exchangeSyms = EXCHANGE_SYMBOLS[filter as keyof typeof EXCHANGE_SYMBOLS] || []
      symbols = [...exchangeSyms, ...watchlistSymbols.filter(
        (s) => !((ALL_STOCK_SYMBOLS as readonly string[]).includes(s)) || SYMBOL_EXCHANGE[s] === filter
      ).filter(
        (s) => !(exchangeSyms as readonly string[]).includes(s)
      )]
    }

    // Deduplicate
    symbols = [...new Set(symbols)]

    // Sort
    symbols.sort((a, b) => {
      const qa = quotes[a] as Quote | undefined
      const qb = quotes[b] as Quote | undefined
      let cmp = 0

      switch (sortField) {
        case 'symbol':
          cmp = a.localeCompare(b)
          break
        case 'price':
          cmp = (qa?.price || 0) - (qb?.price || 0)
          break
        case 'change': {
          const chA = qa && qa.sparkline.length > 1 ? ((qa.price - qa.sparkline[0]) / qa.sparkline[0]) * 100 : 0
          const chB = qb && qb.sparkline.length > 1 ? ((qb.price - qb.sparkline[0]) / qb.sparkline[0]) * 100 : 0
          cmp = chA - chB
          break
        }
        case 'volume':
          cmp = (qa?.volume || 0) - (qb?.volume || 0)
          break
      }

      return sortDir === 'asc' ? cmp : -cmp
    })

    return symbols
  }, [filter, sortField, sortDir, quotes, watchlistSymbols])

  const watchlistSet = useMemo(() => new Set(watchlistSymbols), [watchlistSymbols])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-6 pt-6 pb-0 max-w-7xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              MARKET <span className="italic">PULSE</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1 tracking-widest">
              REAL-TIME DASHBOARD &bull; DEMO MODE
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  marketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                )}
              />
              <span className="text-muted-foreground font-mono text-xs tracking-wider">
                {marketOpen ? 'MARKET OPEN' : holiday ? `CLOSED — ${holiday.toUpperCase()}` : 'MARKET CLOSED'}
              </span>
              <span className="text-muted-foreground font-mono text-xs ml-2">{timeStr}</span>
            </div>
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Link to="/portfolio">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Portfolio</span>
                </Button>
              </Link>
              <span className="text-xs text-muted-foreground hidden md:inline">{email}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Index Cards */}
      <div className="container mx-auto px-6 mt-6 max-w-7xl">
        <IndexCards />
      </div>

      {/* Filter Tabs + Add Ticker */}
      <div className="container mx-auto px-6 mt-6 max-w-7xl flex items-center justify-between">
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === tab
                  ? 'bg-green-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Ticker
        </Button>
      </div>

      {/* Unified Stock Table */}
      <div className="container mx-auto px-6 mt-4 pb-8 max-w-7xl">
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="w-[200px] cursor-pointer select-none"
                  onClick={() => handleSort('symbol')}
                >
                  <span className="inline-flex items-center text-xs font-semibold tracking-wider uppercase">
                    Symbol
                    <SortIcon field="symbol" current={sortField} direction={sortDir} />
                  </span>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('price')}
                >
                  <span className="inline-flex items-center justify-end text-xs font-semibold tracking-wider uppercase">
                    Price
                    <SortIcon field="price" current={sortField} direction={sortDir} />
                  </span>
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer select-none"
                  onClick={() => handleSort('change')}
                >
                  <span className="inline-flex items-center justify-center text-xs font-semibold tracking-wider uppercase">
                    Change
                    <SortIcon field="change" current={sortField} direction={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs font-semibold tracking-wider uppercase">Trend</span>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => handleSort('volume')}
                >
                  <span className="inline-flex items-center justify-end text-xs font-semibold tracking-wider uppercase">
                    Volume
                    <SortIcon field="volume" current={sortField} direction={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs font-semibold tracking-wider uppercase">Trade</span>
                </TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySymbols.map((symbol) => (
                <MarketRow
                  key={symbol}
                  symbol={symbol}
                  isWatchlistItem={watchlistSet.has(symbol)}
                  onRemove={watchlistSet.has(symbol) ? handleRemoveTicker : undefined}
                  onTrade={setTradeSymbol}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddTickerModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAddTicker} />
      <TradeModal
        symbol={tradeSymbol}
        onClose={() => setTradeSymbol(null)}
        onSuccess={() => setTradeSymbol(null)}
      />
    </div>
  )
}
