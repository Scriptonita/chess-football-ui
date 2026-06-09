import { useId } from 'react'
import { cn } from '../../lib/utils'

interface FootballProps {
    className?: string
}

export const Football = ({ className }: FootballProps) => {
    const bodyId = useId()
    const hiId = `${bodyId}-h`

    return (
        <svg
            viewBox="0 0 100 100"
            className={cn('w-full h-full drop-shadow-md', className)}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                <radialGradient id={bodyId} cx="36%" cy="32%" r="68%">
                    <stop offset="0%" stopColor="#f0f9ff" />
                    <stop offset="55%" stopColor="#bae6fd" />
                    <stop offset="100%" stopColor="#38bdf8" />
                </radialGradient>
                <radialGradient id={hiId} cx="32%" cy="28%" r="22%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
            </defs>

            <circle cx="50" cy="50" r="47" fill={`url(#${bodyId})`} stroke="#18181b" strokeWidth="1.5" />

            <g stroke="#18181b" strokeWidth="1.4" strokeLinecap="round" fill="none">
                <line x1="50" y1="41" x2="50" y2="30" />
                <line x1="41.44" y1="47.22" x2="30.97" y2="43.82" />
                <line x1="44.71" y1="57.28" x2="38.24" y2="66.18" />
                <line x1="55.29" y1="57.28" x2="61.76" y2="66.18" />
                <line x1="58.56" y1="47.22" x2="69.03" y2="43.82" />

                <line x1="50" y1="15.5" x2="50" y2="4.5" />
                <line x1="17.18" y1="39.34" x2="6.71" y2="35.94" />
                <line x1="29.72" y1="77.91" x2="23.25" y2="86.81" />
                <line x1="70.28" y1="77.91" x2="76.75" y2="86.81" />
                <line x1="82.82" y1="39.34" x2="93.29" y2="35.94" />
            </g>

            <g fill="#18181b" stroke="#18181b" strokeWidth="0.6" strokeLinejoin="round">
                <polygon points="50,41 41.44,47.22 44.71,57.28 55.29,57.28 58.56,47.22" />
                <polygon points="50,30 57.61,24.47 54.70,15.53 45.30,15.53 42.39,24.47" />
                <polygon points="30.97,43.82 28.06,34.88 18.66,34.88 15.75,43.82 23.36,49.35" />
                <polygon points="38.24,66.18 29.84,66.18 25.93,75.12 33.54,80.65 41.15,75.12" />
                <polygon points="61.76,66.18 58.85,75.12 66.46,80.65 74.07,75.12 71.16,66.18" />
                <polygon points="69.03,43.82 76.64,49.35 84.25,43.82 81.34,34.88 71.94,34.88" />
            </g>

            <circle cx="50" cy="50" r="47" fill={`url(#${hiId})`} pointerEvents="none" />
        </svg>
    )
}
