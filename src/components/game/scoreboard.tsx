import { useGameStore } from '../../store/use-game-store'
import { cn } from '../../lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ActionPoints } from '../action-points'
import { useGameT } from '../../i18n'

interface ScoreboardProps {
  creatorUsername:   string
  opponentUsername:  string
  creatorAvatarUrl?: string
  opponentAvatarUrl?: string
  userSide?: 'white' | 'black' | null
}

function initials(name: string) {
  return (name?.split(' ').map(w => w[0]).join('').toUpperCase() || '?').slice(0, 2)
}

export default function Scoreboard({
  creatorUsername,
  opponentUsername,
  creatorAvatarUrl,
  opponentAvatarUrl,
  userSide,
}: ScoreboardProps) {
  const t = useGameT()
  const { boardState } = useGameStore()
  if (!boardState?.score) return null

  const { score, turn, actionPoints, kingMustRelease } = boardState

  // El creador siempre juega con blancas
  const myScore    = userSide === 'white' ? score.white : score.black
  const rivalScore = userSide === 'white' ? score.black : score.white
  const myName     = userSide === 'white' ? creatorUsername : opponentUsername
  const rivalName  = userSide === 'white' ? opponentUsername : creatorUsername
  const myAvatar   = userSide === 'white' ? creatorAvatarUrl : opponentAvatarUrl
  const rivalAvatar= userSide === 'white' ? opponentAvatarUrl : creatorAvatarUrl
  const myTeam     = userSide === 'white' ? t('teamWhite') : t('teamBlack')
  const rivalTeam  = userSide === 'white' ? t('teamBlack') : t('teamWhite')
  const isMyTurn   = turn === userSide
  const myKingMustRelease    = isMyTurn  && kingMustRelease === turn
  const rivalKingMustRelease = !isMyTurn && kingMustRelease === turn

  const maxAP = boardState.maxActionPoints ?? 5

  return (
    <div className="w-full bg-bg-secondary flex items-center justify-between px-5 py-2.5">
      {/* Jugador local */}
      <PlayerInfo
        name={myName}
        team={myTeam}
        avatarUrl={myAvatar}
        isActive={isMyTurn}
        actionPoints={isMyTurn ? actionPoints : 0}
        maxActionPoints={maxAP}
        kingMustRelease={myKingMustRelease}
        align="left"
      />

      {/* Marcador central */}
      <div className="flex items-center gap-3">
        <span className="font-anton text-[32px] leading-none text-fg-primary tabular-nums">
          {myScore}
        </span>
        <span className="font-anton text-2xl text-fg-muted">—</span>
        <span className="font-anton text-[32px] leading-none text-fg-primary tabular-nums">
          {rivalScore}
        </span>
      </div>

      {/* Rival */}
      <PlayerInfo
        name={rivalName}
        team={rivalTeam}
        avatarUrl={rivalAvatar}
        isActive={!isMyTurn}
        actionPoints={!isMyTurn ? actionPoints : 0}
        maxActionPoints={maxAP}
        kingMustRelease={rivalKingMustRelease}
        align="right"
      />
    </div>
  )
}

interface PlayerInfoProps {
  name:      string
  team:      string
  avatarUrl?: string
  isActive:  boolean
  actionPoints: number
  maxActionPoints: number
  kingMustRelease: boolean
  align:     'left' | 'right'
}

function PlayerInfo({ name, team, avatarUrl, isActive, actionPoints, maxActionPoints, kingMustRelease, align }: PlayerInfoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', align === 'right' && 'flex-row-reverse')}>
      <Avatar className={cn(
        'w-9 h-9 border-2 transition-colors duration-300',
        isActive ? 'border-accent-green' : 'border-border-subtle'
      )}>
        <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
        <AvatarFallback className="bg-bg-surface-elevated text-fg-secondary text-xs font-semibold">
          {initials(name)}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col gap-1', align === 'right' && 'items-end')}>
        <span className={cn(
          'font-inter text-[13px] font-semibold leading-none transition-colors duration-300',
          isActive ? 'text-fg-primary' : 'text-fg-muted'
        )}>
          {name}
        </span>
        <div className={cn('flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
          <span className="font-mono text-[10px] text-fg-muted uppercase">{team}</span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          )}
        </div>
        <ActionPoints
          total={maxActionPoints}
          remaining={actionPoints}
          size={12}
          kingMustRelease={kingMustRelease}
          className="gap-0.5"
        />
      </div>
    </div>
  )
}
