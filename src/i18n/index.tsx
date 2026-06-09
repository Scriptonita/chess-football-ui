import { createContext, useContext, type ReactNode } from 'react'

/**
 * A translator scoped to the `game` namespace: `t('turn')`, `t('whiteToMove')`, …
 * Each host app supplies one bound to its own i18n library:
 *   - Next.js (next-intl):   const t = useTranslations('game')
 *   - Vite (react-i18next):  (key) => t(`game.${key}`)
 */
export type GameTranslator = (key: string, values?: Record<string, unknown>) => string

const fallback: GameTranslator = (key) => key

const GameI18nContext = createContext<GameTranslator>(fallback)

export function GameI18nProvider({ t, children }: { t: GameTranslator; children: ReactNode }) {
  return <GameI18nContext.Provider value={t}>{children}</GameI18nContext.Provider>
}

/** Returns the `game`-scoped translator provided by the host app (identity fallback). */
export function useGameT(): GameTranslator {
  return useContext(GameI18nContext)
}
