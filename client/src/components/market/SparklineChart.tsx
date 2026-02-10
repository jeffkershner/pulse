import { useId } from 'react'

interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
}

export default function SparklineChart({ data, width = 100, height = 36 }: SparklineChartProps) {
  const id = useId()

  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 2

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = pad + (height - 2 * pad) - ((val - min) / range) * (height - 2 * pad)
    return { x, y }
  })

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`

  const isUp = data[data.length - 1] >= data[0]
  const color = isUp ? '#22c55e' : '#ef4444'
  const gradientId = `spark-${id}`

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
