# Code Review — After Changes v2

**Date:** 2026-06-28
**Scope:** Full project, third-pass review after all `code_review_after_changes.md` actions applied
**Test baseline:** 11 unit tests passing, 3 e2e tests passing (14/14)
**Compared against:** `docs/code_review_after_changes.md`

---

## Overall Assessment

The codebase is in its cleanest state yet. No correctness bugs. All three rounds of remediation have compounded well — the component hierarchy is logical, the pure logic layer is well-tested, and the accessibility issue (nested interactive elements) is resolved. This pass surfaces only minor items and two forward-looking notes tied to upcoming plan parts.

**The codebase is ready to proceed to Part 2 (scaffolding).**

---

## Findings

### F1 — Drag-handle SVG has no accessible label
**File:** `frontend/src/components/KanbanCard.tsx:33–48`
**Severity:** Low

The `<svg>` element receives dnd-kit's `{...attributes}`, which sets `role="button"` and `aria-roledescription="sortable"`, but no human-readable name. Screen readers will announce it as "sortable button" with no indication of what it does.

Adding `aria-label` gives users a clear description:

```tsx
<svg
  {...attributes}
  {...listeners}
  aria-label={`Drag to reorder: ${card.title}`}
  ...
>
```

**Action:** Add `aria-label={`Drag to reorder: ${card.title}`}` to the drag-handle SVG.

---

### F2 — `handleDeleteCard` is verbose where destructuring would be cleaner
**File:** `frontend/src/components/KanbanBoard.tsx:74–77`
**Severity:** Info

```ts
cards: Object.fromEntries(
  Object.entries(prev.cards).filter(([id]) => id !== cardId)
),
```

This iterates the entire cards object to build a new one with one key removed. The idiomatic alternative is computed-key destructuring:

```ts
const { [cardId]: _removed, ...rest } = prev.cards;
// cards: rest
```

Both produce the same result. The destructuring form is shorter and avoids creating an intermediate entries array. The `_removed` variable requires a lint ignore if `no-unused-vars` is strict.

**Action:** Optional cleanup — either form is correct. Prefer whichever is more readable to the team.

---

### F3 — `onBlur` in `KanbanColumn` fires `onRename` even when title is unchanged
**File:** `frontend/src/components/KanbanColumn.tsx:51–58`
**Severity:** Info

When the user clicks into the column title and then clicks away without changing it, `onBlur` fires, `trimmed` equals the current title, and `onRename` is called, triggering a `setBoard` state update for no change. This is harmless now but will cause a spurious API write once Part 6 wires up the backend.

**Action:** Defer to Part 6. Before adding the API call, add an equality guard:

```ts
onBlur={(event) => {
  const trimmed = event.target.value.trim();
  const next = trimmed || lastValidTitle.current;
  if (next !== column.title) onRename(column.id, next);
  else if (!trimmed) onRename(column.id, lastValidTitle.current); // revert display
}}
```

---

### F4 — E2e drag test hardcodes `card-1`, which couples it to `initialData`'s static IDs
**File:** `frontend/tests/kanban.spec.ts:21–22`
**Severity:** Low

```ts
const dragHandle = page.getByTestId("drag-handle-card-1");
const targetColumn = page.getByTestId("column-col-review");
```

`card-1` and `col-review` are IDs from the hardcoded `initialData` in `kanban.ts`. When Part 7 loads the board from the API, the IDs will be UUIDs. The test will break unless updated to target cards by visible content rather than internal ID.

**Action:** Note for Part 7. Rewrite the drag test to locate the first card by position (`page.getByTestId(/drag-handle-/).first()`) rather than by a specific ID.

---

### F5 — No unit test for the empty-column-title guard
**File:** `frontend/src/components/KanbanBoard.test.tsx`
**Severity:** Low

The `lastValidTitle` ref logic in `KanbanColumn` (introduced in the last round) is not covered by any unit test. If someone refactors that handler, there is no test to catch a regression where blanking a column title and blurring away persists the empty title.

**Action:** Add one unit test:

```ts
it("reverts column title when cleared and blurred", async () => {
  render(<KanbanBoard />);
  const input = within(getFirstColumn()).getByLabelText("Column title");
  const original = input.value;
  await userEvent.clear(input);
  await userEvent.tab(); // triggers blur
  expect(input).toHaveValue(original);
});
```

---

### F6 — Production dependencies are exact-pinned instead of using `^`
**File:** `frontend/package.json:17–19`
**Severity:** Info

```json
"next": "16.1.6",
"react": "19.2.3",
"react-dom": "19.2.3"
```

Exact pins prevent automatic patch-level updates (`16.1.7`, security fixes, etc.) from reaching the project. The Next.js ecosystem moves quickly; being stuck on an exact minor version means manual bumps for every security patch. Using `"^16.1.6"` still locks the major and minor, allowing safe patch updates.

**Action:** Change to `"^16.1.6"`, `"^19.2.3"`, `"^19.2.3"`.

---

### F7 — No `engines` field declaring the required Node version
**File:** `frontend/package.json`
**Severity:** Info

There is no `engines` field specifying which Node version this project expects. Without it, a developer or CI runner on an incompatible Node version will silently fail in unexpected ways. This becomes more important once the Dockerfile pins a specific Node version in Part 2.

**Action:** Add at Part 2, once the Node version for the Docker base image is chosen:

```json
"engines": {
  "node": ">=22"
}
```

---

## Deferred Items Carried Forward (from previous reviews)

| Item | Deferred to |
|---|---|
| F6 (prev v1): Align `@types/node` with Dockerfile Node version | Part 2 |
| F7 (prev v1): Same-column drop produces new state reference even when position is unchanged — becomes spurious backend write | Part 7 |

---

## What Is Now Clean (Resolved from Previous Reviews)

| Item | Resolution |
|---|---|
| Pointless `useMemo` for `cardsById` | Removed |
| `Math.random()` in `createId` | Replaced with `crypto.randomUUID()` |
| Column title could be set to empty string | `useRef` guard reverts to last valid title on blur |
| Details fallback `\|\| "No details yet."` | Removed; empty string stored as-is |
| Delete button label mismatch | "Remove" → "Delete", matching `aria-label` |
| `CardContent` duplicated in two files | Extracted to `CardContent.tsx` |
| `autoFocus` missing on new card form | Added |
| `reuseExistingServer: true` | Changed to `!process.env.CI` |
| `.idea/` not in `.gitignore` | Active |
| Duplicate `test` npm script | Aliases to `test:unit` |
| `moveCard` edge cases untested | 3 cases added (empty column, no-op, missing card) |
| `createId` untested | Uniqueness and prefix tests added |
| Drag test magic number unexplained | Comment added |
| Nested interactive elements (`article[role=button]` + `button`) | Dedicated drag-handle SVG; `{...attributes}/{...listeners}` moved off `<article>` |
| `@playwright/test` version mismatch | Bumped to `^1.61.1` |
| Leading whitespace in `kanban.spec.ts` | Removed |

---

## Prioritised Action List

| # | Severity | File | Action |
|---|---|---|---|
| 1 | Low | `KanbanCard.tsx` | F1: Add `aria-label` to drag-handle SVG |
| 2 | Low | `KanbanBoard.test.tsx` | F5: Add unit test for empty column title revert |
| 3 | Low | `tests/kanban.spec.ts` | F4: Note to replace `card-1` hardcode with position-based selector in Part 7 |
| 4 | Info | `KanbanBoard.tsx` | F2: Optional — replace `Object.fromEntries/entries` with destructuring in `handleDeleteCard` |
| 5 | Info | `KanbanColumn.tsx` | F3: Add equality guard to `onBlur` before wiring backend in Part 6 |
| 6 | Info | `package.json` | F6: Change exact-pinned prod deps to `^` ranges |
| 7 | Info | `package.json` | F7: Add `engines` field when Dockerfile Node version is chosen in Part 2 |
