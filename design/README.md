# Handoff: Spendly order flows

> **The frame around a mockup is not part of the design.** The full-shell mockups (9a, 10a) sit inside a rounded, outlined card with a drop shadow at a fixed 1400px width. That card is presentation only — it exists so the mockup reads as a window on the page. In the app the shell fills the browser viewport edge to edge: square corners, no outer border, no shadow, the sidebar running the full window height and the content column meeting the window edge. Any fixed pixel width on a full-page mockup stands in for a viewport.

## Overview

Spendly is personal receipt and order tracking for a single user: capture a receipt, keep the order and its item lines straight, and see what it added up to per month, vendor and category.

This package covers the whole surface that work touched: the app shell, the home page, the order list, order read and edit, creating an order from a scanned receipt, statistics with drill-down, the vendor and category library, the states and confirmations that sit across all of it, the phone layouts, settings, file import, the dark theme, the full-size image viewer, and the foundation references — typography, the control set, and the layout rules.

The change that started it: on the order edit screen the order header used to sit above the item list and eat most of the viewport, while the actual work is nearly always adjusting item lines. The header moved into a right rail, so the item list owns the width and starts near the top of the page. Everything else follows that same two-column shape.

Target repo: `mm98/Spendly`, branch `main`. The mockups live at `design/` there. Existing React source referenced through this document is under `react/src`.

## The contract

**This design set is the only source of truth for the UI.** Where it specifies something — a value, a state, a piece of copy, an ordering, a behaviour — implement exactly that. No approximating, rounding, improving or substituting. If two files disagree, the markup wins — see the precedence rule below.

**Reproduce the markup, as components.** The structure, element order, nesting, spacing values, colours and text in each screen are the specification, not a suggestion of one. Lift them, then factor the repeated parts into the components named in 14d — same output, better structure. Don't redraw a screen from a written description of it; the description exists to explain the markup, not to replace it.

**When two files disagree, the `.dc.html` markup wins.** The mockup is the design; this document is prose describing it and can drift behind an edit. Report what you found so the prose gets fixed — but build the markup, and don't block on an answer. Two exceptions. `Responsive reference.dc.html` outranks every file on layout that varies with width — it is the only one carrying working responsive CSS, and a static canvas cannot express reflow. And where a file states a rule in prose beside its own markup, the rule governs: the 2c mockup renders four cards across because four fit that canvas, not because the count is four.

**Where the design states how something works, follow it.** Don't propose an alternative, ask whether it was intended, or flag it as a possible improvement. The reasoning is already recorded in `DECISIONS.md`, including what was rejected and why — read the entry before assuming a rule is an oversight. Rules that look like mistakes and are not: a limit never blocks a save, reorder needs both drag and buttons, thirds appear exactly once, destructive buttons exist only inside dialogs, the top bar takes no actions at all.

**If something is not specified, stop and ask.** A missing state, an unnamed error case, a field with no defined behaviour — these are gaps in the design, not invitations to invent. `BEHAVIOUR.md` ends with a list of open questions for exactly this reason; add to it rather than guessing. Ask about silence, never about instructions.

**The data is fake, the shapes are real.** Every vendor, amount, date, category and count in these files is illustrative. Wire real data to the same shapes. Don't hardcode "Indbo Møbler", 7.635,00 or 41 orders, and don't treat a sample count as a limit — five facet values shown does not mean five exist.

**Copy is final.** Button labels, empty-state sentences, dialog titles and hint text are written deliberately. Use them verbatim. Don't reword, shorten, expand or add exclamation marks. Where copy is missing for a state, that is an open question, not a writing task.

### How to build one screen

Working from this document's description of a screen instead of from the screen itself is what produces approximations. **The prose here explains the markup; it does not replace it.** Every screen section below tells you which file and which id — go and read that markup.

1. **Open the `.dc.html` and find the section whose badge matches the id.** Read it top to bottom before writing anything. Every value you need is an inline style in that markup.
2. **Transcribe, don't estimate.** `padding: 10px 12px` is 10px 12px. `#1d4d33` is `#1d4d33`. If you are about to write a number that does not appear in the file, stop — that is a guess.
3. **Copy text is a string literal from the file.** Select it; don't retype it from memory.
4. **Factor into components after the markup renders correctly**, not before. Get it identical, then extract.
5. **Diff against `screenshots/` at the same width** — walk the elements in order and confirm each is present, not "does it look similar".

State which screen id you are implementing before starting it, and list what the file did not answer. An empty list on a screen you have not read is the failure this procedure exists to prevent.

---

## If the files will not open

`offline/` holds every screen bundled as a single self-contained file — React, the preview runtime and the Poppins webfont all inlined. They open from disk with no network access and no sibling files, which is what a sandboxed agent needs. Same filenames, same screen ids, and the relative links between them still work, so `offline/index.html` navigates the whole set.

Use `design/` when you have a normal browser and want the smaller files; use `offline/` otherwise. They are the same designs — the bundling changes nothing about the markup.

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

Neutrals — a warm greige family, not grey. This is the surface identity of the app.

| Value | Use |
| --- | --- |
| `#eceae4` | App background (page canvas behind cards) |
| `#f2f1eb` | Secondary surface: reference-table headers, empty photo cells. **Not** the order list's column header, which has no fill |
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
| Display | 34–36px / 600 | line-height 1.15, `text-wrap: pretty` — greetings and auth/first-run headings only; **there are no page titles** |
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

1. **The top shell is locked.** It carries **search only** — no page title, no breadcrumb, and **no actions at all**, page-level or global. Everything the app can do lives inside a page or in the sidebar. This is a hard constraint from the existing product, not a preference: it is why the edit screen has a sticky save bar, the list puts bulk actions above itself, and capture is reached from Home and the sidebar rather than a shell button.
2. **A monthly limit never blocks a save.** Red blocks, amber informs. Exceeding a category limit is a fact about the month, not a validation error.
3. **Nothing saves by itself.** Scans propose values, they never overwrite silently. A duplicated order opens unsaved and can be abandoned.
4. **Numbers answer the current filter.** Totals and counts in a filtered list describe what is on screen, not the whole account.
5. **Single user, personal receipts.** No item catalogue, no shared editing, no permissions. A conflict means two browser tabs, not two people.

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
- The sidebar keeps `#14261c` in **both themes** (see 12a) — it is the one element that does not participate in theming, which also means it needs no theme work.

### The top bar

**Locked. No page actions may be placed here** — see global rule 1. There is no page title because the sidebar's active row already names the area, and a record's name is the page's own heading inside the content column. It carries **search only**: one field, 420px fixed, left-aligned and flush with the content column's padding so it sits on the same x as the page content below it. It does not scroll and it does not change per page beyond its text. Every action a page offers lives inside the page: that is why the edit screen has a sticky save bar at the bottom of its content column, why the order list puts bulk actions in a bar above the list, and why Settings saves per card.

### The content column

- One scroll container, `48px` padding (`20px` on mobile).
- **Scroll position resets to top on navigation**, and is restored when returning to a list via the browser back button — a user who scrolled to order 80, opened it, and came back should land where they were.
- **Sticky elements inside it** — the save bar on order edit, the bulk-action bar on the list, table headers — are `position: sticky` relative to *this* container, not the viewport. This only works because the container is the scroller; it is the main reason for the layout above.
- The two-column screens (order edit, order list, the library) lay out **inside** this column: main `1fr` plus a fixed rail, `24px` gap. The rail scrolls with the content, not separately. There is no second scrollbar anywhere in the app.

### Breakpoints

**These are viewport widths, and they govern the shell only** — whether the sidebar is expanded, whether the facet rail is a drawer, whether two columns stack, whether the phone layout applies. **They do not govern any table's columns.** A table's columns drop on the width of the column it sits in, which is a different number: at a 1280px viewport with the sidebar expanded and the rail present, the list column is 652px. 2i's widths are list-column widths and are labelled as such; the collision of "1280" meaning two different things is the trap. Shell → media query on the viewport. Everything inside a page → container query on its own column.

| Width | What changes |
| --- | --- |
| ≥ 1280px | Full layout. Sidebar expanded by default. |
| < 1280px | Facet rail on the order list becomes a drawer; sidebar may collapse to the 68px rail. |
| < 900px | Two-column screens stack: rail content moves above or below the main column per screen (order edit collapses its rail into a summary section; the library switches to list-then-panel navigation). |
| < 640px | Phone layout. Sidebar becomes a bottom tab bar, the top bar keeps only search, sheets replace inline expansion, and the capture FAB appears. |

**On mobile the sidebar is not a drawer by default** — the five primary destinations become a bottom tab bar, and Settings and the account move into a "More" destination. A hamburger drawer would put the most-used navigation two taps away on the device where capture matters most.

### What is global, and lives in the shell rather than any page

- The toast queue (bottom-centre, one at a time).
- The dialog layer and its scrim.
- The command palette (⌘K / Ctrl-K).
- The theme, applied before first paint from the persisted preference.
- Keyboard layering: Esc closes the topmost layer — sheet, then dialog, then palette, then an inline edit.

---

## Screens

### 20a–20e — Sign in, register, and first run
File: `Auth and first run.dc.html` · Code: `features/auth/`

**Registration is open** — anyone can create an account. No invite, no admin approval. The product is single-user personal receipt tracking, so there is nobody to invite you.

**20a — Sign in and register.** Email and password, one card centred on the canvas. Sign in shows one error for a wrong email *or* a wrong password ("That email and password don't match") — naming which was wrong tells an attacker which half to keep. Register asks name, email, password, and **no confirm field**: the reveal toggle does that job, and a second box only catches a typo made twice identically while costing everyone the extra entry. Paste is never blocked — password managers are the main route to a strong password.

**20b — Confirming the address.** Registration lands on a holding page, not Home. The emailed link hits `/confirm/:token` with four states: valid (confirms, goes to first run), already used (says so, offers sign in), expired (offers a resend), malformed (offers a resend). **An unconfirmed account can sign in and look around**, with a banner at the top of the content column — but capture is held, because a scanned receipt attached to an unreachable address is data nobody can recover.

**20c — Forgotten password.** Asks for the email and shows the same message whether or not the account exists. `/reset/:token` has the same four states as confirm, then the password form with the strength meter from 14a. Six wrong sign-in attempts locks for fifteen minutes and says exactly that, with the countdown — a lockout with no stated duration reads as a permanent ban.

**20d — First run, two questions.**
1. **Currency and number format**, prefilled from browser locale, with a live preview showing `1.234,50 kr.` beside a formatted date. The preview is the point: it shows the consequence of both fields at once, so neither has to be understood in the abstract.
2. **One category**, as single-select rows with icon tiles, plus "Something else…" which opens the name field and 5b's icon picker. Deliberately one, not a grid — a grid invites picking all of them, and then the facet list is full of empty categories on day one.

Then **Home, day one**: capture is the only prominent action, the month card reads `0,00 kr.` with an empty track and an invitation to set a limit *later*, and the category card echoes what step 2 produced. **The monthly limit is not asked during onboarding** — a limit set before any spending is a guess, and the pace marker against a guessed limit teaches the wrong thing.

Both steps are skippable and say so. Skip keeps the locale currency and creates the suggested category.

**20e — Where these sit in the chrome.** Three levels, and none of them are popups:

| Level | Chrome | Which routes |
| --- | --- | --- |
| 1 | None — card centred on the canvas | `/signin`, `/register`, `/confirm`, `/confirm/:token`, `/reset`, `/reset/:token`, `/welcome` |
| 2 | Full shell; unconfirmed adds a banner | `/` and every other app route |
| 3 | Dialog over the shell | Session expiry only |

**Two layout components, not one shell with pieces hidden.** An `AuthLayout` and the `AppShell` from 9a. Rendering AppShell with its sidebar suppressed leaves the sidebar's data hooks mounted and fetching for a user who may not exist yet.

**First run uses AuthLayout despite the user being signed in.** A sidebar reading "0 orders · 0 vendors" beside a question about currency is navigation to nowhere, and the currency answer changes how the shell renders every amount.

**Routing rules:** an unauthenticated hit on any app route redirects to sign-in **carrying the intended path**, and lands there afterwards — a receipt link shared to yourself should open that receipt, not Home. A signed-in user hitting `/signin` goes to Home. A signed-in user who has not finished first run is redirected into it from every app route. Session expiry is the one dialog, because there *is* something behind it worth not losing: signing in from the dialog returns to the same route with state intact, and "Later" leaves the app read-only so an in-progress order can be copied out.

---

### 9a / 9b / 9c — Navigation shell
File: `Navigation shell.dc.html` · Code: `App.jsx`, `components/Nav.jsx`, `components/Shell.jsx`

**Purpose:** the frame every page renders inside.

**Layout:** fixed left sidebar `248px`, content area fills the rest with `48px` page padding. Sidebar background `#14261c`, `20px 14px` padding, column with `4px` between rows.

**Two greens, two meanings, not interchangeable.** `#1d4d33` is the primary action — Scan receipt in the nav, and the capture tile on the collapsed rail. `#1f3d2c` is the active destination — the row you are on, and the account block. Scan receipt is a button, so it is filled on every screen; that is not an active state and it never moves. The account block is filled for the same reason a card has a surface, not because it is selected. Using the destination fill for the action makes Scan receipt read as "the page you are on".

**Sidebar rows:** `9px 10px` padding, radius `9px`, icon 17px then 14px label, `11px` gap. **The brand row is the same footprint**, so its mark sits on the same vertical line as every nav icon and the active fill's rectangle is the one the brand row occupies. The brand keeps its filled tile: a 26px rounded square with negative side margins, so it centres on the 17px icon column and overhangs evenly rather than pushing the wordmark out of line. Idle text `#c3d2c8`; hover fill `rgba(255,255,255,0.05)`; active is fill `#1f3d2c` with `#fff` text. A count sits right-aligned in each row at 11px `#a9bdb1`.

**Order:** Home, then `Scan receipt` (primary green) and `New order`, then section label `ORDERS` (10px, `0.14em`, `#7d9186`, padding `16px 8px 4px`) with Orders / New order, then `LIBRARY` with Statistics / Vendors / Categories. Settings sits below a spacer, then the account block: fill `#1f3d2c`, radius `9px`, `10px` padding, 32px circular avatar `#4f7f63` with white 12px/700 initials (the IdentityMark ladder is 22/8, 26/10, 32/12, 40/15, 56/20 — type 2.7× smaller than the mark, or two initials touch the edge), name 13px/600 `#fff`, then the email at 11px `#a9bdb1`, chevron right (`flex: none`). **There is no company name on an account, so line two is the email** — split into two spans so the local part shrinks with `text-overflow: ellipsis` while the `@domain` is `flex: none`. Truncating from the right would hide the part that says which account is signed in: `mikkel.mo…@verylongcompany.dk`, never `mikkel.mortensen@very…`.

**Collapsed rail (in 9b):** `68px` wide, icons only, centred, labels appear as tooltips on hover. Toggle persists per user.

**Command palette (in 9b):** ⌘K / Ctrl-K. Centred overlay `560px` wide, radius `14px`, shadow `0 14px 32px rgba(27,26,23,0.14)`, scrim `rgba(27,26,23,0.35)`. A search field at top, then grouped results — Orders, Vendors, Actions — each row showing icon, primary label 14px, secondary meta 12px `#8b8a82`. Arrow keys move, Enter opens, Esc closes.

**Account menu (9c):** the chevron on the account block opens a 232px popover upward, aligned to the block's left edge, radius `12px`, shadow `0 6px 16px rgba(27,26,23,0.08)`, light surface like every other popover. Four rows: a header repeating name and **email** (which appears nowhere else in the shell, and is how you confirm which account you are in), **Account and profile** deep-linking to `/settings/account` — not a new screen, but Settings (11a) with that section selected in the left nav, scrolled to the card, and focus on its heading (no highlight flash, no auto-focused field), **Keyboard shortcuts** (its only entry point besides pressing `?`), and **Sign out** — the reason the menu exists, being the one action that should not be buried in a settings page.

Deliberately absent: a theme switch (the toggle is directly above it — two controls for one preference is how they drift), org or account switching, and any upgrade prompt. The chevron points down when closed and up when open, and is the only thing on the block that changes. Standard menu semantics: `aria-haspopup="menu"` + `aria-expanded` on the trigger, `role="menu"` on the panel, arrow keys between items, Esc closes and returns focus. Sign out confirms only when there are unsaved changes, naming what would be lost. On the collapsed rail the block is the avatar alone, the chevron disappears, and the menu opens to the right.

**Top bar:** locked, 56px, does not scroll. Search only — no page title, and no actions of any kind. Search is not an action: it opens the ⌘K palette, which is navigation.

**9d — the command palette.** ⌘K anywhere, or the search field. 560px, centred, top-anchored at 15vh, capped at 60vh with the list scrolling inside. Two states: empty shows "Jump back in" (the last five records opened, stored locally, newest first) then Actions; typing shows results grouped **Orders → Vendors → Items → Actions** in that fixed order, three rows per group plus "See all N in …", with empty groups hidden entirely including their header.

The nine commands: Scan a receipt (S), New order (N), Import a file, Go to each destination (G then O/T/V/C/S), Switch to dark/light mode, Add a vendor, Add a category, Orders over limit this month, Drafts, Keyboard shortcuts (?). The last two are saved filters and appear only when they would return something.

**Not in it:** anything destructive (a palette is typed fast and confirmed by reflex), anything acting on the current page (a command whose meaning depends on what is behind the overlay is unpredictable), and Settings values other than theme. The list should stay near nine — a palette listing every action is a menu with worse ergonomics.

Arrows traverse all groups as one flat list, skipping headers — same rule as the combobox. Actions rank above records only when the query matches a command name. Search is debounced 300ms and cancels in flight, keeping previous results visible so the list never blanks. Matched text highlights in amber including mid-word, since Danish compounds mean the match is often not at the start. Vendor aliases are searched, and a row matched on one shows the canonical name plus "— matched indbo.dk" in muted 12px. Not available below 640px.

---

**9e — the ORDERS group is the saved views.** The items under ORDERS in the sidebar and the Views card in the facet rail are **one list rendered twice**. Do not give the sidebar its own hardcoded items: "Awaiting delivery" and "Missing receipt" are saved views shipped as defaults for a new account, not navigation the code knows about.

**Every default view must be reproducible from the facets.** `Awaiting delivery` is Status = Ordered; `Missing receipt` is Receipt = Missing. The **Receipt** facet (Attached / Missing) exists for that second one — without it the view could not be rebuilt by a user working the rail, which would make it a hardcoded list pretending to be a saved view, unrecreatable once deleted.

**A newly saved view inserts at position 2** — directly under `All orders`, at the top of the saved list — so the save is visible immediately in both surfaces. Appending to the end would place it in the overflow on any account that already has four views, and saving would appear to do nothing. It stays where it lands until the user drags it in the rail; nothing re-sorts on its own.

Division of labour: the **sidebar is reach** — select and see a live count, from any screen, no menus and no reordering. The **rail is management** — Save current, rename, delete, make default, drag to reorder, and the `edited` chip. The sidebar shows the **first four, then a count** ("2 more in Orders"), because it has a pinned bottom zone and cannot grow without limit; which four is controlled by dragging in the rail, with no separate pin flag. `All orders` is always first and always shown in both, is not a saved view, and has no menu.

**The rail is read-only until Edit is pressed.** Nine times out of ten a user opens the Views card to *switch* view, not to reorganise it — drag handles on every row put a maintenance affordance in front of the navigation task and make the list read like a settings screen. At rest: names, icons and counts. **Edit** reveals handles and a per-row menu with Rename and Delete; **Done** leaves. `All orders` renders as locked in that mode rather than disappearing, so the list does not reflow when the mode changes.

Edit is a button, visible at rest on every device — the objection to hover-revealed affordances (16f) is about things needing a cursor to be *discovered*, not about modes entered deliberately. **Save current replaces Edit in that slot** when the filters differ from the active view, because saving concerns the state you are in now and outranks reorganising. Reordering saves on drop; there is no separate save.

Selecting from the sidebar navigates to the order list with that view's URL applied — arriving that way, the rail shows the same row selected. There is no state where the two disagree about which view is active. Counts come from one request and render identically in both.

**A saved view's icon is derived from its filters, never chosen.** Saving is one field — a name typed over a row in the Views card — and a picker there would turn a two-second action into a small form. Fixed mapping: status → clock, date only → calendar, one vendor → storefront, amount → coin, one category → **that category's IdentityMark, tile and colour intact** (the only coloured mark in the sidebar), anything else or several groups at once → bookmark. Date is ignored when deciding, since almost every view carries one: "Hay this month" is a vendor view. Search text and sort never affect it.

Derive at render, not at save — store the filters and no icon field, so editing a view's filters changes its icon and nothing goes stale. A deleted category takes its view back to the bookmark; never render a missing mark as an empty box. In the rail the same glyph is 14px `#8b8a82`, or `#1d4d33` on the selected row. A view can carry an **attention flag**, honoured by both surfaces. Like status colour, the flag names a **pair** — one ink per surface: `#d3b98a` on the dark sidebar, `#7a5c23` at weight 600 on the rail's white card. Both are authored; the dark tint on white fails contrast, so neither is computed from the other. The flag is a property set when the view is saved, never derived from the number, and a count is never red.

**Collapsed (9b), the rail is the expanded sidebar with the labels removed** — 68px, rows still 40px with 44px targets, nothing scaled. Every row survives one-to-one and in the same order: Home, Scan receipt, New order, divider, All orders, Vendors, Categories, Statistics, spacer, Settings, dark mode, account. The one exception is the saved views — five 17px glyphs derived from filters are not distinguishable from one another, so the ORDERS group collapses to `All orders`' icon alone and views are reached from the facet rail, which is where they are managed anyway. With labels gone the two greens are the only thing separating the capture tile (`#1d4d33`) from the active destination (`#1f3d2c`), and every tile needs a tooltip plus an `aria-label` carrying the same string its expanded row shows. On the phone tab bar, Orders is one destination and views are reached from the rail's sheet.

**9f — the shell contract.** What the shell may hold, and how each part behaves when the text is too long or the screen too narrow.

**Permitted in the top bar:** one search field (420px fixed, left-aligned, flush with the content column's padding, opening ⌘K). Search is permitted because it navigates; nothing it does changes a record.

**Not permitted:** any action, page-level or global — no Save, New order, Scan receipt, export or overflow menu, and **no global-action exception**. Nothing page-specific: no filters, counts, tabs, record names or statuses. No second account block; the account lives at the bottom of the sidebar. **The shell takes no children from a page** — no slot, no portal, no `useTopBarActions` hook, so the constraint holds by construction rather than by review. Where actions go instead: a sticky bar at the bottom of the content column, a bar above the list, a button inside the page, or the sidebar — which holds **exactly two**, `Scan receipt` (primary green, at the top, above the ORDERS group) and `New order`, because they create the thing the whole app is about and must be reachable from every screen. Wanting a *third* sidebar action is the rule working, not a gap.

**Truncation.** Sidebar area name, saved view name, account name: ellipsis, one line. Palette results: ellipsis on the primary, meta drops first. The **account email truncates its local part only** — two spans, local part with `min-width: 0`, domain `flex: none` — because cutting from the right removes the domain, which is what identifies the account. Every truncating text needs `min-width: 0` on its flex parent, the most common cause of a shell that overflows at 1280px but looks fine at 1440px. A count beside a truncating label is `flex: none`: the number is why the row exists. Anything truncated must be readable somewhere else — a tooltip, the palette, or its Settings page.

**By width.** ≥1280: sidebar 248px with Scan receipt and New order above the ORDERS group, search at 420px. <1280: sidebar may collapse to the 68px rail — Scan receipt keeps its green fill as a 44px tile at the top of the icon stack, New order below it as a neutral icon, a hairline separating both from the destinations — and search stops growing. <900: rail stays collapsed, search becomes a 42px icon button opening the palette full-screen. <640: sidebar becomes a **bottom tab bar** — Home, Orders, Statistics, More — with Settings, account and theme under More, and saved views reached from the filter sheet. **Scan receipt leaves the bar** and becomes the 56px floating action button above it (7a): the phone is the camera, so capture stays reachable without spending a tab on it, and New order is reached from the capture screen, which offers manual entry alongside the scan (3a). The tab bar is the one place the shell changes shape rather than size, and it is a **media query**, not a container query. It respects the safe-area inset, and the sticky save bar sits above it.

**9g — the sidebar on a short screen.** The sidebar's content is ~700px and never gets shorter — saved views make it grow, never shrink. A 768px laptop leaves roughly 650px after browser chrome, so this is the common case.

Three tiers, each removing something rather than scaling: **≥720px** nothing changes, slack goes to the spacer. **560–720px** the nav scrolls, bottom zone pinned and complete. **<560px** Settings and the theme toggle move into the account menu (9c), reclaiming 88px; the account block stays because it is how they are reached. Below 640px *wide* this is moot — the sidebar is already a tab bar.

Implementation: a container query on the sidebar's own height, and `100dvh` not `100vh`. The brand is outside the scroll region, as is the bottom zone — a wordmark that scrolls away leaves the sidebar looking like a detached list. The scrolling region is the nav between them only — `flex: 1; min-height: 0; overflow-y: auto`; **without `min-height: 0` the flex child refuses to shrink below its content and pushes the bottom zone off-screen instead of scrolling**, which is the single most likely failure here. The scroll affordance is a 22px `mask-image` fade, shown only when there is more below (a permanent fade reads as a rendering fault); the scrollbar is 6px, `rgba(255,255,255,0.14)`, on hover only — never the platform default, which is the brightest thing on `#14261c`. Scroll the active row into view on load, nearest-edge.

Never: shrink rows (40px is the floor and the touch target depends on it), trim the saved views (the "N more" count would change with the window), or scroll the whole sidebar (the brand scrolling away is disorienting and the account block must stay reachable).

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

**Facet rail:** one white card per facet group — Date, Status, Receipt, Vendor, Categories, Amount. Group label 11px uppercase `0.12em`. Each facet row is a checkbox, a 13px label, and a right-aligned count 12px `#8b8a82`. Groups with many values show the top 6 plus "Show all (24)". Counts update with the other facets applied.

**Date presets are calendar periods, stored as tokens.** The Date facet offers **This week · This month · This quarter · This year · Custom…**. The four named periods re-evaluate on every load, so a saved view called "This quarter" shows Q3 in September and Q4 in October. Only `Custom…` stores two absolute dates.

**Never resolve a preset to dates at save time.** A view that stored `2026-07-01 → 2026-09-30` when the user picked "This quarter" freezes to that quarter permanently and gives no sign it has stopped rolling. Store `{period: "quarter"}` and resolve at query time. Week starts per the Settings value (Monday by default); quarters are calendar quarters.

**Above the list:** a search field (full width of the list column, radius `9px`, leading search glyph, placeholder "Search vendor, item, reference or note"), then the active filter chips row: pills radius `999px`, `#e7efe8` fill, `#1d4d33` text, 12px, each with an × ; plus "Clear all" as a text button. Right of that: result count ("128 orders · 486.320 kr."), sort select, and the rows/cards toggle — a segmented control, radius `9px`, `1px solid #dedcd4`, active segment `#1d4d33` on white.

**The card photo strip carries one hairline, along its bottom** — `#e6e4dc`, the same token as the card's border, so the band closes against the card body rather than bleeding into it. Individual photos inside the strip get no border: the `#eceae4` band is already their edge, and bordering each one would restore the cell furniture the single-surface strip exists to avoid. That is the difference from a 36px row thumbnail, which sits directly on white and needs its own.

**Every photo thumbnail carries a 1px border** — `#e6e4dc` on light, `#463f37` on dark — inset with `box-sizing: border-box` so it comes out of the declared size rather than growing it. Product photography is overwhelmingly shot on white, so without a border a pale photo has no edge against a white row or card and the cell reads as empty rather than as an image. Same reason 12a borders every thumbnail in dark mode; only the colour differs, not whether.

**A chip in a table cell needs the cell to centre it.** A chip is an inline-block, so a bare `<span>` in a grid cell sits on the text baseline — roughly 2px below the row's centre, which reads as every chip and status pill drifting downwards beside the text cells next to them. The cell must carry `display: flex; align-items: center`: the row's own `align-items: center` centres the *cell*, not the inline content inside it. This applies to chips, status pills, and anything else inline-block placed in a grid or flex cell rather than in running text — it was wrong in 16 places across the order list before it was caught.

**A chip's width follows its label.** Chips are left-aligned in the category cell, so their left edges stack and only their right edges differ — that is intended, not a misalignment. Do not force a common width: a fixed-width chip truncates a long category name or pads a short one with dead space, and the category column is fluid precisely so several chips can sit in it. What must be identical is the chip itself — `2px 8px`, radius `6px`, 22px tall, 11px text — everywhere it appears.

**A column is a header cell and a body cell, dropped together.** Removing the header while rows still render the cell shifts every cell after it one place left, and leaves the row with more children than the grid has columns — the surplus wraps to a second line. A `⋮` appearing *underneath* a row is that mismatch, not a wrapping bug in the menu. Write the drop as one conditional covering both, never two.

The check is arithmetic: count the header's children and each row's children at every breakpoint and require them equal. A row that is suddenly twice as tall is the symptom; the count is the cause, and it is the only reliable way to catch a cell in the wrong column when both hold short text.

**Every width in 2i is the list column, not the window.** The shell takes a fixed amount first: sidebar 248 (68 collapsed), page padding 96 (48 each side, 20 on the phone), facet rail plus gap 284 (260 + 24, or 0 once it is a drawer). The list column is whatever remains.

Which is why collapsing the rail is not a small change: at a 1280px window with everything present the column is **652px** — narrower than the CARDS breakpoint — while the same window with the rail as a drawer gives **936px**, enough for CATEGORY DROPS. One decision about the rail moves the table two breakpoints.

So do not wire these numbers to the viewport. A container query on the list column is correct at any window width and survives the rail opening, the sidebar collapsing and a panel appearing; a media query is right for exactly one configuration and silently wrong for the rest.

**2b is the table; 2i shows it narrowing.** Where the two disagree on a column's width, name or position, 2b wins — 2i is a reference illustration of 2b, and the same precedence applies as anywhere else: the screen outranks the illustration of it. What 2i owns is the *drop order*, which 2b cannot express at a single width.

The canonical grid at 1280 is `18px 2.1fr 104px 1.3fr 78px 118px 150px 40px` — checkbox, ORDER, DATE, CATEGORIES, ITEMS, STATUS, TOTAL, menu. **CATEGORIES precedes ITEMS**, and both ORDER and CATEGORIES are fractional: an order carries chips, so that cell has to flex with them, while ITEMS is a fixed 78px because it holds one number.

**2i draws the row table at every width** — 1280, 1040, 880 and the 420px card, each at its own width so nothing has to be inferred from a rule.

Columns are **dropped whole, never narrowed until their content wraps**. Items leaves at 1040, category at 880; date, status, amount and vendor never leave; the table itself becomes cards at 640. A column leaves when its information is available elsewhere on the same screen, not when it happens to be narrowest — the facet rail already names the categories in view, but nothing else says when an order was placed, which is why date survives to the phone and category does not.

Three implementation points, and the third is what causes wrapping and overlap: **container queries on the list column**, not media queries on the viewport (the same table sits beside a 260px facet rail and, at 1280, without one — the widths are the table's, not the window's); **one grid definition shared by the header and every row**, declared once as a custom property and overridden per breakpoint; and **every fluid cell needs `min-width: 0`** with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on every text cell. Without `min-width: 0` a grid child refuses to shrink below its content and the row overflows instead of truncating. Amount, date and status never wrap and never truncate — give them `white-space: nowrap` and a width fitting the longest value the *format* can produce, not the longest in the sample data.

**The row thumbnail keeps a 1px `#e6e4dc` border, inset** (`box-sizing: border-box`, so the border comes out of the 36px rather than growing it). Product photography is mostly shot on white; without the border a pale photo has no edge against the white row and the cell reads as empty. Same reasoning as 12a's rule for dark.

**The extra-photo count is a badge on the thumbnail** — bottom-right, `rgba(27, 26, 23, 0.72)`, white 9px/600, matching the card strip's `+N`. It previously sat in the gutter beside the thumb inside a 58px box that existed only to reserve space for an optional element; a count floating between two columns belongs to neither. On the thumb the cell is a flat 36px and the vendor name starts at the same x whether or not a count exists.

**Rows view (2b):** header strip `#f2f1eb`, 11px uppercase labels. Column order and alignment, left to right: checkbox `36px`; **vendor `200px` fixed** at `2.1fr`; date `104px`; categories `1.3fr`; items `78px`; status `118px`; amount right-aligned `150px`; actions `40px`. Row padding `12px 14px`, hairline `#e6e4dc` between rows, hover `#f0efe9`.

The fixed vendor column is a deliberate correction: an earlier version placed the vendor inside a variable-height stack with the item preview, so it landed at a different vertical position on every row. Vendor is first, one line, truncated with ellipsis, and always at the same x and y within its row. Any item preview text sits on a second line under it and never displaces it.

**Cards view (2c):** `repeat(auto-fill, minmax(280px, 1fr))` at a `16px` gap, per 18a — the mockup canvas happens to fit four across, which is a rendering of that rule, not a fixed column count. Card radius `12px`, `1px solid #e6e4dc`, `overflow: hidden`, a column flex.

**Custom date range (2d).** Choosing Custom opens a From/To pair **inside the Date group in the facet rail**, below the presets, not in a popover — a calendar floating over the list hides the results the range is changing. Fields are `40px`, open the platform date picker on click, and accept typing in the Settings date format.

The presets and the range are **one facet with four settings**: picking a preset clears the range, setting a range deselects the presets, and they cannot both be active. There is **no Apply** — it filters as soon as a valid date is entered, matching every other facet. From alone means "from that date to today", which is why To shows `Today` as its placeholder rather than blocking. With a range set, the group shows a `92 days · 41 orders` summary line and a Clear.

**An invalid range does not clear the list.** To-before-From turns the field red (`#8a4a41` on `#fdf6f5`) with an inline message, and the results hold at the last valid range — recomputing to zero while someone is mid-edit reads as "no orders exist". The applied range appears above the list as a single chip (`01/06/2026 – 31/08/2026`), and both dates are URL-encoded so it is linkable and survives reload.

**The photo strip is the order's own item photos** — not its attachments. A fixed `116px` band across the top of the card, holding the first three item lines that carry a photo, in item order, as equal flex fractions with a `2px` gap; `object-fit: cover`, centred, never letterboxed. Item lines without a photo are skipped. A `+N` pill (bottom right, `rgba(27,26,23,0.72)`, 11px/600) counts the **remaining photos, not the remaining items**, so seven items with five photos shows three and `+2`; under four photos there is no pill.

Fewer photos means wider ones — one photo fills the strip, two split it. No empty slots and no letterboxing to preserve three columns.

**With no item photos the strip keeps its height** and holds a quiet placeholder — a picture glyph and "No photos yet" in `#8b8a82` on `#f2f1eb` — so the grid stays even. It is deliberately **not** a call to action: photos are added on the item line (17a), and offering an upload from a list card would put a file picker where the user is scanning. The receipt PDF and any other order attachment never appear in the strip; a scan of a receipt is not a picture of what was bought, and a grid of grey paper is useless to browse.

Overlaid on the strip: the selection checkbox top-left, and the attachment-count button top-right when the order has attachments. Both sit on white chips so they survive any photo behind them.

The card leads with a **116px photo strip** across the full card width — up to three item photos side by side at `gap: 2px`, each `flex: 1`. Overlaid on it: a "+N" pill bottom-right (`rgba(27,26,23,0.72)`, white 11px/600, radius 999px, `3px 10px`) when more items exist, the selection checkbox top-left (18px, `1px solid #d6d4ca`, white fill), and a 22px white attachment button top-right. Body below the strip carries vendor, reference, status pill, category tags and the amount.

This is the one place item photos are shown at size, which is why the strip is the card rather than a row of small thumbnails.

**The thumbnail cell — three states, one width.** A 36px rounded square (radius 8px) holding the first item photo, `object-fit: cover`; the same square `1px dashed #c3c1b8` on `#f7f6f2` and empty when the order has no photo; and either followed by a `+N` count at 11px/600 `#6b6a63` when more photos exist. **The cell is 58px in every case**, so the vendor name starts at the same x on every row — the same reasoning as the fixed vendor column. No stacked pairs, no white ring, no second image. **The diagonal hatch in the mockups is not a state** — it is how a photo we do not have is drawn; only the dashed square is literal. The count is *photos*; the paperclip after the reference line is *attachments on the order* — they can disagree, so never derive one from the other. Full spec in 17c.

**Draft and cancelled rows.** Both use the grey status token — they are not comparable states, so no sixth colour is introduced. A **cancelled** row renders every cell at `opacity: 0.6`, the amount `line-through` in `#8b8a82`, and `not counted` in place of the saved-percentage line; **the pill stays at full contrast**, because the label is what distinguishes it from Draft. A **draft** row is entirely normal — nothing dimmed. Opacity is reinforcement, never the signal. The strikethrough also states that cancelled orders are excluded from total spend, so it applies wherever a cancelled amount renders: list rows, cards, mobile rows, the read view.

**2h draws all of it** — nothing selected, two of eighteen, the whole page, and the "select all matching" strip. **The bulk bar sits on the table's grid, not its own.** Its checkbox occupies the same 18px cell as a row's, so "2 selected" starts at the same x as the column header and the thumbnails below it. Laid out as a plain flex row its label lands 15px left of everything else — visible precisely because the bar and the header are adjacent.

**A checkbox's real hit area is the cell, not the square.** The square stays 18px; the cell it sits in stretches to the row's full height and pads out to 44px, and it calls `stopPropagation` so a hit anywhere inside it never reaches the row.

A **labelled** checkbox does not need this — where the label belongs to the checkbox (facet rows, settings toggles, options in a Set status popover) the label *is* the target, so square, text and count all toggle and the hit area is already the row's width. The problem case is a checkbox whose neighbouring text belongs to something else: in a table row the vendor name opens the order, so the checkbox has no label of its own and the bare 18px square is all there is. A near-miss then does the wrong thing — opens the order instead of selecting it — and on touch that is the common case, not the edge. The test is not "table or facet"; it is **whether the text beside the checkbox does the same thing the checkbox does**.

**The toolbar has exactly two states.** The summary line ("18 orders · 61.480,00 kr. · saved 24.310,00 kr.") is the resting state, drawn in 2b. Ticking the first row **replaces it in place** with the bulk bar — same position, same height, nothing below it moves — and clearing the last selection reverts it. There is no third state and the bulk bar is never present alongside the summary. The header checkbox is the only element common to both.

**Only the toolbar changes with selection.** The column header strip is identical in every state — no fill, a `#e6e4dc` hairline below, 11px `0.1em` `#8b8a82` — because it labels the columns and says nothing about selection. Tinting it during selection would be a third competing signal alongside the row tint and the toolbar swap. The three signals of selection are: the row tint, the checkbox state, and the toolbar swap. Nothing else moves.

**Selection rules (2h).** The header checkbox has three states driven by the **page only**: empty when none of the 25 rows are selected, dash when some are, tick when all are. Clicking it empty or dashed selects the page; clicking it ticked clears the page. It never reaches other pages. Once the page is fully selected, a separate strip below the bulk bar offers **"Select all 128 matching"** as an explicit second action — a bulk delete that silently included 103 unseen rows is not something undo covers well.

**A row has four fills, and every list in the app uses the same four:**

| State | Light | Dark |
| --- | --- | --- |
| Rest | none (card surface) | none |
| Hover | `#f0efe9` | `#2a2621` |
| Selected | `#e7efe8` | `#1f3328` |
| Selected + hover | `#dfe6e0` | `#26402f` |

**Selection outranks hover, and the two never mix.** Hovering a selected row deepens the green; it does not replace it with grey. A selected row that turns grey under the cursor looks deselected at the moment you are about to act on it. Hue carries the meaning — green chosen, warm grey pointed at — and lightness carries the state within a hue.

Order rows and cards, vendors, categories, statuses, item lines and saved views all use these. A list that invents its own hover value is a bug. Transition `120ms ease` on `background-color` only. Shift-click extends from the last ticked row. The checkbox cell stops propagation, so ticking never opens the order (16f). Selection is per page, clears on any filter/search/sort/page change without warning, and is **not** in the URL — a shared link should not carry someone else's pending bulk action. **Cards carry the same row menu.** The `⋮` sits at the end of a card's footer line — 44px target, glyph flush at the card's 14px padding edge, aligned with the amount above it — and opens the same six items in the same order as a row: Open order, Duplicate, Download receipt, Set status ›, Add category ›, Delete. The view toggle changes how an order is drawn, not what can be done to it; a card offering a different set would mean the toggle silently changes capability.

It anchors to the card, not the viewport, opening bottom-right above the footer and flipping upward near the grid's bottom edge. It is on the footer rather than over the photo strip because a control there would land on a photo of unknown lightness and compete with the checkbox and paperclip badge already present. Always visible at `#b3b1a9`, never hover-revealed.

**Cards view selects the same way, with one layout difference.** A card shows **no checkbox at rest** — a permanent tick box on every card competes with the photo strip, which is the thing the view exists to show. Hovering reveals it in the strip's top-left over an `rgba(27,26,23,0.35)` circular scrim so it reads against any photo; once **anything** on the page is selected, every card shows its checkbox permanently, ticked or not. Clearing the last selection returns them to hover-only. On touch they are always visible.

**Every overlay on a photo carries a shadow: `0 1px 4px rgba(27, 26, 23, 0.28)`.** The card checkbox in both states, and the paperclip badge. The photos are the user's own, so the lightness behind an overlay is never knowable — a white control vanishes on a pale product shot, and the filled green one vanishes on a dark photo. Same reasoning as 12a keeping a border on every thumbnail: a white scan with no edge is not a control, it is a gap.

**Photos sit on the canvas at `opacity: 0.5`.** One `#eceae4` band, photos filling it edge to edge with a 1px gap letting the canvas show through as a hairline. Full colour, no filter — the half opacity is what settles them, letting the canvas lift through so the strip sits behind the text rather than competing with it. **Cards only**: the 36px row thumbnail and the item photos in 1a/1b stay fully opaque, where a photo is being identified rather than glanced at.

**Cells divide by the number of photos, never by three.** One photo fills the strip, two halve it, three third it. There is no such thing as an empty cell.

**No photos still renders the band** — `#eceae4` with a centred image glyph in `#b3b1a9` and the label "No photos". Dropping it would make cards different heights in the grid, and an order with nothing photographed is a normal order, not a broken one.

A **selected card** takes a `2px #1d4d33` border in place of its `1px #e6e4dc` hairline — the card's own edge carries the state, since the `#e7efe8` row tint would fight the photo strip. Apply it on the same box (2px border, 1px less padding) so nothing reflows.

The bulk bar is identical in both views, but in rows it **replaces** the summary line, while in cards there is no toolbar so it is **inserted above the grid** as another child of the same 14px column. The container owns the spacing — the bar carries no margin of its own, per 15a: gaps on the container, never margins on children. That is a consequence of the layout, not a separate decision.

**Selection survives the view toggle** in both directions, count included. There is no select-all in cards: the header checkbox lives in the rows table, so switching to cards keeps whatever was selected but offers no way to select the whole page. Switching back restores it.

**Bulk actions (in 2a):** selecting rows reveals a bar above the list — a checkbox in indeterminate state, "N selected" in 13px/600 `#1d4d33`, then four buttons right-aligned with an `8px` gap: **Set status**, **Add category**, **Export**, and **Delete**. All are 12px/600 on white at radius 8px, padding `6px 12px`. Set status carries the accent border `#1d4d33`; Add category and Export take `#cbd8cd`; Delete takes `#e2d3d1` with `#8a4a41` text. Both open a small popover anchored to the button: Set status is a single-select list of the five statuses (the Combobox in pick-only mode — there is no Radio component; see 14d); Add category is a searchable list with the category icon tile and name, multi-select, and a "Create category" row at the bottom. Applying shows the count in a toast with Undo. Delete opens a confirm dialog naming the count; Export downloads the selection.

**Load more, not pagination.** The list ends with a range line and a single button — "Showing 6 of 18" at 13px `#6b6a63`, then LOAD MORE right-aligned (`1px solid #dedcd4`, radius 9px, padding `8px 16px`, 12px/600, `letter-spacing: 0.06em`, `#1d4d33`). Each press appends the next page in place; scroll position does not move and the range line updates. The count reflects the filter, never the account.

The Pager component in 14e exists for a page-size-and-arrows treatment and is **not used on this screen** — build it only if a screen calls for it.

---

**2g — saved views.** A view is a name for the filters, search and sort currently applied — it stores the **URL**, not a result set, so a view is also just a link and its count is always live.

Naming happens **inline in the Views card**, in the position the row will occupy: the field takes focus with the result count already beside it, Enter saves, Esc cancels, blur cancels, and the header action reads Cancel while it is open. The default name is **empty, not generated** — a suggested "Hay · Ordered · this month" gets accepted unread, and a rail full of filter strings is no easier to scan than the filters. The active filters render as a line below the field instead. Duplicate names are allowed; a view is a personal bookmark.

Changing a filter while a view is selected **does not silently update it**. The row keeps its name, gains an amber `edited` chip, and the card offers Update view or Revert. The list follows the new filters immediately; the chip only records that the saved definition and what is on screen have diverged.

Each saved view has a `⋮` menu: **Rename**, **Make default**, **Delete view**. Deleting confirms with a dialog naming the view (per 6d) rather than a toast with Undo — a deleted view leaves nothing on screen to undo from. **All orders is not a saved view**: it is the unfiltered list, always first, has no menu, and cannot be renamed, reordered or deleted. Making a saved view the default changes what Orders opens to; All orders stays where it is.

### 3a — Creating an order from a receipt
File: `Order create.dc.html` · Code: `pages/NewOrder.jsx`, `pages/Scan.jsx`, `components/AiCard.jsx`, `components/fileKinds.js`

**Purpose:** get a receipt into the system with as little typing as possible. Four stages, shown side by side in the mockup but sequential in the app.

1. **Start.** Three ways, ranked by frequency: the drop zone with **one** button ("Select a receipt"), then below a divider, "Empty order" and "Copy a previous order" as equal cards. Accepts PDF, JPG, PNG, HEIC; states the size limit.

   **One file button, not two.** Camera versus files is the device's decision, not a design choice — a single input with the right `accept` and `capture` attributes yields a camera option on a phone, the photo library on a tablet, and a plain file dialog on desktop, each in the form that platform's users already know. Separate "Choose file" and "Use camera" buttons duplicate the OS picker's own first screen, and one of the two is always dead weight on whatever device is in hand. Drop needs no button at all on desktop — the zone is the affordance — but the button stays for keyboard users. "Copy a previous order" is hidden when there are no orders yet.
2. **Reading.** The uploaded file's thumbnail on the left, and on the right a progress card: an animated indeterminate bar, the stage in words ("Reading line items…"), and Cancel. Nothing is written yet.
3. **Check what was read.** The heart of the flow. Two panes: the receipt preview left (zoomable, page thumbs for multi-page PDFs), the proposed order right. Every proposed value carries a confidence affordance — fields read cleanly look like normal filled fields; uncertain fields get an amber left edge (`2px #b58a2b`) and a "check this" hint. Item lines list with the read values as editable inputs; unmatched vendor or category shows an inline picker with a "Create X" option. A summary line reconciles the totals: if the item lines do not add to the receipt total, that difference is stated plainly in amber, with a "the receipt says" figure beside the computed one. Buttons: Discard, Save as draft, Create order.
4. **Created.** Confirmation with the order summary, the attachment kept on the order, and two links: open the order, or scan another.

The scan **proposes**; nothing is stored until Create order. The uploaded file always ends up attached to the resulting order.

**3b — Copy a previous order.** The picker the create-screen card opens; the copy itself is 8a's duplicate unchanged. A 462px dialog: a line stating what carries over, search across **vendor and item name** (the thing you remember is often "the order with the oak chairs", not the shop), then two groups — **You order these often** (orders whose vendor and line shape recurred, with the repeat count, since that is the case this exists for) and **Recent**. Same grouped-Combobox behaviour as 14a: arrows cross both groups as one flat list, headers never focusable.

Every row must be identifiable without opening it, so each carries vendor, line count, the first item names and the total — the total does most of the work when a shop has twelve orders. Picking opens the edit screen **unsaved** with 8a's notice; no confirm, because nothing exists yet. Amounts are copied, not re-priced: they are what was paid last time and are editable like any field — nothing looks up a current price.

Three entry points, one dialog: the create-screen card (hidden with no orders), the New order split-button menu, and Home's **Duplicate last order** (which skips the dialog, since "last" needs no picking). The order list's per-row Duplicate is deliberately not one of them — there the source is already chosen, so it goes straight to edit. That is also why this is a dialog and not a list page: browsing with facets is the order list's job, and Duplicate is already waiting there.

**3c — the same receipt scanned twice.** Every upload is hashed (SHA-256 of the bytes as received, stored on the attachment row and indexed). On a match this screen **replaces the reading stage** — a dialog over a progress bar would mean the scan is running behind a question about whether it should, and asking after the proposal exists wastes the read and drops the user into review with a decision they should have made first.

**Cache the reading, not just the hash.** Each scan is a paid API call, so the scan output is stored against the file hash and a repeat upload can produce a full order with no second call. That is the return on the feature: the three legitimate reasons to continue — a repeated purchase on an identical receipt, a re-import after deleting the original, one receipt covering two orders — are all served by the cached reading. **The cost is internal and never appears in the UI:** no amounts, no warnings, no counters — a price tag would ask the user to manage an infrastructure bill they never agreed to. The design carries the intent instead, with **Use the reading** as the primary and **Scan again** as a secondary, the latter being rational only when the cached reading was wrong and the model has since improved.

It shows the matched order in full (vendor, reference, date, line count, total, when it was scanned) with **Open that order**, because "you have already imported this file" without naming the order is a dead end — the user's next question is always *which one*. Amber, and it never blocks: **Scan anyway** is always available and never behind a confirm, because three legitimate reasons exist (a genuinely repeated purchase on an identical receipt, a re-import after deleting the original, and one receipt covering two orders). **Attach it to that order instead** appears only when the matched order lacks this exact file — so after an exact match against that same order it is disabled. Multiple matches list up to three, newest first. The upload is kept for 24 hours either way.

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

Panel for a selected vendor: the vendor form (name, website, **Also matches** — the alias chips from 5d — city, VAT number, default categories, notes), then a small stats card — spend, orders, average order, saved vs retail as a 2×2 grid of 20px/700 values — plus a sparkline and the "See in Statistics" link. No charts.

**Merge** handles scan duplicates: the panel offers "Merge into…", which opens a picker of similar vendors, then a comparison showing which field wins per row and the resulting order count. It is destructive and confirmed explicitly, naming the number of orders that will move.

**5f draws both tables at 1280, 1040, 880 and 420.** Same rule as 2i — columns are dropped whole, never squeezed until they wrap — but which column goes differs, because a vendor list answers *how much and how recently* while a category list answers *what is the limit and how close is this month*.

**Vendors** drop *saved* first (softest number, and the panel states it exactly for the selected vendor), then *orders* — which folds into the name's second line at 880 rather than vanishing, since a vendor with 24 orders and one with 2 are different kinds of vendor. **Spend and last order never leave**: spend is the sort key, and nothing else on screen says when you last bought from someone.

**Categories** drop the *12-month average* first — context for the limit, not the limit itself. **The limit and this month never leave**; they are the pair the page exists to compare, and a category row without both is just a name. The progress bar is a column, not decoration: it stays at every width, goes full width on the phone, and over the limit fills amber with the overage stated in words beneath — a bar pinned at 100% cannot say how far past it went, and on a phone there is no adjacent column to say it.

The panel is why these tables can shed columns at all: both screens are list-plus-panel, so anything dropped is one click away and still exact. Below 900px the panel becomes a separate view, which is the same change that turns the tables into cards. The identity mark never shrinks and never drops — 26px at every width.

#### 5b — Categories

List rows: a `26×26` icon tile (radius `8px`) filled with the category colour, glyph in white — or `#3d3c36` when the colour is light — then the name 14px/600, this month's spend, and its limit. The tile replaced a plain colour dot so a category is recognisable at a glance.

Panel: the category form.
- **Name.** Text field with the current icon tile inline at its left (22px, radius `7px`).
- **Icon.** The current icon at 44px (radius `11px`, category colour), its name, and a Change control. Open, it is a picker: a search field, then an 8-column grid of `aspect-ratio: 1` cells (radius `8px`, `#f7f6f2`, selected cell `#eef1ee` with a 2px `#1d4d33` outline offset 1px), ending in a "+64" overflow cell. Icons come from a fixed set; the picker never accepts uploads.
- **Colour.** A row of swatches from the green ramp plus neutrals.
- **Monthly limit.** A single amount that applies to every month — it is not per-month data. Empty means no limit. Below the field: this month's spend against it, with the pace marker bar.
- Icon and colour always render together, so the same mark identifies the category in chips, facets and charts.

#### 5d — Vendor aliases

A receipt rarely prints the name you call a vendor. "INDBO MØBLER A/S", "Indbo Møbler ApS" and "indbo.dk" are one vendor, and aliases are what let a scan resolve without asking. They are also where a merged vendor's old names go, so nothing stops matching after a merge.

**In the form** the field is labelled **"Also matches"**, not "Aliases" — the label states what it does, so a user adding a name knows they are teaching the scanner. Values are removable chips (14a); to correct one, remove and re-add. A CVR number is an alias like any other but matches exactly rather than fuzzily, and is the strongest signal a scan can find. Names carried over from a merge render in the accent tone so their origin is visible.

**Matching order:** exact CVR → exact alias or name, normalised (case, punctuation, and the suffixes A/S, ApS, IVS, Ltd removed) → fuzzy above 0.9 against names and aliases alike, pre-selected but marked uncertain → nothing, and the picker opens with a Create row. **An alias is never shared** — if a name would match two vendors, reject it on entry naming the vendor that already claims it.

**Learning from a scan:** in review (3a), when the receipt's name differs from the vendor chosen, a checkbox offers "Also match INDBO MØBLER A/S in future", checked by default. Opt-out rather than automatic, because a user who picked the wrong vendor should not silently teach a wrong name. Shown once per distinct name, and written only when the order is created — a discarded scan teaches nothing. Not offered for categories: a category is the user's own classification, not a name printed on paper.

**An alias is never displayed as the vendor.** Orders, lists, charts and the identity mark all use the canonical name. Search matches aliases (order list, vendor combobox, palette); facet counts are unaffected, since one vendor is one facet value whatever it is called. Duplicate detection and file import both read aliases too.

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

### 6a–6f — States and confirmations
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

### 11a / 11b — Settings, and importing a file
File: `Settings and import.dc.html` · Code: new pages (`pages/Settings.jsx`, `pages/Import.jsx`)

**Widths.** The 1180px shell drawn around 11a is presentation only — a stand-in for a viewport so the screen reads in context. In the app the shell fills the browser edge to edge (sidebar 248px fixed, content column fluid, per 9a). Inside the content column: section nav **208px fixed**, hairline divider, card column **fluid with a 640px cap**. Past 640px the cards stop growing and the slack falls to their right — a 42px input stretched across 1920px reads as a bug (15a). Below ~900px the section nav becomes a select above the cards and the cap no longer binds.

#### 11a — Settings

**Layout:** the app sidebar, then a page-level settings nav (`208px`, rows `9px 10px`, radius `9px`, active row white on the canvas) and a single column of cards capped at `640px`. The shell holds a fixed composition — do not let the card column compress below its designed width; the page scrolls instead.

**Five sections, each its own card with its own save.** Only the card you touched goes dirty; the sticky save bar names it ("Unsaved changes in Statuses").

**Status colour is a pair token, not a swatch.** A status stores one of five names — `green`, `sage`, `sand`, `clay`, `grey` — and each names a fixed surface/ink pair:

| token | surface | ink |
| --- | --- | --- |
| green | `#e7efe8` | `#1d4d33` |
| sage | `#eef1ee` | `#4f7f63` |
| sand | `#f3ede1` | `#7a5c23` |
| clay | `#f0e6e4` | `#8a4a41` |
| grey | `#f0efe9` | `#57564f` |

Both values are authored. **Do not derive the ink from the surface at runtime** — at the pale end of the ramp that gets contrast wrong, for the reason in 14c: chroma falls as lightness rises, so a computed dark variant of a near-white tint lands at the wrong hue and the wrong weight.

**The picker shows the pill the list will draw**, not a dot. A dot cannot represent a pair, and that is how the two drifted: the card offered five solid swatches (no clay, though Cancelled used it) while the list rendered tinted pairs, and Ordered's swatch was green while its pill was sand.

- **Account and profile.** 56px avatar with upload and remove, name, email (read-only), and a password row.
- **Appearance.** Theme as three preview cards — light, dark, follow system — each a miniature of the shell rather than a swatch. Then row density as a segmented control (comfortable / compact; compact takes list rows from 14px to 8px of vertical padding and leaves item lines alone, so touch targets survive). The theme is also switchable from the sidebar bottom; the two stay in sync.
- **Currency and format.** Currency, number format, date format, week start, with a live preview strip showing the result. Changing the currency does not convert existing amounts — it changes the symbol only, and the card says so.
- **Defaults for a new order.** Default category and status, plus a "let a scan override these" toggle: on, a receipt naming a vendor whose default category differs wins; off, your default always applies.
- **Statuses.** A draggable list, each row a colour dot, the name, the order count on it, and an edit control. Editing expands the row inline to a five-swatch colour picker plus the name field — the same in-place pattern as item lines. Draft is built in and cannot be renamed or removed. A status with orders on it cannot be deleted; reassign first.

**Leaving edit mode on a status row.** The row carries **Cancel** and **Save** as visible controls — Esc and Enter are shortcuts, not the only way out, since neither exists on touch. Cancel reverts the row to its stored name and colour; Save commits it. Tapping or clicking another row saves the open one first rather than trapping the user, because a name and a colour cannot be half-valid and there is nothing to warn about. An empty name is the one thing Save refuses, with the field in its error state.

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

**Two further rules for thumbnails on dark**, and they matter more than they sound: every image thumbnail keeps a `1px #463f37` border, because a white receipt scan with no border floats as a bright edgeless rectangle; and thumbnails render at **90% opacity**, taking the glare off without touching colour accuracy. Full opacity returns on hover and in the viewer, where the image is the subject.

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

Cross-cutting geometry: every text-entry and select control is `1px solid #dedcd4`, radius `9px`, padding `10px 12px`, 14px text — **42px tall, the canonical control height**. Controls that are not text (the stepper, combobox triggers, segmented controls, solid buttons) take `box-sizing: border-box; height: 42px` explicitly rather than sizing to content, and centre their own content. **Toolbar rows are where this drifts:** left to padding, a segmented control lands at 37px, a solid button at 37px and a bordered field at 42px — three heights in one row, visible only once they are side by side. Focus is one treatment everywhere: border `#1d4d33` plus a 3px `rgba(29,77,51,0.12)` ring. Labels are always visible at 12px/600 above the control — no floating labels, no placeholder-as-label. **Segments fill their track:** a segmented control is a 42px track with 3px padding, so each segment is exactly 36px, centred with `display: grid; place-items: center` and horizontal padding only — vertical padding leaves the label off-centre. **Icon side is a rule:** left says what the field holds (search glyph, currency prefix, IdentityMark); right says what clicking does (combobox chevron, and the calendar that opens a date picker). A date field carries its calendar on the right, in the chevron's position. Validation fires on blur once touched and on submit, never per keystroke.

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

**14d — Component API.** Fourteen components with the options each needs and what drives them, so nothing is speculative: TextField, PasswordField, AmountField, Stepper, Combobox, SearchInput, Segmented, Radio, Checkbox, Toggle, DateField, FileDrop, SwatchPicker, Button, Chip.

**Radio** — `options`, a `meta` slot per option, `rowTarget`. Used by bulk "set status" (2a) and the date presets (2d): one value from a set too long or too annotated for Segmented. Three options minimum. The mark is **16px with `box-sizing: border-box` and `flex: none`** — unselected `1px #d6d4ca` on white, selected `5px #1d4d33` on white leaving a 6px well. Without border-box the selected mark measures 26px and every row shifts as the selection moves. Whole row is the target (44px on touch), selected row `#eef1ee` with its label 600 `#1d4d33`, hover `#f0efe9` so hover and selection stay separable. One tab stop per group; arrows move and select.

- **All share five props** — `label`, `value`, `onChange`, `error`, `disabled` — owned by **one shared field wrapper**, which also owns the label's `htmlFor`, the required marker, the hint/error slot with `aria-describedby`/`aria-invalid`, and the spacing. Each control renders only its own box. **Error and hint share one slot** so a field never changes height when it fails.
- **Controlled only.** No internal value state, no `defaultValue` — a control holding its own copy is how a field silently disagrees with what gets saved.
- **No `variant="danger"` on an input.** Error is a boolean plus a message, which makes the red state impossible to apply for decoration.
- **PasswordField** exists only in the change-password dialog (440px, opened from Settings). Reveal is built in and replaces a confirm field — a second box catches nothing the eye does not, and doubles the work. The meter measures length first, never blocks, and never demands a symbol. Paste is never blocked and `autocomplete="current-password"`/`"new-password"` are always set; both are how a weak password gets chosen instead of a strong one.

**Deliberately not components:** a two-option radio (that is always a Segmented), slider (an amount range is two AmountFields — a receipt total is typed, not dragged to), autocomplete / tag input / rich text / native select (all are the Combobox, Chip list, or multiline TextField), and Form (each screen's save behaviour differs, so screens compose the wrapper and controls directly).
- Build order in the file: wrapper + TextField + Button, then Combobox, then AmountField + Stepper together, then the small four the order list needs at once, then the rest. Each control ships with the states from 14a as its acceptance criteria.

**14e — controls that appear once.** Six that exist in one place each, which is why they were missing from 14a. A control used once still has to be specified.

- **Custom date range.** Two DateFields **inline in the Date facet group**, below the presets — not a popover, because a floating panel covers the list the range is filtering. Not a calendar grid either: **either side may be left empty**, From alone meaning "since" and To alone "up to", and most range pickers cannot express open-ended, which is the common case. There is **no Apply** — it filters on the first valid date like every other facet, and an invalid range holds the last valid results rather than emptying the list. The presets are pill chips (This week · This month · This quarter · This year · Custom…) — active is solid `#1d4d33` with white text, inactive is `1px solid #dedcd4` with `#57564f`. Presets and range are one facet with four settings; setting one clears the other. From and To stack vertically inside a `1px #dedcd4` / radius 10px container, each 40px with a trailing 14px calendar glyph (`#8b8a82` when filled, `#c3c1b8` when empty). Mobile: the facet rail is already a sheet, so the fields sit inline within it, stacked full width. **Full behaviour is specified in 2d** — 14e draws the control, 2d owns the rule. The anchored popover mode belongs to single-date use (`range={false}`), such as the order date on the edit screen.
- **Amount range.** A dual-handle RangeSlider **and** two AmountFields — one control, two views, both writing the same pair. The fields are the accurate path (handles snap to a proportional step, typed values do not), which is why the slider alone is not enough. Bounds come from the account's own data, not a constant. Handles cannot cross. Filtering debounces 300ms. Each handle is a real slider input with its own aria-label and arrow-key stepping.
- **Sort.** A Combobox in pick-only mode keeping the word "Sort" inside the trigger, so it reads as a sentence and needs no label. Radius **10px**, the one control that deviates, because it sits beside the 10px search field. Direction lives in the label — no separate ascending/descending toggle, which would produce "Vendor A–Z, descending".
- **Pagination.** A range sentence ("1–25 of 128"), a size Combobox and two arrows. Not numbered pages — 6 targets here, 40 at a larger account. 128 is the filtered total and must agree with the count above the list. Arrows disable at the ends rather than disappearing. Changing size keeps the first visible row visible.
- **Long facet group.** Top 6 by count, then "Show all N"; expanded it scrolls at 240px rather than growing. A filter field appears above 20 values, narrows that group only, and is not part of the query. **Selected values always render**, above the top 6 and regardless of the group filter, so a selection can never be hidden by the control displaying it.
- **Period and compare** (4a). A Segmented plus a line always stating the resolved dates, so what is measured is never inferred from a word. "Custom" opens the same popover as the date facet — one control, two placements. The compare label names the period it computed, not "previous period".

**14f — identity marks.** One component, three kinds, and **the shape carries the type**: a person is a circle, a vendor a rounded square of initials, a category a rounded square holding its icon. Do not make vendors round to match the account block — a user and a vendor looking alike in one list is the confusion this prevents.

Five sizes — 20, 26, 34, 44, 56 — with radius 6/8/10/12/50% and type at roughly 0.42× the box, weight 700, always two characters. Never below 20px. 20 in a chip or palette row, 26 in a list row, 34 in a card, 44 in a form field, 56 in a profile header.

**Vendor initials:** first letter of the first two words, uppercased; one word gives its first two letters; single characters and non-letters are skipped, so "H&M" is HM. Danish letters are kept as themselves, never transliterated. **Colour is deterministic** — hash the normalised canonical name to an index into the seven picker swatches from 14c. Same vendor, same colour, everywhere and after every reload. Never a generated colour: a hash into an HSL wheel leaves the palette on the first vendor it meets. Ink flips above L 75. The mark is decoration, carries `aria-hidden`, and always sits beside the name — nothing is identified by colour alone. **No logos, ever** — no favicon fetching, no upload.

**Where vendor marks go:** the vendors library, the command palette and vendor comboboxes, order cards, and the order detail rail. **Not** order list rows or mobile order rows — the vendor column is 200px and already first, fixed and left-aligned, so a 26px mark plus its gap takes a sixth of it to repeat the text beside it.

---

**14g — where an overlay opens, and what it announces.** One positioner for every overlay: the combobox panel, row and card menus, submenus, the date picker, the account menu. Six implementations of "open below the thing" is six places for an off-screen panel, and the one that gets it wrong is always the last row of a long list.

**Placement.** Prefer below, 6px offset. Flip above only when below has less room than above. If neither side fits, take the larger and cap at the available space less 8px, scrolling internally with a fade at the overflowing edge. **Vertical flips, horizontal shifts** — flipping sideways moves a menu away from the row it acts on and, in a table, over a different row's content; shift and clamp instead, keeping 8px clear.

**Decide once, at open.** Measure trigger, measure the panel's natural height, place it. Never re-measure on scroll — a panel that drifts or re-flips while the user is reaching for an item is worse than one placed imperfectly. Scrolling the container closes it. **Render at document level**: the list column is a scroll container, so a panel that is a DOM child of a row gets clipped by it.

**The chevron reports the decision** — it flips with a combobox panel, and on a submenu parent it points at the side the submenu opened on. A glyph that always points down is lying half the time.

**Announcement.** Combobox: `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-activedescendant`, focus **stays in the input**, panel `role="listbox"`, groups `role="group"` with `aria-labelledby`, options `role="option"` + `aria-selected`, and the filter result count in a polite live region. Menu: `aria-haspopup="menu"` + `aria-expanded`, and an `aria-label` naming the subject — *"Actions for order SPENDLY-447"*, never "More", since fourteen buttons labelled "More" is a list that cannot be navigated; focus **moves into** the menu, first item on Enter or ↓, last on ↑. Both: Esc closes and returns focus to the trigger, click outside closes without acting, and nothing outside is `aria-hidden` — these are not modal.

**Below 640px, anchored positioning is abandoned** — a bottom sheet with a grab handle and 46px rows, same items in the same order. A 200px popover beside a thumb-sized target with a keyboard covering half the screen cannot be fixed by flipping.

### 15a / 15b — Layout rules
File: `Layout rules.dc.html`

**The rule behind every screen: one fluid column per layout, everything else a fixed pixel width.** The main column is `1fr`; rails, navs and facet columns are fixed. Two fluid columns means neither has a predictable width, nothing inside either can be sized with confidence, truncation stops being predictable, and the first long vendor name reflows the page.

Gaps, not margins, set on the container: `24px` between columns, `14px` between stacked cards, `16px` in a card grid, `12px` between fields.

**An overlay's inset is never a free number.** A control positioned over something — a checkbox on a card, a paperclip badge on a photo strip, a PDF tag on an attachment tile — is inset by *the padding of whatever it lines up with*, not by whatever looks about right. A card's checkbox is 16px in because the bulk bar above it has 16px padding, so the two share an x. Identify the element it aligns against, read that element's padding, use that number.

The same arithmetic applies to a **range slider's track**: inset it by half a thumb (`margin: 0 9px` for the 18px thumb — 14px plus a 2px border each side, halved). The thumb is positioned by its centre, so a full-width track puts it 9px outside the container at 0% and 100%, while the amount fields below sit flush. Change the thumb size and the inset changes with it.

**Four column shapes cover the whole set:**
1. **Main + right rail** (1a, 1d, 10a). Rail widths are **320 / 360 / 400** and nothing between — 320 for a read-only summary, 360 for a form rail, 400 for a panel that is itself a form. The rail stays shorter than the main column.
2. **Left rail + main** (2a, 11a). Facets `260px`, page-level nav `208px`. A left rail is always narrower than a right rail because it holds controls, not content. Below 1280px it becomes a drawer rather than compressing.
3. **List + panel** (5a, 5b). The panel never collapses — with no selection it shows the roll-up, so the column width is constant whatever is selected. Below 900px they become separate views with a back action, never stacked.
4. **Card grid** (2c, 4a). Order cards `repeat(auto-fill, minmax(280px, 1fr))` at a 16px gap; Statistics on a 12-column grid where every card spans a whole number of columns so rows always close.

**Fields — full width or a fraction.** The test is the content, not the importance: full width when the content has no predictable length (vendor, item name, reference, notes, search, drop zones); halves when two *bounded* values are read together (date + status, currency + format); **thirds exactly once** — quantity × unit price = line total, because the row is an equation; never four in a row (each cell falls under 80px in a 360px rail). A control with an intrinsic width takes `flex: none` at its own size and the field beside it takes the remainder with `min-width: 0`.

**Always full width of its container:** tables and item lists, drop zones, progress bars, the sticky save bar and bulk-action bar (full width of the *main column*, not the page), and cards. **Never full width on desktop:** buttons, body text (capped 640px prose / 900px description), a form column (Settings caps at 640px even at 1920px), segmented controls / chips / steppers / swatch rows (intrinsic width, `align-self: flex-start`), and dialogs (440px) and popovers (560px).

**Rows:** height from padding (12–14px, 8px compact), never a fixed height. Columns fixed except one — vendor 200px, date 110px, items 72px, category 160px, status 120px, amount 120px right-aligned — with one fluid cell absorbing the slack, which is what keeps every value at the same x down the list. Second lines never displace the first. One grid definition shared with the header, declared once. An expanding row pushes, never overlays.

**15b — Fields on mobile.** A four-step test, in order: (1) is it one calculation or one object? keep it grouped; (2) would any part fall under 100px? stack it regardless — three fields at 375px is 105px each before gaps, the hard floor, and why nothing keeps thirds on a phone; (3) does one part have an intrinsic width? fixed + fluid, not halves; (4) otherwise full width, which is the right answer for most fields.

What survives the breakpoint is short enough to name: the item equation (as fixed + fluid, with the computed third becoming a **total line** rather than a field — a read-only box on a phone is a target that does nothing), the photo row with its controls, and the icon-plus-name field. Control padding goes from `10px 12px` to `12px`, taking the height from 42px to 46px without changing type size, and radius from `9px` to `10px` — radius tracks control size; field gap goes 12px → 14px.

Also below 640px: buttons in a sheet go full width and stacked (the only correct full-width button); dialogs become bottom sheets; comboboxes become full-screen sheets with search at the top above the keyboard; segmented controls may go full width; the save bar spans the viewport respecting the safe-area inset; labels stay above their fields at every width.

**15c — which numbers are real.** A mockup has to be *some* width to be drawn, so these files carry pixel values that are scaffolding, not specification. **Do not lift widths off the mockups.**

*Real, build to these:* the fixed rail widths (320/360/400 right, 260 facets, 208 page nav, 248 sidebar, 68 collapsed); control and row geometry (42px control height, 46 on touch, 12–14px row padding, 8 compact, 44px minimum target); the table column widths (vendor 200, date 110, items 72, category 160, status 120, amount 120); all gaps and paddings; all radii, type sizes, borders and shadows; the caps (640 prose and form columns, 900 description, 440 dialog, 560 popover, 232 account menu); and the minimums (560 main column, 280 order card, 100 mobile field floor, 80 desktop equation cell).

*Mockup only, ignore:* the **1400px shell frame** on 9a and 10a (a stand-in for a viewport, and the source of the rounded corners and shadow that are also not part of the design); **every card width on the reference pages** — 430, 470, 520, 560, 620, 700 — which exist so annotations sit beside their subject; fixed heights on demonstration boxes; **side-by-side comparison columns**, where states shown in a row are sequential in the app and never share a screen; the 375px phone frames (representative, not a target — the phone layout must hold 320→430); the 1180px Settings shell and 1320px inventory tables; and all review furniture (id badges, annotation rules, state headings).

**The test:** does the number describe a thing, or the space around it? A rail is 360px because a form needs 360px — that travels. A card is 430px in these files because two of them plus a gap fit the page being drawn on — that does not. Put differently: **every fixed width in the app is on something that holds controls** (a rail, a nav, a dialog, a table column); everything that holds *content* is fluid, with a minimum and sometimes a maximum.

**How to write it:** `min-width`, not `width` (the main column is `1fr` with `min-width: 560px` and never has a width of its own); `repeat(auto-fill, minmax(280px, 1fr))` rather than a column count — nothing anywhere says "four across"; `max-width` for reading as a ceiling, not a size; **container queries over viewport breakpoints** for anything inside a column, so a field grid stacks because *its column* got narrow rather than because the window did (that is what lets the same form work in a 360px rail and a 640px page); and height from content and padding, with no fixed heights outside the deliberate 42px control.

**Verify at 1920, 1440, 1280, 1024, 900, 768, 430, 375, 320** — each crosses a breakpoint, a rail's disappearance, or a minimum. The two that catch the most: **1024**, where the facet rail has gone but the two-column layout has not, and **320**, where the mobile field floor bites. Also check **1920 with the sidebar collapsed** — the widest the main column ever gets, where a missing max-width shows up as a 1700px line of 13px text.

**Both breakpoint tables share one principle: every step removes or relocates something. Nothing is scaled down.** A compressed facet rail, a four-column equation at 300px, and a desktop table squeezed into a phone row are the same mistake.

---

### 16a–16c — Actions inventory
File: `Actions inventory.dc.html`

**The completeness check.** Compiled by walking every mockup rather than from memory: each control drawn, what it does, and what the user observes afterwards. Use it as the checklist when a screen is built — if a control on the screen isn't in this table, its behaviour was never decided.

Two rules the audit confirmed hold across the whole set, and which are worth enforcing in review:
- **Every destructive action has exactly one dialog; every reversible one has exactly one toast.** Nothing has both, nothing has neither. Dialogs: delete order, bulk delete, merge, discard scan. Toasts: line delete, status change, category add, archive, import.
- **Every "See X" link is a filter handoff, not a new view.** See in Statistics, Open in orders, the Needs-a-look rows and the monthly summary rows all carry state into a screen that already exists. No screen is reachable through only one link.

**16b — ten controls that were drawn with no behaviour described anywhere.** Seven are resolved outright:

| Control | Resolution |
| --- | --- |
| Export CSV / Export | Appeared on four screens meaning four things. One behaviour: exports **the current filter or drill state**, never the page and never the account, with the count in the button label. Same column set the importer reads, so export/import round-trips. |
| Save current | Saved views store query + facets + sort under a name, listed above the facet rail. Stores **the filter, not the result**. Never shared — one user. |
| Archive (vendor/category) | The middle option between keeping and deleting, and the answer to 5c's "no orders in 12 months". Hides it from lists and pickers; orders, totals and history untouched. Reversible, so toast + Undo. |
| Duplicate last order (Home) | 8a's duplicate applied to the most recent order without opening it. Same rules (no date, status or attachments), opens unsaved. Hidden when there are no orders. |
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

**16h — reordering by drag.** Two lists reorder — item lines on the order edit screen, and statuses in Settings — using **one component**. A second implementation is where the keyboard path gets dropped.

The handle is **always visible** at `#c3c1b8`, never hover-revealed: an affordance that only appears under the cursor is invisible on touch. Hover darkens it to `#57564f` with the standard `#f0efe9` row hover and `cursor: grab`. **Only the handle initiates a drag** — dragging from anywhere else would prevent text selection and fight the row click (16f) — but the whole row is a valid drop target, and a **4px threshold** stops an imprecise click registering as a zero-distance drag.

Dragging lifts the row out: white, `0 4px 14px rgba(27,26,23,0.08)`, a 0.6° tilt, following the pointer. A **2px `#1d4d33` insertion line** marks the landing place and rows below shift by `transform: translateY` over 150ms — never height or margin, which drops frames on exactly the lists that need reordering. **Move the row, do not clone it**: a ghost left in the old position shows a state the list will never be in.

**Keyboard is the same move.** Tab reaches the handle, Space or Enter picks the row up, ↑ ↓ move it one place per press, Space drops, Esc returns it. Each move announces the new position in a live region.

**Touch:** handle widens to 24px, row to 46px (15b), and the drag starts on **touch-and-hold, 200ms** — immediate would steal every scroll gesture beginning on a handle. **Auto-scroll** within 60px of a list edge, 4→18px per frame, bounded by the list; the page never scrolls.

**Position is stored explicitly** as a contiguous integer per row, rewritten on every reorder — never derived from name, date or amount, because receipt lines carry the order they were printed in. Statuses save on drop (the card is its own save scope); item lines mark the order dirty and wait for the sticky bar. **Dropping in the same place is not a change** — no dirty flag, no toast. A failed save restores the previous order and says so.

### 17a–17d — Images and files
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

**17c — thumbnails in a list row.** An order row's 36px thumbnail shows the **first item's photo**, and falls back to the category IdentityMark rather than a broken-image glyph. The card view's 116px strip shows up to three item photos then "+N". Both count *photos*; the paperclip badge after the reference line counts *attachments on the order*. They are different fields and can legitimately disagree — never derive one from the other.

**17d — what every image position holds.** A closed list of the nine positions in the app, each with its size, what it shows, and what renders when there is nothing there:

| Position | Size | Shows | Empty |
| --- | --- | --- | --- |
| Item photo | 44px | goods | IdentityMark in the category colour |
| Item photo, editing | 80px | goods | dashed slot, "Add photo" |
| Order thumbnail | 36px | goods | first item's photo, else the mark |
| Card photo strip | 116px | goods | up to 3 on a `#f7f6f2` floor, then "+N" |
| Attachment tile | 84px | paper | PDF tag bottom-left |
| Receipt preview | fluid | paper | page 1, zoomable |
| Page thumbnail | 72px | paper | one per PDF page |
| Account avatar | 32 / 56px | person | initials |
| Vendor mark | 26px | — | initials, always |

Three things this settles. **Goods and paper are different fields**: item photo and card strip show what was bought, attachment tile and receipt preview show the receipt — they share neither a picker nor a viewer. **Every fallback is an IdentityMark**, never a broken-image glyph and never an empty box, so a hatched block in a mockup always resolves to something. And **a vendor never has a photo** — always initials, no logo fetching.

A fourth thing this settles: **an image is never placed directly on a card or a row**. Every position above renders on a surface — the tinted cell in the card strip, the bordered tile for an attachment, the IdentityMark backdrop behind an item photo. Product photography is mostly shot on white, so an image with no floor under it dissolves into whatever it sits on. Same rule as the border on every dark-theme thumbnail (12a) and the shadow on every overlay (15a): the lightness of user-supplied imagery is never knowable.

An image position that is not on this list should not exist.

---

### 19a / 19b — Icon legend
File: `Icon legend.dc.html`

**Twenty-eight action icons, each with what it does, where it appears, its tooltip and its accessible name.** The set contains ~119 distinct glyphs; these are the ones that carry behaviour, and no icon-only button ships without both a tooltip and an aria-label.

The mapping is the specification, not the geometry — substitute the codebase's icon set at matching optical weight rather than lifting the paths.

**One icon, one meaning, everywhere.** The paperclip is always *attachments* and never "add a file"; the pencil always edits in place and never opens a new page; the plus always appends a row and never opens a dialog. Where two actions look similar but differ in outcome they get different glyphs — Close (dismisses a layer) and Remove-filter (changes results) are both an × and are drawn differently. **If a new action does not map to an icon in 19a, it gets a text button** — inventing a glyph for a one-off is how an icon set stops being learnable.

**Labelling.** Tooltip on hover *and* keyboard focus, 400ms delay, verb phrasing. The aria-label names the **target**, not just the verb: "Delete" is useless in a list of nine rows, "Delete Stol — eg" is not. Decorative icons take `aria-hidden="true"` and no tooltip; an icon inside an already-labelled button is decorative.

**Drawing.** 16×16 viewBox, stroke only, `stroke-width` 1.5 for actions and 1.3 for decorative glyphs, round caps and joins, no fills except the drag dots and the filled star. Rendered at 17px in a 32px button, 15px in a 28px item-line button, 14px inline beside text. Colour is always `currentColor`, so hover and disabled states carry the icon with them.

**Four prohibitions:** no icon-only destructive action outside a row (bulk delete is a labelled button); no icon carrying meaning by colour alone (the amber and red alerts are the same glyph — the message distinguishes them); no target below 28px on desktop or 44px on touch, however small the glyph; no hover-only icons on touch, which is why the item-line pencil is permanent below 640px.

---

### 18a / 18b — Responsive reference
File: `Responsive reference.dc.html`

**Read this before implementing any layout.** Every other file in this bundle is a static canvas drawn at one width, with fixed pixel values and no queries — nothing about narrow behaviour can be read off them. This page is the exception: the layouts in it genuinely respond, and the CSS is printed beside each one. **Where a static mockup and this page disagree about a narrow layout, this page wins.**

**Container queries, not media queries.** Every rule keys off the width of the element's own container (`container-type: inline-size` on the layout wrapper), not the viewport. The same components sit in a 1fr main column, a 360px rail and a 400px panel — a viewport query gets all three wrong at once. Media queries are correct for exactly two things: the shell breakpoint that turns the sidebar into a tab bar, and print.

**Thresholds are container widths, not viewport widths.** 900 on a main column inside a 248px sidebar plus 48px padding is a viewport around 1244. Don't translate them — put the query on the container and the numbers work out.

**Four thresholds exist in the whole product:** `1280` (a left rail leaves the layout), `900` (two columns become one), `640` (rows become cards, dialogs become sheets, field grids collapse), and the shell's own `640` viewport query. A fifth threshold is a design change, not an implementation detail.

**18a — working layouts with their CSS.** Six demos, each in its own container: all four column shapes, plus the row table and the field grids. Points that only a working example makes clear:
- `order: -1` moves the collapsed rail **above** the item list, not below. A form appended under forty item lines is somewhere nobody scrolls to.
- The rail collapses to a **summary line that states its own contents** ("Indbo Møbler · 12 Aug · Received") — same element, two children, one shown at a time.
- `minmax(560px, 1fr)` on the main column is deliberate: it refuses to go under 560 and overflows instead, surfacing the problem in development rather than silently crushing the rows.
- **Order cards need no query at all** — `repeat(auto-fill, minmax(280px, 1fr))` reflows on its own. Statistics is the opposite and does need them, because span values must stay divisors of 12 for rows to close: 3 → 4 → 6 → 12 are the only legal steps.
- **Fixed columns must never total more than the container.** The row table drops items at 1040 and category at 880, before the grid runs out of room — a starved `minmax(0, 1fr)` silently collapses to zero width rather than overflowing, which is the failure mode to watch for. Vendor is the fluid cell; amount stays 120px.
- The list's two thresholds are **independent** — at 1000px the facets are a drawer but the table is still a table. Chaining them into one breakpoint produces the cramped intermediate state.
- **One row markup, two presentations.** Desktop cells carry `.hide-m`, phone lines carry `.m2`, both always in the DOM. Two separate row components drift apart within a sprint.
- The computed third of the item equation is **replaced, not moved**: the read-only field hides and a total line shows. A box you cannot type into is a target that does nothing.
- Only padding changes for touch — `10px 12px` → `12px`, taking 42px to 46px. Type sizes never change between desktop and phone.

**18b — per-screen table.** One row per screen, three columns (at 1280 / at 900 / at 640), with an empty cell meaning the layout is identical to the column on its left. Covers the shell, order read and edit, the list, create, statistics, the library, home, settings, import, the viewer, dialogs and the combobox.

Two places horizontal scroll is allowed, both named in the table: the import dry-run preview table, and the attachment strip. Nowhere else.

**Acceptance, per screen.** At each of `1440 · 1280 · 1024 · 900 · 768 · 640 · 390`: no horizontal scroll except those two, no text under 11px, every target ≥44px below 640, no overlap, and the sticky save bar reachable without the keyboard covering it. The two widths that catch the most problems are **1024** (a rail has left but the table has not yet become cards) and **390** (the narrowest phone that matters).

**Build the four container-query wrappers first**, as four layout components. Every screen then picks one and fills it — screens that hand-roll their own grid are how a fifth threshold appears.

**Side-by-side panels in the other files are annotation, not layout.** Columns headed "1 — pick a file", "empty" / "loaded", or "light" / "dark" are never on screen together. Don't build a responsive row out of them.

### 16g — Selecting rows, and the header checkbox

**Applies to every selectable list**, not just orders. Three visual states on the header checkbox — empty, dash (some of the page), check (all of the page) — and only two outcomes from a click: **empty and dash both select the whole page; check clears.** Dash selects and never clears, because a partial selection is work already done and losing it by clicking the box that represents it is the outcome nobody predicts.

**The header checkbox never reaches past the page.** When the filter matches more, a named action appears under the bulk bar in the check state only — "Select all 128 matching", stating the number. Once taken, the bar reads "128 selected — everything matching these filters" with "Just this page" as the way back.

Single rows: the checkbox is the only selecting target (clicking the row navigates — 16f), it and its 44px hit padding stop propagation, and shift-click selects a range in the order currently displayed, without re-anchoring on sort.

Implementation:
- **Two shapes of selection, one piece of state** — a set of ids, or a flag meaning "everything matching the current filter" held with that filter. The second is *not* 128 ids: actions on it send the filter to the server, so it stays correct if a row was added since the click.
- **Filter, search, sort and page-size changes clear the selection** (including the filter-wide one), with no warning. **Paging does not.** That is the only case where the two differ, which is why page changes are handled separately from filter changes.
- The header box is a real `<input type="checkbox">` with **`indeterminate` set from script** — a property, not an attribute, unwritable in markup. Assistive tech reports "mixed" only for a genuine checkbox.
- Its accessible name states the scope: "Select all 25 on this page", updated with page size.
- Destructive bulk actions restate number and noun: "Delete 128 orders?".
- The count in the bulk bar is authoritative, not the ticks.

### 16d / 16e — Row menus, and hover

**16d — the row overflow menu.** Every data row ends in the same **40px** actions cell, holding the ⋮ and nothing else. **No visible per-row buttons, deliberately** — a pencil on every row is a third way to reach somewhere the row click and the menu both already go, and it costs column width that 15a keeps tight. The row's own hover fill and pointer are the affordance. The one exception is the **item line in 1b**, which expands in place rather than navigating: no address to fall back on and no menu, so the pencil is the only signal it is editable.

Menu order is fixed: constructive entries, a divider, then the destructive one last and alone. **Destructive is never a visible row button** — Delete 30px from Edit is one slip; behind a menu it takes two deliberate movements and still opens a confirm dialog. Every entry is reachable from the record's own page too: a menu is a shortcut, not the only route. One level of submenu, for Set status only, because that is a value list rather than a set of actions.

The cell **always occupies its 40px** whether hovered or not — the `⋮` is always visible, so nothing appears or disappears and no row shifts on hover. On touch the buttons are permanently visible at 44px. Opening the menu holds the row in hover and inverts the ⋯, so the owning row is clear once the pointer leaves. Panel is 226px, radius 10px, shadow `0 6px 16px rgba(27,26,23,0.08)`, anchored right and flipping above when there is no room. **Every button stops propagation** so a click does not also open the row — the most common bug in this pattern. `aria-haspopup="menu"` with a label naming the row ("More actions for Indbo Møbler", not "More"). Right-click on the row opens the same menu at the pointer. **While a selection exists the cluster is hidden** — bulk actions own the rows then.

**16e — hover.** One fill, one meaning: **`#f0efe9` says this responds to a click**, used on everything clickable and nothing else. A decorative hover teaches users to ignore the real ones.

| Surface | Hover |
| --- | --- |
| List row, menu row, chart bar, drillable table row | `#f0efe9` (rows full-bleed; menu rows inset 6px, radius 7px) |
| Icon button | `#f7f6f2` — lighter, because it sits on an already-hovered row |
| Destructive icon button | `#fdf6f5`, glyph to `#8a4a41` |
| Primary button | `#2f7a51`; active `#163c28` |
| Secondary button | `#f7f6f2`, border `#c3c1b8` |
| Input, combobox, selectable chip | border `#dedcd4` → `#c3c1b8`; fill never changes |
| Sidebar item | `rgba(255,255,255,0.05)`; the active item does not respond |
| Attachment tile | border `#1d4d33`; on dark, opacity 90% → 100% |

Rules: **if it does not respond to a click, it does not hover** — cards, KPI figures, section headers, status pills and the totals card are inert, and that is what keeps hover meaningful. **One fill per depth**, so a button inside a hovered row uses the lighter value. **Hover never moves anything** — no lift, scale, shadow or border thickening; colour and opacity only. **Selected beats hover**: a selected row stays `#e7efe8` and does not shift. 120ms ease both directions. **Focus is not hover** — keyboard focus is always the green ring, and a row can carry both at once. Guard everything with `@media (hover: hover)`, or a touch device keeps the fill on the last row tapped and it reads as a selection.

On dark, hover lightens rather than darkens (row `#2a2621`, icon button `#38332c`, selected `#1f3328`), so every value is a token and no component holds a hover literal.

---

## What clicking a row does (16f)

**A click takes you to wherever that row's detail already lives — and it never opens an edit form.** If the detail is a route, the click navigates; if it is a panel on the same page, it selects; if it is the row itself, it expands. Nothing has to be remembered per screen, because the layout already says which of the three applies.

| Row | Detail lives | A click |
| --- | --- | --- |
| Order (2b, 2c) | `/orders/:id` | Navigates to the **read** view, not edit |
| Vendor (5a) | Panel beside the list | Selects; row takes the `#e7efe8` tint |
| Category (5b) | Panel beside the list | Selects; the panel is read-to-edit, no mode |
| Item line (1b, 1d) | Inside the row | Expands in place — the one case a click reaches an editable field |
| Statistics row (4a) | One level down the drill path | Pushes a crumb, re-filters every card |
| Facet row (2a) | Nowhere — it is a control | Toggles the checkbox; whole row is the 44px target |

**Editing is always a second, deliberate action** — the pencil, the menu, or an Edit button. A list where clicking opens a form cannot be browsed without risking a change.

**A clickable row carries `cursor: pointer` on the row itself**, not only on the link inside it. The hover fill is a promise the row is clickable, and a fill without a pointer half-makes it — the hover then reads as decoration and people hunt for the real target. All three kinds, including the facet row and the item line.

**The row is the touch target, not the control inside it.** A facet checkbox is 19px and an item-line pencil 28px because they are glyphs; the row around them takes the full **44px** on touch with the glyph centred. Sizing the glyph up instead makes the row look like a form and still leaves most of its width dead.

**Selection is `#e7efe8`, hover is `#f0efe9`, and neither is `#f7f6f2`.** The quiet grey means inert — a selected row tinted with it is indistinguishable from a disabled one and from its own hover, which is what makes a list-and-panel layout feel like nothing happened on click.

**Where the click navigates, the row is an anchor** — an `<a>` with a real `href`, not an `onClick` with a router push. That is what makes ⌘-click, middle-click, open-in-new-tab and the status-bar preview work; all four are free with an anchor and impossible without one. **Where it selects, the row is a button** with no href, because there is no address for "vendor 4 is showing in the panel".

**Stop propagation on:** the checkbox, the ⋮, every icon button in the actions cluster, the drag handle, and any link or chip inside the row. Getting this wrong means every attempt to tick a checkbox navigates away.

**Hover is a contract.** Any row with the `#f0efe9` fill and a pointer cursor is promising it does something; a row that does nothing gets neither. Rows are in the tab order, Enter does what a click does, Space toggles the checkbox where there is one, and the focus ring sits on the row rather than on something inside it. **Nothing anywhere requires a double-click.**

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
| `02-order-list.png` | 2a–2e |
| `03-order-create.png` | 3a–3c |
| `04-statistics.png` | 4a |
| `05-vendors-categories.png` | 5a–5f |
| `06-states-confirmations.png` | 6a–6f |
| `07-mobile.png` | 7a |
| `08-duplicate-alerts.png` | 8a, 8b |
| `09-navigation-shell.png` | 9a–9g |
| `10-home.png` | 10a |
| `11-settings-import.png` | 11a, 11b |
| `12-dark-mode-viewer.png` | 12a, 12b |
| `13-typography.png` | 13a |
| `14-input-types.png` | 14a–14f |
| `15-layout-rules.png` | 15a–15c |
| `16-actions-inventory.png` | 16a–16f |
| `17-images-and-files.png` | 17a–17d |
| `18-responsive-reference.png` | 18a, 18b |
| `19-icon-legend.png` | 19a, 19b |
| `20-auth-and-first-run.png` | 20a–20e |

Full-page PNG at 2× device pixels (roughly 3300–4100px wide. Three pages are long enough to be capped below 2× by the pixel budget — `14-input-types.png`, `16-actions-inventory.png` and `00-overview.png`; for those, open the HTML rather than reading the screenshot), so panels and 11px labels stay legible when zoomed. Still for orientation and review only — measure nothing off them; the values in this document and the HTML files are the source.

## Assets

No external assets. All icons are inline SVG drawn for these mockups on a 16×16 viewBox, stroke-only — replace with the codebase's icon set at matching weight. Photo and attachment thumbnails are placeholder blocks; the real ones come from uploads. `Poppins` is loaded from Google Fonts in the mockups; use however the app already loads fonts.

## Files in this bundle

| File | Screens |
| --- | --- |
| `DECISIONS.md` | Rationale and rejected alternatives |
| `BEHAVIOUR.md` | Edge cases, precise rules, open questions |
| `index.html` | Linked overview of everything below — start here |
| `Home.dc.html` | 10a |
| `Navigation shell.dc.html` | 9a, 9b, 9c, 9d |
| `Order editing layouts.dc.html` | 1a, 1b, 1c, 1d |
| `Order list.dc.html` | 2a, 2b, 2c, 2d, 2e |
| `Order create.dc.html` | 3a, 3b, 3c |
| `Order statistics.dc.html` | 4a |
| `Auth and first run.dc.html` | 20a, 20b, 20c, 20d, 20e |
| `Vendors and categories.dc.html` | 5a, 5b, 5c, 5d, 5e |
| `States and confirmations.dc.html` | 6a–6f |
| `Mobile screens.dc.html` | 7a |
| `Duplicate and alerts.dc.html` | 8a, 8b |
| `Settings and import.dc.html` | 11a, 11b |
| `Dark mode and image viewer.dc.html` | 12a, 12b |
| `Typography.dc.html` | 13a |
| `Input types.dc.html` | 14a–14f |
| `Layout rules.dc.html` | 15a, 15b, 15c |
| `Responsive reference.dc.html` | 18a, 18b |
| `Icon legend.dc.html` | 19a, 19b |
| `Actions inventory.dc.html` | 16a–16h |
| `Images and files.dc.html` | 17a–17d |
| `support.js` | Preview runtime for the files above — not part of the product |
| `screenshots/` | Full-page capture of each file (see above) |

## Screen ids are names, not an order

Every screen carries an id badge — `1a`, `14e`, `20c`. These are **stable identifiers for pointing at a screen**, numbered in the order the screens were drawn. They are not the build order, and `1a` is not step one.

They are deliberately left alone: the ids are the review vocabulary, the mockups cross-reference each other by id in about two hundred places, and the build order has already changed twice. A name that encodes a moment in the project's history has to change when that moment passes — which is the same reason the naming rules reject `V2` and `New`.

The build order lives below, and on the index page as a STEP badge on each card.

## Build order

The index page carries a **STEP** badge on every card, matching this list. Screen ids are stable names, not an order — `1a` is not step one.

**Before step 0:** answer the open questions in `BEHAVIOUR.md` that affect what you are starting with. Several change the data model.

**0 — Foundations.** Read 18a, 14a–14f, 15a–15c, 13a and 19a; build nothing from them directly except the shared pieces below. Then, in order: the four container-query layout wrappers from 18a (every screen picks one and fills it — screens that hand-roll their own grid are how a fifth threshold appears), the shared field wrapper with TextField and Button, and then Combobox, which is the largest single control and has four screens waiting on it. Do the keyboard table in 14a before the styling, not after.

**1 — Auth and first run** (20a–20e). AuthLayout and the route guards, or there is nothing for an app route to sit behind.

**2 — Navigation shell** (9a–9d). The frame everything else renders inside.

**3 — Order edit and inline item editing** (1a–1d). The original problem, and the highest-traffic screen.

**4 — Order list with facets** (2a–2d). Unblocks navigation to everything else.

**5 — States, confirmations and file handling** (6a–6f, 17a, 17b). As shared components, before they get reinvented per page.

**6 — Order create and the scan flow** (3a–3c).

**7 — Vendors and categories** (5a–5d).

**8 — Statistics** (4a).

**9 — Home** (10a). Mostly composes what the earlier steps produced.

**10 — Settings and import** (11a, 11b) and **duplicate and alerts** (8a, 8b). Settings is small once the token layer exists; import is the largest single flow in the set and depends on nothing else.

**11 — Dark theme** (12a, 12b). A token pass, not a rebuild — if it needs component changes, the token layer was not clean. Do it before shipping: retrofitting a theme costs far more than building against one.

**Mobile (7a) is not a step.** Do each screen's narrow layout with that screen, using 18a — never as a pass at the end.

The foundation files are not steps; they are what every step is built against. Read 18a before writing any layout, 14d before any component, and 16a–16f when wiring a screen's actions — those are the three that stop the same decision being made differently on each screen.
