# Spendly: A Design System

A unified language for building consistent, scalable expense tracking interfaces. This document defines what the product looks like and why—not how to build it.

## What is this?

A design system is a shared language. It prevents the chaos that happens when designs scale: mismatched buttons, contradictory layouts, forgotten decisions, duplicated effort. Spendly's system defines the foundations (color, typography, spacing), the components (buttons, forms, cards), and the patterns (how filters work, how data flows, how users create things). 

**Everything here is framework-agnostic.** It names no React, no Vue, no Web Components. Those are implementation decisions that change. The design system outlives them.

## The problem it solves

Without a system, four button styles ship in four places. A field that rejects values draws error messages three different ways. A total that appears in ten places lives in ten files, and three of them disagree. Decisions get repeated, duplicated, and forgotten.

With a system:
- One source of truth: decisions are written once
- Consistency: every implementation follows the same rules
- Speed: new screens don't re-solve old problems
- Confidence: the system catches drift before it ships

## How this system was made

The system did not arrive first; the product did. The system was extracted from it by audit — taking inventory of every control the UI had, category by category, and counting.

The inventory is what made the case. Four buttons restated the same block of styles in full and had drifted apart doing it: three gaps, three radii, four font sizes for one control. Four date fields existed and three carried the calendar glyph — the fourth kept a bare native icon nobody had looked at. Five row families each declared their own `display`, `gap` and `padding` for one arrangement. The donut's shares were baked into the stylesheet beside a list computed from different numbers, and nothing rendered could disagree. Nineteen distinct `gap` values were in use, of which six carried the layout and thirteen were drift.

Every one of those counts turned into a rule, and the loop is still the method:

1. **Audit** — count the instances of a pattern before touching one. The tally decides the scope.
2. **Extract** — the shared thing becomes an element or a component; survivors keep only their differences.
3. **Document** — the rule lands here in general terms; the defect and its numbers land in [`docs/defects.md`](docs/defects.md), keyed to the section they defend.

That third file is the audit, kept running. A rule in this document that looks arbitrary has its history there.

## Contents

The system is layered: an element is defined before the component that uses it, a component before the view that composes it, a view before the pattern that repeats across several. Read down for depth.

- **[Foundations](#foundations)** — Color · Elevation and shape · Typography · Sizing · Spacing · Grids and breakpoints
- **[Components](#components)** — Buttons · Fields and forms · Stepper · Cards · Data rows · Notes · Empty states · Chips · Combobox · Segmented control · Switch · Charts · Meters and progress · Chrome · Icons
- **[Views](#views)** — Home · Orders overview · All orders · Order detail · Create and edit · Scan flow · Vendors · Categories · Statistics · Settings
- **[Patterns](#patterns)** — Filtering · Creation flow · Search · Progressive disclosure · Form validation · Feedback · Deletion · Pagination · Data persistence · Loading and errors · Honest affordances · Accessibility · iOS and WebKit · Responsive layout
- **[Conventions](#conventions)** — Naming in the markup · Language and formats · Documentation

---

## Foundations

These are the building blocks. Nothing here is a control. Everything here is what controls are made of.

### Color

Every color is a named token. A hex value written directly into a rule is a decision nobody can find later.

**Text, in four steps.** Text gets lighter as it gets less important, and the steps are fixed:

| Token | Value | Usage |
|-------|-------|-------|
| `--text` / `--text-strong` | #0B0F0D | Headings, figures, controls |
| `--text-body` | #3A423D | Sentences and descriptions |
| `--text-muted` | #636D64 | Metadata, captions |
| `--text-faint` | #9AA39D | Placeholders, disabled-looking text |

**Surfaces.** The app canvas is `--bg-app` #EFF1EF; cards float on it as `--bg-card` white. `--bg-row-hover` #F6F7F4 is the tint a navigable row shows under the pointer. `--bg-dark` #0B1A12 and `--bg-dark-lift` #12241A are the dark hero surfaces, with `--text-on-dark` #ADB8AF for their text.

**Borders, in three weights:** `--border-card` #E9ECE8 around surfaces, `--border-divider` #EDEFEA inside them, `--border-control` #E2E4DF on fields — each slightly different because a hairline inside a card must be quieter than the card's own edge.

**Semantics, one job each:**

| Token | Value | Usage |
|-------|-------|-------|
| `--green` | #14AC72 | Positive accents: savings, the answered state, meters |
| `--text-positive` | #0E7A52 | Positive *text* — darker than `--green` so it reads at small sizes |
| `--text-negative` | #B3261E | Rejections and negative deltas |
| `--teal` | #07625E | Focus rings, keyboard navigation — nothing else |
| `--blue` | #4F5BD5 | The AI/assistant accent |

Green is never an action color and blue is never a success state. When one color means two things, changing it for one job silently changes the other.

**Data viz has its own palette** (`--donut-*`, `--icon-*`: blue, red, yellow, purple, orange) because chart segments need to differ from *each other*, not to carry meaning — a donut slice is not "positive" or "negative".

**Contrast is AA, by design.** `--green` on white is 2.93:1 — fine for a 3px meter, not for text, which is why `--text-positive` exists. Measured values live in [`docs/defects.md`](docs/defects.md).

### Elevation and shape

One shadow: `--shadow`, two soft layers. Everything that floats — cards, the combobox panel — uses it. A second shadow is a second opinion about how high things float.

Three radii, named for what they wrap, not for their pixel count:

| Token | Value | Wraps |
|-------|-------|-------|
| `--radius-compact` | 10px | 32px-tier controls |
| `--radius-page` | 12px | The content sheet, panels |
| `--radius-card` | 15px | Cards |

### Typography

One family — Poppins — in exactly three weights: 500, 600, 700.

**The base is 14px / 500 / 1.45.** Everything inherits from it; a component states type only where it differs.

| Role | Spec |
|------|------|
| Body | 14px / 500 |
| Section labels | 11.5px / 600, uppercase, .08em letter-spacing |
| Dense metadata | 11–13px / 500 |
| Headline figures | 22px / 700, tight letter-spacing |
| Hero headings | 26–30px / 600–700 |

**Why 500 as the body weight, not 400:** 400 reads too light against these tinted sheets. No rule asks for 400, so the 400 face is not embedded at all — a face nothing requests is pure payload.

**Why weights, not more colors, for hierarchy:** a bolder label beside a muted value gives two axes of hierarchy (weight and color) from one family, and both survive grayscale.

**Numbers are tabular.** Any column of figures uses `font-variant-numeric: tabular-nums` (`.tabular-figures`) so amounts align digit-for-digit. A total that jitters as it changes is a total set in proportional figures.

**Headline sizes are owned by a class, not by each site.** `.figure-large` is 22px/700 — the class exists because the size was once inline per site, and one site drifted to 24px against three at 22px. A size class that does not set a size is a defect wearing a fix.

### Sizing

Control heights come in tiers, and a control joins a tier rather than picking a height:

| Tier | Height | Who lives there |
|------|--------|-----------------|
| Chrome | 32px | Top-bar actions, pill buttons, compact buttons, square icon buttons, field thumbs |
| Standard | 38px | The base button, the toolbar's search field, the global finder |
| Entry | 48px | Every field in a form, a segmented control used *as* a field, the hero's entry buttons |

44px sits between the last two for exactly one thing: a card's full-width block action. It is not a tier — nothing else may claim it.

**Radius follows the tier**: 32px and 38px controls take `--radius-compact` (10px); the 48px entry tier takes `--radius-page` (12px). A control that picks its own radius breaks the pairing that makes the tiers read as families.

**Icons follow the tier too** — 15px in the standard tier, 14px in the chrome tier — never the call site.

**Why tiers:** a height chosen per control is a height that drifts per page. Four buttons once had four heights for the same job. With tiers, "how big is this control" is answered by asking what kind of control it is, and a new size has to argue for a new *kind*.

**Touch:** under a coarse pointer, entry fields render their text at 16px and scale it back to the design size — the size iOS demands before it stops zooming the page on focus — and segments keep a 38px minimum on the phone. Targets grow by tier, not per control.

### Spacing

Spacing builds rhythm and hierarchy. The system uses a tight palette of intentional gaps:

| Value | Usage |
|-------|-------|
| 7px | Label to field |
| 12px | Within a row, between small elements |
| 14px | Inside panels, between sections |
| 16px | Form grid, between fields at equal weight |
| 18px | Between cards, top-level spacing |
| 20px | Card gutter, row hover bleed |

**Why these numbers:** They're the load-bearing values. Change one of these and the whole layout moves. Everything else is either derived from these or is a one-off constraint.

**The test:** Grep the stylesheet. Count how many places use each value. The top six are the ones that carry the layout.

### Grids and Breakpoints

The shell is a two-column grid: a fixed 236px sidebar and a fluid content sheet. Pages lay their cards on an 18px-gap grid inside it.

**Width breakpoints, from wide to narrow:**

| Breakpoint | What changes |
|------------|--------------|
| ≥2200px | The content rail stops growing |
| ≤1180px | Card grids drop to one column |
| ≤900px | Two-column page layouts stack |
| ≤700px | The phone layout: sidebar gone, bottom nav, one 12px gutter |

**Each breakpoint answers one question** — "when does this arrangement stop fitting?" — so they are not a scale, and a new layout must justify a new number rather than reuse one because it is nearby.

**Two breakpoints are not widths:**
- `pointer: coarse` is what makes a phone a phone. Touch targets grow and fields render at 16px (then scale back) so iOS does not zoom the page on focus. A narrow desktop window is *not* the phone layout.
- `prefers-reduced-motion: reduce` stops the animations for users who asked for that.

**The document itself has rules.** The doctype is load-bearing — without it the page parses in quirks mode, which once moved 243 elements off their standards-mode geometry. The charset declaration comes first in `<head>`, before any sizable block: a browser stops sniffing for the encoding after 1024 bytes, and an undeclared encoding renders every non-ASCII character wrong.

---

## Components

Components are functional pieces of the interface. Each one is built from foundations and exists in multiple states.

### Every state is a rule, or it is a hope

A component has as many states as the stylesheet gives it, and no more — a state nobody wrote renders as the resting state, whatever the truth is. What the system defines:

| Component | States it has |
|-----------|---------------|
| Field shell | `:focus-within` — dark edge and 1px ring. `:has([aria-invalid="true"])` — red edge, and it outranks focus, so a focused broken field still reads broken |
| Combobox | `.is-open` on the wrapper: panel shown, field edge darkened, chevron rotated 180° |
| Data row, card header | `[data-go]:hover` — the tint, keyed on the attribute that navigates, never on the row's class |
| Segmented, sub-tabs, range tabs, month columns, stepper, sidebar nav | `.is-on` — one selection mechanism for every group of one-of-many |
| Switch | `[aria-checked="false"]` — grey track, knob left. Both states are written, because the on state was once the only one |
| Disclosure button | `[aria-expanded="true"]` rotates the chevron; the label never changes |
| Anything focusable | `:focus-visible` — 2px `--teal`, 2px offset, one rule for the whole document |

**An ARIA attribute is a claim about the pixels, and only the pixels settle it.** Each state attribute above has a stylesheet rule that draws it. A switch whose `aria-checked` flips while both states render identically passes every attribute check and still lies to everyone who looks at it.

**Buttons have no hover, active or disabled rule — a documented gap, not a decision.** See [Buttons](#buttons).

### Buttons

A control that acts in place is a `<button>`. A control that goes somewhere is a `<a>` with `data-go` to identify the destination. That's not pedantry: a link opens in new tabs, a button doesn't. A link fires click on Enter, a button doesn't. They're not the same.

**One base, then variants.** `.button` owns the shape every button shares: 38px tall, 12.5px/600 caps label, compact radius, a 1px edge (transparent until a variant colors it). Four buttons once restated that block in full and drifted apart doing it — three gaps, three radii and four font sizes for one control — which is why the shape lives in the base now.

A variant is never written alone. It is always `class="button button-primary"`, because the variant owns only its *difference*:

| Variant | Difference |
|---------|-----------|
| `button-primary` | Dark surface, white label — the one main action on a surface |
| `button-outline` | White surface, visible edge — the alternative beside a primary |
| `button-ghost` | No fill at all — low emphasis, the quiet second choice |
| `button-pill` | The 32px tier: top bar and section actions share this one size |
| `button-block` | Full width, 44px — a card's one big action |
| `button-caps` | The hero's 48px entry buttons |
| `button-link` | Underlined text action (SEE ALL, CLEAR ALL) — no box at all |

**Every button label is caps.** One voice for actions, everywhere.

**A button's icon follows the button's tier, not the call site** — 15px in the 38px tier, 14px in the 32px tier. An icon sized where the button is used is a size that drifts per page.

**States:** the stylesheet defines no hover, active or disabled rule for buttons — a real gap, documented rather than papered over. Where an implementation must show *disabled* (a pager at its last page), it does so honestly and locally until the system settles a rule for all tiers at once.

### Fields and Forms

A field is a label, an input, an error message and help text, in that order.

```
Label
[━━ input ━━]
error message or help text
```

**Field shell** (`.field-shell`): The bordered box the input sits in. It can carry:
- Leading icon (a glyph, read-only)
- Trailing icon (a button or glyph)
- Unit (text like "kr" for currency)
- Chips (tags that sit inside the border with the input)

**Field types:**
- **Text** (`.field`): Plain text input
- **Date** (`.field-shell-date`): Date picker with a calendar glyph
- **Combobox** (`.combobox`): Searchable dropdown
- **Textarea**: Multi-line text

**Field pairs** (`.field-pair`): Two fields side by side on desktop, stacked on phone. Used for ranges (from/to) and paired choices (first name / last name).

**Validation:**
When a field rejects a value:
1. The shell gets a red border
2. The input gets `aria-invalid="true"`
3. An error message appears below, with an id
4. The input gets `aria-describedby` pointing at that message
5. The form itself states the problem in one sentence

This marking is written once. Every form that rejects values uses the same pattern.

### Cards

A card is a section with optional header, content, and divider.

**Card header** (`.card-header`): 
- Has a title (required)
- Can be linked (optional, but needs an `aria-label` if so)
- Gets a chevron when linked
- Announces as: "{title}, open {destination}"

**Card body** (`.card-body`):
- 14px top padding inside
- 20px side padding
- Never gets a padding-top override, ever. That's how two cards got 2px overrides and put their content at four different distances from the hairline.

**Card divider** (`.card-divider`):
- 1px line between header and body
- Inherits text color, so it's darker where text is darker

**Card types:**
- **Data card**: Static information (orders, vendor details)
- **Question card** (`.card-question`): Asks something, has an answer and a call-to-action
- **KPI card** (`.card-kpi`): Number, label, delta (statistic tiles on Statistics page)

**A note and the action under it stand 12px apart, set from the note** (`.note + .button`). Set from the button, the gap depends on which variant happens to follow — one variant carries its own margin and another carries none, which is how the same pair once measured 12px on one page and 0 on another. ([`docs/defects.md`](docs/defects.md))

### Data Rows

A row displays one record in a list. It is either:
- Read-only (static text), or
- Navigable (the whole row is a link to the record, carrying `data-go`)

Editing never happens in the row — a record is edited on its own form page, one way, everywhere.

**Row anatomy:**
- Left: glyph or avatar
- Center: one or more text fields (title, subtitle, metadata)
- Right: optional action (chevron to navigate, delete button, etc.)

All gaps are 12px. If that's wrong for a row type, it needs its own CSS rule.

**Hover state:** On desktop with a pointer, rows that navigate show a tint (`[data-go]:hover`). On phone with touch, no hover. The tint bleeds 10px into the card gutter on each side.

**Why `data-go`?** It's what every clickable row carries. It names the destination. So styling is simple: `a[data-go] { color: inherit; text-decoration: none; }`. One rule, every linked row looks like a row, not a link.

### Notes

A note is a tinted callout. It has a tone (positive, warning) and optional title.

```
[✓ Saved] Orders added to your list.
```

**Tones:**
- **Positive** (green): Success, confirmation, good news
- **Warning** (amber/orange): Caution, attention needed

**Why separate tones:** Color alone doesn't work for colorblind users. The tone is usually the semantic meaning anyway (success, warning).

### Empty states

What a list shows when it holds nothing: a 42px icon tile, then one sentence, centered, capped at 30ch.

**An empty state is an answer, not an absence.** A filtered list with no matches says so under the very filters that caused it — the chips stay, because removing them is how the user gets out. A record that does not exist gets "Nothing here." rather than an empty frame that looks like a slow one.

**The sentence says what would fill it** ("No orders match these filters", not "No data") — the difference between a dead end and a next step.

### Chips

A chip is a small label, usually removable. Used for filters, tags, and selections.

```
[Vendor: Bilka ×]  [Status: Delivered ×]
```

**Chip types:**
- **Filter chip** (`.chip`): Shows an active filter. Clicking × removes the filter.
- **Status chip** (`.chip-status`): Shows the status of something. Not removable.
- **Tag chip** (`.chip-tag`): Labels for the record. Removable.
- **Saving chip** (`.chip-saving`): How much is saved on a purchase.

**The rule:** The chips are the filters, not a picture of them. Removing a chip removes that filter. If a chip sits on the page but removing it does nothing, that's a lie about the interface.

### Combobox

A searchable dropdown for picking one thing from a list.

```
[Bilka ▼] ─── closed
  • Bilka
  • Netto
  • Rema 1000
  • Føtex
```

**Anatomy:**
- Input: shows the selected value, lets you type to search
- Chevron: says it expands; rotates 180° while open
- Panel: the options, floated on the card shadow
- Selected: current value marked in the list

**States:** `.is-open` on the wrapper is the one open state — panel shown, field edge darkened, chevron rotated. Closed, the field shows the selected *name*.

**A combobox displays a name, never an id.** Links arrive carrying ids (`vendor=bilka`); the field resolves the id through the same lookup the chips use before showing anything. Two controls describing one filter may not disagree — the field is the one a user edits, so what it claims is what the next APPLY is made from.

### Segmented Control

A group of tabs where only one can be on. Used for status filters (Ordered / Delivered / Returned), time ranges (Today / Week / Month), view types.

```
[Ordered] [Delivered] [Returned]
```

One is always selected. Clicking a different one switches which is selected. All choices are visible—this is not a dropdown.

**Why not a dropdown:** Every choice is one tap. With a dropdown, three choices means tap, wait for menu, tap again. With segmented, it's one tap.

**Selection is a fill, not a weight.** The selected segment gets the dark surface and white text (`.is-on`); its weight stays 500 like its neighbours. A bolder selected label is wider than its resting self, and on a `width:max-content` track the whole control changes width every time the selection moves.

**If the control enumerates a sequence, the order must be true.** Ordered / Delivered / Returned reads left to right in the order it happens. This control once read Delivered / Ordered / Returned in all three places it appears — pixel-perfect in every engine, and wrong.

**One selection mechanism.** `.is-on` marks the selected item here, in the range tabs, the sub-tabs, the month columns and the sidebar nav — one class for every one-of-many group, so a harness (or a reader) checks selection the same way everywhere.

### Switch

The on/off control: 44×26, a round knob on a pill track.

**Both states are drawn, and they differ in three ways at once:** on is the green track with the knob right; off (`[aria-checked="false"]`) is the grey track with the knob left. Track color *and* knob side *and* — where the switch discloses something — the disclosed content itself. Redundancy is the point: this switch once had only its on state written, so it rendered green-and-right whatever the truth was, and no attribute check could see it.

**A switch is a statement, not a request.** Flipping it takes effect immediately — no save button. A switch that needs APPLY is a checkbox wearing the wrong costume.

**Every switch names what reads it.** A settings page of switches that change nothing is the decorative-control defect with more surface area — so each one's label says what it controls, and somewhere in the product that thing observably changes.

### Stepper

The two-step form's header: one cell per step, each with an icon tile, a progress bar and a label.

**States:** the current step is `.is-on` (green bar, full-weight label); a completed step is done (green tile, green bar); a future step is muted. Three states, all written.

**The stepper is a map, not a control.** It shows where you are; moving between steps is the form's CONTINUE and BACK, which run the validation the jump would skip. A stepper you can click is a promise that arbitrary order is fine, and here it is not.

### Meters and progress

Small quantitative graphics, each with one job:

- **Meter** (10px bar): how much of a budget is used. The fill is `--green`; a 2.5px marker in `--text` shows a reference point (the comparable figure last month). The marker is why it is a meter and not a progress bar — it states *against what*.
- **Progress bar** (6px): completion of a process, no marker.
- **Progress ring**: the same, radial, where the number it wraps is the subject.
- **Month columns**: a column per month at fixed 150px scale-height, the current month `.is-on`.

**None of these carry text.** The figure they illustrate stands beside them as real text in tabular figures — a number inside a graphic is a number a screen reader loses and a walk cannot compare.

### Charts

The app draws a line chart, a donut, weekday bars, meters and progress rings. Three rules hold them together:

**One user unit is one CSS pixel.** The line chart's viewBox is remapped 1:1 onto the element's pixel box on every resize, so stroke widths hold and text in the chart is never scaled. A chart whose viewBox is a guess renders its 1px grid line at 1.3px on one screen and 0.8px on another.

**A chart is drawn from the records the list beside it is drawn from.** The donut's shares and its legend must come from one source. A ring with shares baked into the stylesheet next to a list with its own numbers cannot fail visibly — a ring has no opinion about the list beside it — and the two once disagreed exactly that way.

**Chart colors are the data-viz palette** (`--donut-*`), which exists so segments differ from each other. Semantic colors stay out of charts: a slice is not "positive".

**Legends are rows.** A chart legend row is the data-row pattern at chart scale — glyph (swatch), label, value — and a legend row that filters the list navigates like any other row, with `data-go`.

### Chrome

The frame around the pages: sidebar, top bar, bottom nav on the phone.

**Sidebar** (236px, desktop only): brand, then navigation. The active item is `.is-on`, the same selection mechanism as every one-of-many group. Icons sit at fixed width so labels align.

**Top bar:** the global search field, and the app-wide actions at 32px (`button-pill` tier). The search prints its shortcut on a key cap — and a key cap is a promise: the shortcut must actually open and focus the search from anywhere.

**Bottom nav** (phone only): the sidebar's destinations as a thumb-reachable bar. Same `.is-on`, same icons, one nav defined per layout — never two navs both rendered and one hidden by luck.

### Icons

The system uses 39 glyphs across the entire app, every one stroke-drawn in the same style and named for its meaning. When a new page needs an icon, it reaches for one of these before inventing a fortieth — a glyph that exists twice in slightly different paths is the drift the uniformity rule exists to stop.

**Sizes are set by the component that carries the icon**, not by the call site: a button's icon follows the button's tier (15px in the 38px tier, 14px in the 32px tier), a row's glyph follows the row family. Sizes run 12–20px; each one belongs to a component's spec.

**Icon buttons** (`.icon-button`) are the square control carrying nothing but a glyph — so the accessible label is mandatory, because there is no text to read.

**The rule:** Use an icon when the meaning is universal (trash = delete, search = find). Never use one alone when the meaning is private to this app — label it.

---

## Views

Views are screens. They're composed from foundations and components.

### Home

The landing screen, top to bottom: the month being viewed, the hero chart, then a card grid the user owns.

**The dashboard is personal.** Which cards appear, and in what order, is the user's choice: an edit mode exposes a grip per card, cards drag (or move by arrow key, Home and End for the ends), and the arrangement persists. Everyone sees the same Orders page; Home shows what this user chose to see.

**A drag shows what is moving and where it lands.** The lifted card leaves the flow at the size it had, follows the pointer on a shadow, and a dashed slot of exactly that size travels through the grid. A dimmed card shuffled in place is a drag where the most important thing on screen is the faintest.

**The scan promo card can say LATER** — and LATER writes the same setting the Settings switch writes, so dismissing it here and re-enabling it there are one setting seen twice, not two flags that drift.

### Orders Overview

The month in review: this month against the one before, side by side with the same structure in both columns — same rows, same order, so the eye compares without re-reading. Then the latest orders, suggestions drawn from history, and the question of the day.

**The question card** asks something the data can answer ("Did you order more than last month?"), shows the answer in the note tones, and offers one action — SEE THOSE ORDERS — which is a link into All Orders carrying the filters that prove the answer. The card is a door, not a widget.

### All Orders

The working list. Top to bottom: sub-tabs (Ordered / Delivered / Returned — the status filter in one tap), the toolbar (search field, FILTERS disclosure, the sort chip), the chip row with the match count over it, the rows, and the pager.

Every piece of that state lives in the URL:

```
#/orders/all?category=groceries&vendor=bilka&from=2024-01-01
```

Arriving at that URL shows a filtered list. The chips reflect the URL, the panel's fields reflect the URL, the count reflects the rows.

**A filtered list is a place, not a mode.** It can be linked to, bookmarked, sent — and it *is* linked to: category tiles, vendor cards, chart legend rows and the question of the day all land here carrying filters. Closing the filter panel doesn't clear the filters; they stay in the URL.

**Two controls describing one filter may never disagree** — the sub-tab and the panel's status control are the same filter in two places, and so are a chip and its combobox.

### Order Detail

One order's full record. The header band holds the identity and the actions: status, date, total, edit — and the trash, which follows the [deletion policy](#deletion). Below it: the line items with what each cost and saved, then the attachments card — add a file, open one, remove one (that trash follows the same [deletion policy](#deletion)), with the header counting them.

**Everything shown is derived from the record.** The subtotal is the lines added up; the saving is retail minus paid. A stored total beside stored lines is two claims that can disagree while both look right.

**Why edit is a separate page:** the form has validation, a draft, and two steps. That complexity doesn't belong on the reading view — the detail page shows, the form page changes.

### Create and Edit

Two-step flow for creating or editing an order:
1. **Step 1**: Basic info (date, vendor, category, kind)
2. **Step 2**: Items (add, remove, edit quantity and notes)

Same form for create and edit. Editing loads the order in. The two steps share one draft — leaving and coming back loses nothing.

**Validation:** Each step validates on its own attempt to continue. A rejected step marks its fields (see [Form Validation](#form-validation)) and states the verdict in its own status line: "Cannot continue — Vendor and Date need fixing." The verdict stays on screen while the form is still wrong, because it names the fields to go and fix.

### Scan Flow

Entry point for creating orders from receipts:
1. **Entry**: the hero says the app takes "a PDF, photo or screenshot", and four entry buttons name the formats one by one
2. **Reading**: shows the document the user chose
3. **Review**: the extracted lines, editable one by one, saved as a real order

**Why separate:** Reading shows the actual document. Review shows the extracted data. The user sees both and can correct misreads.

**The copy is a contract.** When the product's own words enumerate what it accepts, each entry must carry its own document through — name, size, format glyph, and a page count that belongs to PDFs and nothing else. All four entries once landed on the same `kvittering-bilka.jpg`, and no screenshot could catch it, because one document was the only document.

**Review runs the same rules as the form.** Scan and create are two doors to one saved order, so a value required at one door is required at the other, refused in the same words. The two had once parted company: the review checked nothing, and a receipt with a blank vendor line saved an order with no vendor — through a flow whose twin asks "Who did you buy from?" about that field.

### Vendors

Favourites in the spotlight, every vendor below — **one card, in two sizes**. The pair and the strip once said the same things in two arrangements, one entering through a full-width VIEW ORDERS and the other through its header; now the header band is the way in on both, and the star (favourite) and pencil (edit) sit at the foot of both.

**A linked header may not hold a button.** An action inside a link is two things to activate in one box — the star lives in the card foot, outside the link.

### Categories

Each category is a tile — its glyph, its color, its month's total and budget meter — and the tile is a door: it opens All Orders filtered to that category. A Manage tab lists the same categories as rows whose job is editing; a row opens the record's own form page.

**Glyph and color are chosen, not assigned.** A generated color is a value the user can see, cannot explain, and could not change. Both are picked on the category's form page, previewed at the size they are used at, and stored on the record — so every surface that draws the category draws it from the record.

### Statistics

The month in numbers: a four-across KPI row (each tile a figure, its delta and its trend arrow — trend and tone are separate, because spending *less* is a good *down*), then the charts, then the month pager.

**The month is in the URL**, so a month can be linked, and the browser's Back walks the pager. The period arrows disable honestly at the ends of the data.

### Settings

Every control here names what reads it, and the page proves it: default kind and status (what the order form opens with), rows per page and sort (what All Orders obeys), the scan card switch (the same setting Home's LATER writes), ask-before-deleting (what every trash reads), and clear stored data (back to the shipped state, said before it does it).

**A settings page whose switches change nothing is the decorative-control defect with more surface area.** A setting exists here only if something observably reads it.

---

## Patterns

Patterns are common behaviors and flows.

### Filtering

**How filters work:**
1. Click FILTERS to open the panel (collapsed by default)
2. Set filters using comboboxes, date fields, segmented controls
3. Click APPLY (or auto-apply on each change)
4. Chips appear showing active filters
5. Click × on a chip to remove that filter
6. URL updates with all filter state

**The rules:**
- Filters are in the URL, always. Bookmarking works.
- Chips show the filters, not a picture of them. Remove a chip, the list updates.
- Sub-tabs (Ordered / Delivered) are filters too. They must agree with the panel's status control.
- Opening the filter panel shows the current state, not defaults.

### Creation Flow

**Two doors, one saved order.** Records can be created by form or by scan, and the doors converge: a value required at one is required at the other, refused in the same words, because both run the same rules. The two once parted company — the scan review checked nothing, and a receipt with a blank vendor line saved an order with no vendor, through a flow whose twin asks "Who did you buy from?" about that field.

**A flow holds a draft.** Moving between steps, or leaving to look something up, loses nothing. The draft is not the record; SAVE is the moment it becomes one.

**Creation lands you on what you made.** Saving opens the record (or the list positioned at it), because the proof that it worked is the thing itself, not a message about it.

**Every create flow is reachable the same way:** ADD opens `/<records>/new`, a row or a pencil opens `/<records>/:id/edit`, and the search palette offers all the creates. One route shape, learned once.

### Search

Two surfaces, one promise: typed text finds things.

**The global finder** sits in the top bar and prints its shortcut on a key cap — and a key cap is a promise: the shortcut must open and focus the search from anywhere, or the cap is a decoration lying about the keyboard.

**The palette contract:** results update per keystroke; Up and Down walk them; Enter opens the highlighted one; Escape closes and hands focus back to what had it. It searches the data (orders, vendors, categories, item lines, notes) *and* the commands (every page, every create flow) — so the keyboard reaches everything.

**It is an index, not a script.** A search that ships four hardcoded results for one demo word is right for that word and wrong for every other. If search is drawn, it searches.

### Progressive Disclosure

Complex features are hidden until needed: the filter panel behind FILTERS, extra detail behind a switch, an item editor behind its line. Users see what they need now, not everything at once.

**The mechanics are fixed:**
- The disclosure button states its state: `aria-expanded` flips, and the chevron rotates with it. The label never changes — the arrow is what says open or closed.
- What is closed is `hidden` — actually absent, not visually parked. A panel that is merely transparent still traps focus and still reads to a screen reader.
- Both states must exist in the stylesheet. The "more details" switch once had a green track and a right-hand knob in *both* states, because nobody wrote the off state — a control with one drawn state renders that state whatever the truth is.

**Closing a disclosure changes what is visible, never what is true.** Collapsing the filter panel does not clear the filters; the chips and the URL still hold them.

### Form Validation

When a form rejects a value:
1. The field's shell gets the red edge — and it outranks focus, so a focused invalid field still reads invalid
2. The message appears under its own field, with an id the control's `aria-describedby` points at
3. The form's own status line names every rejected field in one sentence: "Vendor and Date need fixing"
4. The description is set with the message and removed with it — a dangling `aria-describedby` points at nothing

**Why this way:** the message is beside the field (context), the status line gives the scope in one place, and the marking is written *once* — every form that rejects values uses the same one, because two copies agree until the day one is fixed.

**A verdict is not a toast.** Saved / added / removed goes to the transient feedback layer; "cannot continue" stays on the form, beside the fields it names, until they are fixed.

### Feedback

Everything the app says back after an action — saved, added, removed, moved, refused — goes to **one layer**: top right, under the top bar, a single polite status region. A toast clears itself after five seconds, can be dismissed, stacks newest first, and is capped so the stack cannot wallpaper the screen. The layer never swallows a click meant for what is under it.

Before the one layer existed, each page printed its result wherever there was room — a removed file was reported a column away from the file, a reorder was announced at the top of a form nobody was looking at. **Feedback nobody sees is feedback that was not given.**

**The line it does not cross:** a form's verdict on its own fields is not a toast. "Cannot continue — Vendor and Date need fixing" stays on the form, beside the fields it names, until they are fixed. Adding a line is a toast; failing to add one is not.

### Deletion

One policy, everywhere:

- **Delete lives on the record's own page** — the order's header band, the form's footer — not on list rows, where a miss-tap on a crowded phone row is a record gone.
- **Ask-before-deleting is one setting, read by every delete** — records and their parts alike: the order, the category, the vendor, a line item, an attachment. A destructive action that asks on one screen and not another is not a setting, it is a coin toss.
- **Asking is a modal dialog.** The question interrupts above the page — the record named, DELETE and CANCEL, cancel holding focus, Escape declining — never a confirmation unfolded inline into the layout.
- **A refusal names the reason and the count.** A vendor with orders on it, a category still on orders — both are refused with how many things are in the way, because "cannot delete" without a why is a dead end and with one is a to-do list.

### Pagination

Long lists page; they do not scroll forever. Continuous scrolling buries the footer, breaks "how many are there?", and makes a position unshareable — and this is a ledger, where *how many match* is half the answer.

**The pager states the range** ("1–25 of 112"), disables PREVIOUS and NEXT honestly at the ends, and keeps the page in the URL with the rest of the list state. Page size and default sort are settings, read from the same place every list reads them.

### Loading and Errors

**Data arrives late, and the design owns that.** Every read has latency, so every reading surface has a loading state — a surface designed against instant data is a surface with no loading state, and that is the half that breaks first.

- **Known data stays up during a refetch.** Walking back to a page paints what is known rather than flashing a skeleton at values that have not changed, and the layout does not collapse under the user while newer data lands.
- **A slow answer may not overwrite a fast one** that arrived after it — reads are cancellable, and a stale response is dropped, not drawn.
- **An error is an answer.** A failed read says so; a missing record says "Nothing here." An empty frame that looks like a slow frame is a lie with a spinner.

### Data Persistence

What the user changes persists. Refresh the page, the changes are still there. A "clear stored data" action resets everything to the shipped state, and it says so before it does.

**The rule:** What is stored is the *difference* from the shipped data — an edited record stores which fields changed; a new record is stored whole. A stored *copy* of everything freezes the demo data at the version first seen, so a later fix to the shipped data never reaches anyone who opened the app once.

**Storage being refused is not an error worth surfacing.** The choice still holds for the session; it just does not survive the next one.

### Honest Affordances

A control is a promise. Everything drawn as interactive must do the thing it depicts — this is the pattern most of this system's defects trace back to.

- **A button that does nothing is not drawn.** FILTERS was once rendered complete and toggled nothing. If the behavior isn't built yet, the control isn't either.
- **A control names its action, and the action must be true.** A grip with `cursor:grab` promises dragging; if rows can't be dragged, the grip lies.
- **Hover states are earned.** Only elements that navigate get the row tint — it's keyed on `data-go`, the attribute that actually navigates, not on the row's class. A tint on an inert row invites a click that does nothing.
- **Disabled is shown, not hidden.** A pager at its last page shows NEXT disabled rather than removing it — the control exists, it just can't act right now, and the difference is information.
- **Copy is a promise too.** If the words enumerate what the product accepts, every named case must work (see [Scan Flow](#scan-flow)).

### Accessibility

The system targets WCAG AA, and the pieces are structural, not sprinkled on:

- **One focus rule for the document:** `:focus-visible` draws 2px `--teal` with 2px offset on anything focusable. No control invents its own.
- **Landmarks:** every element lands inside one — content in `<main>`, navigation in `<nav>` — because "outside any landmark" is invisible to nobody except the people using the landmarks.
- **Labels are real:** an icon-only control carries an accessible name; a linked card header announces "{title}, open {destination}"; a `<label>` points at its own control explicitly the moment anything labelable sits between them.
- **State is in attributes and in pixels:** `aria-expanded`, `aria-checked`, `aria-invalid` — and each attribute has a stylesheet rule that draws it, because an ARIA attribute is a claim about the pixels, and only the pixels settle it.
- **Reduced motion is honored** via `prefers-reduced-motion`.
- **Contrast:** AA against the palette above. Decorative uses (a 3px meter in `--green`) may sit below text thresholds; text never does — that is what the darker `--text-positive` exists for.

### iOS and WebKit

The one platform whose own chrome the system has to work around. These are not styling choices; each is a workaround for something an engine draws or does uninvited:

- **Native decoration is suppressed everywhere it appears.** Search fields get a circled × from the engine; date fields get a picker button. Both are browser-drawn icons the icon rule does not allow — and suppressing them is engine-shaped: a `-webkit-` prefix names the engine that *invented* the pseudo-element, not one that obeys the property you set on it. What removes a control in one engine can leave it drawn in another; only launching the engine settles it.
- **Field text is 16px under a coarse pointer, then visually scaled back.** iOS zooms the page on focus of any field below 16px; the scale-back keeps the design's size without the zoom.
- **Openers must be real.** The date glyph opens the native picker where the platform can (`showPicker`), and binds nothing where it can't — a dead listener swallows the tap the label forwards to the input.

A change touching a native form control is engine-shaped by default: verified in one engine means unverified in the others, and the report says which.

### Responsive Layout

The phone layout is 700px and narrower. Below that:
- The sidebar is gone; navigation moves to a bottom bar
- Card grids and column layouts become one column
- Field pairs stack instead of sitting side by side
- The page runs on a single 12px gutter

**Touch is not width.** The coarse-pointer rules (bigger targets, 16px field text) key off `pointer: coarse`, not off the viewport — a narrowed desktop window is not a phone, and a phone in landscape still is one.

**The test:** every page renders at 390px with no horizontal overflow — `scrollWidth` equals `clientWidth` on the document element.

---

## Conventions

How the system is written down — in markup, in copy, and in these documents.

### Naming in the Markup

The class names are the system's public vocabulary, and they follow one grammar:

- **Family prefix, then part**: `card`, `card-header`, `card-body`, `card-divider`. A part's name says whose part it is.
- **Base plus variant, never variant alone**: `button button-pill`, `note note-warning`. The base owns the shape; the variant owns only its difference. A variant written alone is a control that silently lost its shape.
- **One state vocabulary**: `.is-on` for every selection, `aria-expanded` for every disclosure, `aria-checked` for every switch, `aria-invalid` for every rejection. State is never a bespoke class per component — a harness, a stylesheet and a reader all check it the same way everywhere.
- **Attributes are API**: `data-go` names where an element navigates, and it is what the styling and the hover treatment key off — so "looks like it navigates" and "navigates" cannot come apart.
- **A new selector is a claim about how many elements it matches.** Read the count back and require the number you meant: a rule that renders plausibly is not a rule that matched what you aimed at. Three of thirty rules once reached further than intended, and only the count said so.

### Language and Formats

The copy is English; the number grammar is Danish. Neither is negotiable per screen.

- **Money**: a dot groups thousands, a comma separates decimals — `1.187,25 kr.` It is written in exactly two shapes: with the øre (`24.418,57 kr.`) where the figure is a total someone could reconcile against a receipt, and rounded (`18.420 kr.`) where it is a summary. Choosing the shape is choosing a claim about precision, not a formatting nit.
- **Percent** uses the comma too: `12,6%`.
- **Dates** read day-first: `18 July`.
- **Inputs speak the same grammar they display.** An amount field accepts `1.187,25`, gets the numeric keyboard, and treats `89.95` as a typo to name rather than a number to guess at — which is why no money field is a native number input; those reject the comma outright.
- **Button labels are caps**, and they name the action: SEE THOSE ORDERS, ADD FILE, CLEAR ALL. One voice for every action in the product.
- **Field labels are questions where a question is clearer**: "Who did you buy from?" beats "Vendor" on a form a person fills once.
- **Back buttons name the destination**, not the direction: "Back to orders", never just "Back".
- **A rejection names the fields**: "Cannot continue — Vendor and Date need fixing."
- **Copy that enumerates is a contract**: if the words say "a PDF, photo or screenshot", each named case works ([Scan Flow](#scan-flow)).

### Documentation

Three documents, one job each — because a rule stated in two places is obeyed in one:

- **This file** holds the rules, in general terms, with the reasoning beside each. It names no framework, no build tool, no storage API: those are decisions downstream of the system, and the system outlives them.
- **[`docs/defects.md`](docs/defects.md)** holds the evidence — the defect a rule cost, the numbers that settled it, the instrument that measured it. Entries are keyed to the section they defend, by name, never to a date. It is not a changelog.
- **[`docs/porting.md`](docs/porting.md)** holds what an implementation has to build and the traps that belong to targets rather than to the design. A port's own README documents that port.

**How a change lands:** the rule goes here, in the section that owns it; the bug and its numbers go to the defect log; anything implementation-shaped goes to the porting notes. A fix that teaches nothing writes nothing.

---

## Ground Rules

**One source of truth:** If a decision lives in two places, they'll disagree eventually. Decisions live here. Implementation lives in the code.

**No hand-waving:** "It looks right" is not evidence. Measurements decide. Element walks. Pixel diffs. Interaction assertions.

**Honest affordances:** If a control can't do something, don't draw it as if it can. A button that doesn't work is a button that shouldn't be drawn yet.

**Uniformity:** When something repeats, count how many times. If three things do it one way and one does it another, change the one, not the three. Never add a new way.

**Elements before components before views:** An element is defined before the component that uses it. A component before the view that shows it. Reading top to bottom is reading in dependency order.

---

## This system evolves

Design systems are living things. They grow with the product. When something doesn't work, it gets fixed. When a new pattern emerges, it gets documented.

The hardest part is getting started. The payoff comes when the third new screen takes a day instead of a week because everything is already solved.
