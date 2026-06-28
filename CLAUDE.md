# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Project Management app with a Kanban board and AI chat sidebar. See `docs/PLAN.md` for the phased build plan (Parts 1-10).

**Always read `docs/PLAN.md` before starting a new part of the plan.**

Architecture:
- **Frontend**: Next.js (TypeScript, Tailwind v4, dnd-kit for drag-and-drop)
- **Backend**: Python FastAPI, serving the statically built Next.js site at `/`
- **Database**: SQLite (created on first run)
- **AI**: OpenRouter via the OpenAI-compatible API, model `openai/gpt-oss-120b`
- **Deployment**: Single Docker container; `scripts/` has start/stop scripts for Mac/PC/Linux
- **Package manager**: `uv` (Python), `npm` (Node)

## Frontend Commands

All commands run from `frontend/`:

```bash
npm run dev          # dev server at http://127.0.0.1:3000
npm run build        # production build
npm run lint         # ESLint
npm run test:unit    # Vitest unit tests (src/**/*.{test,spec}.{ts,tsx})
npm run test:e2e     # Playwright e2e tests (tests/*.spec.ts)
npm run test:all     # unit + e2e
```

Run a single Vitest test file:
```bash
npx vitest run src/components/KanbanBoard.test.tsx
```

## Frontend Architecture

- `src/lib/kanban.ts` — core data types (`Card`, `Column`, `BoardData`) and pure logic (`moveCard`, `createId`). All board mutations go through these functions.
- `src/components/KanbanBoard.tsx` — root client component; owns all board state, wires dnd-kit events to `moveCard`.
- `src/components/KanbanColumn.tsx` / `KanbanCard.tsx` / `KanbanCardPreview.tsx` / `NewCardForm.tsx` — presentational components.
- `src/app/page.tsx` — renders `<KanbanBoard />`.
- Unit tests live alongside source files (`*.test.ts(x)`); e2e tests live in `tests/`.

## Coding Standards

- No over-engineering, no unnecessary defensive programming, no extra features — keep it simple.
- No emojis, ever.
- When hitting issues, identify root cause with evidence before applying a fix.
- Use latest idiomatic library APIs.

## Color Scheme (CSS variables)

| Token | Value | Use |
|---|---|---|
| `--accent-yellow` | `#ecad0a` | Accent lines, highlights |
| `--primary-blue` | `#209dd7` | Links, key sections |
| `--secondary-purple` | `#753991` | Submit buttons, important actions |
| `--navy-dark` | `#032147` | Main headings |
| `--gray-text` | `#888888` | Supporting text, labels |

## Auth (MVP)

Hardcoded credentials: username `user`, password `password`. The database schema will support multiple users for future expansion.

## Environment

`OPENROUTER_API_KEY` is in `.env` at the project root.
