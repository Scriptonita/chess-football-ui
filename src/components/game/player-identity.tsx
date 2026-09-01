import { cn } from '../../lib/utils'

interface PlayerIdentityProps {
  name: string
  team: string
  /**
   * `full` — the side panels and the mobile scoreboard: name on its own line,
   * team beneath it. `compact` — the tablet/desktop mini-scoreboard, where the
   * pair shares one line.
   */
  variant?: 'full' | 'compact'
  isActive?: boolean
  align?: 'left' | 'right'
  /** Rendered inline after the team label (e.g. the active-turn pulse dot). */
  adornment?: React.ReactNode
  className?: string
}

/**
 * One player's name and team.
 *
 * `Scoreboard` set this in Inter 13px semibold with the team in mono 10px, and
 * `MiniScoreboard` in mono 10px uppercase joined by a middot — so the same
 * player changed appearance on a viewport change. Both now render this, and the
 * only difference left is the deliberate one: how much room there is.
 */
export function PlayerIdentity({
  name,
  team,
  variant = 'full',
  isActive = false,
  align = 'left',
  adornment,
  className,
}: PlayerIdentityProps) {
  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'font-inter text-[11px] font-medium truncate max-w-[160px]',
          isActive ? 'text-fg-secondary' : 'text-fg-muted',
          className,
        )}
      >
        {name}
        <span className="font-mono uppercase tracking-[0.5px] text-fg-muted"> · {team}</span>
      </span>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1 min-w-0', align === 'right' && 'items-end', className)}>
      <span
        className={cn(
          'font-inter text-[13px] font-semibold leading-none truncate transition-colors duration-300',
          isActive ? 'text-fg-primary' : 'text-fg-muted',
        )}
      >
        {name}
      </span>
      <div className={cn('flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.5px]">{team}</span>
        {adornment}
      </div>
    </div>
  )
}
