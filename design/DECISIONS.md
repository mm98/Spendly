# Decisions — Spendly order flows

Why the design is the way it is. Each entry names what was rejected and the reason. If you are about to change one of these, read its entry first — several look like tidier alternatives and were tried.

---

## 1. The order header sits in the right rail, not above the items

**The problem this solved.** On the edit screen the order header — vendor, date, status, category, reference, totals — sat above the item list and consumed most of the viewport. But nearly every edit session is adjusting item lines. You arrived at the screen and immediately scrolled past the part that filled it.

**The decision.** Details move to a `360px` right rail. The item list starts at the top of the main column and owns the full width.

**Rejected: keep the header on top but make it collapsible.** Still costs a row of chrome, still needs a decision every visit, and collapsed state either persists (so the details are invisible to a new user) or resets (so you collapse it every time). It also leaves the item list narrow for no gain.

**Rejected: header as a thin summary strip with a modal for editing.** Editing the vendor becomes a two-click detour, and the modal covers the items you were comparing against.

**The constraint that follows.** The rail must stay **shorter than the item list**. Once the rail becomes the longest thing on the page, the page scrolls for the rail's benefit and the original problem returns in a new form — which is exactly what happened when attachments and a notes block were first added to the rail. Attachments moved below the item list for this reason. Anything new in the rail has to displace something, not extend it.

## 2. The top shell holds no page actions

Product constraint, not a preference — the shell is locked and shared. Everything a page does lives inside the page. This is why the edit screen has a sticky save bar at the bottom of its content column rather than Save in the top bar, and why bulk actions appear as a bar above the list.

## 3. Item editing expands in place; it is not a dialog

**The decision.** Selecting a line expands it into a form within the list, pushing the rows below down.

**Why.** Editing a line is nearly always relative to its neighbours — you are fixing a quantity because the next line tells you which one it is, or splitting a price across two lines. A dialog hides the context that makes the edit correct.

**Rejected: a dialog.** Covers the list, and forces one line at a time with a modal open/close per edit.

**Rejected: editing in the right rail.** Splits attention across the page width, and the rail is the wrong shape for a photo plus four fields. Also breaks rule 1 — the rail grows.

**Exception: mobile.** In a single column, "expands in place" and "takes over the screen" are the same thing, so mobile uses a bottom sheet. The sheet is the mobile expression of the same idea, not a different pattern.

## 4. A row must never look inert

**The problem.** Once editing happens by clicking a row, nothing tells you the row is clickable. This came up directly: "so how does the user know how to edit an order item?"

**The decision.** Three affordances, together: `cursor: pointer`, a hover fill (`#f0efe9`), and a pencil at the row's right edge on hover. On touch, where there is no hover, the pencil is permanently visible. The list header carries the sentence "Tap a line to edit it."

**Why all of them.** Each alone fails somewhere — hover fill is invisible on touch, a permanent pencil on desktop adds noise to every row, and a hint sentence alone gets read once and forgotten. The combination degrades correctly per input type.

## 5. Reorder needs buttons as well as drag

**The decision.** A drag handle *and* up/down buttons in every row's action cluster.

**Why both.** Drag is the fast path with a mouse and unusable with a keyboard; it is also awkward on touch inside a scrolling list, where a long-press to drag competes with the scroll gesture. The buttons are the accessible and mobile path. Dropping either one loses a real group of users.

**Order is explicit.** A stored position field, not derived from name, date or amount. Receipt lines have a meaningful order — the order they were on the receipt — and sorting would destroy it.

## 6. The vendor column is fixed-width and first

**The problem.** An earlier list put the vendor inside a variable-height stack with an item preview, so the vendor name sat at a different vertical position on every row. Scanning down the list, your eye had to search for it each time.

**The decision.** Vendor is the first column after the checkbox, `200px` fixed, one line, ellipsis-truncated, always at the same x and y within its row. Item preview text, when shown, goes on a second line and never displaces it.

**The general rule.** In a scannable list, the column you scan by is fixed. Variable content goes to the right of it or below it, never above or beside it in a way that moves it.

## 7. Amber informs, red blocks

**The decision.** A monthly budget limit never prevents a save. Crossing it renders as an amber notice stating the amount over, and the save proceeds.

**Why.** A limit is a fact about your month, not a rule about your data. You cannot un-spend money by failing validation, and blocking the save would mean the app's records no longer match reality — the worst possible outcome for a tracking tool.

**Consequence for implementation.** Limit checks live outside the validation layer entirely. Do not route them through the same code path as required fields; the temptation to give them a "severity: warning" flag in the validator is how they eventually start blocking.

**Red is reserved for** what actually stops a save (missing vendor, no item lines, negative quantity) and for destructive actions.

## 8. Category limits are one value, not a monthly series

**The decision.** A category carries a single monthly limit amount. It applies to every month. There is no per-month editing, no history of limit changes.

**Why.** This was clarified explicitly during design: it is a limit entered on the category, not a budget planned per month. Modelling it as a series invites a calendar UI, a "copy last month" action, and a question about which month's limit a historical comparison should use — none of which the user asked for.

**The pace marker exists because of this.** Since the limit is flat and the month is partial, "3.400 of 6.000 kr." on day 20 is not readable on its own. A 2px amber marker at `day / daysInMonth` gives it meaning. It is a reference line, not a threshold.

## 9. Statistics is the only place with charts

**The decision.** One statistics page with a period control and a drill path. Vendor and category panels answer the single-record question locally — four numbers and a sparkline — and link into Statistics with the crumb pre-applied.

**Rejected: per-vendor and per-category statistics pages.** Two places computing the same aggregates will eventually disagree, and when they do, neither is trustworthy. It also triples the surface that needs updating when a metric definition changes.

**The link is the seam.** "See in Statistics" from a panel, and "Open vendor" from a Statistics bar. Same numbers, one source, navigable in both directions.

## 10. A scan proposes; it never writes

**The decision.** Scanning produces a proposal held separately from the order. Nothing exists until Create order.

**Why.** An OCR result is a guess. If it saves first and asks later, a wrong guess is now a record you have to find and correct, and the "was this checked?" state is lost. Holding the proposal separately also means "what the scan said" survives the user's overrides, which is what makes the review step honest.

**Confidence is shown per field**, not as one overall score. A receipt where the total read cleanly and the vendor did not is the common case; one number cannot express it.

**Failure keeps the file.** A scan that cannot be read hands off to manual entry with the file already attached. The user's upload is never lost to an error state.

## 11. Duplicate carries the shape, not the evidence

**Carries over:** vendor, category, reference, notes, and all item lines with quantities and prices — the reason you duplicate is that the *shape* repeats.

**Does not carry over:** order date (set to today), status (reset), attachments. A receipt is evidence of one specific purchase; copying it to another order makes the record lie.

**Opens unsaved,** with a notice naming the source and offering Discard, so an accidental duplicate costs nothing.

## 12. Undo is preferred over confirmation

**The decision.** Reversible actions — set status, add category, bulk edits — complete immediately and offer Undo in a toast. Only irreversible actions get a dialog.

**Why.** A confirmation dialog on a reversible action taxes every use to prevent a cheap mistake. Undo taxes only the mistakes.

**Dialogs name the consequence,** not the mechanism: "Delete this order?" with a body listing what goes with it, including attachments. Never "Are you sure?".

## 13. Mobile drops fields; it does not shrink them

**The problem.** The first mobile list carried every desktop column into a phone row. It was unreadable, and shrinking the type made it worse.

**The decision.** A mobile row shows vendor and amount on line one, date/items/status on line two, category on line three. Nothing else. The remaining fields live in the detail view.

**The principle.** On a small screen, cut information rather than compress it. If a field is not worth three lines of a phone row, it belongs one level deeper.

**Capture gets a floating action button** because the phone is the camera. It is the one action that is always reachable, and the only FAB in the app.

## 14. Skeletons, not spinners

Loading states mirror the shape of the content arriving — rows at row height, cards at card size, label/value pairs in panels. A spinner in place of a layout causes a full reflow on arrival and tells you nothing about what is coming.

## 15. Empty states are three different states

"Never had any" is an invitation with a primary action. "Filtered to nothing" offers to clear the filters. "Search found nothing" echoes the query. Collapsing them into one message makes the first-run experience read like a failure.

## 16. Single user, personal receipts

There is no item catalogue, no shared editing, no permissions, no approval flow. An item catalogue page was designed and then removed for this reason — this is receipt tracking, not inventory management. A concurrent-edit conflict means two browser tabs, not two people, so last-write-wins with a warning is sufficient.

## 17. Import maps against real values, not field names

**The decision.** In the import mapping step, every file column shows its name plus three real sample values from the file, beside the Spendly field it will become.

**Why.** "Beløb" means nothing until you see `7.635,00` under it. A mapping UI listing only header names asks the user to remember what their own export contains, and the failure is silent — the import succeeds with the wrong column and the mistake surfaces weeks later in Statistics.

**Rejected: a template-only import.** Download a fixed spreadsheet, fill it, upload. Simpler to build and genuinely faster for a one-off, which is why the template is still offered — but it forces the user to reshape every export by hand, forever. The template covers the easy case; the mapping UI covers the real one.

**Nothing is guessed silently.** A value that doesn't match an existing category or vendor gets a row with its occurrence count and a picker, and an unresolved row blocks the import. A category invented by an import is worse than one the user chose, because nobody remembers creating it.

## 18. "A whole order" per row loses the itemisation, and says so

**The decision.** The import can treat each row as an item line (grouped into orders by a reference column) or as a whole order. In the second mode, quantity and unit price leave the mapping, item name becomes an optional description, and a required Order total appears. Each order arrives with one item line carrying the description and the total at quantity 1.

**Why one line rather than none.** An order with no lines would make the totals unverifiable and the order awkward to edit — every screen assumes at least one line. One synthetic line keeps the data model uniform.

**Why the dropped fields are shown struck through** rather than removed: a mapping that silently loses two columns looks like a bug. Struck through, it reads as a consequence of the choice just made.

**The count is the tell.** Switching modes changes the order count in the preview (128 rows → 128 orders instead of 41). That number is the fastest way to notice the wrong mode, faster than reading any explanation, which is why the preview shows it before anything is written.

## 19. An import is undoable for 24 hours

**The decision.** After an import completes, "Undo this import" removes exactly what it wrote — orders, lines, and the vendors it created — for 24 hours. After that they are ordinary records.

**Why.** An import is the one action that can put a hundred wrong records in at once, and the mistake is usually noticed a minute later, not immediately. Requiring a hundred manual deletes for one wrong mapping is the worst outcome in the product. This is the same preference as decision 12 (undo over confirmation), applied at the scale where it matters most.

**Unimportable rows are skipped, not repaired.** They come back as a downloadable file to correct and re-import. Guessing a missing price is inventing data.

## 20. Settings saves per card, not per page

Each Settings section has its own save, and only the card you touched goes dirty — the save bar names it. One page-wide dirty state would mean a stray click in Appearance blocks a password change, and "Save settings" would hide which of five things actually changed.

**Statuses are user-editable but bounded.** Draft is built in. A status with orders on it cannot be deleted — reassign first. Renaming is free, because the name is a label and orders reference the status by id.

## 21. Dark mode is warm, and the sidebar does not change

**The decision.** A warm brown-black dark theme (`#1a1815` canvas), not a neutral near-black, with the greens lifted rather than darkened. The sidebar keeps `#14261c` in both themes.

**Why warm.** The light theme's identity is warmth — a greige canvas, deliberately not grey. A neutral dark theme would read as a different product with the same layout.

**Why the sidebar is unchanged.** It was already dark. Leaving it fixed gives both themes one shared anchor, and means the shell needs no theme work at all.

**Elevation reverses.** Light lifts a surface with shadow; dark lifts it by getting lighter. Cards sit lighter than the canvas, dialogs lighter again. Shadows stay for layering only, at about half the opacity.

**Rejected: deriving the dark palette by inverting lightness.** It produces a cold grey, muddy greens, and amber that reads brown. Each role was picked by hand and the map is the deliverable.

**Rejected: shipping dark mode later.** Retrofitting a theme means auditing every literal colour in the codebase. Build against the token layer from the start even if dark ships second.

## 22. On dark, image thumbnails get a border and 90% opacity

**The problem.** A receipt scan is mostly white paper. On a dark surface it becomes a bright rectangle with no discernible edge, and a strip of them glares.

**The decision.** Every image thumbnail keeps a `1px #463f37` border, and renders at 90% opacity in the dark theme. Full opacity returns on hover and in the viewer.

**Why opacity rather than a filter.** Dimming with brightness or contrast changes what the image looks like; opacity against a known surface reduces glare without misrepresenting the scan. And it is reversed exactly where the image is the subject.

**The viewer itself is dark in both themes.** Bright chrome around a bright scan leaves nothing to read the image edge against. Only the scrim changes.

## 23. Truncation is decided per role, once

**The decision.** Every text role has one overflow behaviour, fixed across the app: one line with ellipsis for row primaries and table cells, a two-line clamp for item names in cards and on mobile, and never for amounts, dates, validation messages or button labels.

**Why per role rather than per component.** Deciding at the component level means the same vendor name truncates differently in three places, and each new list re-litigates it.

**Amounts never truncate** because a clipped amount is a wrong amount. Validation messages never truncate because a clipped error is worse than no error. Those two are absolute.

**Two lines, never three.** A three-line clamp makes card heights uneven enough to break scanning, which is the only reason the card view exists.

**The mechanical part matters.** `min-width: 0` goes on the flex child — the wrapper holding the name and its meta line — not on the truncating text, which already escapes the automatic-minimum-size rule via `overflow: hidden`. This is the most common cause of a row overflowing on mobile, and it was caught twice during this work.

## 24. Self-host the font

Four weights of Poppins, self-hosted. The mockups call Google Fonts for convenience; the product should not need a third party to render a total. No italics, no 300 or 800 — a missing weight gets synthesised by the browser and the amounts stop lining up.

---

## Where the design is intentionally silent

Not oversights — decisions deferred because they need product input. They are listed as open questions in `BEHAVIOUR.md`.

- What happens to orders when a vendor or category is deleted.
- Whether an item line can carry its own category, differing from the order's.
- Whether drafts are a status or a separate state.
- Currency beyond DKK.
- Attachment size and count limits.
- Whether an import can update existing orders rather than only creating new ones.
- Whether a second currency is ever needed, and if so whether historical amounts convert.
