import { useState } from 'react'
import { useGameStore } from '../../store/use-game-store'
import { Button } from '../ui/button'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Flag } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useGameT } from '../../i18n'

interface GameControlsProps {
  isMyTurn: boolean
  className?: string
}

export default function GameControls({ isMyTurn, className }: GameControlsProps) {
  const boardState = useGameStore(s => s.boardState)
  const endTurn = useGameStore(s => s.endTurn)

  const t = useGameT()
  const [showEndTurnConfirm, setShowEndTurnConfirm] = useState(false)

  if (!boardState) return null

  const actionPoints = boardState.actionPoints

  // Only ask for confirmation when ≥2 AP remain — with 0–1 AP left it's obvious
  const handleEndTurn = () => {
    if (actionPoints >= 2) {
      setShowEndTurnConfirm(true)
    } else {
      endTurn()
    }
  }

  return (
    <div className={cn('w-full bg-bg-secondary flex flex-col gap-3 px-5 pt-3 pb-5', className)}>
      {/* Finalizar turno */}
      {isMyTurn && (
        <Button
          variant="primary"
          size="default"
          className="w-full gap-2 tracking-[1.5px]"
          onClick={handleEndTurn}
        >
          <Flag size={16} strokeWidth={2} />
          {t('endTurn')}
          {actionPoints >= 2 && (
            <span className={cn('ml-1 font-inter text-xs font-normal opacity-70 tracking-normal')}>
              · {actionPoints} {t('actionPointsShort')}
            </span>
          )}
        </Button>
      )}

      {/* Turno del rival */}
      {!isMyTurn && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center h-11 rounded-md bg-bg-surface border border-border-subtle"
        >
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
