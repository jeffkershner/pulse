import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { fetchCandles } from '@/api/market'
import { useQuoteStore } from '@/stores/quoteStore'

interface PriceChartProps {
  symbol: string
}

export default function PriceChart({ symbol }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: false,
      },
    })
    chartRef.current = chart

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })
    seriesRef.current = series

    // Fetch historical candle data
    setLoading(true)
    fetchCandles(symbol, 'D', 90)
      .then((candles) => {
        if (candles.length && seriesRef.current) {
          const data = candles.map((c) => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
          seriesRef.current.setData(data)
          chart.timeScale().fitContent()
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [symbol])

  // Stream live updates as the latest candle
  useEffect(() => {
    const unsub = useQuoteStore.subscribe((state) => {
      const quote = state.quotes[symbol]
      if (quote && seriesRef.current) {
        const today = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
        seriesRef.current.update({
          time: today as any,
          open: quote.price,
          high: quote.price,
          low: quote.price,
          close: quote.price,
        })
      }
    })
    return unsub
  }, [symbol])

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          Loading chart...
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
