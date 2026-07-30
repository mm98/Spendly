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

---

## Components

Components are functional pieces of the interface. Each one is built from foundations and exists in multiple states.

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

The landing screen. Shows:
- A month selector
- A hero section (what the app does)
- Editable cards showing summaries (total, spending by category)
- A dashboard grid where users pick which cards appear

**Why cards are editable:** The dashboard is personal. Everyone sees the same thing on Orders, but Home shows what the user chose to see.

### Orders Overview

Summary of the current month's orders vs. the previous month. Shows:
- Month-over-month comparison (total, count, average)
- Suggested vendors (based on history)
- Latest orders
- Sub-tabs for different views

**Comparison card design:** Side by side, same structure. Makes the comparison obvious.

### All Orders

A searchable, sortable, filterable list of all orders. Every filter lives in the URL:

```
#/orders/all?category=groceries&vendor=bilka&from=2024-01-01
```

Arriving at that URL shows a filtered list. The chips reflect the URL. The filter panel reflects the URL.

**The rule:** A filtered list is a place, not a mode. You can link to it, bookmark it, send it. Closing the filter panel doesn't clear the filters—they stay in the URL.

### Order Detail

One order's full record. Shows:
- Header with status and meta (date, total)
- Items (editable)
- Attachments (add, remove, view)
- Actions (edit, delete)

**Why edit is a separate page:** The form is complex. It has validation. That complexity doesn't belong on the detail page.

### Create/Edit Form

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

### Vendors, Categories, Statistics

Each has its own view pattern (list with actions, detail page, form).

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

### Responsive Layout

The phone layout is 700px and narrower. Below that:
- The sidebar is gone; navigation moves to a bottom bar
- Card grids and column layouts become one column
- Field pairs stack instead of sitting side by side
- The page runs on a single 12px gutter

**Touch is not width.** The coarse-pointer rules (bigger targets, 16px field text) key off `pointer: coarse`, not off the viewport — a narrowed desktop window is not a phone, and a phone in landscape still is one.

**The test:** every page renders at 390px with no horizontal overflow — `scrollWidth` equals `clientWidth` on the document element.

---

## Implementation Notes

This system is framework-agnostic on purpose. These sections live in separate documentation:

- **docs/porting.md**: How to build this system in React, Vue, or any framework. Port-specific details (component props, build setup, deployment).
- **docs/defects.md**: The bugs each rule cost and the measurements that settled them. Evidence, not speculation.

A port's README documents the port. This README documents the system.

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
