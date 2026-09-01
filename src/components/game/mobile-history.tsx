import { useId, useState } from 'react'
import { useGameStore } from '../../store/use-game-store'
import { cn } from '../../lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { MoveHistory } from './move-history'
import { squareName, SHORT_KEY } from '@scriptonita/chess-football-engine'
import type { MoveHistoryEntry } from '@scriptonita/chess-football-engine'
import { useGameT } from '../../i18n'
import { useDialogA11y } from '../../lib/use-dialog-a11y'
import { X } from 'lucide-react'

interface MobileHistoryProps {
    className?: string
}

export function MobileHistory({ className }: MobileHistoryProps) {
    const { boardState } = useGameStore()
    const [open, setOpen] = useState(false)
    const titleId = `${useId()}-title`
    const panelRef = useDialogA11y({ open, onClose: () => setOpen(false) })

    const lastMove = boardState?.moveHistory?.at(-1)

    if (!lastMove) return null

    return (
        <>
            <HistoryChip lastMove={lastMove} onClick={() => setOpen(true)} className={className} />

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            key="sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                            ref={panelRef}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary rounded-t-2xl border-t border-border-subtle shadow-xl focus:outline-none"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                        >
                            <SheetHeader titleId={titleId} onClose={() => setOpen(false)} />
                            <div className="px-4 pb-6 max-h-[50dvh] overflow-y-auto">
                                <MoveHistory scrollable={false} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

function SheetHeader({ titleId, onClose }: { titleId: string; onClose: () => void }) {
    const t = useGameT()
    return (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
            <span id={titleId} className="font-mono text-[10px] tracking-[0.5px] uppercase text-fg-muted">
                {t('history.title')}
            </span>
            <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-surface hover:bg-bg-surface-elevated text-fg-muted hover:text-fg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green"
                aria-label={t('history.close')}
            >
                <X size={14} aria-hidden="true" />
            </button>
        </div>
    )
}

interface HistoryChipProps {
    lastMove: MoveHistoryEntry
    onClick: () => void
    className?: string
}

function HistoryChip({ lastMove, onClick, className }: HistoryChipProps) {
    const t = useGameT()
    const toSq = squareName(lastMove.to)
    let label: string
    switch (lastMove.type) {
        case 'pass':          label = `⊕ ${toSq}`; break
        case 'tackle':        label = `✕ ${toSq}`; break
        case 'interception':  label = `⛔ ${toSq}`; break
        case 'goal':          label = `⚽ GOL`; break
        case 'offside':       label = `⚠ OFS`; break
        default: {
            const pieceShort = t(`pieces.${SHORT_KEY[lastMove.pieceType]}`)
            const fromSq = lastMove.from ? squareName(lastMove.from) : ''
            label = fromSq ? `${pieceShort}${fromSq}→${toSq}` : `${pieceShort}→${toSq}`
        }
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'bg-bg-surface border border-border-subtle',
                'font-mono text-[11px] text-fg-secondary',
                'hover:text-fg-primary hover:bg-bg-surface-elevated active:scale-95',
                'transition-all duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green',
                className,
            )}
            aria-label={t('history.viewAll')}
        >
            <span>{label}</span>
            <span className="text-fg-muted text-[10px]" aria-hidden="true">▾</span>
        </button>
    )
}
