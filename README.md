# Handoff: Spendly order flows

> **The frame around a mockup is not part of the design.** The full-shell mockups (9a, 10a) sit inside a rounded, outlined card with a drop shadow at a fixed 1400px width. That card is presentation only — it exists so the mockup reads as a window on the page. In the app the shell fills the browser viewport edge to edge: square corners, no outer border, no shadow, the sidebar running the full window height and the content column meeting the window edge. Any fixed pixel width on a full-page mockup stands in for a viewport.

## Overview

Spendly is personal receipt and order tracking for a single user: capture a receipt, keep the order and its item lines straight, and see what it added up to per month, vendor and category.

This package covers the whole surface that work touched: the app shell, the home page, the order list, order read and edit, creating an order from a scanned receipt, statistics with drill-down, the vendor and category library, the states and confirmations that sit across all of it, the phone layouts, settings, file import, the dark theme, the full-size image viewer, and the foundation references — typography, the control set, and the layout rules.

The change that started it: on the order edit screen the order header used to sit above the item list and eat most of the viewport, while the actual work is nearly always adjusting item lines. The header moved into a right rail, so the item list owns the width and starts near the top of the page. Everything else follows that same two-column shape.

Target repo: `mm98/Spendly`, branch `main`. The mockups live at `design/` there. Existing React source referenced through this document is under `react/src`.

## About the design files

Three documents, read in this order:

1. **`README.md`** (this file) — what to build: screens, layout, exact values, tokens.
2. **`DECISIONS.md`** — why it is this way, and what was rejected. Read before changing anything that looks like it could be simplified; several of the obvious simplifications were tried and rejected for reasons recorded there.
3. **`BEHAVIOUR.md`** — the precise rules the mockups cannot show: edge cases, facet counting, validation timing, scan failure modes, definitions of every statistic. It also collects **ten open questions** that need a product answer, each with a recommendation. Check those before building the screens they affect.

The HTML files are **design references created in HTML** — prototypes showing intended layout, hierarchy and behaviour. They are not production code and should not be copied into the app.

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

**Contrast in this app is measured with APCA, the model WCAG 3 is drafted on. The older WCAG 2 ratio is not used anywhere and must not be reintroduced.** It was built for grey text on a white page, and it misjudges exactly the case this app has most of: a glyph on a saturated mid-tone tile. It scored a black icon higher than a white one on the violet category colour — 4.56 against 4.23 — when the white one is plainly easier to read, and APCA says so too, 74.2 against 34.9. Where a figure is quoted for contrast, it is an APCA `Lc`, roughly 45 to carry a bold glyph and 60 for body text.

**The ink on a coloured tile is chosen, never assumed.** A category icon and a vendor's initials sit on a colour the account picked, so black or white is decided per fill by whichever scores higher. Only genuinely light fills — the yellow and the orange — come out black; everything else is white. Nothing warns the reader about a poor choice, because there is nothing to warn about: swept every fourth value of all three channels, 262,144 colours, the worst any of them manages with its better ink is 54.3, above the floor a glyph needs. That is what makes an open colour picker safe to offer.

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

Red — error and destructive. Used for validation that stops a save, for delete, and for a budget month that spends more than it brings in.

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
- The first row of a list sits below the card's hairline at the distance every other row sits below the hairline above it. The row's own padding is the whole gap; nothing above it adds more.
- **The gutter is the page's inset on all four sides.** The space between the top bar and the first thing a page draws, and below the last, is the same value as the side margin. A page adds nothing of its own on top of it: where a lead-in looks wanted, it belongs to a surface that is drawn, not to empty air.

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
3. **Nothing saves by itself.** Scans propose values, they never overwrite silently. A copied order opens unsaved and can be abandoned.
4. **Numbers answer the current filter.** Totals and counts in a filtered list describe what is on screen, not the whole account.
5. **Single user, personal receipts.** No item catalogue, no shared editing, no permissions. A conflict means two browser tabs, not two people.
6. **A component that exists is the only way to draw that thing.** No hand-rolled copy, no raw markup wearing the component's classes, no second implementation that merely looks the same. This is the whole reason a component exists: one place to change, one behaviour to trust. Sharing a component's *look* while keeping a private mechanism is the same failure wearing a disguise — it passes review because it renders correctly, and it drifts the first time either half moves. Before writing markup, check whether the thing already has a component; if it does and it cannot express what you need, widen the component rather than working around it.
7. **There is one tooltip.** Every hover label in the app is drawn by one component: the chart hovers, the sidebar scores and the icon grid alike. See Tooltips below.
8. **A control is not something to pick up.** Pressing a link and moving the mouse selects text, or does nothing at all. It never drags the link. Every browser hands a link that gesture by default, and a drag holds the mouse for as long as it lasts: no release reaches the page, and every click after it goes to the drag rather than to what was clicked — which reads as a window that has stopped answering while the keyboard still works. Three things in the app are dragged, and each one says so: a file into a drop zone, an image out of the page, and a line by its handle.

---

### Tooltips

**One surface, one component, no second way of doing this.** A tooltip is a white card on the page's card background, the page radius, the app's float shadow token, no border, and one padding — every hover label in the app is drawn by the same component, and there is no hand-rolled second kind. Sharing the look while keeping a private mechanism is the failure this rule exists to stop: it passes review because it looks right, and drifts the first time either half changes.

**Its content is built from four named parts, not from free styling.** A tooltip is often more than one word: a heading, a coloured key, a name, a figure. Those are a heading line, a row, an 8px colour chip, and a name-and-figure pair — the same four the chart hovers use, so a new tooltip composes from what already exists instead of inventing a second vocabulary. Plain text in a tooltip is normal weight; the figure is the bold half of a pair, and a single-value tooltip is bold on its own. Nothing else in a tooltip is emphasised.

**A tooltip is for a pointer, and never the only way to know something.** Whatever it says, the thing it points at already says to a screen reader through its own `aria-label`. So a tooltip never carries a fact available nowhere else, and it never holds a control: it takes no pointer events, and it goes the moment the pointer leaves or the focus moves.

**It picks its own side: north, south, east, west, in that order.** North is where a label is looked for, so it is tried first; the first side with room in the viewport wins, and when none has room, the side with the most does. It then slides along the free axis so it stays fully on screen — a label half off the edge is worse than one slightly off-centre. It is drawn against the viewport rather than beside what it points at, because the things worth labelling sit in scrolling boxes and rounded cards that would otherwise cut it off.

**It appears on hover and on keyboard focus, not on click.** A grid of unlabelled controls is unusable to someone tabbing through it if the name only answers to a mouse.

**The gap between a tooltip and what it points at is a token, not a number in the script that places it.** The stylesheet owns the spacing; the component owns only which side it goes on.

**It is pointed at the box the reader sees, not at the words inside it.** A tooltip centres on what it is given, so what it is given has to be the shape the reader reads as the target. Where the target is a line of text inside a wider block — a footer line, a caption, a cell — the block is what the label measures against; centred on the text run it lands off-centre in everything around it.

**A label for a whole strip is as wide as that strip.** Most tooltips are as wide as their own words, because they point at one small thing. One that labels a full-width strip takes the strip's width instead, so its edges land on the column everything around it already lines up with — a card of figures floating at whatever width its longest row happens to measure reads as loose inside a narrow column.

---

## The shell — structure and scroll behaviour

Read this before building any screen. It is the frame everything else sits in, and none of it is visible in a screenshot.

### Anatomy

```
┌──────────────┬─────────────────────────────────────────┐
│              │  top bar — LOCKED, 56px, does not scroll│
│   sidebar    ├─────────────────────────────────────────┤
│   248px      │                                         │
│   full       │  page content — the only scroll          │
│   viewport   │  container on the page                  │
│   height     │  padding 48px                           │
│   fixed      │                                         │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

**The page does not scroll. The content column does.** `html, body { height: 100%; overflow: hidden }`; the content column is the single scroll container (`overflow-y: auto`). This is deliberate: the sidebar and the top bar must never move, and a document-level scroll makes both of them either move or need `position: fixed`, which then breaks the sticky save bar inside the content.

### The sidebar

- **Always full viewport height**, `100dvh` (not `100vh` — on mobile browsers the toolbar makes `vh` wrong). Fixed `248px`, or `68px` collapsed.
- **It is a flex column**, and it scrolls independently *only if its own content overflows* — which happens on short viewports. It does not scroll with the page.
- **Three zones, top to bottom:**
  1. *Brand*, at the top, not scrollable.
  2. *Navigation*, the flexible middle (`flex: 1`, `overflow-y: auto`, `min-height: 0` — the same automatic-minimum-size rule from 13a applies here, and without it the middle refuses to shrink and pushes the bottom zone off-screen).
  3. *Bottom zone, pinned:* Settings, the theme toggle, and the account block. These sit below a `flex: 1` spacer, so they rest against the bottom of the viewport whatever the nav length. On a short viewport the nav scrolls and the bottom zone stays put — it is never scrolled away, because switching theme and reaching the account must not depend on scroll position.
- A `1px rgba(255,255,255,0.07)` divider separates the theme toggle from the nav above it. There is no divider between the toggle and the account block; they read as one bottom group.
- **The collapse state** persists per user. Collapsed, labels become tooltips on hover; the bottom zone keeps the same order, icons only, and the account block becomes the avatar alone.
- **Nothing in the rail is text to select.** The brand, the destinations and the line at the foot are labels for controls, so a drag across them has nothing to hand back, and a long press on the phone's tab bar raises no selection callout over it.
- The sidebar keeps `#14261c` in **both themes** (see 12a) — it is the one element that does not participate in theming, which also means it needs no theme work.

### The top bar

**Locked. No page actions may be placed here** — see global rule 1. It carries the breadcrumb, the page title, and the actions that belong to the app rather than to the open page. It does not scroll and it does not change per page beyond its text. Every action a page offers lives inside the page: that is why the edit screen has a sticky save bar at the bottom of its content column, why the order list puts bulk actions in a bar above the list, and why Settings saves per card.

**On a phone the bar carries no page title.** Every phone screen names itself — the tab bar lights the section, each create and edit card prints its own headline — so the heading is kept for assistive technology and not drawn. The left slot always holds one control: it goes back where there is somewhere to go back to, and to the front page otherwise, which is what lets the tab bar spend its five columns elsewhere.

### The content column

- One scroll container, `48px` padding (`20px` on mobile).
- **Scroll position resets to top on navigation**, and is restored when returning to a list via the browser back button — a user who scrolled to order 80, opened it, and came back should land where they were.
- **Sticky elements inside it** — the save bar on order edit, the bulk-action bar on the list, table headers — are `position: sticky` relative to *this* container, not the viewport. This only works because the container is the scroller; it is the main reason for the layout above. Nothing between a sticky element and the scroller may clip in a way that makes a scroll box of its own, or the element silently stops sticking, and whatever a page keeps in view stops under the top bar, never behind it.
- The two-column screens (order edit, order list, the library) lay out **inside** this column: main `1fr` plus a fixed rail, `24px` gap. The rail scrolls with the content, not separately. There is no second scrollbar anywhere in the app.

### Breakpoints

| Width | What changes |
| --- | --- |
| ≥ 1280px | Full layout. Sidebar expanded by default. |
| < 1280px | Facet rail on the order list becomes a drawer; sidebar may collapse to the 68px rail. |
| < 900px | Two-column screens stack: rail content moves above or below the main column per screen (order edit collapses its rail into a summary section; the library switches to list-then-panel navigation). |
| < 640px | Phone layout. Sidebar becomes a bottom tab bar, the top bar drops the page title and keeps the way out plus the global actions, sheets replace inline expansion, and the capture FAB appears. |

**On mobile the sidebar is not a drawer by default** — the five primary destinations become a bottom tab bar, and Settings and the account move into a "More" destination. A hamburger drawer would put the most-used navigation two taps away on the device where capture matters most.

### What is global, and lives in the shell rather than any page

- The toast queue (bottom-centre, one at a time).
- The dialog layer and its scrim.
- The command palette (⌘K / Ctrl-K).
- The theme, applied before first paint from the persisted preference.
- Keyboard layering: Esc closes the topmost layer — sheet, then dialog, then palette, then an inline edit.

---

## Screens

### 9a / 9b / 9c — Navigation shell
File: `Navigation shell.dc.html` · Code: `App.jsx`, `components/Nav.jsx`, `components/Shell.jsx`

**Purpose:** the frame every page renders inside.

**Layout:** fixed left sidebar `248px`, content area fills the rest with `48px` page padding. Sidebar background `#14261c`, `20px 14px` padding, column with `4px` between rows.

**Sidebar rows:** `9px 10px` padding, radius `9px`, icon 17px then 14px label, `11px` gap. Idle text `#c3d2c8`; hover fill `rgba(255,255,255,0.05)`; active is fill `#1f3d2c` with `#fff` text. A count sits right-aligned in each row at 11px `#a9bdb1`.

**Order:** Home, then section label `ORDERS` (10px, `0.14em`, `#7d9186`, padding `16px 8px 4px`) with Orders / New order, then `LIBRARY` with Statistics / Vendors / Categories. Settings sits below a spacer, then the account block: fill `#1f3d2c`, radius `9px`, `10px` padding, 28px circular avatar `#4f7f63` with white 12px/700 initials, name 13px/600 `#fff`, org 11px `#a9bdb1`, chevron right.

**Collapsed rail (in 9b):** `68px` wide, icons only, centred, labels appear as tooltips on hover. Toggle persists per user.

**Command palette (in 9b):** ⌘K / Ctrl-K. Centred overlay `560px` wide, radius `14px`, shadow `0 14px 32px rgba(27,26,23,0.14)`, scrim `rgba(27,26,23,0.35)`. A search field at top, then grouped results — Orders, Vendors, Actions — each row showing icon, primary label 14px, secondary meta 12px `#8b8a82`. Arrow keys move, Enter opens, Esc closes.

**Account menu (9c):** the chevron on the account block opens a 232px popover upward, aligned to the block's left edge, radius `12px`, shadow `0 6px 16px rgba(27,26,23,0.08)`, light surface like every other popover. Four rows: a header repeating name and **email** (which appears nowhere else in the shell, and is how you confirm which account you are in), **Account and profile** deep-linking to `/settings/account` — not a new screen, but Settings (11a) with that section selected in the left nav, scrolled to the card, and focus on its heading (no highlight flash, no auto-focused field), **Keyboard shortcuts** (its only entry point besides pressing `?`), and **Sign out** — the reason the menu exists, being the one action that should not be buried in a settings page.

Deliberately absent: a theme switch (the toggle is directly above it — two controls for one preference is how they drift), org or account switching, and any upgrade prompt. The chevron points down when closed and up when open, and is the only thing on the block that changes. Standard menu semantics: `aria-haspopup="menu"` + `aria-expanded` on the trigger, `role="menu"` on the panel, arrow keys between items, Esc closes and returns focus. Sign out confirms only when there are unsaved changes, naming what would be lost. On the collapsed rail the block is the avatar alone, the chevron disappears, and the menu opens to the right.

**Top bar:** locked. Breadcrumb and page title only.

---

### 10a — Home
File: `Home.dc.html` · Code: new page (`pages/Home.jsx`)

**Purpose:** the start page. Answers "where am I this month, and what needs me?" and offers capture as the primary action.

**Layout:** shell sidebar, then content as a two-column grid — main `1fr`, right rail `320px`, `24px` gap.

**Main column, top to bottom:**
1. **Greeting + month.** Title 34px/600, subline 14px `#57564f`.
2. **This month against its own pace.** White card, radius `12px`, `20px` padding. Big total 28px/700, then what the month is projected to reach 13px `#8b8a82`. Progress bar height `10px`, radius `5px`, track `#eef1ee`, fill `#1d4d33`, plus a 2px `#b58a2b` pace marker where the previous month ended, extending 2px beyond the bar top and bottom. Caption under it explains the marker: 11px `#8b8a82` with a 2px amber swatch inline. The denominator is the month's own projection, never the sum of the category limits — see 5b.
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

**Rail contents, in order:** order details (vendor, order date, status, category, reference), then the status history, then totals, then notes. Each is its own white card, radius `12px`, `16px` padding, `14px` between cards. Each card opens with an 11px uppercase `0.12em` `#6b6a63` label.

**Status history is its own card, and every step in it names itself.** The order's dated steps — ordered, delivered, returned — are a log, not fields of the record: the list has no fixed length, since a returned item can be replaced and delivered again. Folding it into the details card costs the first step its name, because that row is already spoken for as the order's own date, and it leaves a bare link sitting between two label/value rows. So it is a card of its own, collapsed by default, opened by its header band (Progressive Disclosure), and it appears only when there is more than one step to see. Each row is the step's own name against its date, so a reader never has to work out which status a date belongs to.

**Totals card:** label/value rows 13px, then a `1px #dedcd4` divider, then the grand total at 20px/700. The items are one row here — their summed price, with the rows that follow taking the discount off and adding the shipping, so the card reads down to the same total the order stores. The rail never repeats a list the main column already shows.

**The summary states the order's total, and every other figure is printed once.** A long receipt puts the breakdown past every line on it, so the fact list beside the order carries the total as well, next to the saving it produced. Nothing else is printed twice: a card header that repeats the figure its own foot states hands the reader the same number in two places, at two weights, with nothing to say which one answers the question.

#### 1a — Read view

Values render as text, not inputs. Item rows are read-only: thumbnail, name, quantity × unit price, line total. The primary action is Edit; secondary actions Copy and Delete sit next to it, inside the page (never in the top bar).

Attachments sit **below** the item list as a horizontal strip of tiles: `96×96`, radius `10px`, `1px solid #e6e4dc`. Images show a cropped thumbnail; PDFs show a rendered first-page thumb with a small `PDF` tag bottom-left (11px, white on `rgba(27,26,23,0.6)`). Filename 11px truncated under each tile. Clicking opens a lightbox.

#### 1b — Editing an item in place

Selecting a row expands it into an editing form **within the list**, pushing the rows below down. It does not open a dialog and does not take over the rail.

Expanded row: fill `#fff`, `1px solid #1d4d33`, radius `10px`, `14px` padding. Contents: the item photo at `80×80` (radius `9px`) with an overlay control on hover, then fields — name (full width), then a `1fr 1fr 1fr` grid of quantity, unit price and line total, where line total is computed and read-only. Below: Cancel (ghost) and Save item (primary) right-aligned, `8px` gap. Esc cancels, ⌘/Ctrl-Enter saves.

**The item photo controls** (the answer to "how do I add, replace or delete a photo"): hovering the 80×80 thumb dims it to `rgba(27,26,23,0.45)` and reveals two 28px round icon buttons — replace (upload glyph) and delete (trash glyph). With no photo the slot is a dashed `#dedcd4` square with a small camera glyph and the label "Add photo"; it accepts drop as well as click. Deleting asks for confirmation only if the photo came from a scan.

**Discoverability of editing** (an explicit revision): a row must never look inert. Each row shows, on hover, a `#f0efe9` fill, a pencil affordance at its right edge, and `cursor: pointer`. On touch, the pencil is always visible. The list header carries a one-line hint: "Tap a line to edit it."

#### 1c — Edit screen with reorder

Same two-column shape with fields in the rail as inputs (`1px solid #dedcd4`, radius `9px`, `10px 12px`, 14px text — 42px tall, the canonical control height (controls that are not text, like the quantity stepper, get `box-sizing: border-box; height: 42px` explicitly rather than sizing to content); focus `1px solid #1d4d33` plus a 3px `rgba(29,77,51,0.12)` ring).

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

**Bulk actions (in 2a):** selecting rows reveals a bar above the list — "4 selected", then Set status and Add category as buttons, then Clear. Both open a small popover anchored to the button: Set status is a single-select list of the five statuses (the Combobox in pick-only mode — there is no Radio component; see 14d); Add category is a searchable list with the category icon tile and name, multi-select, and a "Create category" row at the bottom. Applying shows the count in a toast with Undo.

**Pagination:** page size select and prev/next at the bottom; the total reflects the filter.

---

### Wishlist
No design file — both patterns it is built from are already drawn: the working list (2a) and the record form (5a–5c). Code: `pages/Wishlist.jsx`, `pages/WishForm.jsx`, `components/ListToolbar.jsx`, `components/LinePhoto.jsx`, `components/FormPage.jsx`

**Purpose:** what the account wants and has not bought. A wish is a name and a link, and optionally a price, a picture and one or more categories. It is never an order, and that separation is the point: every total, chart and category limit in the product reads orders as money that has already left, so nothing on this page reaches any of them.

**Filling in from the link:** paste the address first and the page is asked what it calls the thing and what picture it offers a link preview, and the name and the picture frame fill in from that. Only while a wish is being created, only into a name nobody has typed, and silently — a shop that refuses to be read, a page that has moved, an address the server will not fetch are all the same nothing, and the reader types the name themselves. The picture is offered, not applied: choosing a file or pressing Remove drops it, and it is fetched by the server only once the wish is saved.

**Required:** the name, and the link. A link may be typed without `https://` and is completed on the way in; anything that is not an http(s) address is refused in the field, in the same words on both sides of the wire. A price left blank means "not written down", which is a different fact from free — a wish with no price is left out of every sum, and any figure that leaves some out says how many it counted.

**The list:** the toolbar every working list here opens with — one search field, one sort, one FILTERS disclosure — then the chips naming what is on, the rows, and the pager cut to the account's own rows-per-page setting. Search matches the name, the shop and the categories. Filters: category, the dates it was added between, and which wishes are shown — on the list, archived, or all. Archived are excluded until they are asked for. The two price sorts also narrow, the way the order list's discount sorts do: a wish with no price is not the cheapest wish, it is one the question does not apply to.

**A row:** the picture, or the same cube glyph an item without one gets; the name; and one meta line carrying the shop, when it was added, "Archived" where it is, and the categories. The price is right-aligned like every other amount. Two destinations, both real links so each can be middle-clicked and read off the status bar: the shop's page in a new tab, and the wish's own page. The row itself goes nowhere — it offers two ways out, and a row that quietly picks one of them for the reader is the dishonest half of that.

**A wish is a record, not part of one,** so it is created and edited on its own page — the same page a vendor, a category and an order use, because there is one way to edit a record here rather than one per screen. An order's lines are edited in place because a line has no life outside the order; a wish stands on its own. The list is only ever a list. Archived is a checkbox on the record beside its other fields, the way a vendor's Favourite is; the list filters on it. Deleting lives on the record's own page and asks first, through the one ask-before-deleting setting every other delete reads.

**The picture:** one per wish, and the same frame an order line's photo uses. It is clicked, or a file is dropped on it, or one is pasted in. Only what is actually an image is accepted — the bytes decide, not the filename. Replacing gives the picture a new address, so a browser told to keep it forever can never show the old one.

---

### Budget
No design file — it is drawn the way the spreadsheet it replaces was drawn. Code: `pages/Budget.jsx`, `components/BudgetImport.jsx`

**Purpose:** the household's yearly budget: one sheet per year, the income and the fixed costs down the side in groups, the twelve months across, and at the end of each row the year's total and the monthly average. Like the wishlist it is not orders, so no order total, chart or category limit reads it, and it reads none of them.

**Two amounts a month.** Each row holds, for each month, an expected amount and a real one, and either may be empty. The sheet shows the real amount where there is one and the expected amount otherwise, drawn in a paler grey so the two can be told apart at a glance; every total counts the same way. An expected amount is a placeholder, not something to read, so it is faded on purpose to placeholder level: APCA Lc 30 on the card in both themes, under the 60 asked of text that has to be read, and still visible on the current month's column and on the row under the pointer. In a row's panel the expected fields are typed into, so their text stays readable and their dashed edge marks them instead. The sheet's header says it in words: grey amounts are expected. Clearing a real amount brings the expected one back. Empty is not zero: a month with nothing written counts as nothing, and shows as a blank cell.

**Totals, at the foot of the sheet,** under a Totals heading like Income and Costs. The month names are not repeated there, because they stay in view above the sheet. First what the costs come to on each account, in the order of the account list, then income, costs and what is left over. Cost rows with no account are added up on a line of their own. The account block is drawn only when at least one cost row has an account. Left over is coloured the way the spreadsheet coloured it: a month with money left is green on a green wash, a month that spends more than it brings in is red on a red wash, and the year and the monthly average follow the same rule. A figure shown as 0,00 stays plain.

**Amounts are always open. The shape of the sheet waits behind EDIT.** An amount can be typed into the sheet at any time. Everything that changes the sheet's shape is done a few times a year: adding, renaming, moving and deleting rows and groups, the account list, and starting or deleting a year. All of it waits behind one EDIT button beside the years, which reads DONE while it is on. At rest a name is plain text, not a control that does nothing. In edit mode the rows show their grips, the names open their panels, the add rows appear, and the account list is drawn under the sheet. An add row's plus is bare, with no box around it, and sits where the grips sit, with the same small gap after it, so its words start where the names above it start. It is never drawn above the sheet, so turning edit mode on does not push the sheet down the page. Turning it off closes any open panel.

**It is edited where it is read, the way a spreadsheet is.** An amount is a cell: click it, or type into it, and it becomes a field over the cell for the real amount. Enter saves and goes down a row, Tab saves and goes right, Escape leaves the cell as it was, and the arrow keys walk the sheet. Where the real amount is empty, the expected one is written under the field, not in it. Every change is saved as it is made, one after another; a change that fails says so and the sheet reads the year back, so it never shows a figure that is not stored.

**A row's own panel.** In edit mode the row's name opens a panel under the row with its name, its account (one from the account list, or none), its group, and both amounts for every month, with a way to put one amount in every month and to clear either kind. The months stand twelve across, or six, or three, so no month is left alone on a line, and the box for one amount in every month is the size of a month's box, with its buttons beside it. Rows are moved by their grip, dragged or with the arrow keys; a row moves to another group from its panel. A group's name opens the group's panel: rename it, move it up or down, delete it. Deleting a row, a group, an account or a year asks first, the same way every delete does. When a panel closes, focus goes back to what opened it, or to the add button of its list when that was deleted.

**The account list.** The accounts a row is paid from, or paid into, are one list that every year shares, and each row picks one from it or none. It is set up once, so it is shown only in edit mode, under the sheet, and it is drawn the way the sheet's own rows are: a grip, the name, and how much it is used, one line each. A name opens the account's panel to rename or delete it, and the grip moves it. Two accounts cannot share a name, and a taken name is refused in the field, the way every other taken name is. Each account says how many rows use it in the year on screen. Deleting one asks first, says how many rows it leaves without an account counting all years, and keeps those rows.

**A new year starts from the newest one.** It gets the same groups and rows, and the reader chooses what happens to the amounts: copied as they are, copied as expected amounts, or left out. The first choice is how the spreadsheet was carried forward: copy last year, then clear what is not known yet and write what is expected instead.

**Bringing the spreadsheet in is done once.** The first screen offers it, and Settings' Import tab keeps the same button for a second go. The workbook is read in the browser: every sheet named after a year becomes that year, the rows under each group heading become that group's rows, and an amount drawn in light grey text comes in as an expected amount. A sheet named Accounts becomes the account list, in its own order; without one, the accounts the rows name become the list. Before anything is written the reader is told which years were found, which of them would replace a year already here, what the account list will be, and which sheets are left out because they are not years.

**Figures are shown with two decimals**, in the sheet as in the cell's field and the row's panel, the way the spreadsheet showed them. A month column is sized for the widest figure a household budget is likely to hold, and no row draws its figures heavier than semibold, since bold figures are wider; Left over stands out by its colours and its bold label instead. The name column grows only to a set width, and a longer name is cut short and shown in full on hover; the months are what the sheet is for, so they and the totals share all the width that is left. Every row uses the same columns, so a figure sits at the same place all the way down. A blank line opens each group and each section after the first; what sits straight under a heading does not get one, since the heading already sets it apart. Row names are drawn in the regular weight, and the group and section headings carry the emphasis. Where the year does not fit across, the sheet scrolls sideways inside its card with the row names held in place, and it opens on the current month rather than on January. The month names stay in view: while the page scrolls down they stop under the top bar, and they move sideways with the sheet, so a figure is never far from the name of its month.

**Navigation.** Budget is the last entry in the rail. On a phone it takes Statistics' column in the five-column bar; Statistics keeps its door there through Home's Spent card.

---

### Checking a bank statement
No design file. Code: `pages/BudgetCheck.jsx`, `api/bankStatement.js`

**Purpose:** answer one question about a bank's CSV export: is every payment in it accounted for in the budget? Nothing is imported. The file is read on the device and never sent; only the reader's own choices are stored. It is reached from Settings' Import tab and from the command palette, and it counts as part of Budget in the rail.

**The columns are the reader's to set, and are guessed first.** Banks do not agree on a format, so the page asks which column holds the date, the text and the amount, and, for a bank that shows money out in a column of its own, which one that is. Each choice shows three real values from the file under it. The separator, the text encoding, the decimal mark, a first line of column names and how the date is written are guessed from the file; the date format and the column-name line can be changed. The choice is remembered in the browser for the next file of the same width.

**A payment is in the budget** when a row of the same kind, cost for money out and income for money in, holds the same amount in the payment's month, as its real or its expected amount; when every longer word of a row's name starts a word in the payment's text; or when the reader placed it. A row's amount in a month is used by one payment only. A row found by its name or by the reader's choice, whose amount that month is another, is reported as found with another amount, and says what the budget holds. A payment in a year with no budget says so.

**What the reader sees:** a headline stating how many payments are not in the budget, the date range the file covers, and the count and sum for each outcome. The list opens on the missing payments, with other amounts and all payments one tap away. Every payment can be placed by hand: on a row of the right kind in its year, or outside the budget. The choice applies to every payment with the same text, less any word holding a digit, so next month's statement is placed the same way; it can be taken back.

---

### 3a — Creating an order from a receipt
File: `Order create.dc.html` · Code: `pages/NewOrder.jsx`, `pages/Scan.jsx`, `components/AiCard.jsx`, `components/fileKinds.js`

**Purpose:** get a receipt into the system with as little typing as possible. Four stages, shown side by side in the mockup but sequential in the app.

1. **Start.** Three ways, ranked by frequency: the drop zone with **one** button ("Select a receipt"), then below a divider, "Empty order" and "Copy a previous order" as equal cards. Accepts PDF, JPG, PNG, HEIC; states the size limit.

   **One file button, not two.** Camera versus files is the device's decision, not a design choice — a single input with the right `accept` and `capture` attributes yields a camera option on a phone, the photo library on a tablet, and a plain file dialog on desktop, each in the form that platform's users already know. Separate "Choose file" and "Use camera" buttons duplicate the OS picker's own first screen, and one of the two is always dead weight on whatever device is in hand. Drop needs no button at all on desktop — the zone is the affordance — but the button stays for keyboard users. "Copy a previous order" is hidden when there are no orders yet.
2. **Reading.** The uploaded file's thumbnail on the left, and on the right a progress card: an animated indeterminate bar, the stage in words ("Reading line items…"), and Cancel. Nothing is written yet.
3. **Check what was read.** The heart of the flow. Two panes: the receipt preview left (zoomable, page thumbs for multi-page PDFs), the proposed order right. Every proposed value carries a confidence affordance — fields read cleanly look like normal filled fields; uncertain fields get an amber left edge (`2px #b58a2b`) and a "check this" hint. Item lines list with the read values as editable inputs; unmatched vendor or category shows an inline picker with a "Create X" option. A summary line reconciles the totals: if the item lines do not add to the receipt total, that difference is stated plainly in amber, with a "the receipt says" figure beside the computed one. With no printed total to check against, because nothing was read or the receipt prints none, the line says the total is not checked, in amber: it never reports a match it did not make. The review is the create form with the reading filled in: where nothing was read, each field opens on the default an empty order opens on, and every value on screen is what Create order saves. Buttons: Discard, Save as draft, Create order.
4. **Created.** Confirmation with the order summary, the attachment kept on the order, and two links: open the order, or scan another.

The scan **proposes**; nothing is stored until Create order. The uploaded file always ends up attached to the resulting order.

**3b — Copy a previous order.** The picker the create-screen card opens; the copy itself is 8a's, unchanged. A 462px dialog: a line stating what carries over, search across **vendor and item name** (the thing you remember is often "the order with the oak chairs", not the shop), then two groups — **You order these often** (orders whose vendor and line shape recurred, with the repeat count, since that is the case this exists for) and **Recent**. Same grouped-Combobox behaviour as 14a: arrows cross both groups as one flat list, headers never focusable.

Every row must be identifiable without opening it, so each carries vendor, line count, the first item names and the total — the total does most of the work when a shop has twelve orders. Picking opens the edit screen **unsaved** with 8a's notice; no confirm, because nothing exists yet. Amounts are copied, not re-priced: they are what was paid last time and are editable like any field — nothing looks up a current price.

Two entry points open this dialog: the create-screen card (hidden with no orders) and the New order split-button menu. The rest skip it, because they already know which order is meant — Home's **Copy last order**, a vendor's **Copy latest order**, and the order list's per-row copy, where the reader has already found the row. That is also why this is a dialog and not a list page: browsing with facets is the order list's job, and the copy control is already waiting there.

**3c — the same receipt scanned twice.** Every upload is hashed (SHA-256 of the bytes as received, stored on the attachment row and indexed). On a match this screen **replaces the reading stage** — a dialog over a progress bar would mean the scan is running behind a question about whether it should, and asking after the proposal exists wastes the read and drops the user into review with a decision they should have made first.

**Cache the reading, not just the hash.** Each scan is a paid API call, so the scan output is stored against the file hash and a repeat upload can produce a full order with no second call. That is the return on the feature: the three legitimate reasons to continue — a repeated purchase on an identical receipt, a re-import after deleting the original, one receipt covering two orders — are all served by the cached reading. **The cost is internal and never appears in the UI:** no amounts, no warnings, no counters — a price tag would ask the user to manage an infrastructure bill they never agreed to. The design carries the intent instead, with **Use the reading** as the primary and **Scan again** as a secondary, the latter being rational only when the cached reading was wrong and the model has since improved.

It shows the matched order in full (vendor, reference, date, line count, total, when it was scanned) with **Open that order**, because "you have already imported this file" without naming the order is a dead end — the user's next question is always *which one*. Amber, and it never blocks: **Scan anyway** is always available and never behind a confirm, because three legitimate reasons exist (a genuinely repeated purchase on an identical receipt, a re-import after deleting the original, and one receipt covering two orders). **Attach it to that order instead** appears only when the matched order lacks this exact file — so after an exact match against that same order it is disabled. Multiple matches list up to three, newest first. The upload is kept, and can still be matched, for a week either way — including past the point its own reading became an order, so a re-import after deleting that order still finds the cached reading instead of paying for a second one.

**This is not duplicate-order detection and must not be presented as such.** The hash catches the same file uploaded twice — the common case. It misses a second photo of the same paper receipt, the same PDF re-saved by another reader, or a re-download that changed a byte of metadata; all are different bytes. The fuzzy check on vendor + date + total — behind Import's "2 rows look like orders you already have" and 5c's possible-duplicates list — is the separate mechanism for those, and it runs later, on the proposed order rather than the file. Both can fire on one upload: this screen comes first because it is certain, and the fuzzy warning appears in review only if the user chose to scan anyway.

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
- **Monthly limits:** one row per category with a limit — name, spent, limit, and a bar with the `#b58a2b` pace marker. Over-limit rows fill amber `#e2d3ae` rather than red. Rows only: the card states no total for the limits and no percentage of one (5b).
- **Vendor table:** top vendors with spend, orders, average, and a 60×20 sparkline.

**A bar's height is its value; its fill only says which bar is singled out.** The one bar a card marks — this month's column, the busiest weekday — is filled whole in the highlight colour, every other in the track colour. A fill that stops part-way up a bar reads as a second value the bar does not carry.

**Drill-down:** clicking any bar, slice or table row pushes a crumb onto the breadcrumb (`2026 ▸ Decor ▸ August`) and re-filters every card on the page to that slice. The final level is a list of the matching orders, from which a row opens the order. Crumbs are individually removable, and the state is URL-encoded so a drilled view can be linked.

**Statistics is the only place with charts.** Vendor and category panels answer the narrow, single-record question locally (see 5a/5b); each carries a "See in Statistics" link that opens this page with the corresponding crumb already applied. Do not duplicate chart cards into those pages — one source, so the numbers cannot disagree.

---

### 5a–5c — Vendors and categories
File: `Vendors and categories.dc.html` · Code: `pages/Vendors.jsx`, `pages/Categories.jsx`, `pages/CategoryForm.jsx`

**Purpose:** the library behind orders. Two lists that share one layout: list left, panel right (`400px`).

#### 5a — Vendors

List rows: name 14px/600, order count and total 12px `#8b8a82`, chevron. Search above.

Panel for a selected vendor: the vendor form (name, VAT number, website, address, default categories, notes), then a small stats card — spend, orders, average order, saved vs retail as a 2×2 grid of 20px/700 values — plus a sparkline and the "See in Statistics" link. No charts.

**Default categories** are the vendor's own answer to "what is this usually": a new order that names the vendor starts with them already in its Categories field, where they can be added to or removed before it saves. They are a starting point, never a rule — an order that already carries categories keeps them when its vendor changes, and editing a vendor's defaults never rewrites orders already saved.

**Merge** handles scan duplicates: the panel offers "Merge into…", which opens a picker of similar vendors, then a comparison showing which field wins per row and the resulting order count. It is destructive and confirmed explicitly, naming the number of orders that will move.

#### 5b — Categories

List rows: a `26×26` icon tile (radius `8px`) filled with the category colour, glyph in white — or `#3d3c36` when the colour is light — then the name 14px/600, this month's spend, and its limit. The tile replaced a plain colour dot so a category is recognisable at a glance.

Panel: the category form.
- **Name.** Text field with the current icon tile inline at its left (22px, radius `7px`).
- **Icon.** The current icon at 44px (radius `11px`, category colour), its name, and a Change control. Open, it is a picker: a search field, then an 8-column grid of `aspect-ratio: 1` cells (radius `8px`, `#f7f6f2`, selected cell `#eef1ee` with a 2px `#1d4d33` outline offset 1px), ending in a "+64" overflow cell. Icons come from a fixed set; the picker never accepts uploads.
- **Colour.** A row of swatches from the green ramp plus neutrals.
- **Monthly limit.** A single amount that applies to every month — it is not per-month data. Empty means no limit. Below the field: this month's spend against it, with the pace marker bar.

**A limit is a ceiling on one category, and limits are never added together.** A category is limited so that *it* stays under an amount, not so that it spends one every month: a limit on gifts still stands in the months nobody has a birthday. So the sum of every limit is not a budget the account set, and a period measured against that sum is a percentage of a number nobody chose — it reads low whenever the quiet categories were never going to be bought from, and a category far over its own limit disappears inside it. Every screen that compares spend to a limit compares one category to its own, ranked fullest first, and says how many categories are over. No screen prints a total of the limits, a percentage of that total, or a bar filled by one.

This is why the count is the summary: "8 of 9 over this month" is a fact about the limits that were actually set. A percentage across all of them is not.
- Icon and colour always render together, so the same mark identifies the category in chips, facets and charts.

**A summary card lists what the reader chose, in the words they chose it in — never the value the code stores.** The vendor and category forms each preview the record as it will be drawn, then list its fields underneath. A colour belongs in that preview as the colour, and an icon as the glyph; printing the colour's hex or the icon's catalogue name beside them states the same choice a second time in a form nobody reading a receipt can act on, and nothing on the page can be changed by knowing either. The rule is the general one: a row earns its place by changing what the reader does next, so a field whose whole meaning is already on screen as a picture is shown as the picture and nothing else.

**Moving a record's orders is how a record becomes deletable.** A vendor or a category that still has orders on it cannot be deleted, since the orders would point at nothing. Both edit forms carry a **Move orders** card in the rail above Delete: choose another record of the same kind, and every order on this one moves to it. The button names the count ("MOVE 53 ORDERS") and the choice is confirmed in a dialog rather than offered an undo, because nothing records which orders moved and there is nothing to put back. A category is many-to-many, so an order already carrying the chosen category simply leaves the old one and keeps every other category it has; a vendor is a single field, so the order is listed under the new vendor and nothing else on it changes. With no orders on the record the card says that instead of offering a choice, and choosing nothing is rejected in the field rather than by a dead button.

#### 5c — Roll-up panel (nothing selected)

The panel's default state, matching the detail panel's width and card rhythm but describing the whole list: totals for all vendors (spend, vendors used, saved, average order), a "where the money goes" top-five bar list with "Other N vendors", and a "Needs a look" list — possible scan duplicates, vendors with no orders in 12 months, missing VAT — each an amber or neutral row with a count bubble and a chevron into the filtered list. For categories: the categories closest to their limits and the ones past them, each against its own limit, fullest first, with the count over. Footer hint: "Select a vendor to edit its details."

---

### 8a / 8b — Copying an order, and budget alerts
File: `Duplicate and alerts.dc.html` · Code: `pages/EditOrder.jsx`, `pages/CategoryForm.jsx`

**8a — Copy.** Copying an order opens a new **unsaved** order prefilled from it, on the edit screen, with a notice at the top on the success surface, naming the order it came from and offering "Discard". What carries over is explicit and stated in the notice: vendor, categories, kind, reference, note, discount, shipping, and every item line with its quantity and prices. What does not: the order date (set to today), the status (reset to what a new order opens as, which the account's own default decides), and attachments — a receipt belongs to the order it came from. Nothing is written until Save, and Save creates a record of its own rather than touching the one copied from.

**The case this exists for is a shop visited on a schedule** — a barber, a standing delivery — where the order is the same every time and the only thing that changes is the date. So the copy is offered where that shop is already on screen: on an order, on every row of the order list, and on a vendor as **Copy latest order**, which picks the newest order that vendor has rather than asking which one. The vendor's control is hidden while the vendor has no orders, since there is no last one to open. 3b's picker is the way in when the shop is not on screen at all.

**Every entry point lands on the same page, and none of them writes anything on the way.** A control that copied silently would put a record in the ledger from one click, on a screen that never showed what it was about to say.

**8b — Budget alerts.** The same fact surfaced in three places, all amber, none blocking:
1. **As you cross it, while editing.** A notice appears above the sticky save bar the moment the running total pushes the order's category over its monthly limit: "This puts Decor 1.240 kr. over its 6.000 kr. limit for August." Save is unaffected.
2. **On the category.** In the category panel (5b) and its list row, the limit bar fills amber `#e2d3ae` past 100% and the row gains a small amber badge.
3. **Once a month.** A dismissible summary on Home (10a) listing the categories that finished the previous month over their limit, with each row linking to that month's filtered order list.

Wording is factual — the amount over, the limit, the month. No exclamation, no red, no "warning".

---

### 6a–6f — States and confirmations
File: `States and confirmations.dc.html` · Code: `components/ListState.jsx`, `components/Dialog.jsx`, `components/Toast.jsx`

**6a — Empty states.** Distinguish three: never had any (a real invitation — headline, one line of explanation, primary action, e.g. "No orders yet" / "Scan a receipt"), filtered to nothing ("No orders match these filters" plus "Clear filters"), and search found nothing (echo the query, offer to clear). Centred in the content area, `48px` vertical padding, headline 16px/600, body 13px `#57564f`, no illustration.

**6b — Loading.** Skeletons that match the shape of what is coming: `#f7f6f2` blocks at the real row heights with the shimmer, never a spinner in place of a layout. Row lists show six skeleton rows; cards show three skeleton cards; the panel shows label/value pairs.

**6c — Validation.** Field-level, on blur and on submit. Error field: border `#c98a80`, message below at 12px `#8a4a41` with a small alert glyph. A form-level summary appears above the actions when submit fails, listing the fields as links. Rules implemented: vendor required; order date required and not in the future; at least one item line; quantity > 0; unit price ≥ 0; amounts max two decimals; reference max 64 chars; category limit must be a positive amount or empty. Crossing a monthly limit is **not** an error — it renders as the amber notice from 8b and the save proceeds.

**6d — Confirmations and toasts.** Destructive actions use a dialog: `440px`, radius `14px`, shadow `0 12px 28px rgba(27,26,23,0.16)`, scrim `rgba(27,26,23,0.35)`. Title 16px/600 states the consequence in the user's terms ("Delete this order?"), body 13px names what is lost including attachments, then Cancel (ghost) and the destructive primary (`#8a4a41` fill). Non-destructive success uses a toast instead: bottom-centre, dark `#1b1a17`, white 13px text, radius `9px`, shadow `0 14px 32px rgba(27,26,23,0.14)`, an Undo text button in `#a8c6b2`, auto-dismiss 6s, paused on hover. Undo is the preferred pattern; reserve dialogs for what cannot be undone.

**6e — Scan failure.** As described in 3a: keep the file, say what failed, offer manual entry with the file attached. A failed read is not a reading and is never kept, so the same file uploaded again is read again. When the reading service refuses over billing, such as no credits left, the message says so, since the reader can fix that; it names no cause the service did not give.

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

### 11a / 11b — Settings, and importing a file
File: `Settings and import.dc.html` · Code: new pages (`pages/Settings.jsx`, `pages/Import.jsx`)

#### 11a — Settings

**Layout:** the app sidebar, then a page-level settings nav (`208px`, rows `9px 10px`, radius `9px`, active row white on the canvas) and a single column of cards capped at `640px`. The shell holds a fixed composition — do not let the card column compress below its designed width; the page scrolls instead.

**Five sections, each its own card with its own save.** Only the card you touched goes dirty; the sticky save bar names it ("Unsaved changes in Statuses").

- **Account and profile.** 56px avatar with upload and remove, name, email (read-only), and a password row.
- **Appearance.** Theme as three preview cards — light, dark, follow system — each a miniature of the shell rather than a swatch. Then row density as a segmented control (comfortable / compact; compact takes list rows from 14px to 8px of vertical padding and leaves item lines alone, so touch targets survive). The theme is also switchable from the sidebar bottom; the two stay in sync.
- **Currency and format.** Currency, number format, date format, week start, with a live preview strip showing the result. Changing the currency does not convert existing amounts — it changes the symbol only, and the card says so.
- **Defaults for a new order.** Default category and status, plus a "let a scan override these" toggle: on, a receipt naming a vendor whose default category differs wins; off, your default always applies.
- **Statuses.** A draggable list, each row a colour dot, the name, the order count on it, and an edit control. Editing expands the row inline to a five-swatch colour picker plus the name field — the same in-place pattern as item lines. Draft is built in and cannot be renamed or removed. A status with orders on it cannot be deleted; reassign first.

#### 11b — Import

**Purpose:** the bulk path — a spreadsheet or a JSON export from another app, as opposed to scanning one receipt (3a). Four stages, sequential in the app, shown side by side in the mockup.

1. **Pick a file.** Drop zone accepting CSV, XLSX and JSON, plus a downloadable template whose columns map themselves. Below it, previous imports with a "reuse mapping" action — the second import of the same monthly export should cost nothing.
2. **Map the columns.** Each file column on the left showing its **name and three real sample values**, an arrow, and the Spendly field on the right. Mapping against real data is the whole point; a list of field names in the abstract is guessable and wrong. A "don't import" option renders the row dimmed with a dashed target. Two inline resolutions appear where needed: an ambiguous date gets a "read as DD-MM-YYYY" amber strip with a Change control, and a column whose values don't match existing records gets a count and a "match them" link. The footer states the count mapped and which fields are required (vendor, order date, item name).
   - **"Each row is" — one item line or a whole order.** With *one item line*, rows are grouped by a reference column into multi-line orders. With *a whole order*, the item fields collapse: quantity and unit price leave the mapping (shown struck through, not silently removed), item name becomes an optional Description, and a required **Order total** appears because there is nothing left to sum. Each order then arrives with a single item line carrying the description and the total at quantity 1 — totals stay correct and the order stays editable, but the itemisation is gone and cannot be recovered later. Switching back restores the previous mapping. The order count in step 3 changes with the switch (128 rows → 128 orders instead of 41), which is the fastest signal that the wrong option is selected.
   - **Matching unknown values.** Every unmatched value gets a row with its occurrence count and a picker. An unresolved row blocks the import: a category invented by an import is worse than one the user chose.
3. **Check before writing.** Four counts (orders, item lines, new vendors, total), then the advisories: likely duplicates of orders already held (amber, reviewable) and rows that cannot be imported (red, listed). Unimportable rows are **skipped, not repaired** — they come back as a downloadable file to correct and re-import. Then the first five orders rendered as they will be saved, with new vendors flagged in the row. A "bring them in as drafts" toggle lets 41 orders be worked through without counting in Statistics yet.
4. **Done.** The counts, then three actions: see the imported orders, download the skipped rows, and **undo this import** — which removes exactly what this import wrote, including the vendors it created, for 24 hours.

---

### 12a / 12b — Dark mode, and images at full size
File: `Dark mode and image viewer.dc.html` · Code: theme layer + `components/Lightbox.jsx`

#### 12a — Dark mode (warm dark)

Not an inversion. The light theme's identity is warmth — a greige canvas, not grey — so the dark theme is a warm brown-black and the greens lift rather than darken. Implement as a single token layer with a role-to-value map per theme; no component should reference a literal.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#eceae4` | `#1a1815` |
| Card surface | `#ffffff` | `#221f1b` |
| Raised / hover | `#f0efe9` | `#2a2621` |
| Quiet fill | `#f7f6f2` | `#262320` |
| Hairline border | `#e6e4dc` | `#38332c` |
| Input border | `#dedcd4` | `#463f37` |
| Text primary | `#1b1a17` | `#f2f0ea` |
| Text body | `#3d3c36` | `#d8d4ca` |
| Text secondary | `#57564f` | `#a8a29a` |
| Text muted | `#8b8a82` | `#7d776e` |
| Green primary | `#1d4d33` | `#5d9b76` |
| Green surface | `#e7efe8` | `#1f3328` |
| Chart track | `#eef1ee` | `#2e2b26` |
| Amber line | `#b58a2b` | `#d9b166` |
| Amber surface | `#fdf8ee` | `#2c2418` |
| Red text | `#8a4a41` | `#d99a90` |
| Red surface | `#fdf6f5` | `#2c1e1c` |
| Sidebar | `#14261c` | unchanged |

Four rules behind the map:
- **The sidebar does not change.** It was already dark, and it is the one element anchoring both themes.
- **Elevation reverses.** Light lifts a surface with shadow; dark lifts it by getting lighter. Cards are lighter than the canvas, dialogs lighter again. Shadows remain, at roughly half the light theme's opacity, and only for layering.
- **The chart ramp keeps its five steps in the same order, lifted:** `#5d9b76`, `#7fb392`, `#a3c9b0`, `#4a6b57`, `#39443c`.
- **Amber and red keep their meaning but swap carriers.** On light, the surface is tinted and the text is dark; on dark, the surface is barely tinted and the text carries the colour. The pace marker stays a hairline, lifted to `#d9b166` so it survives against an amber-filled bar.

Primary buttons on dark are `#5d9b76` with `#14261c` text — the green is light enough that white text on it fails contrast. Green text on a dark surface uses `#8fc0a2`, not the button green.

Theme switching lives in Settings (three preview cards) and at the bottom of the sidebar; both write the same preference, which follows the OS when set to system.

#### 12b — Images at full size

One overlay serves both order attachments and item photos, and it always knows the set it belongs to — the order's files — so navigation does not require going back.

**Chrome:** a header with the filename, its context line (vendor and date for an attachment; the item name for a photo), the position in the set ("File 1 of 3"), download, and close. Prev/next as 38px round `rgba(255,255,255,0.12)` buttons over the image edges. A footer strip of the order's other files, the current one outlined in the accent green.

**Multi-page PDFs** get a page rail on the left (`108px`, thumbnails at `aspect-ratio: 0.72`, current page outlined 2px accent) plus a "Page 1 of 3" line. Single-page files show no rail.

**Keyboard:** left/right move within the set, Esc closes, focus is trapped and returns to the tile that opened it.

**The overlay is dark in both themes.** Bright chrome around a bright scan leaves nothing to read the image edge against. What changes with the theme is the scrim — `rgba(27,26,23,0.72)` on light, `rgba(10,9,8,0.82)` on dark.

**Two rules for thumbnails on dark**, and they matter more than they sound: every image thumbnail keeps a `1px #463f37` border, because a white receipt scan with no border floats as a bright edgeless rectangle; and thumbnails render at **90% opacity**, taking the glare off without touching colour accuracy. Full opacity returns on hover and in the viewer, where the image is the subject.

---

### 13a — Typography
File: `Typography.dc.html`

The specimen is rendered at real size — measure off the file, not a screenshot. Beyond the scale (in the token section above) it fixes four things:

**Loading.** `Poppins, system-ui, sans-serif`, weights 400/500/600/700, latin and latin-ext. No italics anywhere, no 300 or 800 — a missing weight gets synthesised and the amounts stop lining up. **Self-host the four files** rather than calling Google Fonts; the mockups use the CDN for convenience only. `font-display: swap`, preload 400 and 600. The fallback runs narrower, so a swap shifts row content slightly; nothing in the layout is sized to fit text exactly, so that is acceptable.

**Danish characters.** æ ø å appear throughout vendor names, categories and receipt text, uppercase forms included in the small-caps labels. Any substitute family must carry them at all four weights.

**Tabular figures.** Poppins' numerals are proportional, so a column of amounts does not align on the decimal. Every amount in a list, table or total gets `font-variant-numeric: tabular-nums` and is right-aligned. A single amount inside a sentence stays proportional.

**Truncation, assigned per role.** User data — vendor names, item names, filenames — can be any length, and each sits in a cell that must not grow.
- *One line with ellipsis:* every list row primary, table cell, filename under an attachment tile, sidebar account name. Full text as a `title` on hover and in the detail view.
- *Two-line clamp:* item names in card views and on mobile, where the row has height to spare and the name is what identifies the line. Two lines, never three, and reserve the height whether or not the text needs it so the grid does not jump.
- *Never truncated:* amounts, dates, status pills, validation messages, button labels, dialog body. A clipped amount is a wrong amount and a clipped error is worse than none. These take `white-space: nowrap` and `flex: none`; the flexible cell beside them absorbs the shortfall. Category chips truncate the label but keep the icon.
- *`min-width: 0` on the flex child, not the text.* A flex child's automatic minimum size stops it shrinking below its content, so the ellipsis never fires and the amount is pushed out of the row. The declaration belongs on the **wrapper** that is the flex child — typically the column holding the name and its meta line — not on the truncating element itself, which already escapes the rule by having `overflow: hidden`. Two levels of wrapper means two declarations; grid cells need the same. This is the most common cause of a row overflowing on mobile.
- `overflow-wrap: anywhere` on notes and references, which can be one unbroken string. Test every list with a 60-character vendor name and a 120-character item name; both occur in real receipts.

Six standing rules: nothing below 10px (sidebar label only; 11px is the floor for anything read, always uppercase or muted); letter-spacing only increases and only on uppercase, never negative; line-height follows length (1.15 titles, 1.5–1.55 multi-line, 1 for standalone figures) with `text-wrap: pretty` on every heading and paragraph; weight carries emphasis, not colour — 600 is the strongest thing in a row, and bold plus a colour change on the same word is doubling up; mobile keeps these sizes and drops fields instead (row primaries go up to 15px, nothing goes down); and on dark, drop one step of weight where you can, since light-on-dark reads heavier.

---

### 14a–14d — Input types, buttons, palette rule, component API
File: `Input types.dc.html` · Code: `components/` (the shared control set)

**This is the component specification.** Build these before the screens; every screen composes them.

**14a — Controls and their states.** Text field, amount field, quantity stepper, search, multi-line, the combobox in both modes, segmented, checkbox, toggle, filter chips, drop zone, date, colour and icon pickers. Each shown in every state it has (empty, filled, focus, error, read-only, disabled, loading) with the rule that made it that shape.

Cross-cutting geometry: every text-entry and select control is `1px solid #dedcd4`, radius `9px`, padding `10px 12px`, 14px text — **42px tall, the canonical control height**. Controls that are not text (the stepper, combobox triggers) take `box-sizing: border-box; height: 42px` explicitly rather than sizing to content. Focus is one treatment everywhere: border `#1d4d33` plus a 3px `rgba(29,77,51,0.12)` ring. Labels are always visible at 12px/600 above the control — no floating labels, no placeholder-as-label. **A placeholder never shows a plausible value**: a grey "Transport" or "6.000" reads as a field someone already filled in. A placeholder is an instruction or the effective default in words ("Search vendors...", "No budget", "Any"), or the field simply has none — a placeholder is transient anyway, gone the moment the field has a value, so it is never where optionality lives. There are no required markers, so **every optional field says "(optional)" after its label**, muted, in the one place that survives the field being filled in or emptied again. Validation fires on blur once touched and on submit, never per keystroke.

Specifics worth not rediscovering: an error state **keeps the value** (the field being corrected is the one that failed); read-only and disabled look deliberately different (read-only keeps full contrast, disabled drops it and its copy says what would enable it); amount fields accept `4190`, `4.190,00`, `4190.00` and `4 190` and reformat on blur, and never use `type="number"`; the stepper's minus disables at 1 rather than deleting the line.

**The combobox is one component with two modes** — this is the largest single piece in the set.
- *Pick-only* (status, formats): button trigger, no search field, closed option set.
- *Searchable* (vendor, category): the trigger becomes a text input, and results are grouped **Favourites → Recent → All**, with "Create X" always last quoting exactly what was typed.
- Group headers are labels: never focusable, never selectable, hidden when their group has no matches. **Arrow keys traverse all groups as one flat list** — visual grouping must not affect traversal.
- Favourites are explicit (starred from the library, capped at five); Recent is automatic (last three used, excluding anything starred so nothing appears twice).
- **Nothing is selected by typing alone** — no inline autocomplete, no selection on blur. The user commits with Enter or a click; silent selection is how the wrong vendor lands on an order.
- Two highlight states with two meanings: the grey row is hover/keyboard focus, the green row with a check is the current value. They can sit on different rows at once. Conflating them is the classic hand-built-dropdown bug.
- Full keyboard table in the file, plus the ARIA roles (`combobox` + `aria-expanded` + `aria-activedescendant`, `listbox`, `group` per section) and a live region for the filter result count.

**14b — Buttons.** Four levels, chosen by what the action does: primary (one per view), secondary, ghost, destructive. **Destructive only exists inside a confirm dialog** — a red button on a page is always a bug, since the page-level Delete is a secondary that opens the dialog. Confirming action is always rightmost with cancel to its left, 8px gap, everywhere. Loading holds the button width, swaps the label for a spinner plus a verb, and blocks a second submit. Disabled is a last resort — prefer letting the click happen and showing what is wrong. Labels are specific verbs ("Import 41 orders", not "Confirm"). Anything that navigates is an anchor (`as="a"`), so cmd-click keeps working.

**14c — Extending the palette.** The colours follow a rule, stated in OKLCH because it is invisible in hex:
1. **Four hue families, nothing between them.** Green H 150–158, amber H 81–89, red H 27–29, neutrals H 91–101 at C ≤ 0.012. The neutrals sitting on the amber hue at near-zero chroma is why the canvas reads warm greige rather than grey — and why a true grey dropped in looks dirty beside it.
2. **Chroma falls as lightness rises.** The green ramp runs L 37.9 → 55.4 → 72.1 → 86.0 → 91.8 with C 0.069 → 0.069 → 0.052 → 0.025 → 0.011. Hold chroma flat while lightening and the pale end turns to mint.
3. **Chroma is capped at C 0.12**, and that ceiling belongs to one colour — the amber pace marker at `#b58a2b`, which must read as a 2px hairline. Picker swatches stop at C 0.08.

To add a swatch: pick a hue in an existing family or ≥40° from all four; set L in 69–86 and ≥5 L from any swatch on the same hue; derive chroma from that lightness (~0.08 at L 70, ~0.05 at L 80, ~0.025 at L 86); check it as a 26px icon tile with white and with dark ink (the glyph flips above L 75), as a 12px chart bar, and as a chip; and add the dark-theme pair in the same commit (+18 L, same chroma). Never open a free colour picker to users, and never interpolate in hex or HSL.

**14d — Component API.** Thirteen components with the options each needs and what drives them, so nothing is speculative: TextField, AmountField, Stepper, Combobox, SearchInput, Segmented, Checkbox, Toggle, DateField, FileDrop, SwatchPicker, Button, Chip.

- **All share five props** — `label`, `value`, `onChange`, `error`, `disabled` — owned by **one shared field wrapper**, which also owns the label's `htmlFor`, the required marker, the hint/error slot with `aria-describedby`/`aria-invalid`, and the spacing. Each control renders only its own box. **Error and hint share one slot** so a field never changes height when it fails.
- **Controlled only.** No internal value state, no `defaultValue` — a control holding its own copy is how a field silently disagrees with what gets saved.
- **No `variant="danger"` on an input.** Error is a boolean plus a message, which makes the red state impossible to apply for decoration.
- **Every `<input>`, `<select>` and `<textarea>` carries its own `id` or `name`, always** — a label's `for`, autofill, and a password manager all key off it, and a field with neither answers to none of them even though it looks, focuses and types exactly like one that does. A screen that needs to address a field (validation, a filter, a saved setting) names it; a field nothing else needs to name still gets one on its own, never a bare control with neither attribute.
- **Deliberately not components:** radio (every either/or here is a Segmented or Combobox), slider (an amount range is two AmountFields — a receipt total is typed, not dragged to), autocomplete / tag input / rich text / native select (all are the Combobox, Chip list, or multiline TextField), and Form (each screen's save behaviour differs, so screens compose the wrapper and controls directly).
- Build order in the file: wrapper + TextField + Button, then Combobox, then AmountField + Stepper together, then the small four the order list needs at once, then the rest. Each control ships with the states from 14a as its acceptance criteria.

---

### 15a / 15b — Layout rules
File: `Layout rules.dc.html`

**The rule behind every screen: one fluid column per layout, everything else a fixed pixel width.** The main column is `1fr`; rails, navs and facet columns are fixed. Two fluid columns means neither has a predictable width, nothing inside either can be sized with confidence, truncation stops being predictable, and the first long vendor name reflows the page.

Gaps, not margins, set on the container: `24px` between columns, `14px` between stacked cards, `16px` in a card grid, `12px` between fields.

**Four column shapes cover the whole set:**
1. **Main + right rail** (1a, 1d, 10a). Rail widths are **320 / 360 / 400** and nothing between — 320 for a read-only summary, 360 for a form rail, 400 for a panel that is itself a form. The rail stays shorter than the main column.
2. **Left rail + main** (2a, 11a). Facets `260px`, page-level nav `208px`. A left rail is always narrower than a right rail because it holds controls, not content. Below 1280px it becomes a drawer rather than compressing.
3. **List + panel** (5a, 5b). The panel never collapses — with no selection it shows the roll-up, so the column width is constant whatever is selected. Below 900px they become separate views with a back action, never stacked.
4. **Card grid** (2c, 4a). Order cards `repeat(auto-fill, minmax(280px, 1fr))`; Statistics on a 12-column grid where every card spans a whole number of columns so rows always close.

**Fields — full width or a fraction.** The test is the content, not the importance: full width when the content has no predictable length (vendor, item name, reference, notes, search, drop zones); halves when two *bounded* values are read together (date + status, currency + format); **thirds exactly once** — quantity × unit price = line total, because the row is an equation; never four in a row (each cell falls under 80px in a 360px rail). A control with an intrinsic width takes `flex: none` at its own size and the field beside it takes the remainder with `min-width: 0`.

**Always full width of its container:** tables and item lists, drop zones, progress bars, the sticky save bar and bulk-action bar (full width of the *main column*, not the page), and cards. **Never full width on desktop:** buttons, body text (capped 640px prose / 900px description), a form column (Settings caps at 640px even at 1920px), segmented controls / chips / steppers / swatch rows (intrinsic width, `align-self: flex-start`), and dialogs (440px) and popovers (560px).

**Rows:** height from padding (12–14px, 8px compact), never a fixed height. Columns fixed except one — vendor 200px, date 110px, items 72px, category 160px, status 120px, amount 120px right-aligned — with one fluid cell absorbing the slack, which is what keeps every value at the same x down the list. Second lines never displace the first. One grid definition shared with the header, declared once. An expanding row pushes, never overlays.

**15b — Fields on mobile.** A four-step test, in order: (1) is it one calculation or one object? keep it grouped; (2) would any part fall under 100px? stack it regardless — three fields at 375px is 105px each before gaps, the hard floor, and why nothing keeps thirds on a phone; (3) does one part have an intrinsic width? fixed + fluid, not halves; (4) otherwise full width, which is the right answer for most fields.

What survives the breakpoint is short enough to name: the item equation (as fixed + fluid, with the computed third becoming a **total line** rather than a field — a read-only box on a phone is a target that does nothing), the photo row with its controls, and the icon-plus-name field. Control padding goes from `10px 12px` to `12px`, taking the height from 42px to 46px without changing type size; field gap goes 12px → 14px.

Also below 640px: buttons in a sheet go full width and stacked (the only correct full-width button); dialogs become bottom sheets; comboboxes become full-screen sheets with search at the top above the keyboard; segmented controls may go full width; the save bar spans the viewport respecting the safe-area inset; labels stay above their fields at every width.

**15c — which numbers are real.** A mockup has to be *some* width to be drawn, so these files carry pixel values that are scaffolding, not specification. **Do not lift widths off the mockups.**

*Real, build to these:* the fixed rail widths (320/360/400 right, 260 facets, 208 page nav, 248 sidebar, 68 collapsed); control and row geometry (42px control height, 46 on touch, 12–14px row padding, 8 compact, 44px minimum target); the table column widths (vendor 200, date 110, items 72, category 160, status 120, amount 120); all gaps and paddings; all radii, type sizes, borders and shadows; the caps (640 prose and form columns, 900 description, 440 dialog, 560 popover, 232 account menu); and the minimums (560 main column, 280 order card, 100 mobile field floor, 80 desktop equation cell).

*Mockup only, ignore:* the **1400px shell frame** on 9a and 10a (a stand-in for a viewport, and the source of the rounded corners and shadow that are also not part of the design); **every card width on the reference pages** — 430, 470, 520, 560, 620, 700 — which exist so annotations sit beside their subject; fixed heights on demonstration boxes; **side-by-side comparison columns**, where states shown in a row are sequential in the app and never share a screen; the 375px phone frames (representative, not a target — the phone layout must hold 320→430); the 1180px Settings shell and 1320px inventory tables; and all review furniture (id badges, annotation rules, state headings).

**The test:** does the number describe a thing, or the space around it? A rail is 360px because a form needs 360px — that travels. A card is 430px in these files because two of them plus a gap fit the page being drawn on — that does not. Put differently: **every fixed width in the app is on something that holds controls** (a rail, a nav, a dialog, a table column); everything that holds *content* is fluid, with a minimum and sometimes a maximum.

**How to write it:** `min-width`, not `width` (the main column is `1fr` with `min-width: 560px` and never has a width of its own); `repeat(auto-fill, minmax(280px, 1fr))` rather than a column count — nothing anywhere says "three across"; `max-width` for reading as a ceiling, not a size; **container queries over viewport breakpoints** for anything inside a column, so a field grid stacks because *its column* got narrow rather than because the window did (that is what lets the same form work in a 360px rail and a 640px page); and height from content and padding, with no fixed heights outside the deliberate 42px control.

**Verify at 1920, 1440, 1280, 1024, 900, 768, 430, 375, 320** — each crosses a breakpoint, a rail's disappearance, or a minimum. The two that catch the most: **1024**, where the facet rail has gone but the two-column layout has not, and **320**, where the mobile field floor bites. Also check **1920 with the sidebar collapsed** — the widest the main column ever gets, where a missing max-width shows up as a 1700px line of 13px text.

**Both breakpoint tables share one principle: every step removes or relocates something. Nothing is scaled down.** A compressed facet rail, a four-column equation at 300px, and a desktop table squeezed into a phone row are the same mistake.

---

### 16a–16c — Actions inventory
File: `Actions inventory.dc.html`

**The completeness check.** Compiled by walking every mockup rather than from memory: each control drawn, what it does, and what the user observes afterwards. Use it as the checklist when a screen is built — if a control on the screen isn't in this table, its behaviour was never decided.

Two rules the audit confirmed hold across the whole set, and which are worth enforcing in review:
- **Every destructive action has exactly one dialog; every reversible one has exactly one toast.** Nothing has both, nothing has neither. Dialogs: delete order, bulk delete, merge, discard scan. Toasts: line delete, status change, category add, archive, import.
- **Every "See X" link is a filter handoff, not a new view.** See in Statistics, Open in orders, the Needs-a-look rows and the monthly summary rows all carry state into a screen that already exists. No screen is reachable through only one link.

Also stated here: **global actions live in the shell, page actions do not.** Scan receipt and New order sit in the top bar because they belong to the app, not to the open page — that is not an exception to the locked-shell rule, which is that a page may not put *its own* actions there.

**16b — ten controls that were drawn with no behaviour described anywhere.** Seven are resolved outright:

| Control | Resolution |
| --- | --- |
| Export CSV / Export | Appeared on four screens meaning four things. One behaviour: exports **the current filter or drill state**, never the page and never the account, with the count in the button label. Same column set the importer reads, so export/import round-trips. |
| Save current | Saved views store query + facets + sort under a name, listed above the facet rail. Stores **the filter, not the result**. Never shared — one user. |
| Archive (vendor/category) | The middle option between keeping and deleting, and the answer to 5c's "no orders in 12 months". Hides it from lists and pickers; orders, totals and history untouched. Reversible, so toast + Undo. |
| Copy last order (Home) | 8a's copy applied to the most recent order without opening it. Same rules (no date, status or attachments), opens unsaved. Hidden when there are no orders. |
| Reuse mapping | Applies a previous import's mapping to the new file by column name. Always lands on the **mapping step** with rows pre-filled, never straight to preview — same headers can still mean different data. Unmatched columns are flagged. |
| Change password | A dialog (current / new / confirm), not inline fields, so it is never half-filled in a card that saves other things. Success is a toast; **other sessions stay signed in**. |
| Open full size (scan review) | The 12b viewer with the receipt as its only file, so small print is readable without leaving review. Panel edits untouched. |

Three needed a product answer and are drawn as proposals in 16c: **See theirs** (the two-tab conflict), **duplicate name** (warn vs block), and **export format** (recommend CSV only, UTF-8 with BOM so Excel opens Danish characters, user's number format).

**16c — the six that needed layout**, all composed from existing parts:

1. **Saved views** — above the facets, because a view *is* a filter. Live counts. Editing filters while a view is active drops the highlight and offers **Update view** beside Save current, so a view is never silently rewritten. Save prompts for a name pre-filled from the active chips.
2. **Archived state** — an "Archived" toggle with a count in the search row; archived rows render at 62% with a badge (same reasoning as dark-mode image tiles: present, not competing). The panel footer states plainly that the orders survive, since "archive" reads easily as "delete quietly". Restore is one click, no confirm. A category keeps its limit while archived and drops out of the limits card.
3. **Change password dialog** — 260px, reveal control on the current-password field only, strength advisory and **not gating the button**.
4. **Export popover** — states the scope in words ("128 orders · 412 lines" plus the active filters named). Row shape is a **Segmented** (one item line / a whole order), matching 11b's identical control. Line-per-item is the default because it round-trips through Import.
5. **See theirs** (proposal) — lists **only the differing fields**, with a count in the sentence above and a "saved" row (yours: unsaved, 2 min of edits; theirs: 4 min ago) so the choice is informed. Lines collapse to a count; the totals row is what tells you which version is right. **Keep mine** is primary — you are the one looking at the screen and your edits are the unsaved ones. No third button, no field-level merge.
6. **Duplicate name** (proposal) — amber, field **not** in an error state, Save never disabled: two vendors can genuinely share a name, and a tracker that refuses to record reality is worse than one holding a near-duplicate. Shows the existing vendor's order count and last-used date, which is what makes the choice decidable. Fires on blur on the same rule as duplicate detection (normalised similarity above 0.85); creating anyway surfaces the pair in 5c's possible-duplicates list.

**There is no Radio component** (14d). Every either/or is a Segmented (2–3 options) or a Combobox (more). Anything drawn as a radio anywhere in the set is a bug.

---

### 17a / 17b — Images and files
File: `Images and files.dc.html` · Code: `components/FileInput.jsx`, `components/fileKinds.js`

**Four places take a file — item photo (one per line), order attachments (many), receipt scan (one), avatar (one) — and they are one FileDrop component with different `accept`, `multiple` and `compact` settings.** Do not write four uploaders.

**Lifecycle.** Validate in the browser first (extension *and* sniffed magic bytes, then size; rejection renders inline on the zone, which stays usable). Show the tile immediately from a local object URL, before the network is touched — the progress ring is drawn over that preview, never over a grey box. Upload to **staging**, which returns an id; the order draft holds the id and nothing is attached to a record yet. The server derives EXIF-corrected orientation, a metadata-stripped copy, a thumbnail, and a first-page render for PDFs; HEIC is converted for display and the original kept as uploaded. **Saving the order commits the ids**; files uploaded to a draft that is never saved become orphans, cleaned after 24 hours.

That 24-hour window is what makes immediate upload safe, and it is also why Undo on a delete always works — removing a file from a draft only drops the id, so nothing was actually deleted yet.

**Replace uploads first, then swaps the reference, then releases the old file.** If the upload fails the old image is still there and the tile says so. During a replace the tile shows the **old** image dimmed under the progress ring, not an empty slot — the user must be able to abandon the page mid-replace and still have their original.

**Delete.** An item photo the user added: removes at once, toast + Undo, no dialog. An item photo or attachment that came from a scan: confirms first, because it is evidence the user did not create and cannot re-take. Deleting the order: the dialog names the attachment count.

**Three shortcuts that fail, called out because they are the tempting ones:**
1. *Uploading on save.* A 12 MB receipt on hotel wifi turns Save into a thirty-second freeze with no feedback, and a failure there loses the whole form, not just the file.
2. *Attaching straight to the record on drop.* Writes to an order the user may abandon, and gives an unsaved order server state. The staged-id approach gets the immediate upload without the write.
3. *Replace as delete-then-upload.* Turns a non-destructive action destructive whenever the network hiccups.

**Attachments have no replace — only add and delete.** A receipt is evidence of one purchase, and swapping the file behind an unchanged filename is how a record starts lying. Item photos *do* replace, because a photo is illustration.

**Source menu** (17b). Clicking an empty item-photo slot, or Replace, opens a menu: **Take a photo**, **Choose a photo**, and a separated **Use the receipt** which opens a page picker so a crop of an existing attachment can become the item photo. Dropping a file bypasses the menu. The menu **adapts rather than branches**: Take a photo is absent (not disabled) where there is no camera; Use the receipt appears only when the order has an attachment; and with one source available the menu is skipped and the picker opens directly — so on desktop with no attachment, clicking the slot opens the file picker with no menu at all.

**One picker entry, not two.** "Choose a photo" and "Choose a document" would be the same dialog on desktop, and an item photo accepts images only. On mobile the single entry opens the photo library. The attachment strip is the opposite case — it accepts PDFs, so its picker entry opens the file browser. The `accept` list decides which; a second menu row never does.

**States drawn in 17b:** empty, filled at rest, hover with replace/delete (28px on desktop; permanent 44px labelled buttons on touch, per 15b), the source menu, uploading/replacing, and failed. Plus the attachment strip with mixed states in one row.

**Failure is per file, never per batch.** Drop five with one rejected: four upload, the fifth keeps its tile with the reason and a Remove. The reason is specific — "Too large", "Not a supported type", "Upload failed" — because "Error" does not tell the user whether to retry or pick a different file.

Also everywhere: navigating away mid-upload prompts with the count of uploads in flight (the sticky-save prompt alone does not mention files); a duplicate file on one order warns but does not block, as two photos of one item are legitimate; on dark every thumbnail keeps a `1px #463f37` border at 90% opacity, returning to full on hover and in the viewer; and **never a full-screen blocking overlay for an upload** — progress belongs on the tile and the rest of the form stays editable.

---

### 16a / 16b — Responsive reference
File: `Responsive reference.dc.html`

**Read this before implementing any layout.** Every other file in this bundle is a static canvas drawn at one width, with fixed pixel values and no queries — nothing about narrow behaviour can be read off them. This page is the exception: the layouts in it genuinely respond, and the CSS is printed beside each one. **Where a static mockup and this page disagree about a narrow layout, this page wins.**

**Container queries, not media queries.** Every rule keys off the width of the element's own container (`container-type: inline-size` on the layout wrapper), not the viewport. The same components sit in a 1fr main column, a 360px rail and a 400px panel — a viewport query gets all three wrong at once. Media queries are correct for exactly two things: the shell breakpoint that turns the sidebar into a tab bar, and print.

**Thresholds are container widths, not viewport widths.** 900 on a main column inside a 248px sidebar plus 48px padding is a viewport around 1244. Don't translate them — put the query on the container and the numbers work out.

**Four thresholds exist in the whole product:** `1280` (a left rail leaves the layout), `900` (two columns become one), `640` (rows become cards, dialogs become sheets, field grids collapse), and the shell's own `640` viewport query. A fifth threshold is a design change, not an implementation detail.

**16a — working layouts with their CSS.** Four demos, each in its own container: main + right rail, left rail + main, the row table, and the field grids. Points that only a working example makes clear:
- `order: -1` moves the collapsed rail **above** the item list, not below. A form appended under forty item lines is somewhere nobody scrolls to.
- The rail collapses to a **summary line that states its own contents** ("Indbo Møbler · 12 Aug · Received") — same element, two children, one shown at a time.
- `minmax(560px, 1fr)` on the main column is deliberate: it refuses to go under 560 and overflows instead, surfacing the problem in development rather than silently crushing the rows.
- The list's two thresholds are **independent** — at 1000px the facets are a drawer but the table is still a table. Chaining them into one breakpoint produces the cramped intermediate state.
- **One row markup, two presentations.** Desktop cells carry `.hide-m`, phone lines carry `.m2`, both always in the DOM. Two separate row components drift apart within a sprint.
- The computed third of the item equation is **replaced, not moved**: the read-only field hides and a total line shows. A box you cannot type into is a target that does nothing.
- Only padding changes for touch — `10px 12px` → `12px`, taking 42px to 46px. Type sizes never change between desktop and phone.

**16b — per-screen table.** One row per screen, three columns (at 1280 / at 900 / at 640), with an empty cell meaning the layout is identical to the column on its left. Covers the shell, order read and edit, the list, create, statistics, the library, home, settings, import, the viewer, dialogs and the combobox.

Three places horizontal scroll is allowed: the import dry-run preview table, the attachment strip, and the budget sheet, whose twelve months across are its whole layout. Nowhere else.

**Acceptance, per screen.** At each of `1440 · 1280 · 1024 · 900 · 768 · 640 · 390`: no horizontal scroll except those three, no text under 11px, every target ≥44px below 640, no overlap, and the sticky save bar reachable without the keyboard covering it. The two widths that catch the most problems are **1024** (a rail has left but the table has not yet become cards) and **390** (the narrowest phone that matters).

**Build the four container-query wrappers first**, as four layout components. Every screen then picks one and fills it — screens that hand-roll their own grid are how a fifth threshold appears.

**Side-by-side panels in the other files are annotation, not layout.** Columns headed "1 — pick a file", "empty" / "loaded", or "light" / "dark" are never on screen together. Don't build a responsive row out of them.

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
| Switching "each row is" in import mapping | Item fields collapse or return; the order count changes |
| An unmatched value left unresolved in import | Import is blocked until it is picked or created |
| Import finishes | Skipped rows downloadable; whole import undoable for 24h |
| Theme switch (Settings or sidebar) | Both controls write one preference; system follows the OS |
| Click an attachment tile or item photo | Viewer opens on the order's file set |
| Left / right in the viewer | Moves within the set; Esc closes, focus returns to the tile |

## State

Per screen, roughly what needs to exist:

- **List:** query string, selected facets (multi-value per group), sort, page and size, view mode (rows/cards), selection set. All except selection belong in the URL so a filtered list is linkable and survives reload; view mode also persists per user.
- **Order edit:** the order draft, a dirty flag, `editingLineId`, the line order array, per-field validation errors, and pending file uploads. Autosave is deliberately absent — saving is explicit.
- **Scan:** stage (`idle` / `uploading` / `reading` / `review` / `created` / `failed`), the file reference, the proposal with per-field confidence, and the user's overrides — kept separate from the proposal so "what the scan said" is still available in review.
- **Statistics:** period, compare flag, and the drill crumb stack; all URL-encoded.
- **Library:** selected record id (null shows the roll-up), the form draft, and the merge target.
- **Settings:** per-card draft and dirty flag (never one form-wide dirty state), and the status list's order.
- **Import:** stage, the parsed file, the column map, the row-shape choice, unresolved value matches, the dry-run result, and the import id that makes undo possible.
- **Viewer:** the file set, index within it, and page index for a paged file.
- **Global:** toast queue, dialog, command palette open state, sidebar collapsed, and the theme preference (light / dark / system).

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
| `06-states-confirmations.png` | 6a–6f |
| `07-mobile.png` | 7a |
| `08-duplicate-alerts.png` | 8a, 8b |
| `09-navigation-shell.png` | 9a, 9b |
| `10-home.png` | 10a |
| `11-settings-import.png` | 11a, 11b |
| `12-dark-mode-viewer.png` | 12a, 12b |
| `13-typography.png` | 13a |
| `14-input-types.png` | 14a–14d |
| `15-layout-rules.png` | 15a–15c |
| `16-actions-inventory.png` | 16a–16c |
| `17-images-and-files.png` | 17a, 17b |

Full-page PNG at 2× device pixels (roughly 4100px wide; `14-input-types.png` is the one exception, capped at 1.44× because the page is 8300px tall), so panels and 11px labels stay legible when zoomed. Still for orientation and review only — measure nothing off them; the values in this document and the HTML files are the source.

## Assets

No external assets. All icons are inline SVG drawn for these mockups on a 16×16 viewBox, stroke-only — replace with the codebase's icon set at matching weight. Photo and attachment thumbnails are placeholder blocks; the real ones come from uploads. `Poppins` is loaded from Google Fonts in the mockups; use however the app already loads fonts.

## Files in this bundle

| File | Screens |
| --- | --- |
| `DECISIONS.md` | Rationale and rejected alternatives |
| `BEHAVIOUR.md` | Edge cases, precise rules, open questions |
| `index.html` | Linked overview of everything below — start here |
| `Home.dc.html` | 10a |
| `Navigation shell.dc.html` | 9a, 9b, 9c |
| `Order editing layouts.dc.html` | 1a, 1b, 1c, 1d |
| `Order list.dc.html` | 2a, 2b, 2c |
| `Order create.dc.html` | 3a |
| `Order statistics.dc.html` | 4a |
| `Vendors and categories.dc.html` | 5a, 5b, 5c |
| `States and confirmations.dc.html` | 6a–6f |
| `Mobile screens.dc.html` | 7a |
| `Duplicate and alerts.dc.html` | 8a, 8b |
| `Settings and import.dc.html` | 11a, 11b |
| `Dark mode and image viewer.dc.html` | 12a, 12b |
| `Typography.dc.html` | 13a |
| `Input types.dc.html` | 14a, 14b, 14c, 14d |
| `Layout rules.dc.html` | 15a, 15b, 15c |
| `Actions inventory.dc.html` | 16a, 16b, 16c |
| `Images and files.dc.html` | 17a, 17b |
| `support.js` | Preview runtime for the files above — not part of the product |
| `screenshots/` | Full-page capture of each file (see above) |

## Suggested order of work

0. Answer the open questions in `BEHAVIOUR.md` that affect the screens you are starting with — 1, 2 and 3 for order edit; 5 and 6 for statistics.
1. Shell and tokens (9a) — everything else sits inside it, and the token set is small enough to land in one pass.
2. Order edit and inline item editing (1b, 1c) — the original problem, and the highest-traffic screen.
3. Order list with facets (2b, 2a) — unblocks navigation to everything else.
4. States and confirmations (6a–6d) as shared components, before they get reinvented per page.
5. Scan flow (3a, 6e).
6. Library (5a–5c), then Statistics (4a), then Home (10a), which mostly composes pieces the earlier steps produced.
7. Mobile passes (7a, 1d) alongside each screen rather than at the end.
8. Settings (11a) and Import (11b) — Settings is small once the token layer exists; Import is the largest single piece in the set and depends on nothing else.
9. Dark mode (12a) last as a token pass, not a rebuild — if it needs component changes, the token layer was not clean. Do it before shipping, not after; retrofitting a theme is far more work than building against one.

The foundation files (13a, 14a–14d, 15a–15b) are not steps — they are what every step is built against. Read 16a before writing any layout and 14d before any component; they are the two that stop the same decision being made differently on each screen. Use 16a as the per-screen checklist as you build — a control not in that table is one whose behaviour was never decided. Typography (13a) and the image viewer (12b) are likewise not steps — 13a is the reference you build every screen against, and 12b is a shared component that steps 2 and 5 both need.
