import { apiFetch } from '@/api/client'

export interface PositionResponse {
  symbol: string
  quantity: number
  avg_cost_basis: number
  total_cost: number
  current_price: number
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_percent: number
  realized_pnl: number
}

export interface PortfolioSummary {
  total_value: number
  cash_balance: number
  invested_value: number
  total_return: number
  total_return_percent: number
}

export interface PortfolioResponse {
  summary: PortfolioSummary
  positions: PositionResponse[]
}

export function fetchPortfolio(): Promise<PortfolioResponse> {
  return apiFetch('/portfolio')
}
