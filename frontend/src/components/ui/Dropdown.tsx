import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
}

interface DropdownProps {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  label: string
  disabled?: boolean
  className?: string
}

function Dropdown({
  value,
  options,
  onChange,
  label,
  disabled = false,
  className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selectedOption = options[selectedIndex]

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()

    if (!open) {
      setOpen(true)
      requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus())
      return
    }

    const direction = event.key === 'ArrowDown' ? 1 : -1
    let nextIndex = selectedIndex

    for (let attempts = 0; attempts < options.length; attempts++) {
      nextIndex = (nextIndex + direction + options.length) % options.length
      if (!options[nextIndex].disabled) break
    }

    optionRefs.current[nextIndex]?.focus()
  }

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'Escape') {
      setOpen(false)
      rootRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')?.focus()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      for (let attempts = 1; attempts <= options.length; attempts++) {
        const nextIndex = (index + direction * attempts + options.length) % options.length
        if (!options[nextIndex].disabled) {
          optionRefs.current[nextIndex]?.focus()
          break
        }
      }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className="inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 truncate">{selectedOption?.label ?? label}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-50 mt-2 max-h-64 min-w-full overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {options.map((option, index) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element }}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                  requestAnimationFrame(() => {
                    rootRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')?.focus()
                  })
                }}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${selected ? 'bg-primary-subtle font-medium text-primary' : 'text-foreground hover:bg-surface-hover'}`}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check size={15} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Dropdown
