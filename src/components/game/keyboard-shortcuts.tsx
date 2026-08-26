import { useGameT } from '../../i18n'
import { cn } from '../../lib/utils'

interface KeyboardShortcutsListProps {
    className?: string
}

/**
 * §12: the legend of the board's keyboard shortcuts. GameBoard shows it in a
 * popover behind a "?" button in its toolbar; apps that pass `toolbar={false}`
 * can render the list inline in a side panel instead.
 */
export function KeyboardShortcutsList({ className }: KeyboardShortcutsListProps) {
    const t = useGameT()
    return (
        <ul className={cn('font-mono text-[10px] text-fg-secondary leading-relaxed', className)}>
            <li><kbd className="text-fg-primary">↑↓←→</kbd> {t('shortcuts.arrows')}</li>
            <li><kbd className="text-fg-primary">Enter</kbd> {t('shortcuts.select')}</li>
            <li><kbd className="text-fg-primary">M</kbd> {t('shortcuts.move')}</li>
            <li><kbd className="text-fg-primary">P</kbd> {t('shortcuts.pass')}</li>
            <li><kbd className="text-fg-primary">Esc</kbd> {t('shortcuts.cancel')}</li>
        </ul>
    )
}
