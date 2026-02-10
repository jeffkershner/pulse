import { apiFetch } from '@/api/client'

export interface WatchlistItem {
  symbol: string
  added_at: string
}

export interface WatchlistResponse {
  items: WatchlistItem[]
}

export function fetchWatchlist(): Promise<WatchlistResponse> {
  return apiFetch('/watchlist')
}

export function addToWatchlist(symbol: string): Promise<WatchlistItem> {
  return apiFetch('/watchlist', {
    method: 'POST',
    body: JSON.stringify({ symbol }),
  })
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  await apiFetch(`/watchlist/${encodeURIComponent(symbol)}`, {
    method: 'DELETE',
  })
}
