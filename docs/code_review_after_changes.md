# Code Review — After Changes

**Date:** 2026-06-28
**Scope:** Full project, post-remediation pass (all 12 actions from `code_review.md` applied)
**Test baseline:** 11 unit tests passing, 3 e2e tests passing
**Compared against:** `docs/code_review.md`

---

## Overall Assessment

The codebase is in good shape. All previously identified issues have been resolved correctly. The logic is clean, components are well-factored, and the test suite now covers meaningful edge cases. The findings below are a smaller, lower-severity set — the kind that accumulates naturally when you review again with fresh eyes.

---

## Findings

### F1 — Leading whitespace on line 1 of `kanban.spec.ts`
**File:** `frontend/tests/kanban.spec.ts:1`
**Severity:** Cosmetic

```ts
  import { expect, test } from "@playwright/test";
```

The import has two leading spaces. This is likely a copy/paste artifact. It does not break Playwright but will fail `eslint --fix` diffs and looks wrong on first open.

**Action:** Remove the two leading spaces from line 1.

---

### F2 — Empty details silently replaced with fallback text in `handleAddCard`
**File:** `frontend/src/components/KanbanBoard.tsx:61`
**Severity:** Low (UX)

```ts
[id]: { id, title, details: details || "No details yet." },
```

If the user deliberately leaves the Details field blank, they get the string `"No details yet."` on their card without having typed it. This is a hidden default that will end up persisted to the database in Part 7.

**Action:** Store an empty string and handle the display of "nothing entered" in `CardContent` if needed, or remove the fallback entirely. An empty `<p>` renders invisibly and takes no space.

---

### F3 — Column title can be set to an empty string
**File:** `frontend/src/components/KanbanColumn.tsx:45`
**Severity:** Low

The `onBlur` handler trims whitespace, which is correct. But it does not guard against the result being an empty string. A user who clears the input and tabs away will produce a column with no title. This will hit the database in Part 6.

**Action:** In `onRename` inside `KanbanBoard.tsx`, or in the `onBlur` handler itself, keep the previous title when the trimmed value is empty:

```ts
onBlur={(event) => {
  const trimmed = event.target.value.trim();
  if (trimmed) onRename(column.id, trimmed);
  else event.target.value = column.title; // reset display
}}
```

---

### F4 — Nested interactive elements: drag article contains a button
**File:** `frontend/src/components/KanbanCard.tsx:22–44`
**Severity:** Low (accessibility)

dnd-kit spreads `{...attributes}` on the `<article>`, which sets `role="button"` and `tabIndex` on it, making it keyboard-focusable as a drag handle. The Delete button is nested inside this element. The ARIA spec prohibits interactive descendants inside an element with `role="button"`. Screen readers and automated accessibility checkers (axe, Lighthouse) will flag this.

The standard fix for dnd-kit is a dedicated drag handle:

- Remove `{...listeners}` from `<article>` and `{...attributes}` too.
- Add a small drag handle icon element (e.g. `⠿`) that gets `{...listeners}` and `{...attributes}`.
- The Delete button then sits as a plain sibling with no ARIA conflict.

This is the right fix but adds a handle element and requires a visual drag affordance. Flag for Part 3 cleanup before shipping.

**Action:** Deferred to pre-Part 4 cleanup. No change needed now, but note in backlog.

---

### F5 — `@playwright/test` declared version lags installed version
**File:** `frontend/package.json:27`
**Severity:** Info

```json
"@playwright/test": "^1.58.0"
```

After `npm update` earlier in this session, `1.61.1` is installed and recorded in `package-lock.json`. The declared range `^1.58.0` allows this, but anyone reading `package.json` in isolation would expect `1.58.x`. Aligning the declaration avoids confusion.

**Action:** Bump the declared version to `"^1.61.1"`.

---

### F6 — `@types/node` version is two majors behind
**File:** `frontend/package.json:32`
**Severity:** Info

```json
"@types/node": "^20"
```

Node 20 is in maintenance. The active LTS is Node 22. Before Docker work begins (Part 2), the base image will need a Node version pinned anyway. Aligning `@types/node` with whatever Node version the Dockerfile will use avoids type mismatches.

**Action:** Update to `"^22"` when the Dockerfile is written in Part 2, so both are decided together.

---

### F7 — `moveCard` produces a new state reference on same-column drop-on-column
**File:** `frontend/src/lib/kanban.ts:106–115`
**Severity:** Info (minor inefficiency)

When a card is dragged and dropped onto its own column header (not onto another card), the code filters and re-appends the card to the end of `cardIds`. If the card was already at the bottom, this produces a new array with identical content and triggers a React re-render. `KanbanBoard.handleDragEnd` avoids this for `active.id === over.id` but not for the same-column-column case.

This is not observable to users and won't matter until the backend is wired up (a spurious write would be worse). Note for Part 7.

**Action:** No immediate change. Revisit in Part 7 when writes to the backend are added — a spurious identical write would be a real bug at that point.

---

## What Is Now Clean (Resolved from Previous Review)

| Item | Was | Now |
|---|---|---|
| `useMemo` for `cardsById` | Pointless memo | Removed; `board.cards[activeCardId]` used directly |
| `createId` | Used `Math.random()` | Uses `crypto.randomUUID()` |
| Column title trim | No trim | Trims on blur |
| Delete button label | "Remove" vs "Delete" aria-label | Both now say "Delete" |
| `CardContent` duplication | Duplicated in `KanbanCard` and `KanbanCardPreview` | Extracted to `CardContent.tsx` |
| `autoFocus` on new card form | Missing | Added |
| `reuseExistingServer` | `true` (reuses any process on port 3000) | `!process.env.CI` |
| `.idea/` in `.gitignore` | Commented out | Active |
| `test` script | Duplicated `vitest run` | Aliases to `test:unit` |
| `moveCard` test coverage | 3 cases | 6 cases (added empty column, no-op, missing card) |
| `createId` test coverage | None | 2 tests (uniqueness + prefix) |
| Drag test magic number | Unexplained `120` | Commented |

---

## Prioritised Action List

| # | Severity | File | Action | Status |
|---|---|---|---|---|
| 1 | Low | `KanbanBoard.tsx` | F2: Remove `details \|\| "No details yet."` fallback | Done |
| 2 | Low | `KanbanColumn.tsx` | F3: Guard against empty column title — `useRef` tracks last valid title; onBlur reverts on empty | Done |
| 3 | Low | `tests/kanban.spec.ts` | F1: Remove leading whitespace on line 1 | Done |
| 4 | Low | `KanbanCard.tsx` + `tests/kanban.spec.ts` | F4: Implemented dedicated grip SVG handle; `{...attributes}` / `{...listeners}` moved off `<article>`; e2e drag test updated to target `drag-handle-card-1` | Done |
| 5 | Info | `package.json` | F5: Bumped `@playwright/test` to `^1.61.1` | Done |
| 6 | Info | `package.json` | F6: Align `@types/node` with Dockerfile Node version | Deferred to Part 2 |
| 7 | Info | `kanban.ts` | F7: Revisit same-column drop no-op before adding backend writes | Deferred to Part 7 |

**Final test baseline after remediation: 11 unit tests passing, 3 e2e tests passing (14/14).**
