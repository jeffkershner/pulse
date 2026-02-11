import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuoteStore } from '@/stores/quoteStore'
import { executeTrade } from '@/api/trades'
import { fetchPortfolio } from '@/api/portfolio'
import { formatCurrency } from '@/utils/format'
import { toast } from 'sonner'

interface TradeModalProps {
  symbol: string | null
  onClose: () => void
  onSuccess: () => void
}

export default function TradeModal({ symbol, onClose, onSuccess }: TradeModalProps) {
  const [side, setSide] = useState<string>('BUY')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [cashBalance, setCashBalance] = useState<number | null>(null)
  const [positionQty, setPositionQty] = useState<number>(0)
  const quote = useQuoteStore((s) => (symbol ? s.quotes[symbol] : undefined))

  useEffect(() => {
    if (!symbol) return
    fetchPortfolio()
      .then((data) => {
        setCashBalance(data.summary.cash_balance)
        const pos = data.positions.find((p) => p.symbol === symbol)
        setPositionQty(pos?.quantity ?? 0)
      })
      .catch(() => {})
  }, [symbol])

  if (!symbol) return null

  const price = quote?.price ?? 0
  const qty = parseInt(quantity) || 0
  const total = price * qty

  const handleMax = () => {
    if (side === 'BUY' && price > 0 && cashBalance !== null) {
      setQuantity(String(Math.floor(cashBalance / price)))
    } else if (side === 'SELL') {
      setQuantity(String(positionQty))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (qty <= 0) return

    setLoading(true)
    try {
      const result = await executeTrade(symbol, side, qty)
      toast.success(
        `${result.side} ${result.quantity} ${result.symbol} @ ${formatCurrency(result.price)}`,
      )
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Trade failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!symbol} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trade {symbol}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <Select value={side} onValueChange={setSide}>
              <SelectTrigger className="w-[100px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 flex-1">
              <Input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                required
                className="text-lg text-foreground h-10"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleMax}
              >
                Max
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-mono">{formatCurrency(price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono font-bold">{formatCurrency(total)}</span>
            </div>
            {cashBalance !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Available</span>
                <span className="font-mono">{formatCurrency(cashBalance)}</span>
              </div>
            )}
            {positionQty > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shares Owned</span>
                <span className="font-mono">{positionQty}</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className={`w-full ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            disabled={loading || qty <= 0}
          >
            {loading ? 'Executing...' : `${side} ${qty > 0 ? qty : ''} ${symbol}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
