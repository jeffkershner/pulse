import { apiFetch } from '@/api/client'

export interface IndexQuote {
  symbol: string
  name: string
  price: number
  change: number
  change_percent: number
}

export interface QuoteSnapshot {
  symbol: string
  price: number
  volume: number
  timestamp: number
  sparkline: number[]
}

export interface SearchResult {
  symbol: string
  description: string
  type: string
}

export function fetchIndices(): Promise<IndexQuote[]> {
  return apiFetch('/market/indices')
}

export function fetchLatestQuotes(symbols: string[]): Promise<QuoteSnapshot[]> {
  return apiFetch(`/quotes/latest?symbols=${symbols.join(',')}`)
}

export function searchSymbols(query: string): Promise<SearchResult[]> {
  return apiFetch(`/search?q=${encodeURIComponent(query)}`)
}
