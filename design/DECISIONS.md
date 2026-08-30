# Decisions — Spendly order flows

Why the design is the way it is. Each entry names what was rejected and the reason. If you are about to change one of these, read its entry first — several look like tidier alternatives and were tried.

---

## 1. The order header sits in the right rail, not above the items

**The problem this solved.** On the edit screen the order header — vendor, date, status, category, reference, totals — sat above the item list and consumed most of the viewport. But nearly every edit session is adjusting item lines. You arrived at the screen and immediately scrolled past the part that filled it.

**The decision.** Details move to a `360px` right rail. The item list starts at the top of the main column and owns the full width.

**Rejected: keep the header on top but make it collapsible.** Still costs a row of chrome, still needs a decision every visit, and collapsed state either persists (so the details are invisible to a new user) or resets (so you collapse it every time). It also leaves the item list narrow for no gain.

**Rejected: header as a thin summary strip with a modal for editing.** Editing the vendor becomes a two-click detour, and the modal covers the items you were comparing against.

**The constraint that follows.** The rail must stay **shorter than the item list**. Once the rail becomes the longest thing on the page, the page scrolls for the rail's benefit and the original problem returns in a new form — which is exactly what happened when attachments and a notes block were first added to the rail. Attachments moved below the item list for this reason. Anything new in the rail has to displace something, not extend it.

## 2. The top shell holds no actions — not even global ones

Product constraint, not a preference: the shell is locked and shared. It carries search and nothing else — no page title either, since the sidebar names the area and a record identifies itself in its own content (9f). Everything the app can do lives inside a page or in the sidebar.

**The rule has no "global action" exception**, and the temptation to invent one is worth naming, because I did: Scan receipt and New order look like they belong to the app rather than to any page, so a shell button for them reads as reasonable. It isn't. The moment the shell accepts one action on that reasoning, the next candidate is also arguably global, and the constraint stops being checkable. Capture is reached from Home and the sidebar, which is where the app's own navigation already lives.

This is also why the edit screen has a sticky save bar at the bottom of its content column rather than Save in the top bar, and why bulk actions appear as a bar above the list.

**Search is not an action.** It sits in the top bar because it opens the ⌘K palette, which navigates. Nothing it does changes a record.

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

## 25. One combobox, two modes — never two components

**The decision.** Vendor, category, status and the icon picker are one component. What varies is whether the trigger accepts typing (`searchable`) and whether an `onCreate` handler is supplied.

**Why.** A dropdown is almost entirely keyboard behaviour, focus management and ARIA. A second implementation always looks fine and always misses half of it — the "simple" one is the one where arrow keys stop at a group header, or where blur silently selects whatever was highlighted.

**Rejected: a native select for the pick-only case.** Options carry colour dots, icon tiles and order counts, none of which a native `<option>` can render. But native keyboard behaviour is the specification the custom one must match.

**The traversal rule is the important one.** Grouping is visual. Arrow keys move through all options as one flat list, skipping headers. A developer who builds groups as nested lists gets traversal wrong by construction, so build the flat list first and render the group headers into it.

## 26. Nothing is selected by typing alone

No inline autocomplete into the field, no selection on blur, no "did you mean". The user commits with Enter or a click.

**Why.** The pickers here choose a vendor or a category that lands on a saved record. A silently-selected value is indistinguishable from a chosen one afterwards, and the mistake surfaces weeks later as a wrong total in Statistics. The cost is one keystroke; the alternative is unverifiable data.

## 27. 42px is the canonical control height

**The decision.** Every text-entry and select control is 42px tall, arrived at from `10px 12px` padding plus 14px text plus a 1px border. Controls that are not text — the stepper, the combobox trigger — get `box-sizing: border-box; height: 42px` explicitly.

**Why explicitly.** A control assembled from buttons has no vertical padding and comes out shorter, which is invisible until it sits beside a field. The mismatch was 1px and it was still visible; it also disagreed across two cards on the same page.

**Consequence.** Mobile takes padding to 12px, giving 46px, which clears the 44px touch minimum without changing type size. Don't scale the font to hit the target.

## 28. Buttons are levelled by consequence, not by attention

Primary is the one thing the view is for — one per view, so two primaries means neither is. **Destructive exists only inside a confirm dialog**, which makes a red button on a page a bug by definition: the page-level Delete is a secondary that opens the dialog.

**Disabled is a last resort.** Prefer letting the click happen and showing what is wrong. A disabled Save with no explanation is the most common dead end in a form.

**Anything that navigates is an anchor.** Styling a link as a button is fine; making a button navigate silently removes cmd-click and middle-click.

## 29. The palette is a rule, not a set of picks

**The decision.** Four hue families (green 150–158, amber 81–89, red 27–29, neutrals 91–101 at C ≤ 0.012), chroma falling as lightness rises, and a hard ceiling of C 0.12 that belongs to exactly one colour — the amber pace marker.

**Why it is written in OKLCH.** In hex these values look arbitrary and a developer picking a "similar" colour has nothing to aim at. In OKLCH the ramp is arithmetic, and an eighth colour can be derived rather than judged.

**Why the neutrals sit on the amber hue.** That near-zero chroma at H 91–101 is the entire warmth of the product. A true neutral grey anywhere in the app reads as dirty against it, which is the usual first symptom of a component imported from elsewhere.

**Why chroma must fall as lightness rises.** Holding chroma flat while lightening turns the pale end of the green ramp to mint. This is the single most common way a palette like this gets broken, and it happens whenever variants are generated by an HSL lightness function.

**Rejected: a free colour picker for users.** Every swatch has to survive four contexts (icon tile with white glyph, icon tile with dark ink, a 12px chart bar, a chip) and a second theme. A hex from a wheel satisfies none of them.

## 30. One fluid column per layout

**The decision.** Exactly one column is `1fr`. Rails, navs and facet columns are fixed pixel widths — 320/360/400 for right rails, 260 for facets, 208 for a page nav.

**Why.** With two fluid columns, nothing inside either has a predictable width. Truncation stops being predictable, fixed-width table columns can't be trusted, and the first 60-character vendor name reflows the page. One fluid column means every fixed element can be sized once and stay correct.

**Consequence for breakpoints.** Every breakpoint removes or relocates something; nothing is scaled down. A facet rail at 180px is unusable, so below 1280px it becomes a drawer rather than compressing. The same reasoning rejects a desktop table squeezed into a phone row.

## 31. Field width follows content, not importance

Full width when the content has no predictable length. A fraction when it is a bounded token — a date, a status, a number — where a wide box makes the value look lost.

**Thirds exist exactly once:** quantity × unit price = line total, because the row is an equation read left to right. Four in a row is never correct — each cell falls under 80px in a 360px rail.

**On mobile the test is: one calculation or one object, and no part under 100px.** Three fields at 375px is 105px each before gaps, which is the floor, and why nothing keeps thirds on a phone. The item equation survives as fixed + fluid, with the computed third becoming a **total line** rather than a field — a read-only box on a phone is a target that does nothing.

## 32. Files upload on drop, to staging — not on save

**The decision.** A dropped file uploads immediately and returns an id. The draft holds ids; saving the order commits them. Abandoned drafts leave orphans, cleaned after 24 hours.

**Rejected: upload on save.** Makes the draft self-contained, and makes Save a long silent operation that can fail — losing the whole form, not just the file. A receipt tracker used on a phone in a shop cannot have a Save that takes thirty seconds with no feedback.

**Rejected: attach straight to the record.** Gives an unsaved order server state, and writes to something the user may abandon. Staging gets the immediate upload without the premature write.

**The 24-hour window is load-bearing.** It is why removing a file from a draft can just drop the id, which is why Undo on a delete always works.

## 33. Replace is upload, swap, release — in that order

Never delete-then-upload. A failed upload in that order leaves the user with nothing, from an action that was never destructive. During the replace the tile shows the **old** image dimmed under the progress ring, so abandoning the page mid-replace keeps the original.

## 34. Attachments cannot be replaced; item photos can

**The decision.** The attachment strip offers add and delete only. Item photos offer replace.

**Why.** A receipt is evidence of one specific purchase. Swapping the file behind an unchanged filename and timestamp is how a record starts lying, and there is no way to tell afterwards. An item photo is illustration — replacing a bad photo of a chair with a better one changes nothing about the truth of the record.

## 35. The source menu adapts rather than branching

One menu component. Take a photo is **absent** where there is no camera, not disabled. Use the receipt appears only when the order has an attachment. With a single source available the menu is skipped entirely and the picker opens — so on desktop with no attachment, clicking an empty slot opens the file picker with no menu.

**One picker entry, never two.** "Choose a photo" and "Choose a document" are the same dialog on desktop, and an item photo accepts images only. The `accept` list decides whether the entry opens the photo library or the file browser. A second row for the same picker is padding.

## 36. Five surfaces, chosen by a fixed test — and no notifications

**The decision.** Inline, section notice, popover, dialog, toast. The choice is not a judgement call per screen: about one field → inline; already happened → toast if undoable, section notice if not; picking from a set → popover; would lose something → dialog. Earliest answer wins, because the order runs from least interrupting to most.

**Why write it down.** Every one of these was drawn somewhere in the set, and a developer choosing per screen will pick differently on each — usually reaching for a toast, which is the easiest to implement and the wrongest for errors, since it takes the description of the problem away with it.

**No notification centre.** A notification is for something that happened while you were not looking. In a single-user product where you caused every event, a bell with a history is a list of your own recent clicks. The three real background cases — a scan finishing after you navigated away, the monthly over-limit summary, a long import completing — already have homes in surfaces that exist.

## 37. The duplicate-file check is exact, and separate from duplicate-order detection

**The decision.** Hash every upload (SHA-256), look it up before reading, and interrupt with 3c on a match. Keep it entirely separate from the fuzzy vendor + date + total check.

**Why two mechanisms.** They answer different questions with different confidence. The hash answers "is this the same file" with certainty, on the file, before any work is done. The fuzzy check answers "is this probably the same purchase" with a guess, on a proposed order, after reading. Merging them produces a warning that is sometimes certain and sometimes not, which the user cannot calibrate against — and which would have to be either advisory (wasting the certainty) or blocking (wrong for the guess).

**Why it replaces the reading stage.** A dialog over the progress bar means the scan runs behind a question about whether it should. Asking after the proposal exists wastes the read and puts the user in review holding a decision that belonged earlier.

**Why the reading is cached, not just the hash.** Scanning is a paid per-call operation. Storing the scan output against the hash means every legitimate repeat — a repeated purchase on an identical receipt, a re-import after deleting the original order, one receipt covering two orders — is served without a second call. Detecting the duplicate and then re-scanning anyway would spend the money the check was meant to save.

**The cost stays out of the UI.** It is our bill, not the user's. A per-action price tag or a usage counter asks them to manage infrastructure economics they never agreed to, and they cannot act on the figure anyway. The design expresses the preference structurally instead: Use the reading is the primary button, Scan again is a secondary. Same outcome, no leaked internals.

**Why it never blocks.** Re-reading is rational when the cached reading was wrong and the model has improved since, so Scan again is always one click, never behind a confirm.

**It must not be labelled duplicate detection.** The hash misses a second photo of the same paper receipt and the same PDF re-saved by another reader. Calling it duplicate detection would teach the user to trust it for something it cannot do.

## 44. Responsive behaviour is specified as working CSS, not as prose

**The problem this solved.** The mockups are static canvases at one width. Rules written as paragraphs ("two columns become one below 900") leave every mechanical decision open: which column goes first, what the collapsed state contains, whether the threshold is viewport or container. Implementation from prose produced guesses.

**The decision.** One page (18a) carries genuinely responsive layouts with their CSS printed beside them, and it outranks the static mockups wherever they disagree about narrow behaviour.

## 45. Container queries, not media queries

**Why.** The same field grid appears in a 1fr main column, a 360px rail and a 400px panel. A viewport query gets all three wrong simultaneously — the rail's fields would collapse based on the window rather than the rail. Container queries make each instance correct independently, and make the components genuinely reusable across shapes.

**The two exceptions** are the shell breakpoint (sidebar → bottom tab bar), which is genuinely about the device, and print.

**Consequence for testing.** Test at container widths by resizing the wrapper in isolation. A component that only works at one page width passes a viewport test and fails in the rail.

## 46. Four thresholds, and a fifth is a design change

1280, 900, 640, plus the shell's own 640 viewport query. Named and closed on purpose: an open set of breakpoints is how intermediate widths end up unowned, which is exactly the cramped state that appears when the facet rail and the row table are chained to one threshold instead of two independent ones.

## 47. One row markup, two presentations

Desktop cells carry `.hide-m`, phone lines carry `.m2`, and both stay in the DOM. A separate mobile row component looks cleaner and drifts within a sprint — the phone version stops getting the field the desktop one gained.

## 32. Photos on cards sit on a tinted floor

**The problem.** With real data the card grid read as nine different collages. Product photography is mostly shot on white, so a bled image dissolved into the card and the strip became a hole; a dark shot beside it became a slab. One photo filled half the strip, three filled it unevenly, and no two cards shared a composition.

**The decision.** Every cell of the strip is `#f7f6f2` with 10px padding and the image *contained*, not bled. Cells are separated by a 1px `#eceae4` gutter. The whole strip carries `saturate(0.88)` — the light-theme tone treatment from 17b.

**Why the tint rather than a filter.** The variation is structural, not chromatic. Tinting gives every photo a visible edge whatever its own background, and gives an *empty* cell something to be: a one-photo card shows one image and two quiet panels instead of a lopsided band. The rhythm becomes identical across the grid because the cells are identical, not because the images were softened.

**Rejected: blur.** The photos exist so an order is recognisable at a glance. Blurring removes the only thing they contribute.

**Rejected: opacity fade.** A faded control reads as disabled, and these are not disabled — they are the content.

**Rejected: `object-fit: cover`.** Fills every cell, so no gaps, but it crops the product and a white-background shot is still a white block. It solves the shape problem and leaves the dissolving problem.

**Same family as two rules already in the set.** 12a keeps a 1px border on every thumbnail on dark; 15a gives every overlay on a photo its own shadow. All three say the same thing: the lightness behind user-supplied imagery is never knowable, so anything that must read against it carries its own edge.

## 32. A date preset is a period, not a pair of dates

**The decision.** The four named presets — this week, month, quarter, year — are stored as a period token and resolved when the query runs. Only `Custom…` stores absolute dates.

**Why.** Saved views are the reason. A view named "This quarter" that stored `2026-07-01 → 2026-09-30` at the moment it was saved is silently wrong from October onwards: it still says "This quarter", still appears in the sidebar with a count, and the count is for last quarter. Nothing in the interface can show that, because the view's name and its stored value no longer agree and only one of them is visible.

**Rejected: resolving at save time and re-resolving on edit.** It works until someone saves a view and never opens it again, which is the normal case for a view.

**Consequence.** "30 days" was removed. A rolling window is a genuinely different concept from a calendar period, nothing in the design asked for one, and offering both invites the question of which a saved view stores.

## 33. Photos in the card grid are a warm monochrome

**The decision.** `grayscale(1) sepia(0.42) saturate(1.15)` on every photo in the order card grid. Nowhere else.

**The problem.** With photos live, nine cards in a grid carried nine unrelated palettes — a blue cable, gold fittings, white bottles — and the grid read as restless before any of the content had been looked at. The first attempt was a light desaturation (`saturate(0.88)`), which softened nothing: the hues were still nine hues.

**Why sepia rather than grey.** Full grayscale is neutral in a grey interface. In this one it is a foreign temperature, because the entire neutral ramp sits on the amber hue at near-zero chroma (14c) — a grey photo looks as wrong here as a grey surface does. The sepia lands photos in H 75–85, inside that same band, so a photo is neutral *in this palette*.

**Rejected: grey at rest, colour on hover.** The calmest grid available, and useless on touch, where nothing hovers.

**Rejected: partial grayscale.** `grayscale(0.55)` keeps a hint of the original hue, which means it keeps a hint of nine different hues. Halfway solves nothing.

**The cost, accepted.** Colour is a genuine recognition cue and monochrome removes it — a walnut chair and a black one become the same object. Acceptable because a card already names the vendor, the item count and the category, and a photo's job in a *list* is coarse: this is the order with the tall thing in it. That survives monochrome.

**Scope is the constraint that makes it safe.** The viewer, the item photo on an order, and the receipt preview are never filtered. If the treatment ever escapes the browsing grid, the decision is wrong — a user checking what they actually bought must see the real thing.

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

---

## Long breakdowns expand in place, they do not become their own page

A year can hold 200 vendors and 34 categories. Every breakdown card rests at its top 8 with one **Other N** row for the remainder, and a footer link expands all rows inside the card's own height-capped scroll region. Charts cap at 10 series plus an Other bar. The order table loads 25 at a time.

**Rejected:** a full-page ranked list behind the link — it would need its own period control, its own crumb state and its own back behaviour, duplicating the page the user just left. **Rejected:** a fixed-height scroller holding all 200 rows at rest — the top of a breakdown is the answer; 200 rows makes the card a place to hunt rather than something to read. **Rejected:** truncating without an Other row — every percentage on the card would then be wrong against the KPI above it. **Rejected:** search and sort inside breakdown cards — the card is ranked by its own measure, and finding a named vendor belongs to the vendor list. **Rejected:** page numbers on the drill-down table — it is evidence for the numbers above it, not a list to navigate.

---

## Expenses, refunds and net are three values of one control, not a toggle

The statistics page carries one single-choice menu: **Expenses only** (default), **Refunds only**, **Net of refunds**. The control always reads the current choice.

**Rejected:** a two-state toggle — it cannot express net, which is the figure a user comparing years actually wants. **Rejected:** checkboxes over expense and refund — two of three states then mean the same thing as net, and one state means nothing. **Rejected:** relabelling the KPIs under refunds ("Total refunded") — two screenshots of the page would no longer be comparable. **Rejected:** treating the choice as a crumb — it is a lens on the data, not a step in the drill path.
