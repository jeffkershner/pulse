import { useEffect, useRef } from 'react'
import { API_BASE } from '@/utils/constants'
import { useAuthStore } from '@/stores/authStore'
import { useQuoteStore } from '@/stores/quoteStore'

export function useQuoteStream(symbols: string[]) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setSnapshot = useQuoteStore((s) => s.setSnapshot)
  const updateQuotes = useQuoteStore((s) => s.updateQuotes)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!accessToken || symbols.length === 0) return

    // Close previous connection
    if (esRef.current) {
      esRef.current.close()
    }

    const symbolsParam = symbols.join(',')
    const url = `${API_BASE}/stream?symbols=${encodeURIComponent(symbolsParam)}&token=${encodeURIComponent(accessToken)}`
    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('snapshot', (e) => {
      try {
        const data = JSON.parse(e.data)
        setSnapshot(data)
      } catch { /* ignore */ }
    })

    es.addEventListener('quote', (e) => {
      try {
        const data = JSON.parse(e.data)
        updateQuotes(data)
      } catch { /* ignore */ }
    })

    es.onerror = () => {
      es.close()
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null
        }
      }, 3000)
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [accessToken, symbols.join(','), setSnapshot, updateQuotes])
}
