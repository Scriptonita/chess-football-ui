import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface AvatarProps { className?: string; children: ReactNode }
interface AvatarImageProps { src?: string; alt?: string; className?: string }
interface AvatarFallbackProps { className?: string; children: ReactNode }

export function Avatar({ className, children }: AvatarProps) {
  return <div className={cn('relative w-9 h-9 rounded-full overflow-hidden shrink-0', className)}>{children}</div>
}

export function AvatarImage({ src, alt, className }: AvatarImageProps) {
  if (!src) return null
  return <img src={src} alt={alt ?? ''} className={cn('w-full h-full object-cover', className)} />
}

export function AvatarFallback({ className, children }: AvatarFallbackProps) {
  return (
    <div className={cn('absolute inset-0 flex items-center justify-center text-xs font-semibold', className)}>
      {children}
    </div>
  )
}
