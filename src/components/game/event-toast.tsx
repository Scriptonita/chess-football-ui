import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/use-game-store'
import { cn } from '../../lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameT } from '../../i18n'

interface EventToastProps {
    className?: string
}

type ToastEvent = 'goal' | 'interception' | 'offside' | 'tackle'

const TOASTABLE: ReadonlySet<string> = new Set<ToastEvent>(['goal', 'interception', 'offside', 'tackle'])

const TOAST_CONFIG: Record<ToastEvent, string> = {
    goal:         'bg-accent-green/20 border-accent-green/60 text-accent-green-light',
    interception: 'bg-danger/20 border-danger/50 text-danger',
    offside:      'bg-warning/20 border-warning/50 text-warning',
    tackle:       'bg-warning/20 border-warning/50 text-warning',
}

export function EventToast({ className }: EventToastProps) {
    const t = useGameT()
    const boardState = useGameStore(s => s.boardState)
    const [toast, setToast] = useState<{ type: ToastEvent; key: string } | null>(null)

    useEffect(() => {
        const lastMove = boardState?.lastMove
        if (!lastMove) return
        if (!TOASTABLE.has(lastMove.type)) return
        setToast({ type: lastMove.type as ToastEvent, key: String(lastMove.at) })
    }, [boardState?.lastMove?.at])

    useEffect(() => {
        if (!toast) return
        const timer = setTimeout(() => setToast(null), 2500)
        return () => clearTimeout(timer)
    }, [toast?.key])

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={cn('pointer-events-none flex justify-center', className)}
        >
            <AnimatePresence mode="wait">
                {toast && (
                    <motion.div
                        key={toast.key}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            'px-4 py-2 rounded-full border font-inter text-sm font-semibold shadow-lg backdrop-blur-sm text-center',
                            TOAST_CONFIG[toast.type],
                        )}
                    >
                        {t(`eventToast.${toast.type}`)}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
