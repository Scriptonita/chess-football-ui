import { useId } from 'react'
import { cn } from '../../lib/utils'

// ─── Squares ─────────────────────────────────────────────────────────────────

export const PITCH_COLS = 9
export const PITCH_ROWS = 12

/** The two goal boxes: files c–g on the first two and last two ranks. */
export const isGoalAreaSquare = (x: number, y: number): boolean =>
    x >= 2 && x <= 6 && ((y >= 0 && y <= 1) || (y >= PITCH_ROWS - 2 && y <= PITCH_ROWS - 1))

/**
 * Goal-box shading: an inset box-shadow that darkens the square *over* its own
 * green, so the box reads as a distinct zone (the king's area) while the
 * checkerboard alternation stays visible — opponents enter it square by square
 * and need to read their moves there. An inset shadow (rather than a flat
 * replacement colour) keeps the app's tokens in charge of the hue and composes
 * with Tailwind's `ring-*` utilities on the live board's highlighted squares.
 */
export const GOAL_AREA_SHADE_CLASS = 'shadow-[inset_0_0_0_100vmax_rgba(0,0,0,0.32)]'

/**
 * Base classes of one pitch square. Every board renderer — the live GameBoard,
 * StaticGameBoard, and any app-side mini board built on PitchSurface — derives
 * its squares from here, so the field reads identically everywhere. Colours
 * come from the app's `field-green-*` design tokens.
 */
export function pitchSquareClass(x: number, y: number): string {
    const isEven = (x + y) % 2 === 0
    return cn(
        'relative aspect-square w-full',
        isEven ? 'bg-field-green-1' : 'bg-field-green-2',
        isGoalAreaSquare(x, y) && GOAL_AREA_SHADE_CLASS,
    )
}

// ─── Grass ───────────────────────────────────────────────────────────────────
//
// A seamless fractal-noise tile, inlined as an SVG data URI and repeated as a
// background. `stitchTiles` makes the repeat seamless, so the grain reads as
// one continuous surface across the whole pitch instead of per-square. Blended
// with `mix-blend-mode: overlay`, mid-grey is neutral: the noise only nudges
// the underlying green lighter/darker, so both square shades (and the darker
// goal boxes) keep their own colour while gaining a turf-like texture. The
// browser rasterises the tile once and caches it — no per-frame filter cost.
const GRAIN_TILE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">' +
    '<filter id="g" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" stitchTiles="stitch"/>' +
    '<feColorMatrix type="saturate" values="0"/>' +
    '</filter>' +
    '<rect width="100%" height="100%" filter="url(#g)"/>' +
    '</svg>'

export const GRAIN_TILE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_TILE_SVG)}")`

// Stadium-light falloff: a faint highlight around the upper middle of the pitch
// and darker edges, so the surface reads as a lit plane the pieces sit on
// rather than a flat fill. Kept subtle so move/pass highlights stay legible.
const VIGNETTE =
    'radial-gradient(120% 95% at 50% 38%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,0.26) 100%)'

interface GrassOverlayProps {
    className?: string
}

/**
 * Decorative turf texture for the pitch. Absolutely positioned over the square
 * grid and click-through, so it sits between the squares and the pieces without
 * affecting hit-testing or the per-square highlight classes.
 */
export function GrassOverlay({ className }: GrassOverlayProps) {
    return (
        <div
            aria-hidden="true"
            data-testid="grass-overlay"
            className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}
        >
            <div
                data-layer="grain"
                className="absolute inset-0 mix-blend-overlay opacity-60"
                style={{ backgroundImage: GRAIN_TILE_URL, backgroundSize: '160px 160px' }}
            />
            <div data-layer="light" className="absolute inset-0" style={{ background: VIGNETTE }} />
        </div>
    )
}

// ─── Chalk markings ──────────────────────────────────────────────────────────
//
// Coordinates are in board cells (viewBox 0 0 9 12, y grows downwards), so the
// markings stretch with the grid at any size.

const CHALK = '#f6f5ee'

interface PitchMarkingsProps {
    className?: string
    children?: React.ReactNode
}

/**
 * The painted pitch lines — touchline, goal boxes, halfway line, centre circle,
 * spots and the two "D" arcs — drawn to look like chalk on grass: a roughened,
 * slightly displaced edge and a noise-driven alpha so the coverage is powdery
 * rather than a crisp vector stroke. A faint, wider unfiltered pass underneath
 * acts as the dust halo the line leaves on the turf.
 *
 * Static and cached by the browser as its own layer; anything dynamic that
 * shares the board's coordinate space (e.g. the pass-trajectory preview) should
 * live in a separate <svg> so a hover repaint never re-runs this filter.
 */
export function PitchMarkings({ className, children }: PitchMarkingsProps) {
    const id = useId()
    const filterId = `${id}-chalk`

    return (
        <svg
            viewBox="0 0 9 12"
            preserveAspectRatio="none"
            className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
            aria-hidden="true"
            data-testid="pitch-markings"
        >
            <defs>
                <filter
                    id={filterId}
                    filterUnits="userSpaceOnUse"
                    x="-0.5"
                    y="-0.5"
                    width="10"
                    height="13"
                    colorInterpolationFilters="sRGB"
                >
                    {/* Wobble the edge: low-frequency noise pushes the stroke by up to ~0.04 cells. */}
                    <feTurbulence type="fractalNoise" baseFrequency="5.5" numOctaves="2" seed="3" result="edgeNoise" />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="edgeNoise"
                        scale="0.045"
                        xChannelSelector="R"
                        yChannelSelector="G"
                        result="rough"
                    />
                    {/* Powdery coverage: a second noise becomes an alpha mask in the 0.55–1 range. */}
                    <feTurbulence type="fractalNoise" baseFrequency="14" numOctaves="3" seed="11" result="dust" />
                    <feColorMatrix
                        in="dust"
                        type="matrix"
                        values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.75 0 0 0 0.55"
                        result="dustMask"
                    />
                    <feComposite in="rough" in2="dustMask" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
                </filter>
            </defs>

            {/* Dust halo: wider, faint, unfiltered so it stays cheap. */}
            <g data-layer="halo" fill="none" stroke={CHALK} strokeOpacity="0.09" strokeWidth="0.16" strokeLinecap="round">
                <Markings />
            </g>

            <g
                data-layer="chalk"
                filter={`url(#${filterId})`}
                fill="none"
                stroke={CHALK}
                strokeOpacity="0.82"
                strokeWidth="0.07"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <Markings />
            </g>

            {children}
        </svg>
    )
}

function Markings() {
    return (
        <>
            {/* Touchline / goal lines */}
            <rect x="0.06" y="0.06" width="8.88" height="11.88" />
            {/* Goal boxes */}
            <rect x="2" y="0.06" width="5" height="1.94" />
            <rect x="2" y="10" width="5" height="1.94" />
            {/* Halfway line */}
            <line x1="0.06" y1="6" x2="8.94" y2="6" />
            {/* Centre circle + spot */}
            <circle cx="4.5" cy="6" r="1.5" />
            <circle cx="4.5" cy="6" r="0.09" fill={CHALK} fillOpacity="0.9" stroke="none" />
            {/* Penalty spots */}
            <circle cx="4.5" cy="1.5" r="0.08" fill={CHALK} fillOpacity="0.9" stroke="none" />
            <circle cx="4.5" cy="10.5" r="0.08" fill={CHALK} fillOpacity="0.9" stroke="none" />
            {/* The "D" arcs */}
            <path d="M 3.086,2 A 1.5,1.5 0 0 0 5.914,2" />
            <path d="M 3.086,10 A 1.5,1.5 0 0 1 5.914,10" />
        </>
    )
}

// ─── Surface ─────────────────────────────────────────────────────────────────

interface PitchSurfaceProps {
    className?: string
    /**
     * Extra classes for a given square (e.g. a highlighted area in a rules
     * diagram). Falsy return values are ignored.
     */
    squareClassName?: (x: number, y: number) => string | false | null | undefined
    /** Layers rendered above the markings — pieces, ball, overlays. */
    children?: React.ReactNode
}

/**
 * The complete, non-interactive pitch: squares, turf grain and chalk lines, in
 * that order, inside a container-query wrapper so pieces can size themselves
 * with `cqw`. Callers put their own frame (border/radius) around it and their
 * own piece layer inside it. The interactive GameBoard renders its own square
 * grid (it needs per-square handlers) but builds every square from the same
 * `pitchSquareClass`, and stacks the same GrassOverlay + PitchMarkings.
 */
export function PitchSurface({ className, squareClassName, children }: PitchSurfaceProps) {
    const squares = []
    for (let y = PITCH_ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < PITCH_COLS; x++) {
            squares.push(
                <div key={`${x}-${y}`} className={cn(pitchSquareClass(x, y), squareClassName?.(x, y))} />,
            )
        }
    }
    return (
        <div className={cn('relative', className)} style={{ containerType: 'inline-size' }}>
            <div className="grid grid-cols-9 gap-[1px]" data-testid="pitch-squares">
                {squares}
            </div>
            <GrassOverlay />
            <PitchMarkings />
            {children}
        </div>
    )
}
