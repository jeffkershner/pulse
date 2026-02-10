import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchIndices, type IndexQuote } from '@/api/market'
import { cn } from '@/lib/utils'

const INDEX_DISPLAY_NAMES: Record<string, string> = {
  DIA: 'DOW',
  SPY: 'S&P 500',
  QQQ: 'NASDAQ',
  IWM: 'RUSSELL 2K',
}

function formatIndexPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

export default function IndexCards() {
  const [indices, setIndices] = useState<IndexQuote[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await fetchIndices()
      setIndices(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border rounded-lg overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={cn("p-5", i > 0 && "border-l border-border")}>
            <Skeleton className="h-14" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border border-border rounded-lg overflow-hidden bg-card">
      {indices.map((idx, i) => {
        const isUp = idx.change_percent >= 0
        const displayName = INDEX_DISPLAY_NAMES[idx.symbol] || idx.name
        return (
          <div
            key={idx.symbol}
            className={cn("p-5", i > 0 && "border-l border-border")}
          >
            <div className="text-xs text-muted-foreground font-mono tracking-widest uppercase">
              {displayName}
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-xl font-bold tabular-nums">
                {formatIndexPrice(idx.price)}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  isUp ? "text-green-500" : "text-red-500"
                )}
              >
                {isUp ? '+' : ''}{idx.change_percent.toFixed(2)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
