import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import QuoteRow from './QuoteRow'

interface ExchangeTableProps {
  name: string
  symbols: readonly string[]
  accentColor: string
  onTrade?: (symbol: string) => void
}

export default function ExchangeTable({ name, symbols, accentColor, onTrade }: ExchangeTableProps) {
  return (
    <Card className={`border-l-4 ${accentColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{name}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Symbol</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Trend</TableHead>
              <TableHead className="text-right w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {symbols.map((symbol) => (
              <QuoteRow key={symbol} symbol={symbol} onTrade={onTrade} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
