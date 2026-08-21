# Handoff: Spendly order flows

## Overview

Spendly is personal receipt and order tracking for a single user: capture a receipt, keep the order and its item lines straight, and see what it added up to per month, vendor and category.

This package covers the whole surface that work touched: the app shell, the home page, the order list, order read and edit, creating an order from a scanned receipt, statistics with drill-down, the vendor and category library, the states and confirmations that sit across all of it, and the phone layouts.

The change that started it: on the order edit screen the order header used to sit above the item list and eat most of the viewport, while the actual work is nearly always adjusting item lines. The header moved into a right rail, so the item list owns the width and starts near the top of the page. Everything else follows that same two-column shape.

Target repo: `mm98/Spendly`, branch `main`. The mockups live at `design/` there. Existing React source referenced through this document is under `react/src`.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended layout, hierarchy and behaviour. They are not production code and should not be copied into the app.

They are authored as "design components": each `.dc.html` file is a static page with everything styled inline, and `support.js` (included) is the tiny runtime that renders them. `support.js` is a preview harness only — it has no place in the product.

The task is to **recreate these layouts in the existing React codebase** (`react/src`), using its established component set, routing, styling approach and data layer. Where this document names an exact hex value or pixel size, it is describing the intent; where the codebase already has an equivalent token or component, prefer the codebase's version and keep it consistent.

**How to read a mockup:** open the file in a browser. Each screen is one `<section>` with a green id badge in its top-left (`1a`, `2b`, …). Ids are unique across the whole bundle and are the vocabulary used below and in review. `index.html` is a linked overview of all of them, grouped by area.

Several screens show **states side by side that are never on screen at once** (empty next to loaded, or three stages of a scan). The heading above each column says which state it is. Do not build those as a row of panels.

## Fidelity

**High-fidelity.** Colours, typography, spacing, radii and copy are final and intentional. Recreate the UI closely, using the codebase's existing primitives where they match. The layouts, the numbers shown, and the copy are the specification; the exact pixel values are given below so nothing has to be measured off a screenshot.

Two caveats:
- All data is illustrative. Amounts are Danish kroner formatted `486.320 kr.` (period as thousands separator, `kr.` suffix). Keep that format; the numbers themselves come from the API.
- Icons in the mockups are hand-drawn inline SVG on a 16×16 viewBox, stroke-only, `stroke-width` 1.3–1.6, round caps and joins. Substitute the codebase's icon set at the same optical weight rather than lifting the SVG paths.

---

## Design tokens

### Colour

Neutrals — a warm greige family, not grey. This is the surface identity of the app.

| Value | Use |
| --- | --- |
| `#eceae4` | App background (page canvas behind cards) |
| `#f2f1eb` | Secondary surface, table header strips |
| `#f7f6f2` | Tertiary fill: quiet rows, inert chips, skeleton bases |
| `#f0efe9` | Hover fill on rows and list items |
| `#ffffff` | Card and panel surface |
| `#e6e4dc` | Card border, standard 1px hairline |
| `#dedcd4` | Input border, divider inside cards |
| `#dcdad2` / `#d6d4ca` | Heavier divider, input border on hover |
| `#c3c1b8` | Disabled border, drag-handle glyph |
| `#1b1a17` | Primary text (headings, amounts) |
| `#3d3c36` | Body text, field labels |
| `#57564f` | Secondary text, descriptions |
| `#6b6a63` | Small caps labels, meta |
| `#8b8a82` | Muted / hint text, placeholders |
| `#b3b1a9` | Least prominent chart series, inactive icons |

Green — brand and action.

| Value | Use |
| --- | --- |
| `#1d4d33` | Primary: buttons, badges, active state, first chart series, links |
| `#2f7a51` | Link hover, primary button hover |
| `#4b7a5e` / `#4f7f63` | Second chart series, avatar fill |
| `#8caf97` | Third chart series |
| `#c6d6c9` | Fourth chart series |
| `#dfe6e0` | Fifth / "other" series, quiet green fill |
| `#eef1ee` | Chart track, progress bar background |
| `#e7efe8` | Selected-row tint, success surface |
| `#a8c6b2` / `#cbd8cd` / `#cfd8d1` | Green mid-tones for sparklines and small fills |
| `#1f3d2c` | Sidebar active row |
| `#14261c` | Sidebar background (dark green, not black) |
| `#c3d2c8` | Sidebar idle text |
| `#a9bdb1` | Sidebar meta text |
| `#7d9186` | Sidebar section label |

Amber — informational warning. Used for anything about a monthly limit. **Amber never blocks.**

| Value | Use |
| --- | --- |
| `#fdf8ee` | Surface |
| `#e8dfcb` | Border |
| `#e2d3ae` / `#d3b98a` | Fill for badges and bars |
| `#b58a2b` | Line and marker (the pace marker on progress bars) |
| `#7a5c23` | Text and icon |
| `#6b5424` | Text on amber fill |

Red — error and destructive. Used for validation that stops a save, and for delete.

| Value | Use |
| --- | --- |
| `#fdf6f5` | Surface |
| `#f0e6e4` / `#e2d3d1` | Border |
| `#c98a80` | Fill accent |
| `#8a4a41` | Text and icon |

### Typography

`Poppins` (weights 400, 500, 600, 700), falling back to `system-ui, sans-serif`. One family throughout; hierarchy comes from size and weight.

| Role | Size / weight | Notes |
| --- | --- | --- |
| Page title | 34–36px / 600 | line-height 1.15, `text-wrap: pretty` |
| Section heading | 20px / 600 | screen titles in the mockups |
| Card heading | 15–16px / 600 | |
| Large amount / KPI | 20–28px / 700 | tabular feel; never below 20px |
| Body | 14px / 400–600 | 600 for row primaries (vendor, item name) |
| Secondary | 13px / 400 | descriptions, table cells, colour `#57564f` |
| Meta / label | 12px / 400–600 | field labels are 12px/600 `#3d3c36` |
| Small caps label | 11px / 400, `letter-spacing: 0.12em` | uppercase, colour `#6b6a63` — the card eyebrow used everywhere |
| Sidebar section label | 10px / 400, `letter-spacing: 0.14em` | uppercase, `#7d9186` |
| Micro hint | 11px / 400 | `#8b8a82` |

12px and 13px carry most of the interface; 11px is reserved for uppercase labels and hints. Nothing sits below 9px (used only for the tiny status dot label).

### Spacing

4px base. In practice: `4, 5, 6, 8, 10, 11, 12, 14, 16, 18, 20, 24, 32, 40, 48`.

- Card padding: `16px` (compact), `18px` (standard), `20–24px` (feature cards).
- Gap inside a card between stacked blocks: `12–14px`. Between label and value: `2–5px`.
- Gap between cards in a column: `14px`. Between columns: `24px` (in-app), `40px` (mockup comparison).
- Page padding: `48px` desktop, `20px` mobile.
- Row vertical padding in lists: `12–14px`.

### Radius

| Value | Use |
| --- | --- |
| `12px` | Cards and panels |
| `14px` | Feature / modal surfaces |
| `9px` | Inputs, buttons, list rows, sidebar rows |
| `10–11px` | Nested containers, icon tiles ≥40px |
| `8px` | Small buttons, icon tiles, picker cells |
| `6–7px` | Badges, small icon tiles |
| `4–5px` | Progress bars, chart bars, colour dots |
| `999px` | Pills and chips |
| `50%` | Avatars, count bubbles, status dots |

### Shadow

Used sparingly — flat surfaces with hairline borders are the default. Shadow means "floating above".

| Value | Use |
| --- | --- |
| `0 4px 14px rgba(27, 26, 23, 0.08)` | Raised card, sticky bar |
| `0 6px 16px rgba(27, 26, 23, 0.08)` | Dropdown, popover |
| `0 12px 28px rgba(27, 26, 23, 0.16)` | Dialog |
| `0 14px 32px rgba(27, 26, 23, 0.14)` | Toast, command palette |
| `0 20px 44px rgba(27, 26, 23, 0.22)` | Mobile sheet |
| `0 8px 22px rgba(20, 38, 28, 0.32)` | Primary floating action (green tint) |

### Motion

- Hover / colour / border transitions: `120ms ease`.
- Enter (toast, sheet, dropdown): `160–200ms ease-out`, translate 8–12px plus opacity.
- Drag reorder: `150ms ease` on transform; the dragged row lifts with the raised-card shadow and drops the shadow on release.
- Skeleton shimmer: 1.4s linear infinite, a light band moving left to right over `#f7f6f2`.
- Respect `prefers-reduced-motion`: keep opacity changes, drop translation and shimmer.

---

## Global rules

These hold on every screen and are the constraints behind several layout decisions. Breaking one is a design change, not an implementation detail.

1. **The top shell is locked.** No page actions may be placed in the top bar. Every page's actions live inside the page. This is a hard constraint from the existing product.
2. **A monthly limit never blocks a save.** Red blocks, amber informs. Exceeding a category limit is a fact about the month, not a validation error.
3. **Nothing saves by itself.** Scans propose values, they never overwrite silently. A duplicated order opens unsaved and can be abandoned.
4. **Numbers answer the current filter.** Totals and counts in a filtered list describe what is on screen, not the whole account.
5. **Single user, personal receipts.** No item catalogue, no shared editing, no permissions. A conflict means two browser tabs, not two people.

---

## Screens

### 9a / 9b — Navigation shell
File: `Navigation shell.dc.html` · Code: `App.jsx`, `components/Nav.jsx`, `components/Shell.jsx`

**Purpose:** the frame every page renders inside.

**Layout:** fixed left sidebar `248px`, content area fills the rest with `48px` page padding. Sidebar background `#14261c`, `20px 14px` padding, column with `4px` between rows.

**Sidebar rows:** `9px 10px` padding, radius `9px`, icon 17px then 14px label, `11px` gap. Idle text `#c3d2c8`; hover fill `rgba(255,255,255,0.05)`; active is fill `#1f3d2c` with `#fff` text. A count sits right-aligned in each row at 11px `#a9bdb1`.

**Order:** Home, then section label `ORDERS` (10px, `0.14em`, `#7d9186`, padding `16px 8px 4px`) with Orders / New order, then `LIBRARY` with Statistics / Vendors / Categories. Settings sits below a spacer, then the account block: fill `#1f3d2c`, radius `9px`, `10px` padding, 28px circular avatar `#4f7f63` with white 12px/700 initials, name 13px/600 `#fff`, org 11px `#a9bdb1`, chevron right.

**Collapsed rail (in 9b):** `68px` wide, icons only, centred, labels appear as tooltips on hover. Toggle persists per user.

**Command palette (in 9b):** ⌘K / Ctrl-K. Centred overlay `560px` wide, radius `14px`, shadow `0 14px 32px rgba(27,26,23,0.14)`, scrim `rgba(27,26,23,0.35)`. A search field at top, then grouped results — Orders, Vendors, Actions — each row showing icon, primary label 14px, secondary meta 12px `#8b8a82`. Arrow keys move, Enter opens, Esc closes.

**Top bar:** locked. Breadcrumb and page title only.

---

### 10a — Home
File: `Home.dc.html` · Code: new page (`pages/Home.jsx`)

**Purpose:** the start page. Answers "where am I this month, and what needs me?" and offers capture as the primary action.

**Layout:** shell sidebar, then content as a two-column grid — main `1fr`, right rail `320px`, `24px` gap.

**Main column, top to bottom:**
1. **Greeting + month.** Title 34px/600, subline 14px `#57564f`.
2. **This month against the limits.** White card, radius `12px`, `20px` padding. Big total 28px/700, then "of X kr. in limits" 13px `#8b8a82`. Progress bar height `10px`, radius `5px`, track `#eef1ee`, fill `#1d4d33`, plus a 2px `#b58a2b` pace marker positioned at `day/daysInMonth`, extending 2px beyond the bar top and bottom. Caption under it explains the marker: 11px `#8b8a82` with a 2px amber swatch inline.
3. **Capture a receipt.** The prominent action: a dashed drop zone (`1px dashed #dedcd4`, radius `12px`, `24px` padding, fill `#f7f6f2`) with an upload icon, "Drop a receipt, or take a photo", and a primary button. Drag-over state: border `#1d4d33`, fill `#e7efe8`.
4. **Recent orders.** Compact five-row list; each row vendor 14px/600, date and item count 12px `#8b8a82`, amount right-aligned 14px/600, status pill. Row hover `#f0efe9`. Footer link "All orders".

**Right rail:**
- **Needs a look.** The same alert list pattern as 5c: rows with a count bubble, a short phrase, and a chevron. Amber-surfaced when it is a limit or a duplicate, neutral `#f7f6f2` otherwise. Each row navigates to the filtered list that contains those records.
- **Top categories this month.** Category rows with the icon tile, name, amount, and a bar showing share of its limit.

---

### 1a–1d — Order read, edit, and item editing
File: `Order editing layouts.dc.html` · Code: `pages/OrderDetail.jsx`, `pages/EditOrder.jsx`, `components/ItemLines.jsx`, `components/Reorder.jsx`, `components/FileInput.jsx`, `components/FormPage.jsx`

This is the core of the handoff.

#### Shared two-column shape

Main column `1fr` (min `560px`), right rail `360px`, `24px` gap, aligned to top. The item list begins at the top of the main column — no header block above it. The rail scrolls with the page; it is deliberately kept shorter than the item list so the two do not fight (this was an explicit revision: the rail must not become the longest thing on the page).

**Rail contents, in order:** order details (vendor, order date, status, category, reference), then totals, then notes. Each is its own white card, radius `12px`, `16px` padding, `14px` between cards. Each card opens with an 11px uppercase `0.12em` `#6b6a63` label.

**Totals card:** label/value rows 13px, then a `1px #dedcd4` divider, then the grand total at 20px/700.

#### 1a — Read view

Values render as text, not inputs. Item rows are read-only: thumbnail, name, quantity × unit price, line total. The primary action is Edit; secondary actions Duplicate and Delete sit next to it, inside the page (never in the top bar).

Attachments sit **below** the item list as a horizontal strip of tiles: `96×96`, radius `10px`, `1px solid #e6e4dc`. Images show a cropped thumbnail; PDFs show a rendered first-page thumb with a small `PDF` tag bottom-left (11px, white on `rgba(27,26,23,0.6)`). Filename 11px truncated under each tile. Clicking opens a lightbox.

#### 1b — Editing an item in place

Selecting a row expands it into an editing form **within the list**, pushing the rows below down. It does not open a dialog and does not take over the rail.

Expanded row: fill `#fff`, `1px solid #1d4d33`, radius `10px`, `14px` padding. Contents: the item photo at `80×80` (radius `9px`) with an overlay control on hover, then fields — name (full width), then a `1fr 1fr 1fr` grid of quantity, unit price and line total, where line total is computed and read-only. Below: Cancel (ghost) and Save item (primary) right-aligned, `8px` gap. Esc cancels, ⌘/Ctrl-Enter saves.

**The item photo controls** (the answer to "how do I add, replace or delete a photo"): hovering the 80×80 thumb dims it to `rgba(27,26,23,0.45)` and reveals two 28px round icon buttons — replace (upload glyph) and delete (trash glyph). With no photo the slot is a dashed `#dedcd4` square with a small camera glyph and the label "Add photo"; it accepts drop as well as click. Deleting asks for confirmation only if the photo came from a scan.

**Discoverability of editing** (an explicit revision): a row must never look inert. Each row shows, on hover, a `#f0efe9` fill, a pencil affordance at its right edge, and `cursor: pointer`. On touch, the pencil is always visible. The list header carries a one-line hint: "Tap a line to edit it."

#### 1c — Edit screen with reorder

Same two-column shape with fields in the rail as inputs (`1px solid #dedcd4`, radius `9px`, `10px 12px`, 14px text; focus `1px solid #1d4d33` plus a 3px `rgba(29,77,51,0.12)` ring).

**Reordering item lines.** Two mechanisms, both required:
- **Drag.** A 6-dot handle (`#c3c1b8`, 16px) at the left of each row, `cursor: grab`. Dragging lifts the row with shadow `0 4px 14px rgba(27,26,23,0.08)` and shows a 2px `#1d4d33` insertion line at the drop position; other rows shift with `150ms ease`.
- **Keyboard / buttons.** Up and down icon buttons in the row's action cluster, disabled at the ends. These are what makes reorder usable on touch and with a keyboard; the handle alone is not enough.

Order is explicit and persisted as a position field; it is not derived from name or amount.

**Item action buttons** are 28px square icon buttons, radius `8px`, transparent until row hover, then `#f7f6f2` with `#3d3c36` glyphs at `stroke-width: 1.5`. Cluster: move up (chevron up), move down (chevron down), edit (pencil), duplicate (two overlapping sheets), delete (trash, hover text `#8a4a41`, hover fill `#fdf6f5`). Each carries an `aria-label` and a tooltip; icon-only is intentional to keep the row short, so the labels matter.

**Sticky save bar** at the bottom of the main column while dirty: white, top border `#e6e4dc`, shadow `0 4px 14px rgba(27,26,23,0.08)`, "Unsaved changes" 13px `#57564f` left, Discard and Save right.

#### 1d — Mobile edit and the item sheet

See "Mobile" below; 1d holds the phone version of these two screens.

---

### 2a–2c — Order list
File: `Order list.dc.html` · Code: `pages/Orders.jsx`, `pages/AllOrders.jsx`, `components/Rows.jsx`, `components/ListState.jsx`, `components/Chip.jsx`, `components/Pager.jsx`, `components/Pickers.jsx`

**Purpose:** find orders. Full-text search plus facets, in rows or cards.

**Layout:** facet rail `260px` on the left of the content area, list fills the rest, `24px` gap.

**Facet rail:** one white card per facet group — Status, Category, Vendor, Date, Amount. Group label 11px uppercase `0.12em`. Each facet row is a checkbox, a 13px label, and a right-aligned count 12px `#8b8a82`. Groups with many values show the top 6 plus "Show all (24)". Counts update with the other facets applied.

**Above the list:** a search field (full width of the list column, radius `9px`, leading search glyph, placeholder "Search vendor, item, reference or note"), then the active filter chips row: pills radius `999px`, `#e7efe8` fill, `#1d4d33` text, 12px, each with an × ; plus "Clear all" as a text button. Right of that: result count ("128 orders · 486.320 kr."), sort select, and the rows/cards toggle — a segmented control, radius `9px`, `1px solid #dedcd4`, active segment `#1d4d33` on white.

**Rows view (2b):** header strip `#f2f1eb`, 11px uppercase labels. Column order and alignment, left to right: checkbox `36px`; **vendor `200px` fixed**; date `110px`; items (count) `72px`; category (chip) `160px`; status (pill) `120px`; amount right-aligned `120px`; actions `88px`. Row padding `12px 14px`, hairline `#e6e4dc` between rows, hover `#f0efe9`.

The fixed vendor column is a deliberate correction: an earlier version placed the vendor inside a variable-height stack with the item preview, so it landed at a different vertical position on every row. Vendor is first, one line, truncated with ellipsis, and always at the same x and y within its row. Any item preview text sits on a second line under it and never displaces it.

**Cards view (2c):** grid, `minmax(280px, 1fr)`, `16px` gap. Card radius `12px`, `1px solid #e6e4dc`, `16px` padding: vendor 15px/600 top-left, status pill top-right, date and item count 12px `#8b8a82`, then up to three item thumbnails at 44px, then the amount 20px/700 and the category chip on the footer line.

**Bulk actions (in 2a):** selecting rows reveals a bar above the list — "4 selected", then Set status and Add category as buttons, then Clear. Both open a small popover anchored to the button: Set status is a radio list of the five statuses; Add category is a searchable list with the category icon tile and name, multi-select, and a "Create category" row at the bottom. Applying shows the count in a toast with Undo.

**Pagination:** page size select and prev/next at the bottom; the total reflects the filter.

---

### 3a — Creating an order from a receipt
File: `Order create.dc.html` · Code: `pages/NewOrder.jsx`, `pages/Scan.jsx`, `components/AiCard.jsx`, `components/fileKinds.js`

**Purpose:** get a receipt into the system with as little typing as possible. Four stages, shown side by side in the mockup but sequential in the app.

1. **Start.** Two paths on one screen: the drop zone (dashed `#dedcd4`, radius `12px`, upload glyph, "Drop a receipt — PDF, JPG or PNG", plus "Take a photo" on mobile), and below a divider, "Or enter it manually" as a secondary button. Accepts PDF, JPG, PNG, HEIC; states the size limit.
2. **Reading.** The uploaded file's thumbnail on the left, and on the right a progress card: an animated indeterminate bar, the stage in words ("Reading line items…"), and Cancel. Nothing is written yet.
3. **Check what was read.** The heart of the flow. Two panes: the receipt preview left (zoomable, page thumbs for multi-page PDFs), the proposed order right. Every proposed value carries a confidence affordance — fields read cleanly look like normal filled fields; uncertain fields get an amber left edge (`2px #b58a2b`) and a "check this" hint. Item lines list with the read values as editable inputs; unmatched vendor or category shows an inline picker with a "Create X" option. A summary line reconciles the totals: if the item lines do not add to the receipt total, that difference is stated plainly in amber, with a "the receipt says" figure beside the computed one. Buttons: Discard, Save as draft, Create order.
4. **Created.** Confirmation with the order summary, the attachment kept on the order, and two links: open the order, or scan another.

The scan **proposes**; nothing is stored until Create order. The uploaded file always ends up attached to the resulting order.

Scan failure is in 6e: the file is kept, the message says what failed, and the primary action is "Enter it manually" with the file already attached — never a dead end.

---

### 4a — Statistics
File: `Order statistics.dc.html` · Code: `pages/Stats.jsx`, `components/Chart.jsx`, `components/Viz.jsx`, `components/DashboardCards.jsx`

**Purpose:** the one place for aggregate numbers, with a drill path down to the orders behind any slice.

**Layout:** a period control at the top (year / month / custom range, plus a compare-to-previous toggle), then the drill breadcrumb, then a card grid. Cards are white, radius `12px`, `18px` padding, in a 12-column grid; every card spans a whole number of columns so rows always close — no half-filled row and no gap in the middle (this was a fix; verify at 1280, 1440 and 1920).

**Cards:**
- **KPI strip:** four cards — total spend, order count, average order, saved vs retail. Label 11px uppercase, value 28px/700, delta 12px with an up/down glyph (green `#1d4d33` for down on spend, amber for up).
- **Spend by month:** column chart. Bars `#1d4d33`, radius `4px` top corners, track `#eef1ee`. Axis labels 11px `#8b8a82`. Hover tooltip gives the month, total and order count.
- **By category:** horizontal bars using the five-step green ramp (`#1d4d33`, `#4f7f63`, `#8caf97`, `#c6d6c9`, `#dfe6e0`) with everything beyond the top five collapsed into "Other N categories" at `#dfe6e0`. Each row carries the category icon tile.
- **By status:** the same bar pattern, five statuses.
- **Monthly limits:** one row per category with a limit — name, spent, limit, and a bar with the `#b58a2b` pace marker. Over-limit rows fill amber `#e2d3ae` rather than red.
- **Vendor table:** top vendors with spend, orders, average, and a 60×20 sparkline.

**Drill-down:** clicking any bar, slice or table row pushes a crumb onto the breadcrumb (`2026 ▸ Decor ▸ August`) and re-filters every card on the page to that slice. The final level is a list of the matching orders, from which a row opens the order. Crumbs are individually removable, and the state is URL-encoded so a drilled view can be linked.

**Statistics is the only place with charts.** Vendor and category panels answer the narrow, single-record question locally (see 5a/5b); each carries a "See in Statistics" link that opens this page with the corresponding crumb already applied. Do not duplicate chart cards into those pages — one source, so the numbers cannot disagree.

---

### 5a–5c — Vendors and categories
File: `Vendors and categories.dc.html` · Code: `pages/Vendors.jsx`, `pages/Categories.jsx`, `pages/CategoryForm.jsx`

**Purpose:** the library behind orders. Two lists that share one layout: list left, panel right (`400px`).

#### 5a — Vendors

List rows: name 14px/600, order count and total 12px `#8b8a82`, chevron. Search above.

Panel for a selected vendor: the vendor form (name, VAT number, website, address, default category, notes), then a small stats card — spend, orders, average order, saved vs retail as a 2×2 grid of 20px/700 values — plus a sparkline and the "See in Statistics" link. No charts.

**Merge** handles scan duplicates: the panel offers "Merge into…", which opens a picker of similar vendors, then a comparison showing which field wins per row and the resulting order count. It is destructive and confirmed explicitly, naming the number of orders that will move.

#### 5b — Categories

List rows: a `26×26` icon tile (radius `8px`) filled with the category colour, glyph in white — or `#3d3c36` when the colour is light — then the name 14px/600, this month's spend, and its limit. The tile replaced a plain colour dot so a category is recognisable at a glance.

Panel: the category form.
- **Name.** Text field with the current icon tile inline at its left (22px, radius `7px`).
- **Icon.** The current icon at 44px (radius `11px`, category colour), its name, and a Change control. Open, it is a picker: a search field, then an 8-column grid of `aspect-ratio: 1` cells (radius `8px`, `#f7f6f2`, selected cell `#eef1ee` with a 2px `#1d4d33` outline offset 1px), ending in a "+64" overflow cell. Icons come from a fixed set; the picker never accepts uploads.
- **Colour.** A row of swatches from the green ramp plus neutrals.
- **Monthly limit.** A single amount that applies to every month — it is not per-month data. Empty means no limit. Below the field: this month's spend against it, with the pace marker bar.
- Icon and colour always render together, so the same mark identifies the category in chips, facets and charts.

#### 5c — Roll-up panel (nothing selected)

The panel's default state, matching the detail panel's width and card rhythm but describing the whole list: totals for all vendors (spend, vendors used, saved, average order), a "where the money goes" top-five bar list with "Other N vendors", and a "Needs a look" list — possible scan duplicates, vendors with no orders in 12 months, missing VAT — each an amber or neutral row with a count bubble and a chevron into the filtered list. For categories: the month's spend against the sum of all limits, with the pace marker. Footer hint: "Select a vendor to edit its details."

---

### 8a / 8b — Duplicating an order, and budget alerts
File: `Duplicate and alerts.dc.html` · Code: `pages/EditOrder.jsx`, `pages/CategoryForm.jsx`

**8a — Duplicate.** "Duplicate" on an order opens a new **unsaved** order prefilled from the original, on the edit screen, with a notice at the top: 13px on `#e7efe8`, radius `9px`, naming the source order and offering "Discard". What carries over is explicit and stated in the notice: vendor, category, reference, notes and all item lines with quantities and prices. What does not: the order date (set to today), the status (reset to the first status), and attachments — a receipt belongs to the order it came from. Leaving without saving discards it, with a confirm.

**8b — Budget alerts.** The same fact surfaced in three places, all amber, none blocking:
1. **As you cross it, while editing.** A notice appears above the sticky save bar the moment the running total pushes the order's category over its monthly limit: "This puts Decor 1.240 kr. over its 6.000 kr. limit for August." Save is unaffected.
2. **On the category.** In the category panel (5b) and its list row, the limit bar fills amber `#e2d3ae` past 100% and the row gains a small amber badge.
3. **Once a month.** A dismissible summary on Home (10a) listing the categories that finished the previous month over their limit, with each row linking to that month's filtered order list.

Wording is factual — the amount over, the limit, the month. No exclamation, no red, no "warning".

---

### 6a–6e — States and confirmations
File: `States and confirmations.dc.html` · Code: `components/ListState.jsx`, `components/Dialog.jsx`, `components/Toast.jsx`

**6a — Empty states.** Distinguish three: never had any (a real invitation — headline, one line of explanation, primary action, e.g. "No orders yet" / "Scan a receipt"), filtered to nothing ("No orders match these filters" plus "Clear filters"), and search found nothing (echo the query, offer to clear). Centred in the content area, `48px` vertical padding, headline 16px/600, body 13px `#57564f`, no illustration.

**6b — Loading.** Skeletons that match the shape of what is coming: `#f7f6f2` blocks at the real row heights with the shimmer, never a spinner in place of a layout. Row lists show six skeleton rows; cards show three skeleton cards; the panel shows label/value pairs.

**6c — Validation.** Field-level, on blur and on submit. Error field: border `#c98a80`, message below at 12px `#8a4a41` with a small alert glyph. A form-level summary appears above the actions when submit fails, listing the fields as links. Rules implemented: vendor required; order date required and not in the future; at least one item line; quantity > 0; unit price ≥ 0; amounts max two decimals; reference max 64 chars; category limit must be a positive amount or empty. Crossing a monthly limit is **not** an error — it renders as the amber notice from 8b and the save proceeds.

**6d — Confirmations and toasts.** Destructive actions use a dialog: `440px`, radius `14px`, shadow `0 12px 28px rgba(27,26,23,0.16)`, scrim `rgba(27,26,23,0.35)`. Title 16px/600 states the consequence in the user's terms ("Delete this order?"), body 13px names what is lost including attachments, then Cancel (ghost) and the destructive primary (`#8a4a41` fill). Non-destructive success uses a toast instead: bottom-centre, dark `#1b1a17`, white 13px text, radius `9px`, shadow `0 14px 32px rgba(27,26,23,0.14)`, an Undo text button in `#a8c6b2`, auto-dismiss 6s, paused on hover. Undo is the preferred pattern; reserve dialogs for what cannot be undone.

**6e — Scan failure.** As described in 3a: keep the file, say what failed, offer manual entry with the file attached.

---

### 7a / 1d — Mobile
Files: `Mobile screens.dc.html`, `Order editing layouts.dc.html` (1d) · Same pages at mobile breakpoints

Breakpoint: below `900px` the two columns stack; below `640px` the phone layout applies. Page padding `20px`. **Minimum touch target 44px** everywhere.

**Orders list.** Rows become cards. This was reworked twice because the first version crammed every desktop column into a phone row. What a mobile row shows: vendor 15px/600 on line one with the amount right-aligned at 15px/700; date, item count and status on line two at 12px `#8b8a82`; the category chip on line three. Nothing else. Generous `14px` padding, `12px` between cards. The remaining fields belong to the detail view, not the row.

**Filters** move into a bottom sheet: radius `14px` on the top corners, shadow `0 20px 44px rgba(27,26,23,0.22)`, a drag handle, the facet groups as expandable sections, a sticky "Show 128 orders" primary at the bottom. Entry `200ms ease-out`.

**Order edit (1d).** The details rail becomes a collapsed section above the items, closed by default and labelled with a summary line ("Indbo Møbler · 12 Aug · Received") — the same intent as the desktop change, applied to a single column. Items are full-width rows with the pencil visible (no hover on touch).

**Item editing (1d)** uses a bottom sheet rather than an inline expansion: the photo at 80×80 with its replace/delete controls, the fields stacked full-width, and Cancel / Save pinned to the bottom of the sheet.

**Capture** gets a floating action button, 56px, `#1d4d33`, shadow `0 8px 22px rgba(20,38,28,0.32)`, bottom-right above the tab bar — the phone is the camera, so this is the one action that is always reachable.

**Statistics** goes to one column, charts full-width; the vendor table becomes a stacked list. Drill-down works the same way, with the breadcrumb wrapping.

---

## Interactions summary

| Trigger | Result |
| --- | --- |
| Click an item row | Expands into inline edit (desktop) / opens a sheet (mobile) |
| Esc in item edit | Cancels, reverts that line |
| ⌘/Ctrl-Enter in item edit | Saves the line |
| Drag handle, or up/down buttons | Reorders lines; position persisted explicitly |
| Hover an item row | Fill `#f0efe9`, action cluster and pencil appear |
| Any change on the edit screen | Sticky save bar appears; navigation away prompts |
| ⌘K / Ctrl-K | Command palette |
| Facet or search change | List, counts, result total and URL all update |
| Click a chart bar / table row in Statistics | Pushes a drill crumb, re-filters every card |
| "See in Statistics" in a panel | Opens Statistics with that crumb applied |
| Drop a file on the capture zone | Starts the scan flow |
| Bulk Set status / Add category | Popover, then toast with Undo |
| Delete anything | Dialog naming the consequence |
| Crossing a category limit | Amber notice; the save proceeds |

## State

Per screen, roughly what needs to exist:

- **List:** query string, selected facets (multi-value per group), sort, page and size, view mode (rows/cards), selection set. All except selection belong in the URL so a filtered list is linkable and survives reload; view mode also persists per user.
- **Order edit:** the order draft, a dirty flag, `editingLineId`, the line order array, per-field validation errors, and pending file uploads. Autosave is deliberately absent — saving is explicit.
- **Scan:** stage (`idle` / `uploading` / `reading` / `review` / `created` / `failed`), the file reference, the proposal with per-field confidence, and the user's overrides — kept separate from the proposal so "what the scan said" is still available in review.
- **Statistics:** period, compare flag, and the drill crumb stack; all URL-encoded.
- **Library:** selected record id (null shows the roll-up), the form draft, and the merge target.
- **Global:** toast queue, dialog, command palette open state, sidebar collapsed.

Data needed: orders with item lines and attachments, vendors, categories (with icon, colour and monthly limit), and aggregate endpoints for statistics that accept the same filter shape as the list.

## Screenshots

`screenshots/` holds a full-page capture of each file, numbered to match the id prefixes:

| Image | Contents |
| --- | --- |
| `00-overview.png` | The linked overview page |
| `01-order-editing.png` | 1a–1d |
| `02-order-list.png` | 2a–2c |
| `03-order-create.png` | 3a |
| `04-statistics.png` | 4a |
| `05-vendors-categories.png` | 5a–5c |
| `06-states-confirmations.png` | 6a–6e |
| `07-mobile.png` | 7a |
| `08-duplicate-alerts.png` | 8a, 8b |
| `09-navigation-shell.png` | 9a, 9b |
| `10-home.png` | 10a |

They are for orientation and review only. Measure nothing off them — the values in this document and the HTML files are the source.

## Assets

No external assets. All icons are inline SVG drawn for these mockups on a 16×16 viewBox, stroke-only — replace with the codebase's icon set at matching weight. Photo and attachment thumbnails are placeholder blocks; the real ones come from uploads. `Poppins` is loaded from Google Fonts in the mockups; use however the app already loads fonts.

## Files in this bundle

| File | Screens |
| --- | --- |
| `index.html` | Linked overview of everything below — start here |
| `Home.dc.html` | 10a |
| `Navigation shell.dc.html` | 9a, 9b |
| `Order editing layouts.dc.html` | 1a, 1b, 1c, 1d |
| `Order list.dc.html` | 2a, 2b, 2c |
| `Order create.dc.html` | 3a |
| `Order statistics.dc.html` | 4a |
| `Vendors and categories.dc.html` | 5a, 5b, 5c |
| `States and confirmations.dc.html` | 6a–6e |
| `Mobile screens.dc.html` | 7a |
| `Duplicate and alerts.dc.html` | 8a, 8b |
| `support.js` | Preview runtime for the files above — not part of the product |
| `screenshots/` | Full-page capture of each file (see above) |

## Suggested order of work

1. Shell and tokens (9a) — everything else sits inside it, and the token set is small enough to land in one pass.
2. Order edit and inline item editing (1b, 1c) — the original problem, and the highest-traffic screen.
3. Order list with facets (2b, 2a) — unblocks navigation to everything else.
4. States and confirmations (6a–6d) as shared components, before they get reinvented per page.
5. Scan flow (3a, 6e).
6. Library (5a–5c), then Statistics (4a), then Home (10a), which mostly composes pieces the earlier steps produced.
7. Mobile passes (7a, 1d) alongside each screen rather than at the end.
