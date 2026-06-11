<p align="center">
  <img alt="Chess.Football" src="./assets/cover.png" />
</p>

# @scriptonita/chess-football-ui

Shared, framework-agnostic React UI for **Chess.Football**: board, pieces, scoreboard,
controls, the zustand game store and a small set of UI primitives. Consumed by both the
Next.js app (`futbolajedrez`) and the CrazyGames Vite SPA (`chess-football-crazygames`).

It builds on top of [`@scriptonita/chess-football-engine`](https://www.npmjs.com/package/@scriptonita/chess-football-engine)
(the pure rules engine) and adds the **presentation layer** that was previously duplicated
across both games.

> **Rules source of truth:** the human-readable spec lives at
> [github.com/Scriptonita/chess.football](https://github.com/Scriptonita/chess.football),
> implemented in code by [`@scriptonita/chess-football-engine`](https://www.npmjs.com/package/@scriptonita/chess-football-engine).
> This package is the shared presentation layer on top of it.

## Install

```bash
npm install @scriptonita/chess-football-ui
```

## Design notes

- **Framework-agnostic.** No `next-intl`, no `next/*`, no `"use client"`. Translations are
  injected through `GameI18nProvider` (a `t: (key: string) => string` scoped to the `game`
  namespace), so each app wires its own i18n (`next-intl` or `react-i18next`).
- **Store included.** Unlike the engine (pure), this package owns the zustand game store
  (`useGameStore`, `getInitialBoardState`) so the components are self-contained and the store
  is no longer duplicated per app.
- **Tokens stay per app.** Components use Tailwind utility classes bound to design tokens
  (`bg-bg-surface`, `text-accent-green`, …). Each app must define those tokens and include this
  package's files in its Tailwind `content`/`@source` scan so the classes are generated.

## Peer dependencies

`react`, `react-dom`, `framer-motion`, `lucide-react`.

## Scripts

- `npm run build` — bundle ESM + CJS + `.d.ts` with tsup.
- `npm run typecheck` — `tsc --noEmit`.
