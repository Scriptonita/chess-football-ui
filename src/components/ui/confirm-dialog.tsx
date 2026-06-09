import { cn } from '../../lib/utils'
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
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'bg-bg-surface border border-border-subtle rounded-xl p-6 mx-4 max-w-sm w-full',
          'flex flex-col gap-4 shadow-2xl',
        )}
      >
        <h2 className="font-anton text-lg text-fg-primary uppercase tracking-wide">{title}</h2>
        {description && <p className="font-inter text-sm text-fg-secondary">{description}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="primary" className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
