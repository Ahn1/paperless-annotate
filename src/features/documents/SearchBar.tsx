import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Volltextsuche mit Autocomplete-Vorschlägen von /api/search/autocomplete/. */
export function SearchBar({
  value,
  onSearch,
  autoFocus,
  className,
}: {
  value: string
  onSearch: (query: string) => void
  autoFocus?: boolean
  className?: string
}) {
  const t = useT()
  const api = useApi()
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setText(value), [value])
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Letztes Wort für Autocomplete verwenden (Paperless vervollständigt Terme)
  const lastTerm = text.trim().split(/\s+/).at(-1) ?? ''
  const { data: suggestions } = useQuery({
    queryKey: [api.client.baseUrl, 'autocomplete', lastTerm],
    queryFn: ({ signal }) => api.autocomplete(lastTerm, signal),
    enabled: open && lastTerm.length >= 2,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  })

  function applySuggestion(suggestion: string) {
    const words = text.trim().split(/\s+/)
    words[words.length - 1] = suggestion
    const next = words.join(' ')
    setText(next)
    onSearch(next)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(text)
          setOpen(false)
          inputRef.current?.blur()
        }}
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-faint" />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          placeholder={t('documents.searchPlaceholder')}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="h-11 w-full rounded-xl border border-line bg-surface-1 pl-10 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-2 focus:outline-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('')
              onSearch('')
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-faint hover:bg-surface-2"
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        )}
      </form>
      {open && (suggestions?.length ?? 0) > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface-1 shadow-lg">
          {suggestions!.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySuggestion(suggestion)}
                className="ui-chrome block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-2"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
