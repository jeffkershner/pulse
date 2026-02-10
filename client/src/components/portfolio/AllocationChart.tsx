import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PositionResponse, PortfolioSummary } from '@/api/portfolio'
import { useQuoteStore } from '@/stores/quoteStore'
import { formatCurrency } from '@/utils/format'
import { PieChartIcon } from 'lucide-react'

const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

interface AllocationChartProps {
  positions: PositionResponse[]
  summary: PortfolioSummary
}

export default function AllocationChart({ positions, summary }: AllocationChartProps) {
  const quotes = useQuoteStore((s) => s.quotes)

  const data = positions.map((pos) => {
    const livePrice = quotes[pos.symbol]?.price ?? pos.current_price
    return {
      name: pos.symbol,
      value: Math.round(livePrice * pos.quantity * 100) / 100,
    }
  })

  if (summary.cash_balance > 0) {
    data.push({ name: 'Cash', value: summary.cash_balance })
  }

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label={(props: any) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{ background: 'hsl(225 30% 8.5%)', border: '1px solid hsl(224 25% 16%)', borderRadius: '8px' }}
              labelStyle={{ color: 'hsl(210 40% 98%)' }}
              itemStyle={{ color: 'hsl(210 40% 98%)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
