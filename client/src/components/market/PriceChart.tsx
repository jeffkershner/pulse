import { useEffect, useRef } from 'react'
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, type AreaSeriesPartialOptions } from 'lightweight-charts'
import { useQuoteStore } from '@/stores/quoteStore'

interface PriceChartProps {
  symbol: string
}

export default function PriceChart({ symbol }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 200,
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
        timeVisible: true,
      },
    })
    chartRef.current = chart

    const areaOptions: AreaSeriesPartialOptions = {
      lineColor: '#22c55e',
      topColor: 'rgba(34, 197, 94, 0.3)',
      bottomColor: 'rgba(34, 197, 94, 0.02)',
      lineWidth: 2,
    }
    const series = chart.addSeries(AreaSeries, areaOptions)
    seriesRef.current = series

    // Load initial sparkline data
    const quote = useQuoteStore.getState().quotes[symbol]
    if (quote?.sparkline?.length) {
      const now = Math.floor(Date.now() / 1000)
      const data = quote.sparkline.map((price, i) => ({
        time: (now - (quote.sparkline.length - i) * 30) as any,
        value: price,
      }))
      series.setData(data)
    }

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

  // Stream updates
  useEffect(() => {
    const unsub = useQuoteStore.subscribe((state) => {
      const quote = state.quotes[symbol]
      if (quote && seriesRef.current) {
        const time = Math.floor(quote.timestamp / 1000) as any
        seriesRef.current.update({ time, value: quote.price })
      }
    })
    return unsub
  }, [symbol])

  return <div ref={containerRef} className="w-full" />
}
