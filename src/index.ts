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
export { GrassOverlay, PitchMarkings, PitchSurface, pitchSquareClass, isGoalAreaSquare, GOAL_AREA_SHADE_CLASS, PITCH_COLS, PITCH_ROWS } from './components/game/pitch'
export { TurnBanner } from './components/game/turn-banner'
export { EventToast } from './components/game/event-toast'
export { MobileHistory } from './components/game/mobile-history'
export { BallHolderChip } from './components/game/ball-holder-chip'
export { KeyboardShortcutsList } from './components/game/keyboard-shortcuts'

// ── UI primitives ─────────────────────────────────────────────────────────────
export { ActionPoints } from './components/action-points'
export { Button, type ButtonProps } from './components/ui/button'
export { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar'
export { ConfirmDialog } from './components/ui/confirm-dialog'

// ── Store ─────────────────────────────────────────────────────────────────────
// Exported from the dedicated, framework-pure `./store` subpath instead — it must
// stay free of client-only React APIs so server code (e.g. Next.js route handlers
// calling getInitialBoardState) can import it without pulling in the client bundle.
// See ./store/use-game-store.

// ── i18n injection ────────────────────────────────────────────────────────────
export { GameI18nProvider, useGameT, GAME_I18N_KEYS, type GameTranslator, type GameI18nKey } from './i18n'

// ── Utilities ─────────────────────────────────────────────────────────────────
export { cn } from './lib/utils'
// Apps render their own modals (end-of-match overlays, sheets). They get the
// same focus contract as the package's dialogs instead of reimplementing it —
// which is how those overlays ended up with no focus management at all.
export { useDialogA11y } from './lib/use-dialog-a11y'
