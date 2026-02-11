import { useEffect, useRef } from 'react'
import { API_BASE } from '@/utils/constants'
import { useAuthStore } from '@/stores/authStore'
import { useQuoteStore } from '@/stores/quoteStore'

const MAX_BACKOFF = 30_000

export function useQuoteStream(symbols: string[]) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const updateAccessToken = useAuthStore((s) => s.updateAccessToken)
  const setSnapshot = useQuoteStore((s) => s.setSnapshot)
  const updateQuotes = useQuoteStore((s) => s.updateQuotes)
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffRef = useRef(1000)
  const cbRef = useRef({ setSnapshot, updateQuotes, updateAccessToken })
  const connectRef = useRef<((token: string, symbolsParam: string) => void) | null>(null)

  useEffect(() => {
    cbRef.current = { setSnapshot, updateQuotes, updateAccessToken }
  })

  if (connectRef.current == null) {
    connectRef.current = function connect(token: string, symbolsParam: string) {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }

      const url = `${API_BASE}/stream?symbols=${encodeURIComponent(symbolsParam)}&token=${encodeURIComponent(token)}`
      const es = new EventSource(url)
      esRef.current = es

      es.addEventListener('snapshot', (e) => {
        try {
          cbRef.current.setSnapshot(JSON.parse(e.data))
        } catch { /* ignore */ }
      })

      es.addEventListener('quote', (e) => {
        try {
          cbRef.current.updateQuotes(JSON.parse(e.data))
          backoffRef.current = 1000
        } catch { /* ignore */ }
      })

      es.onopen = () => {
        backoffRef.current = 1000
      }

      es.onerror = () => {
        es.close()
        if (esRef.current !== es) return
        esRef.current = null

        const { refreshToken: rt } = useAuthStore.getState()
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)

        retryRef.current = setTimeout(async () => {
          if (rt) {
            try {
              const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: rt }),
              })
              if (res.ok) {
                const data = await res.json()
                cbRef.current.updateAccessToken(data.access_token)
                connect(data.access_token, symbolsParam)
                return
              }
            } catch { /* fall through to reconnect with current token */ }
          }
          const { accessToken: currentToken } = useAuthStore.getState()
          if (currentToken) {
            connect(currentToken, symbolsParam)
          }
        }, delay)
      }
    }
  }

  const symbolsKey = symbols.join(',')

  useEffect(() => {
    if (!accessToken || symbols.length === 0) return

    backoffRef.current = 1000
    connectRef.current!(accessToken, symbolsKey)

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [accessToken, symbolsKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
