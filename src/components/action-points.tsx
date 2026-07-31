import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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

  // §16: brief "spent" pop on the pip that just went from active to inactive.
  const prevRemainingRef = useRef(remaining)
  const [spentIndex, setSpentIndex] = useState<number | null>(null)
  useEffect(() => {
    const prev = prevRemainingRef.current
    prevRemainingRef.current = remaining
    if (remaining < prev) {
      setSpentIndex(remaining)
      const id = setTimeout(() => setSpentIndex(null), 300)
      return () => clearTimeout(id)
    }
  }, [remaining])

  return (
    <div className={cn('flex items-center gap-1.5', className)} aria-label={t('actionPointsAriaLabel', { remaining, total })}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i < remaining
        const showCrown = kingMustRelease && i === total - 1
        const justSpent = i === spentIndex

        return (
          <motion.span
            key={i}
            data-testid={`ap-pip-${i}`}
            data-spent={justSpent || undefined}
            className="inline-flex"
            animate={justSpent ? { scale: [1.5, 1] } : undefined}
            transition={{ duration: 0.3 }}
          >
            {showCrown ? (
              <Crown
                size={size}
                strokeWidth={2}
                className="text-yellow-400 fill-yellow-400 transition-colors duration-150"
                aria-hidden="true"
              />
            ) : (
              <Zap
                size={size}
                strokeWidth={2}
                className={cn(
                  'transition-colors duration-150',
                  isActive ? 'text-accent-green fill-accent-green' : 'text-fg-muted fill-none',
                )}
                aria-hidden="true"
              />
            )}
          </motion.span>
        )
      })}
    </div>
  )
}
