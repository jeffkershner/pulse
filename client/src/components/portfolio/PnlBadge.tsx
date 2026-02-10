import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent } from '@/utils/format'

interface PnlBadgeProps {
  value: number
  percent?: number
  showPercent?: boolean
}

export default function PnlBadge({ value, percent, showPercent = true }: PnlBadgeProps) {
  const isPositive = value >= 0
  const color = isPositive ? 'text-green-500' : 'text-red-500'
  const bgColor = isPositive ? 'bg-green-500/10 hover:bg-green-500/20' : 'bg-red-500/10 hover:bg-red-500/20'

  return (
    <Badge variant="outline" className={`${bgColor} ${color} border-0`}>
      {isPositive ? '+' : ''}{formatCurrency(value)}
      {showPercent && percent !== undefined && (
        <span className="ml-1">({formatPercent(percent)})</span>
      )}
    </Badge>
  )
}
