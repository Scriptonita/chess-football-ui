// ── Game components ───────────────────────────────────────────────────────────
export { default as GameBoard } from './components/game/game-board'
export { default as GamePiece } from './components/game/game-piece'
export { Football } from './components/game/football'
export { default as Scoreboard } from './components/game/scoreboard'
export { MiniScoreboard } from './components/game/mini-scoreboard'
export { default as GameControls } from './components/game/game-controls'
export { SelectedPieceDetail } from './components/game/selected-piece-detail'
export { MoveHistory } from './components/game/move-history'
export { StaticGameBoard } from './components/game/static-game-board'

// ── UI primitives ─────────────────────────────────────────────────────────────
export { ActionPoints } from './components/action-points'
export { Button, type ButtonProps } from './components/ui/button'
export { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar'
export { ConfirmDialog } from './components/ui/confirm-dialog'

// ── Store ─────────────────────────────────────────────────────────────────────
export { useGameStore, getInitialBoardState } from './store/use-game-store'

// ── i18n injection ────────────────────────────────────────────────────────────
export { GameI18nProvider, useGameT, type GameTranslator } from './i18n'

// ── Utilities ─────────────────────────────────────────────────────────────────
export { cn } from './lib/utils'
