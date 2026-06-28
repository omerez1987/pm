# Code Review — Project Management App

**Date:** 2026-06-28
**Scope:** Full project as of current main branch (Parts 1–3 complete, Parts 4–10 not started)
**Files reviewed:** All frontend source files, config files, test files, AGENTS.md files

---

## Summary

The frontend is clean and well-structured for its scope. The component hierarchy is logical, the core logic is isolated as a pure function, and tests exist at both unit and e2e levels. There are no correctness bugs that would affect the running app today. The issues below range from a pointless memo call (easy fix) to test reliability concerns (fix before Parts 4+) and infrastructure gaps that are expected given where we are in the plan.

---

## Bugs

### B1 — `useMemo` for `cardsById` does nothing
**File:** `frontend/src/components/KanbanBoard.tsx:28`

```ts
const cardsById = useMemo(() => board.cards, [board.cards]);
```

`board.cards` is already a stable object reference per render — it only changes when `setBoard` is called, at which point a new reference is produced. Wrapping it in `useMemo` adds closure overhead but achieves no memoization. The variable is only used once (`cardsById[activeCardId]`) and should just be inlined or removed.

**Action:** Replace `cardsById[activeCardId]` with `board.cards[activeCardId]` and delete the `useMemo` and the `useMemo` import if unused.

---

### B2 — `createId` uses `Math.random()` instead of the platform crypto API
**File:** `frontend/src/lib/kanban.ts:164`

```ts
const randomPart = Math.random().toString(36).slice(2, 8);
```

`Math.random()` is not cryptographically random and has a small but nonzero collision probability under load. For a local-only MVP this is acceptable, but `crypto.randomUUID()` is available in all modern browsers and Node 14+ with zero extra cost.

**Action:** Replace with `crypto.randomUUID()` and drop the manual ID composition entirely. This also simplifies the prefix convention (or keep it: `` `card-${crypto.randomUUID()}` ``).

---

### B3 — Column title input does not trim whitespace
**File:** `frontend/src/components/KanbanColumn.tsx:44`

```ts
onChange={(event) => onRename(column.id, event.target.value)}
```

There is no trimming on blur or submit, so a column can be renamed to spaces. This is a minor UX issue now but will produce confusing data in the database once Part 6 lands.

**Action:** Trim on blur: add `onBlur={(e) => onRename(column.id, e.target.value.trim())}` and leave onChange as-is for typing.

---

## Code Quality

### Q1 — Duplicated card content markup between `KanbanCard` and `KanbanCardPreview`
**Files:** `frontend/src/components/KanbanCard.tsx`, `KanbanCardPreview.tsx`

Both components render an identical `<article>` with the same layout, heading, and paragraph. `KanbanCardPreview` is just `KanbanCard` minus the drag handle and delete button. This duplication will diverge as card design evolves.

**Action:** Extract a `CardContent` component (title + details) shared by both. Each parent wraps it in its own `<article>` with its own extra controls.

---

### Q2 — `NewCardForm` does not auto-focus the title input when opened
**File:** `frontend/src/components/NewCardForm.tsx`

When the user clicks "Add a card" the form appears but focus stays on the button (or goes nowhere). The user must click into the title field.

**Action:** Add `autoFocus` to the title `<input>`. No refs needed.

---

### Q3 — Delete button text ("Remove") disagrees with its `aria-label` ("Delete …")
**File:** `frontend/src/components/KanbanCard.tsx:46-48`

```tsx
aria-label={`Delete ${card.title}`}
>
  Remove
```

The visible label and accessible label describe the same action with different words. This confuses screen reader users and causes the unit test to match `name: /delete new card/i` while the button reads "Remove" visually.

**Action:** Change the button text to "Delete" to match the aria-label, or remove the aria-label and keep "Remove" (the accessible name will derive from the text).

---

### Q4 — Redundant `test` and `test:unit` npm scripts
**File:** `frontend/package.json:8-9`

```json
"test": "vitest run",
"test:unit": "vitest run",
```

These are identical. `test` is the standard npm hook; `test:unit` is used in CLAUDE.md and CI references. Keep both but alias one to the other rather than duplicating the command string.

**Action:** Change `"test"` to `"npm run test:unit"`, so there is one source of truth.

---

### Q5 — `.idea/` directory not ignored at the project root
**File:** `.gitignore` (root), line 167

```
#.idea/
```

The JetBrains IDE directory is commented out. It is currently listed as untracked (`?? .idea/`) in git status. If accidentally staged it will pollute the repo with machine-specific run configs and workspace files.

**Action:** Uncomment `.idea/` in the root `.gitignore`.

---

## Test Coverage Gaps

### T1 — `moveCard` edge cases not tested
**File:** `frontend/src/lib/kanban.test.ts`

Current tests cover: reorder in column, cross-column move, drop on column. Missing:

- Moving a card to an **empty column** (the `isOverColumn` + empty-array path)
- A no-op move (same card, same position) — should return the original array reference unchanged
- Providing an `activeId` that does not exist in any column — should return columns unchanged

**Action:** Add three more `it` blocks covering these cases.

---

### T2 — `createId` has no tests
**File:** `frontend/src/lib/kanban.ts:164`

`createId` has no unit test. While the function is simple, testing that it produces distinct values for rapid consecutive calls would catch any future regression.

**Action:** Add a brief test: call `createId("card")` 1000 times and assert a Set of the results has 1000 entries.

---

### T3 — Playwright config reuses any server on port 3000, not just the dev server
**File:** `frontend/playwright.config.ts:15`

```ts
reuseExistingServer: true,
```

With `reuseExistingServer: true`, if anything else is already bound to port 3000 (IDE preview, Docker port mapping, etc.) Playwright silently runs against it and tests fail with confusing errors — as happened during this review session.

**Action:** Change to `reuseExistingServer: !process.env.CI`. In CI nothing else runs on that port, so it always starts fresh. Locally, developers can pre-start the server for speed, but an unexpected occupant will now cause a clear startup error rather than silent wrong-server behaviour.

---

### T4 — Drag-and-drop e2e test is brittle (pixel-coordinate dragging)
**File:** `frontend/tests/kanban.spec.ts:19-41`

The test uses raw `page.mouse.move` with coordinates derived from `boundingBox()`. This is the correct approach for DnD but is fragile under layout changes (font size, column width, viewport). A partial regression in layout would break the test without any logic change.

**Action:** No immediate change needed, but document the assumption: the test targets the first card in the Backlog column and drops it into the Review column at `columnBox.y + 120`. Add a comment explaining the magic `120` offset and consider parameterising it via `columnBox.height / 2`.

---

## Infrastructure Gaps (expected, noted for completeness)

These are not defects — they are simply the parts of the plan not yet started.

| Area | Status | Next step |
|---|---|---|
| Docker setup | Not started | Part 2 |
| FastAPI backend | Not started | Part 2 |
| Start/stop scripts | Not started | Part 2 |
| Auth (login/logout) | Not started | Part 4 |
| Database schema | Not started | Part 5 |
| Backend API routes | Not started | Part 6 |
| Frontend ↔ backend wiring | Not started | Part 7 |
| OpenRouter AI connectivity | Not started | Part 8 |
| Structured AI outputs | Not started | Part 9 |
| AI chat sidebar | Not started | Part 10 |

`backend/AGENTS.md` and `scripts/AGENTS.md` are placeholder stubs only.

---

## Prioritised Action List

All items below were actioned and verified (unit tests: 11/11, e2e: 3/3).

| # | Severity | File | Action | Status |
|---|---|---|---|---|
| 1 | Low–Medium | `playwright.config.ts` | T3: Change `reuseExistingServer` to `!process.env.CI` | Done |
| 2 | Low | `.gitignore` (root) | Q5: Uncomment `.idea/` | Done |
| 3 | Low | `KanbanBoard.tsx` | B1: Remove pointless `useMemo` for `cardsById` | Done |
| 4 | Low | `KanbanCard.tsx` | Q3: Align button visible text with aria-label (changed "Remove" to "Delete") | Done |
| 5 | Low | `kanban.ts` | B2: Replace `Math.random()` with `crypto.randomUUID()` | Done |
| 6 | Low | `KanbanColumn.tsx` | B3: Trim column title on blur | Done |
| 7 | Low | `NewCardForm.tsx` | Q2: Add `autoFocus` to title input | Done |
| 8 | Low | `package.json` | Q4: De-duplicate `test` and `test:unit` scripts | Done |
| 9 | Low | `kanban.test.ts` | T1: Added 3 edge-case tests for `moveCard` (empty column, no-op, missing card) | Done |
| 10 | Low | `kanban.test.ts` | T2: Added `createId` uniqueness and prefix tests | Done |
| 11 | Low | `CardContent.tsx` (new) | Q1: Extracted shared `CardContent`; updated `KanbanCard` and `KanbanCardPreview` to use it | Done |
| 12 | Info | `tests/kanban.spec.ts` | T4: Added comment explaining the `120` offset in drag test | Done |
