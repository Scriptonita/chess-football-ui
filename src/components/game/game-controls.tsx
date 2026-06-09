import { useState } from 'react'
import { useGameStore } from '../../store/use-game-store'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Move, Flag } from 'lucide-react'
import { Football } from './football'
import { cn } from '../../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameT } from '../../i18n'

interface GameControlsProps {
  isMyTurn: boolean
}

export default function GameControls({ isMyTurn }: GameControlsProps) {
  const {
    boardState,
    selectedPieceId,
    interactionMode,
    setInteractionMode,
    endTurn,
  } = useGameStore()

  const t = useGameT()
  const [showEndTurnConfirm, setShowEndTurnConfirm] = useState(false)

  if (!boardState) return null

  const actionPoints  = boardState.actionPoints
  const selectedPiece = boardState.pieces.find(p => p.id === selectedPieceId)
  const hasBall       = selectedPiece && boardState.ball.holderId === selectedPiece.id
  const canPass       = hasBall && actionPoints > 0
  const canMove       = actionPoints > 0 && !selectedPiece?.hasMovedThisTurn

  return (
    <div className="w-full bg-bg-secondary flex flex-col gap-3 px-5 pt-3 pb-5">
      {/* Botones de acción (visibles siempre en mi turno, deshabilitados cuando no se puede) */}
      <AnimatePresence>
        {isMyTurn && (
          <motion.div
            key="action-btns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex gap-2"
          >
            {/* Desplazar */}
            <button
              onClick={() => setInteractionMode('move')}
              disabled={!canMove}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-md border font-inter text-sm font-semibold',
                'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-move-highlight',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                interactionMode === 'move'
                  ? 'bg-move-highlight/10 border-move-highlight text-move-highlight'
                  : 'bg-bg-surface border-border-subtle text-move-highlight hover:bg-move-highlight/5',
              )}
              aria-pressed={interactionMode === 'move'}
            >
              <Move size={16} strokeWidth={2} />
              {t('move')}
            </button>

            {/* Pasar */}
            <button
              onClick={() => setInteractionMode('pass')}
              disabled={!canPass}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-md border font-inter text-sm font-semibold',
                'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pass-highlight',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                interactionMode === 'pass'
                  ? 'bg-pass-highlight/10 border-pass-highlight text-pass-highlight'
                  : 'bg-bg-surface border-border-subtle text-pass-highlight hover:bg-pass-highlight/5',
              )}
              aria-pressed={interactionMode === 'pass'}
            >
              <span className="w-4 h-4 inline-flex">
                <Football />
              </span>
              {t('pass')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finalizar turno */}
      {isMyTurn && (
        <Button
          variant="primary"
          size="default"
          className="w-full gap-2 tracking-[1.5px]"
          onClick={() => setShowEndTurnConfirm(true)}
        >
          <Flag size={16} strokeWidth={2} />
          {t('endTurn')}
        </Button>
      )}

      {/* Turno del rival */}
      {!isMyTurn && (
        <div className="flex items-center justify-center h-11 rounded-md bg-bg-surface border border-border-subtle">
          <span className="font-inter text-sm text-fg-muted">{t('waitingRival')}</span>
        </div>
      )}

      <ConfirmDialog
        open={showEndTurnConfirm}
        title={t('endTurnConfirm')}
        description={t('endTurnConfirmDescription', { count: actionPoints })}
        confirmLabel={t('endTurnConfirmYes')}
        cancelLabel={t('endTurnKeepPlaying')}
        onConfirm={() => { endTurn(); setShowEndTurnConfirm(false) }}
        onCancel={() => setShowEndTurnConfirm(false)}
      />
    </div>
  )
}
