/**
 * Every CSS custom property the package's Tailwind classes resolve against.
 *
 * A token the host app does not define fails *silently*: Tailwind emits the
 * rule, the variable resolves to nothing, and the declaration is dropped. That
 * is how `--last-move-highlight` went missing in the CrazyGames SPA — the
 * last-move highlight and the bot's turn replay simply never rendered, with no
 * error anywhere.
 *
 * This is the visual counterpart to `GAME_I18N_KEYS`: assert it in each app.
 *
 * ```ts
 * import { REQUIRED_TOKENS } from '@scriptonita/chess-football-ui'
 *
 * const css = readFileSync('src/index.css', 'utf8')
 * expect(REQUIRED_TOKENS.filter(t => !css.includes(`${t}:`))).toEqual([])
 * ```
 */
export const REQUIRED_TOKENS = [
  // Surfaces
  '--bg-primary',
  '--bg-secondary',
  '--bg-surface',
  '--bg-surface-elevated',
  // Text
  '--fg-primary',
  '--fg-secondary',
  '--fg-muted',
  // Accent (the primary CTA rests on the dark step — see Button)
  '--accent-green',
  '--accent-green-light',
  '--accent-green-dark',
  // Borders
  '--border-subtle',
  // Semantic
  '--danger',
  '--warning',
  // Board
  '--field-green-1',
  '--field-green-2',
  '--field-frame',
  '--move-highlight',
  '--pass-highlight',
  '--last-move-highlight',
] as const

export type RequiredToken = (typeof REQUIRED_TOKENS)[number]
