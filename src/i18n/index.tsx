import { createContext, useContext, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { SHORT_KEY, LONG_KEY, type PieceShortKey, type PieceLongKey } from '@scriptonita/chess-football-engine'

/**
 * A translator scoped to the `game` namespace: `t('yourTurn')`, `t('move')`, …
 * Each host app supplies one bound to its own i18n library:
 *   - Next.js (next-intl):   const t = useTranslations('game')
 *   - Vite (react-i18next):  (key) => t(`game.${key}`)
 */
export type GameTranslator = (key: string, values?: Record<string, unknown>) => string

/**
 * Static leaf keys the package's components read via `useGameT` with a literal `t('…')` call.
 * Keep in sync with those call sites — recipe:
 *   grep -rhoE "t\('[a-zA-Z0-9_.]+'" src/components | sed -E "s/t\('//;s/'//" | sort -u
 * (the dynamic `pieces.*` / `eventToast.*` families are derived separately below).
 */
const STATIC_I18N_KEYS = [
  'actionPointsAriaLabel',
  'actionPointsShort',
  'ballHolder',
  'endTurn',
  'endTurnConfirm',
  'endTurnConfirmDescription',
  'endTurnConfirmYes',
  'endTurnKeepPlaying',
  'history.empty',
  'history.goal',
  'history.interception',
  'history.move',
  'history.offside',
  'history.pass',
  'history.tackle',
  'history.title',
  'history.turn',
  'history.viewAll',
  'move',
  'offsideWarning',
  'pass',
  'selectedPiece.alreadyMoved',
  'selectedPiece.atSquare',
  'selectedPiece.empty',
  'selectedPiece.hasBall',
  'shortcuts.arrows',
  'shortcuts.buttonLabel',
  'shortcuts.cancel',
  'shortcuts.move',
  'shortcuts.pass',
  'shortcuts.select',
  'shortcuts.title',
  'teamBlack',
  'teamWhite',
  'waitingRival',
  'yourTurn',
] as const

/** `pieces.*` — one key per short and long piece label the engine exposes (move-history, selected-piece-detail). */
type PieceI18nKey = `pieces.${PieceShortKey | PieceLongKey}`
const PIECE_I18N_KEYS: PieceI18nKey[] = [...Object.values(SHORT_KEY), ...Object.values(LONG_KEY)].map(
  (label) => `pieces.${label}` as PieceI18nKey,
)

/** `eventToast.*` — one key per toastable event (see `ToastEvent` in `event-toast.tsx`). */
type EventToastI18nKey = `eventToast.${'interception' | 'offside' | 'tackle'}`
const EVENT_TOAST_I18N_KEYS: EventToastI18nKey[] = [
  'eventToast.interception',
  'eventToast.offside',
  'eventToast.tackle',
]

/** Union of every `game`-namespace key the package reads. */
export type GameI18nKey = (typeof STATIC_I18N_KEYS)[number] | PieceI18nKey | EventToastI18nKey

/**
 * Manifest of every `game`-namespace key the package's components read via `useGameT`.
 * Host apps use it to assert their translation catalogs cover the package (AD-4).
 * The `pieces.*` family is derived from the engine's `SHORT_KEY`/`LONG_KEY` so it can't
 * drift when a piece is added; static keys and `eventToast.*` are listed above.
 * No key names an automated-opponent brand — the roster owns opponent identity.
 */
export const GAME_I18N_KEYS: readonly GameI18nKey[] = [
  ...STATIC_I18N_KEYS,
  ...PIECE_I18N_KEYS,
  ...EVENT_TOAST_I18N_KEYS,
]

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
