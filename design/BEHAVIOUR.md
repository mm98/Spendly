# Behaviour — Spendly order flows

Precise rules for what the mockups cannot show. Where a rule is a product decision rather than a design one, it is marked **⚠ CONFIRM** with a recommendation. Those need an answer before the affected screen is built; everything else is implementable as written.

Conventions: amounts are DKK, formatted `1.234,50 kr.` (period thousands, comma decimal, `kr.` suffix). Dates are `12 Aug 2026` in display, ISO in transport. All times are the user's local timezone.

---

## Order list (2a–2c)

**Search** covers vendor name, item name, reference and notes. Debounce `300ms`. Server-side, case-insensitive, accent-insensitive, matching on word prefixes — `ind` matches "Indbo", not "Findbo". Multiple words are ANDed and may match different fields. The query is in the URL.

**Facet counts** are computed with **all other facet groups applied but the group's own selections ignored**. Selecting "Received" in Status leaves the other status counts showing what you would get if you switched to them, rather than zero. This is the behaviour users expect and the one most often implemented wrong.

**Facets within a group are ORed; groups are ANDed.** Status(Received, Draft) AND Category(Decor).

**Facet ordering** is by count descending, except Status, which is in workflow order (fixed). Groups show the top 6 with "Show all (N)"; expanded, they scroll at `240px` with a filter field if the group has more than 20 values.

**A facet value with a count of zero** is hidden, unless it is currently selected — then it stays visible with `0` so it can be deselected.

**Result total** ("128 orders · 486.320 kr.") reflects the filter, not the page, and not the account.

**Sort** options: date (default, newest first), amount, vendor, item count. Sort is in the URL. Ties break on order id descending so paging is stable.

**Pagination** is offset-based, sizes 25 / 50 / 100, default 25. Page resets to 1 on any filter, search or sort change — never preserved.

**Selection** is per-page and clears on filter, search, sort or page change, with no warning (the selection is no longer meaningful). "Select all" selects the current page only; if the filter matches more, offer "Select all 128 matching" as a second, explicit action.

**Bulk apply** is optimistic: rows update immediately, toast with Undo for 6s, rollback with an error toast on failure. Partial failure reports the count that succeeded and the count that did not.

**View mode** (rows/cards) persists per user in local storage, not in the URL — a shared link should render in the recipient's preference.

**Row click** opens the order read view. Cmd/Ctrl-click opens in a new tab. The actions cluster and the checkbox stop propagation.

**⚠ CONFIRM — draft orders in the list.** Recommendation: drafts appear in the default list, marked, because a forgotten draft is worse than a cluttered list. Alternative is a separate Drafts view.

---

## Order read and edit (1a–1d)

**Entering edit** is a route (`/orders/:id/edit`), not a toggle, so it is linkable and the browser back button works.

**Dirty tracking** is per field against the loaded values. Reverting a field by hand clears its dirty flag; when none remain, the save bar disappears. Whitespace-only changes to text fields do not count as dirty.

**Navigating away while dirty** prompts, including browser back and reload (`beforeunload`). Cancelling the prompt stays on the page with state intact.

**Save** is a single request with the whole order including its lines. On success: toast, and stay on the edit screen (you are usually making several passes). On validation failure from the server: map errors to fields, scroll the first error into view, keep everything else.

**Item line editing.** Only one line is open at a time; opening another closes the first. Closing with unsaved changes in the line keeps them — the line is dirty within the order draft, not saved to the server independently. Esc reverts that line to its last saved value. ⌘/Ctrl-Enter closes the line, keeping changes.

**Line total** is `quantity × unitPrice`, computed, read-only, rounded half-up to 2 decimals. Quantity accepts up to 3 decimals (a partial metre of fabric is real). Entering a line total directly is not supported.

**Order total** is the sum of line totals. There is no separate editable order total — if the receipt disagrees, that is surfaced in the scan review (see below), not stored twice.

**Adding a line** appends an empty line, opens it, and focuses the name field. An empty line that is never filled is discarded silently on save.

**Deleting a line** removes it immediately with an Undo toast. No dialog — it is cheap to restore.

**Reorder** persists a `position` integer per line, contiguous from 0, rewritten on every reorder. Reordering marks the order dirty; it is not saved independently.

**Attachments.** Accepted: PDF, JPG, PNG, HEIC, WEBP. Multiple per order. Upload begins on drop, shown as a tile with a progress ring; a failed upload leaves the tile with a retry control rather than vanishing. HEIC is converted server-side for the thumbnail. PDF thumbnails render page 1. Click opens a lightbox with prev/next across the order's attachments and a download control.

**⚠ CONFIRM — attachment limits.** Recommendation: 10 files per order, 20 MB each. Needs a number that matches your storage.

**Item photo** (distinct from order attachments — one per line): replace and delete controls appear over the 80×80 thumb. Deleting a photo that came from a scan confirms first; deleting one the user added does not. Empty slot accepts click and drop.

**Deleting an order** confirms with a dialog naming the item count and the attachments that go with it. Hard delete.

**⚠ CONFIRM — hard vs soft delete.** Recommendation: soft delete with a 30-day window, invisible in the UI, so a mistaken delete is recoverable by support. The dialog copy stays the same either way.

---

## Order create and scan (3a, 6e)

**Stages:** `idle → uploading → reading → review → created`, plus `failed` reachable from uploading or reading.

**Upload** validates type and size client-side before starting. Rejection is inline on the drop zone, keeping the zone usable.

**Reading** is indeterminate — no fake percentage. Stage text may update ("Reading line items…") if the backend reports stages; otherwise one message. Cancel abandons and deletes the upload.

**⚠ CONFIRM — scan timeout.** Recommendation: 45s, then `failed` with the manual-entry handoff. Long enough for a multi-page PDF, short enough not to feel abandoned.

**Review** is the only stage where data is editable and the only stage where anything can be created.

- **Per-field confidence.** Two visual levels only: clean (looks like a normal filled field) and uncertain (2px `#b58a2b` left edge plus a check hint). Recommendation for the threshold: below 0.85 is uncertain. A third level tested as noise.
- **Touching an uncertain field clears its uncertain state**, whether or not the value changed — the user has looked at it.
- **Unmatched vendor** shows a picker of near matches with a "Create 'Indbo Møbler'" row. Matching is fuzzy on normalised name; a match above 0.9 is pre-selected but still shown as uncertain.
- **Unmatched category** behaves the same, plus falls back to the vendor's default category when one exists — and is then marked uncertain, not clean.
- **Total reconciliation.** If the sum of lines differs from the total read off the receipt, state both plainly in amber: the computed sum and "the receipt says X". Never silently adjust, and never add a balancing line. A difference does not block creation — receipts have rounding, deposits and discounts the OCR may not have caught.
- **Zero line items read.** The order is still proposed with header fields and an empty item list, and the message says the lines could not be read. The receipt preview stays open beside it so the user can type them in while reading. This is the most common partial failure and must not fall through to the generic failure screen.
- **Save as draft** keeps the proposal and the file without full validation.
- **Create order** validates fully.

**Created** confirms with the summary, keeps the file attached to the new order, and offers open-order and scan-another.

**Failed** keeps the file, says what failed in plain words, and makes "Enter it manually" the primary action with the file already attached to the new blank order.

---

## Statistics (4a)

**Period** is year, month, or custom range; default: current year. In the URL.

**Compare to previous** compares to the immediately preceding period of the same length. Deltas are percentage, one decimal, suppressed when the base is zero (show "—", not "∞" or "100%").

**Drill crumbs** are an ordered stack, each a dimension plus value (`year:2026`, `category:decor`, `month:2026-08`). Every card re-filters to the intersection. Crumbs are individually removable; removing a middle crumb keeps the ones after it if they remain valid, and drops those that do not. URL-encoded.

**Drill order is not fixed** — category then month, or month then category, both work, and reach the same set.

**The final level** is a list of matching orders, rendered with the same row component as the order list, and clicking one leaves Statistics for that order.

**"Other N categories"** is a real crumb: drilling into it filters to everything outside the top five, rather than being inert.

**Empty period** shows the cards with a zero state inside each rather than hiding them, so the period control stays in place.

**Definitions** — pin these once, in one place, and reuse:
- *Total spend*: sum of order totals in the period, by order date, all statuses. **⚠ CONFIRM** whether cancelled orders are excluded. Recommendation: excluded from spend, still counted in the order count, with a note in the card.
- *Average order*: total spend ÷ order count, same filter.
- *Saved vs retail*: sum over lines of `(retailPrice − unitPrice) × quantity`, counting only lines that carry a retail price. **⚠ CONFIRM** — this field exists in the mockups; confirm it exists in the data, otherwise the card comes out.
- *A month* is the calendar month of the order date, user timezone.

---

## Vendors and categories (5a–5c)

**Panel default** is the roll-up (nothing selected). Selecting a row replaces it. Deselecting returns to the roll-up.

**Unsaved panel changes** prompt when selecting a different row.

**Vendor merge** moves all orders from source to target, keeps the target's field values unless the comparison overrides them, and deletes the source. Confirmed explicitly, naming the number of orders moving. Not reversible — **⚠ CONFIRM** whether it needs to be. Recommendation: not reversible, but write an audit record.

**Duplicate detection** for the "possible duplicates" list: normalised name similarity above 0.85, or an identical VAT number. Advisory only — never merged automatically.

**Category limit** accepts empty (no limit) or a positive amount. Zero is not the same as empty and means "nothing should be spent here"; if you don't want that distinction, reject zero.

**Limit progress** = spend in the current calendar month for that category ÷ limit. Over 100%, the bar caps visually at 100% and fills amber, with the overage stated in text.

**Icons** come from a fixed server-side set with a stable key per icon. The picker never accepts uploads. Colour is chosen separately; the icon renders in the category colour, switching its glyph to `#3d3c36` when the colour's luminance is above roughly 0.7.

**⚠ CONFIRM — deleting a vendor or category with orders.** Recommendation: not permitted. Offer merge (vendors) or reassign (categories) instead, with the dialog stating the order count. Silently orphaning records or cascade-deleting orders are both worse.

**⚠ CONFIRM — item-level categories.** Recommendation: no. Category lives on the order only. Per-line categories would change every statistics aggregation and the facet model; if it is wanted, it is a separate piece of work, not a variant of this one.

---

## Budget alerts (8b)

**Live, while editing.** Recomputed on every change to the order's category or line totals. Shows when the order's category would exceed its monthly limit for the **order's** month, not the current month. Amount over is stated. Save is never affected. Suppressed while the order has no category or the category has no limit.

**On the category.** Bar fills amber past 100% in the panel and the list row; the row gains a small amber badge.

**Monthly summary.** On Home, on the first visit of a new month, listing the previous month's categories that finished over limit. Dismissible; dismissal is remembered for that month. Not an email, not a push notification.

**Never:** a modal, a red state, a blocked save, or the word "warning".

---

## Cross-cutting

**Toasts** queue, showing one at a time, bottom-centre, 6s, paused on hover. Undo is available for the toast's lifetime and its action is idempotent. A toast dismissed early keeps the action applied — Undo is an offer, not a pending state.

**Optimistic updates** apply to status changes, category assignment, line deletion and reorder. Not to order creation or save.

**Validation timing:** on blur for a touched field, on submit for everything. Never on keystroke. Clearing an error happens on the next valid blur, not on the first keystroke.

**Keyboard:** Esc closes the topmost layer (sheet, then dialog, then palette, then inline edit). Focus is trapped in dialogs, sheets and the palette, and returns to the trigger on close. Tab order follows visual order. Every icon-only button has an `aria-label`.

**Error handling.** A failed load shows an inline retry in the region that failed, not a full-page error. A failed mutation reverts the optimistic change and says what did not save. Never a bare error code.

**Concurrency.** Last write wins. If the record changed since load, save succeeds but the response includes the new state and a toast notes that it was updated elsewhere. Single-user product — two tabs, not two people.

**Empty vs loading vs error** are three distinct states in every list and panel. Never conflate them: an error rendered as "no results" hides a real problem.

**Responsive breakpoints:** `1280px` (facet rail may collapse to a drawer), `900px` (two columns stack), `640px` (phone layout, sheets replace inline expansion).

---

## Open questions, collected

Answer these before the affected screen is built. Recommendations are in the sections above.

| # | Question | Affects |
| --- | --- | --- |
| 1 | Do drafts appear in the main order list, or a separate view? | 2b, list model |
| 2 | Attachment count and size limits | 1a, 3a |
| 3 | Hard or soft delete for orders | 1a, 6d |
| 4 | Scan timeout | 3a |
| 5 | Are cancelled orders excluded from total spend? | 4a, every aggregate |
| 6 | Does a retail price exist on item lines? (the "saved vs retail" card depends on it) | 4a, 5a, 10a |
| 7 | Is vendor merge reversible? | 5a |
| 8 | Can a vendor or category with orders be deleted? | 5a, 5b |
| 9 | Item-level categories — yes or no? | 5b, 4a, 2a |
| 10 | Currencies other than DKK | everywhere |
