import { useId } from 'react'
import { cn } from '../../lib/utils'
import { useDialogA11y } from '../../lib/use-dialog-a11y'
import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`
  // Escape and the backdrop resolve to the same outcome as the cancel button:
  // the dialog is a question, and dismissing it is answering "no".
  const panelRef = useDialogA11y({ open, onClose: onCancel })

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-bg-surface border border-border-subtle rounded-xl p-6 mx-4 max-w-sm w-full',
          'flex flex-col gap-4 shadow-2xl',
          'focus:outline-none',
        )}
      >
        <h2 id={titleId} className="font-anton text-lg text-fg-primary uppercase tracking-wide">{title}</h2>
        {description && <p id={descId} className="font-inter text-sm text-fg-secondary">{description}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="primary" className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
