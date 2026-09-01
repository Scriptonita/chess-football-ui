import { useEffect, useRef } from 'react'

/**
 * Selector for the elements a modal's Tab cycle may land on. `[tabindex="-1"]`
 * is deliberately excluded: programmatically focusable nodes (like the panel
 * itself) must not become Tab stops.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Deliberately not an `offsetParent` check: that is `null` for anything inside a
 * `position: fixed` subtree (which every one of these dialogs is) and always
 * `null` under jsdom. Attribute-level hiding is what actually matters here.
 */
function focusableWithin(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]'),
  )
}

interface DialogA11yOptions {
  open: boolean
  onClose: () => void
}

/**
 * The four behaviours `aria-modal="true"` promises but does not implement.
 * Declaring `aria-modal` without them is worse than not declaring it at all:
 * assistive tech stops exposing the page behind the dialog while the keyboard
 * happily walks straight into it.
 *
 *   1. Initial focus — the first focusable control, or the panel itself.
 *   2. Focus trap — Tab / Shift+Tab cycle inside the panel.
 *   3. Escape closes.
 *   4. Focus returns to whatever opened the dialog.
 *
 * Attach the returned ref to the dialog panel (the node carrying `role="dialog"`).
 */
export function useDialogA11y({ open, onClose }: DialogA11yOptions) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreToRef = useRef<HTMLElement | null>(null)

  // `onClose` is nearly always an inline arrow: keep it in a ref so the
  // key listener isn't torn down and re-attached on every parent render.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    restoreToRef.current = document.activeElement as HTMLElement | null

    const initial = focusableWithin(panel)[0]
    if (initial) {
      initial.focus()
    } else {
      panel.tabIndex = -1
      panel.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusableWithin(panel)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      restoreToRef.current?.focus?.()
    }
  }, [open])

  return panelRef
}
