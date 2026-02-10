import { create } from 'zustand'

export interface Quote {
  symbol: string
  price: number
  prevPrice: number | null
  volume: number
  timestamp: number
  sparkline: number[]
}

interface QuoteState {
  quotes: Record<string, Quote>
  setSnapshot: (snapshots: Array<{ symbol: string; price: number; volume: number; timestamp: number; sparkline: number[] }>) => void
  updateQuotes: (updates: Array<{ symbol: string; price: number; volume: number; timestamp: number; sparkline: number[] }>) => void
}

export const useQuoteStore = create<QuoteState>((set) => ({
  quotes: {},

  setSnapshot: (snapshots) => {
    const quotes: Record<string, Quote> = {}
    for (const s of snapshots) {
      quotes[s.symbol] = {
        symbol: s.symbol,
        price: s.price,
        prevPrice: null,
        volume: s.volume,
        timestamp: s.timestamp,
        sparkline: s.sparkline,
      }
    }
    set({ quotes })
  },

  updateQuotes: (updates) => {
    set((state) => {
      const newQuotes = { ...state.quotes }
      for (const u of updates) {
        const existing = newQuotes[u.symbol]
        newQuotes[u.symbol] = {
          symbol: u.symbol,
          price: u.price,
          prevPrice: existing ? existing.price : null,
          volume: u.volume,
          timestamp: u.timestamp,
          sparkline: u.sparkline,
        }
      }
      return { quotes: newQuotes }
    })
  },
}))
