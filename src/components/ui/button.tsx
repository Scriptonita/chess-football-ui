import * as React from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'default' | 'sm' | 'lg' | 'icon'

const VARIANT: Record<Variant, string> = {
  // White on `--accent-green` is 4.27:1 — under WCAG AA for the Anton 400 the
  // primary CTA is set in. `--accent-green-dark` clears it (~6.5:1), so the
  // resting state is the dark green and interaction brightens it rather than
  // darkening it. Hover/active are transient; the resting state is the one a
  // player reads.
  primary:
    'bg-accent-green-dark text-fg-primary font-anton tracking-widest rounded-md ' +
    'hover:bg-accent-green active:bg-accent-green-light',
  secondary:
    'bg-bg-surface text-fg-primary font-inter font-semibold rounded-md ' +
    'border border-border-subtle hover:bg-bg-surface-elevated active:bg-bg-secondary',
  ghost:
    'bg-transparent text-fg-secondary font-inter font-medium rounded-md ' +
    'hover:text-fg-primary active:text-fg-muted',
  destructive:
    'bg-danger/10 text-danger font-inter font-semibold rounded-md ' +
    'border border-danger hover:bg-danger/20 active:bg-danger/30',
}

const SIZE: Record<Size, string> = {
  default: 'h-12 min-h-[44px] px-6 text-base',
  sm: 'h-9 min-h-[36px] px-4 text-sm',
  lg: 'h-13 min-h-[52px] px-8 text-lg',
  icon: 'h-11 w-11 min-h-[44px]',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
        'disabled:pointer-events-none disabled:opacity-40',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
