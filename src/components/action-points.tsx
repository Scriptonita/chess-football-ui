import { Zap, Crown } from 'lucide-react'
import { cn } from '../lib/utils'
import { useGameT } from '../i18n'

interface ActionPointsProps {
  total:     number
  remaining: number
  size?:     number
  className?: string
  kingMustRelease?: boolean
}

export function ActionPoints({ total, remaining, size = 20, className, kingMustRelease }: ActionPointsProps) {
  const t = useGameT()
  return (
    <div className={cn('flex items-center gap-1.5', className)} aria-label={t('actionPointsAriaLabel', { remaining, total })}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i < remaining
        const showCrown = kingMustRelease && i === total - 1

        if (showCrown) {
          return (
            <Crown
              key={i}
              size={size}
              strokeWidth={2}
              className="text-yellow-400 fill-yellow-400 transition-colors duration-150"
              aria-hidden="true"
            />
          )
        }
        return (
          <Zap
            key={i}
            size={size}
            strokeWidth={2}
            className={cn(
              'transition-colors duration-150',
              isActive ? 'text-accent-green fill-accent-green' : 'text-fg-muted fill-none',
            )}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}
