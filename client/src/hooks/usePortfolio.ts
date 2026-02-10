import { useCallback, useEffect, useState } from 'react'
import { fetchPortfolio, type PortfolioResponse } from '@/api/portfolio'

export function usePortfolio() {
  const [data, setData] = useState<PortfolioResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await fetchPortfolio()
      setData(result)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { data, loading, refresh }
}
