import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { searchSymbols, type SearchResult } from '@/api/market'

interface AddTickerModalProps {
  open: boolean
  onClose: () => void
  onAdd: (symbol: string) => void
}

export default function AddTickerModal({ open, onClose, onAdd }: AddTickerModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchSymbols(query)
        setResults(data)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (symbol: string) => {
    onAdd(symbol)
    setQuery('')
    setResults([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Ticker to Watchlist</DialogTitle>
        </DialogHeader>
        <Command className="border rounded-lg">
          <CommandInput
            placeholder="Search symbols..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && <CommandEmpty>Searching...</CommandEmpty>}
            {!loading && query && results.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((r) => (
                  <CommandItem
                    key={r.symbol}
                    value={r.symbol}
                    onSelect={() => handleSelect(r.symbol)}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between w-full">
                      <span className="font-medium">{r.symbol}</span>
                      <span className="text-sm text-muted-foreground truncate ml-2">{r.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
