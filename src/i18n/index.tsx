import { createContext, useContext, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

/**
 * A translator scoped to the `game` namespace: `t('turn')`, `t('whiteToMove')`, …
 * Each host app supplies one bound to its own i18n library:
 *   - Next.js (next-intl):   const t = useTranslations('game')
 *   - Vite (react-i18next):  (key) => t(`game.${key}`)
 */
export type GameTranslator = (key: string, values?: Record<string, unknown>) => string

/**
 * Manifest of every `game`-namespace key the package's components read via `useGameT`.
 * Host apps use it to assert their translation catalogs cover the package (AD-4).
 * Kept in sync with the `t('…')` calls in `src/components`; extend it when a component
 * introduces a new key. No key names an AI/opponent brand — the roster owns identity.
 */
export const GAME_I18N_KEYS = [
  'actionPointsAriaLabel',
  'actionPointsShort',
  'endTurn',
  'endTurnConfirm',
  'endTurnConfirmDescription',
  'endTurnConfirmYes',
  'endTurnKeepPlaying',
  'move',
  'offsideWarning',
  'pass',
  'teamBlack',
  'teamWhite',
  'turn',
  'waitingRival',
  'whiteToMove',
  'yourTurn',
] as const

/** Union of the `game`-namespace keys the package reads. */
export type GameI18nKey = (typeof GAME_I18N_KEYS)[number]

const fallback: GameTranslator = (key) => key

const GameI18nContext = createContext<GameTranslator>(fallback)

export function GameI18nProvider({ t, children }: { t: GameTranslator; children: ReactNode }) {
  return (
    <GameI18nContext.Provider value={t}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </GameI18nContext.Provider>
  )
}

/** Returns the `game`-scoped translator provided by the host app (identity fallback). */
export function useGameT(): GameTranslator {
  return useContext(GameI18nContext)
}
