import { apiFetch } from '@/api/client'

export interface TradeResponse {
  id: string
  symbol: string
  side: string
  quantity: number
  price: number
  total: number
  executed_at: string
}

export interface TradeHistoryResponse {
  trades: TradeResponse[]
  total: number
  page: number
  page_size: number
}

export function executeTrade(symbol: string, side: string, quantity: number): Promise<TradeResponse> {
  return apiFetch('/trades', {
    method: 'POST',
    body: JSON.stringify({ symbol, side, quantity }),
  })
}

export function fetchTradeHistory(page = 1, pageSize = 20): Promise<TradeHistoryResponse> {
  return apiFetch(`/trades?page=${page}&page_size=${pageSize}`)
}
