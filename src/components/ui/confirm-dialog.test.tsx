import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './confirm-dialog'

const props = {
  open: true,
  title: 'End turn?',
  description: 'You still have action points left.',
  confirmLabel: 'End turn',
  cancelLabel: 'Keep playing',
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    render(<ConfirmDialog {...props} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('names itself from its own title and description', () => {
    render(<ConfirmDialog {...props} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'End turn?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('You still have action points left.')
  })

  it('moves focus into the dialog on open', () => {
    render(<ConfirmDialog {...props} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Keep playing' })).toHaveFocus()
  })

  it('traps Tab inside the dialog instead of letting it walk the page behind', () => {
    render(<ConfirmDialog {...props} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const cancel = screen.getByRole('button', { name: 'Keep playing' })
    const confirm = screen.getByRole('button', { name: 'End turn' })

    confirm.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(cancel).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()
  })

  it('treats Escape as cancel', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...props} onConfirm={onConfirm} onCancel={onCancel} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('returns focus to whatever opened it', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const { rerender } = render(<ConfirmDialog {...props} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(opener).not.toHaveFocus()

    rerender(<ConfirmDialog {...props} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(opener).toHaveFocus()

    opener.remove()
  })
})
