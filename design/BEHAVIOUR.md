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

**Duplicate file check.** SHA-256 of the uploaded bytes, computed and looked up **before reading**. A match interrupts with 3c instead of proceeding to `reading`. Runs on every upload path, including Import and the item-photo slot. Never blocks. **The scan result is cached against the hash**, so "Use the reading" builds a full proposal with no API call and is the primary action; "Scan again" re-invokes the scanner and is a secondary. Cost is internal — never surface amounts, counters or usage warnings in the UI. The upload is retained for 24 hours whichever branch is taken. Multiple matches: show up to three orders, newest first, with a count beyond that.

**Hash vs fuzzy duplicate detection are separate mechanisms and must stay separate.** The hash is exact and certain, runs on the file, and fires before reading. The fuzzy check (vendor + date + total) is advisory, runs on the proposed order, and fires in review. When both would fire on one upload, the hash screen comes first; the fuzzy warning appears in review only if the user chose to scan anyway.

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

## Settings (11a)

**Per-card dirty state.** Each section holds its own draft and its own dirty flag. The save bar names the dirty section. Two sections dirty at once is legal and the bar names the count; saving writes both.

**Email is read-only** in this design. Changing it is an identity flow with a verification step, out of scope here.

**Theme** is written to one preference, `light | dark | system`, from either control. `system` follows `prefers-color-scheme` live, without a reload. Persist per user, and apply before first paint to avoid a flash of the wrong theme.

**Density** changes list row padding only (14px → 8px). Item line rows and all touch targets keep their sizes, so the 44px minimum holds in either mode.

**Currency** changes the symbol and nothing else. Amounts already stored are not converted, and the card says so. **⚠ CONFIRM** whether multi-currency is ever needed; if yes, an amount needs a currency of its own and every aggregate needs a conversion policy — a different piece of work.

**Number and date format** are display-only, applied at render. Never stored with the value.

**Statuses.**
- Draft is built in: not renamable, not deletable, always first.
- Renaming is free — orders reference a status by id.
- Reordering persists an explicit position; the order is used everywhere statuses appear (facets, the picker, Statistics).
- Deleting is blocked while any order carries the status. The dialog states the count and offers reassignment.
- Colour comes from a fixed five-swatch set, not a free picker.
- **⚠ CONFIRM** a cap on the number of statuses. Recommendation: 8. Beyond that the facet group and the bulk-action popover stop being scannable.

---

## Import (11b)

**Stages:** `idle → parsing → mapping → resolving → preview → writing → done`, plus `failed` from parsing or writing.

**Accepted:** CSV, XLSX (first sheet unless the user picks another), JSON. **⚠ CONFIRM** a row cap. Recommendation: 5.000 rows per import, with a clear message above it rather than a timeout.

**Parsing.** Delimiter and encoding detected, with the detected pair shown and overridable — Danish exports are frequently semicolon-delimited and Latin-1. The first row is assumed to be headers; a toggle says otherwise. An empty file, a single column, or zero data rows all fail at this stage with a specific message.

**Column mapping.**
- Auto-mapping matches on normalised header name against a synonym list (Danish and English). A match is applied but visibly marked, never hidden.
- Sample values are the **first three non-empty distinct values** in that column, truncated for display.
- One file column maps to at most one field; one field takes at most one column. Selecting a field already in use moves it and clears the previous row.
- Required: vendor, order date, item name (or description in whole-order mode), and a price field. Preview is disabled until all are mapped.
- Unmapped columns default to "don't import".
- **Date format** is inferred from the column's values and shown as an explicit "read as" chip. Where DD-MM and MM-DD are both plausible, the ambiguity is stated rather than resolved — a wrongly-inferred date is silent and permanent.
- **Number format** is inferred the same way (`1.234,50` vs `1,234.50`) and shown next to the amount field.
- **Reuse mapping** from a previous import applies the saved map by header name and reports which columns did not match this file.

**Row shape.**
- *One item line per row:* rows are grouped by the column mapped to reference. Rows with an empty reference each become their own order. Within a group, header fields must agree; where they differ the first row wins and the preview flags it.
- *A whole order per row:* quantity and unit price are dropped from the map, item name becomes optional Description, Order total becomes required. Each order gets one line: description or "Imported order", quantity 1, unit price = the total.
- Switching modes preserves both mappings so the switch is free in both directions.

**Value resolution.** Every distinct unmatched vendor or category value gets a row with its occurrence count and a picker offering existing records plus "create it". Fuzzy matches above 0.9 are pre-selected and still shown. **An unresolved row blocks Preview.**

**Preview (dry run).** Computed server-side against real validation, not a client guess. It reports:
- counts (orders, lines, new vendors, total),
- **likely duplicates** — an existing order with the same vendor, date and total. Advisory: the row imports unless the user excludes it,
- **unimportable rows** with the reason per row. Skipped, never repaired, and downloadable as a file with an added reason column,
- the first five orders as they will be saved.

**Bring them in as drafts** writes every order with the Draft status, overriding both the file and the user's default. Statistics excludes drafts, so a large import can be worked through without disturbing the numbers.

**Writing** is one transaction: either the whole import lands or none of it does. Progress is determinate here — the row count is known. Created vendors and categories are part of the transaction.

**Undo** is available for 24 hours and removes exactly what the import wrote, including created vendors and categories, but **only if nothing else has since referenced them** — an order edited after the import blocks its own removal, and the undo reports what it could not remove rather than failing whole.

**⚠ CONFIRM — can an import update existing orders?** Recommendation: no. Create-only. Matching on a reference column to update in place doubles the surface and makes "duplicate" and "update" the same ambiguous case.

---

## Theme (12a)

**Application.** One token layer, resolved per theme. No component reads a literal. Applied before first paint from the persisted preference.

**`system`** follows `prefers-color-scheme` and reacts to a change live.

**Contrast targets.** Body text and above meet 4.5:1 against their surface in both themes; small-caps labels and hints meet 3:1 as non-essential text. Primary buttons on dark are `#5d9b76` with `#14261c` text — white on that green fails. Green *text* on a dark surface is `#8fc0a2`, not the button green.

**Charts** keep the five-step ramp in the same order, so a legend learned in one theme reads in the other.

**Print** always uses the light theme regardless of preference.

---

## Image viewer (12b)

**Opens from** an attachment tile or an item photo. In both cases the set is the order's files, ordered as they appear on the order, with the clicked file current.

**Controls:** prev/next within the set, page thumbnails for a paged file, download, close. No zoom, rotate or delete in this design — deletion stays where the file lives, so there is one place a file is removed. **⚠ CONFIRM** whether zoom is needed for dense receipts; recommendation: add pinch and scroll-wheel zoom later, but not rotate — a wrongly-oriented scan should be fixed on upload.

**Keyboard:** left/right move within the set, Esc closes, Tab is trapped, focus returns to the originating tile.

**Paged files** show the page rail and remember the page while you move away and back within the session.

**Loading** shows the thumbnail scaled up behind a progress indicator, not an empty frame — the low-resolution version is already in hand.

**A file that cannot be rendered** (an unsupported PDF, a corrupt image) shows the filename, the size, and a download action. Never a broken-image glyph.

**Both themes** render the overlay dark; only the scrim differs (`rgba(27,26,23,0.72)` light, `rgba(10,9,8,0.82)` dark).

---

## Typography and overflow (13a)

**Tabular figures** on every amount in a list, table or total, right-aligned. Proportional inside prose.

**Truncation per role**, as specified in the README. The mechanical rule: `min-width: 0` on the flex child (the wrapper), not on the truncating text — which already escapes the automatic-minimum-size rule through `overflow: hidden`. Grid cells need the same.

**Test data.** Every list must hold with a 60-character vendor name and a 120-character item name, and with a note that is one unbroken 200-character string (`overflow-wrap: anywhere`).

**Full text** for a truncated value is available as a `title` on hover and in full in the detail view. A truncated value is never the only place a value appears.

---

## Controls (14a–14d)

**Shared contract.** Every control is controlled: `value` + `onChange`, no internal value state, no `defaultValue`. `label`, `error`, `disabled`, `id`, `name` and `required` live on the shared field wrapper, which owns `htmlFor`, `aria-describedby`, `aria-invalid` and the hint/error slot. Error and hint occupy the same slot, so a field's height never changes when it fails.

**Validation.** On blur once touched, and on submit. Never per keystroke. An error clears on the next valid blur, not the first character typed. The value is preserved through the error — never cleared.

**Amount parsing.** Accept `4190`, `4.190,00`, `4190.00`, `4 190`, and a leading/trailing currency symbol. Reformat to the user's number format on blur. Two decimals half-up (quantity: three). `inputmode="decimal"`, never `type="number"`.

**Stepper.** `min` defaults to 1 and disables the minus button; it never deletes the line. No `onDelete` prop — deletion is a separate control by design. The numeric middle stays typable.

**Combobox — normative behaviour.**
- Modes: `searchable` false is a button trigger with no filter field; true turns the trigger into a text input.
- Groups render in fixed order — favourites, recent, all. Headers are non-focusable labels and are hidden when their group has no matches. The count on a header is post-filter.
- Favourites: user-starred, capped at 5. Recent: last 3 used, excluding starred entries so nothing appears twice.
- **Options are a flat traversal list.** Arrows cross group boundaries and skip headers; Home/End reach the true first and last. Build the flat list, then render headers into it.
- Filtering is accent-insensitive on word prefixes, matching inside compound and hyphenated names (`mob` → `Møbler`). Matches are highlighted.
- `onCreate` present adds a final row quoting the query verbatim, reachable by keyboard like any other option. Creation is name-only.
- Highlight (hover/keyboard) and selection (current value) are separate states and may be on different rows.
- **No selection without an explicit commit.** Esc restores the previous value. Tab commits the highlight only if the user typed nothing.
- Panel caps at 320px and scrolls, keeping the highlighted row in view by nearest-edge scrolling — never centring. Flips above the trigger when there is no room below. Below 640px it is a full-screen sheet with search at the top.
- ARIA: `combobox` + `aria-expanded` + `aria-activedescendant` on the trigger, `listbox` on the panel, `group` + `aria-labelledby` per section, and the result count in a live region.

**SearchInput.** 300ms debounce. The clear affordance exists only when there is a query. `resultCount` is announced in a live region.

**Checkbox.** `indeterminate` is a real third state used by "select all" over a partial selection; clicking it selects all. The whole row is the hit target, 44px on touch.

**Toggle.** Applies immediately, never has a Save, and has no pending state. If a setting needs a save, it is not a toggle.

**Button.** `loading` holds the rendered width, swaps the label for a spinner plus a verb, and disables the button so a double-click cannot double-submit. `iconOnly` requires an `aria-label`. `as="a"` for anything that navigates. `level="destructive"` is only valid inside a Dialog. Full width only inside a mobile sheet.

**FileDrop.** Validates type and size client-side before upload starts. Per-file progress and per-file error; a failed file keeps its row with the reason plus retry and remove. `capture` opens the camera on mobile. The zone is keyboard-focusable with the standard focus ring, and a file button is always present alongside the drop target.

**SwatchPicker.** Two-dimensional arrow navigation. Every item carries an accessible name — a colour with no name is unusable without sight. Selection renders as an outline, never a check overlaying the item.

**Adding a palette colour.** Derive, don't judge: hue in an existing family or ≥40° from all four; L in 69–86 and ≥5 L from any same-hue swatch; C from L (≈0.08 at L 70, ≈0.05 at L 80, ≈0.025 at L 86), never above 0.08; glyph flips to dark ink above L 75; dark-theme pair in the same commit at +18 L, same C. Never interpolate in hex or HSL.

---

## Layout (15a, 15b)

**One fluid column per layout.** Main column `1fr`; every other column a fixed px width. Right rails 320/360/400, facets 260, page nav 208. Never two `1fr` columns in one layout.

**Gaps on the container**, not margins on children: 24 between columns, 14 between stacked cards, 16 in a card grid, 12 between fields (14 on mobile).

**Table columns** are fixed except one: vendor 200, date 110, items 72, category 160, status 120, amount 120 right-aligned. One grid definition shared with the header, declared once. Row height from padding (12–14px; 8px compact), never fixed. A second line sits inside its cell and never displaces the primary.

**Sticky elements** are `position: sticky` relative to the content column, which is the page's only scroll container — not the viewport.

**Statistics grid:** 12 columns, every card spanning a whole number of them. Verify rows close at 1280, 1440 and 1920.

**Breakpoints remove or relocate; they never scale.**
- 1280: facet rail → drawer; sidebar may collapse to the 68px rail.
- 900: two columns → one, per screen (order edit folds its rail into a collapsed section *above* the items; the library becomes list-then-panel as separate views; Statistics stacks). A rail is never appended below a long list.
- 640: phone layout — 20px padding, bottom tab bar, rows → cards, filters → sheet, inline expansion → sheet, capture FAB.

**Mobile field grouping**, applied in order: one calculation or one object → keep grouped; any part under 100px → stack regardless; one part with intrinsic width → fixed + fluid; otherwise full width. The surviving groups are exactly three: the item equation, the photo-plus-controls row, and the icon-plus-name field. Control padding 10px 12px → 12px (42px → 46px). The computed third of the item equation becomes a total line, not a field.

**Below 640px also:** sheet buttons full width and stacked, primary on top; dialogs → bottom sheets; comboboxes → full-screen sheets with search above the keyboard; segmented controls may go full width; the save bar spans the viewport and respects the safe-area inset; labels stay above fields at every width.

---

## Files and images (17a, 17b)

**Validation order:** extension, then sniffed magic bytes, then size. All client-side, before upload. Rejection renders inline on the drop zone; the zone stays usable.

**Upload:** tile appears immediately from a local object URL; upload goes to staging and returns an id; the draft holds ids. Order save commits them. Orphans cleaned after 24 hours.

**Server derives:** EXIF-corrected orientation, a copy stripped of GPS and camera metadata, a thumbnail, and page-1 render for PDFs. HEIC converted for display, original retained as uploaded.

**Replace:** upload new → swap reference → release old. Never the reverse. Old image stays visible, dimmed, under the progress ring. Failure leaves the original in place with the tile reporting the failed replace.

**Delete:** user-added item photo → immediate + toast/Undo. Scan-sourced photo or attachment → confirm first. Order delete → dialog names the attachment count. Draft removal drops the id only; storage cleanup is the 24-hour job.

**Failure is per file.** One rejected file in a batch of five does not roll back the other four. The failed tile persists with a specific reason ("Too large", "Not a supported type", "Upload failed") and a Remove; retry re-uploads without re-picking.

**Source menu:** opens from an empty item-photo slot and from Replace. Rows: Take a photo (only where a camera exists — omitted, not disabled), Choose a photo (opens the library on mobile; the file dialog on desktop), and Use the receipt (only when the order has an attachment; opens a page picker for cropping). Skipped entirely when only one source is available. Drop bypasses it.

**Navigating away mid-upload** prompts with the count in flight ("2 files are still uploading") — the dirty-form prompt alone does not mention files.

**Duplicate file on one order** (same name and size) warns, does not block.

**No full-screen blocking overlay** for uploads. Progress lives on the tile; the form stays editable.

**⚠ CONFIRM — attachment limits** (also question 2): recommendation 10 files per order, 20 MB each, and a 30-day orphan retention if 24 hours is too aggressive for your storage.

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
| 10 | Currencies other than DKK — and whether historical amounts convert | everywhere |
| 11 | Cap on the number of statuses (recommend 8) | 11a, facets, bulk actions |
| 12 | Row cap per import (recommend 5.000) | 11b |
| 13 | Can an import update existing orders, or create only? (recommend create only) | 11b |
| 14 | Is zoom needed in the image viewer? (recommend later, and no rotate) | 12b |
| 15 | Is a Radio component ever needed, or is Segmented/Combobox always right? (recommend not building it until a screen needs it) | 14d |
| 17 | Should the hash check also match against **deleted** orders (soft-deleted, if question 3 goes that way)? Recommendation: yes, and say so in the message — "this was on an order you deleted" is exactly when Scan anyway is the right choice. | 3c |
| 16 | Does any category need a colour outside the four hue families? (recommend no — labels already distinguish them) | 14c, 5b |
