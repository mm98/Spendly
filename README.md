# Spendly: A Design System

A unified language for building consistent, scalable expense tracking interfaces. This document defines what the product looks like and why—not how to build it.

**[Live demo →](https://mm98.github.io/Spendly/)** — the app itself, not the prototype.

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

- **[Foundations](#foundations)** — Color | Elevation and shape | Typography | Sizing | Spacing | Grids and breakpoints
- **[Components](#components)** — Buttons | Fields and forms | Stepper | Cards | Data rows | Notes | Empty states | Chips | Combobox | Segmented control | Switch | Charts | Meters and progress | Chrome | Icons
- **[Views](#views)** — Home | Orders overview | All orders | Order detail | Create and edit | Scan flow | Vendors | Categories | Statistics | Settings
- **[Patterns](#patterns)** — Filtering | Creation flow | Search | Progressive disclosure | Form validation | Feedback | Deletion | Pagination | Data persistence | Loading and errors | Honest affordances | Accessibility | iOS and WebKit | Responsive layout
- **[Conventions](#conventions)** — Naming in the markup | Language and formats | Documentation

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
| `button-caps` | Dark surface, white label at 11.5px caps — the filled action tier. At the base 38px it is the form-page submit and the confirm in a dialog; inside a hero it rises to 48px with wider padding, the entry-button size |
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
- **KPI card** (`.card-kpi`): Number, label, delta (statistic tiles on Statistics page)
- **Prompt card** (`.card-question`): A pale panel — small caps label, a title, then whatever it introduces

**A note and the action under it stand 12px apart, set from the note** (`.note + .button`). Set from the button, the gap depends on which variant happens to follow — one variant carries its own margin and another carries none, which is how the same pair once measured 12px on one page and 0 on another. No screen pairs them today; the rule stands for the next one that does. ([`docs/defects.md`](docs/defects.md))

**A card that ends with a link into a longer list ends with the block button.** Six cards do — latest orders, categories twice, vendors, recent scans, returns. The last spent a while as a bare underlined link instead: a different weight, a smaller thing to hit, and 2px of air above it where the other five have 12. One job, one control. ([`docs/defects.md`](docs/defects.md#returns--one-card-said-four-and-the-other-said-none))

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

**An order is listed the same way wherever it is listed.** Four screens draw a list of orders — the latest on Home, the latest on Orders overview, the returns card, and All orders — and the money column is one shape in all four: the total, then what it saved beneath it in the muted tone. They had three shapes between them, and the saved line was drawn only where the figure was positive, so a row that saved nothing had a total where every other row had a total and a line under it. **A zero is a figure, so it is printed**: *saved 0,00 kr.* An absent line is not "nothing saved" — it is a reader wondering what is missing from this row. And the line is one style wherever it appears — muted, regular weight — not muted on one screen and green bold on the next: three row families draw it, and they drew it in two colours and two weights for the same fact ([`docs/defects.md`](docs/defects.md#data-rows--one-saving-three-styles-and-one-question-sorted-three-ways)).

**The money column holds what the row is worth, and its colour is not an argument.** A list of orders shows what each order cost; a list of vendors shows what has been spent there. Two lists of orders once showed the *saving* instead — "+26,04 kr.", in green, in the slot every other list puts the total in — because the slot itself was green by default and the figure was picked to agree with the colour. Green means saved, everywhere, so a slot that is green whatever it holds is a claim about every number put in it. Where a row has both figures to state, the total leads and the saving is the second line under it, in the muted tone, named. ([`docs/defects.md`](docs/defects.md#data-rows--the-money-column-was-green-so-two-lists-showed-the-saving))

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

**The sentence says what would fill it** ("No orders match these filters", not "No data") — the difference between a dead end and a next step. It names the span it is empty *of*, too: "No returns in Aug." over a card headed *Returns | Aug*, so the reader is not left asking which stretch of time was searched.

**An empty state has to be able to fill.** A card that shows the same sentence whatever the records hold is not answering — it is a picture of an answer, and on the day the list really is empty it is indistinguishable from a working one. *Returns this month* said "No open returns found" over a month holding four returns, and would have said it over a month holding four hundred. ([`docs/defects.md`](docs/defects.md#returns--one-card-said-four-and-the-other-said-none))

**Its words have to be ones the product can make true.** "No open returns" promises a difference between an open return and a closed one; a return is closed when its refund lands, and nothing in the app can record that a refund landed. A sentence naming a state the product cannot reach is the [decorative control](#honest-affordances) defect written in prose.

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
- **Month columns**: a column per window, the current one `.is-on`. The bar sits in a track of its own and its height is a percentage of that track — never of a box that also holds the label, or every tall bar shrinks to the same height and the chart stops comparing anything ([the numbers](docs/defects.md#charts--three-bars-of-100-96-and-85-drew-the-same-height)). The track is 150px at its smallest and grows to fill the card, since this chart shares a row with one that is as long as the account has categories.
- **Weekday bars**: seven bars, one per day, each a share of the busiest. Same track, same rule, same reason — and the share is what the bar is given, never a height in pixels: a figure decided away from the card can only be right for one card. It was, for two, and the taller of them kept 403px of nothing underneath.

**None of these carry text.** The figure they illustrate stands beside them as real text in tabular figures — a number inside a graphic is a number a screen reader loses and a walk cannot compare.

### Charts

**A line that runs through today says so, in one mark.** Every line chart draws the same 4.5px circle in the line's own colour on today's point — and none where today is outside the window, which is a stretch of time that has already finished and a mark reading *you are here* about a day months ago. A comparison line gets none either: it runs through its own days, and today is not among them. Two of the app's five charts drew this and drew it two different ways, one as a haloed disc and one as a dot; three drew nothing.

**A chart with a mark on it is inset by the mark, not by the line.** The circle paints 5.5px past the point it sits on and a running total peaks on its own last day, so the plotted band is inset 6.5px top and bottom — the same 6.5 everywhere, since it is the same mark. Horizontally the line runs edge to edge and the mark keeps its own circle off the sides.

The app draws a line chart, a donut, weekday bars, meters and progress rings. Eight rules hold them together:

**One user unit is one CSS pixel.** The line chart's viewBox is remapped 1:1 onto the element's pixel box on every resize, so stroke widths hold and text in the chart is never scaled. A chart whose viewBox is a guess renders its 1px grid line at 1.3px on one screen and 0.8px on another.

**A chart is drawn from the records the list beside it is drawn from.** The donut's shares and its legend must come from one source. A ring with shares baked into the stylesheet next to a list with its own numbers cannot fail visibly — a ring has no opinion about the list beside it — and the two once disagreed exactly that way.

**Every chart carries a scale, and it is one control: ticks and labels from one set of marks.** An unlabelled line puts its peaks at no date a reader can name, and a tick strip that does not mark the labels is decoration — a comb of evenly repeated lines will agree with an axis by accident and never again once the range moves ([the numbers](docs/defects.md#charts--the-ruler-under-every-chart-was-a-fixed-comb-and-the-marks-were-spread-evenly)).

**A window is marked in its own unit, and drawn in it.** A week is its seven days, a month the 28 to 31 it actually has, a quarter its three months, a year its twelve, and all time the months it spans — the calendar's units, not a fixed set of dates and not a count chosen per range. The marks are the window's own, so a month sends 31 of them whether it holds five orders or five hundred. Where a window is too wide to draw a point per day, the points are cut on the marks themselves: twelve points across a year are its twelve calendar months, because twelve *equal* slices of a year are not, and the months slide against them until two land on one point and one goes unnamed.

**A mark sits over the point the chart plotted for its date** — which is not its position in the list of marks, since the units a scale names are not all the same length. How many marks are drawn is then a question about the width available, not about the range: marks are dropped until each has room for its own label, keeping the first and the last, and the room asked for is measured off the labels rather than reserved for the widest one there could be.

**Chart colors are the data-viz palette** (`--donut-*`), which exists so segments differ from each other. Semantic colors stay out of charts: a slice is not "positive".

**Legends are rows.** A chart legend row is the data-row pattern at chart scale — glyph (swatch), label, value — and a legend row that filters the list navigates like any other row, with `data-go`.

**A callout is a tooltip, so it is asked for.** The sentence that annotates a chart appears while the chart is hovered or focused, and the resting page does not draw it. Left up permanently it is not a tooltip at all — it is a label lying across the middle of the data it describes, and the reader cannot put it away. The chart is what the callout is about, so the chart is the trigger, and being the trigger costs it two things: a tab stop, because a tooltip only a pointer can ask for is one the keyboard never reaches, and the sentence as its own accessible description, because a bubble that is not drawn is out of the accessibility tree and takes its content with it. Under a coarse pointer there is nothing to ask with, so the callout is off entirely rather than left to whether the browser fakes a hover on tap ([the numbers](docs/defects.md#charts--the-callout-was-drawn-permanently-across-the-line-it-annotates)).

### Chrome

The frame around the pages: sidebar, top bar, bottom nav on the phone.

**Sidebar** (236px, desktop only): brand, then navigation. The active item is `.is-on`, the same selection mechanism as every one-of-many group. Icons sit at fixed width so labels align.

**Top bar:** the global search field, and the app-wide actions at 32px (`button-pill` tier). The search prints its shortcut on a key cap — and a key cap is a promise: the shortcut must actually open and focus the search from anywhere.

**Bottom nav** (phone only): the sidebar's destinations as a thumb-reachable bar. Same `.is-on`, same icons, one nav defined per layout — never two navs both rendered and one hidden by luck.

**The bar is 80px, and the row sits 20px up off the bottom edge** — plus whatever the platform reserves below it for a home indicator, which the bar adds to its own padding rather than leaving to the page. A phone screen is a rounded rectangle, so the outermost destinations are the ones the corner curves in under: the nearer the row sits to the edge, the more of the first and last item is inside that arc. The height is padding. The item keeps the 48px entry tier, because a nav item is not a new kind of control ([the numbers](docs/defects.md#chrome--the-bottom-bar-sat-in-the-corner-of-a-rounded-screen-and-the-sheet-ran-under-it)).

**The sheet's bottom padding is the bar's height, not a number that resembles it.** The bar floats over the content, so what the page below has to clear is whatever the bar measures — including the platform inset the bar just added to itself. Written as its own constant it agrees with the bar until the day one of them moves, and the disagreement shows only on the last card of a page.

**Settings is chrome, not a page's furniture.** It is reached by one glyph in the top bar, from every screen — what it holds (the order form's defaults, both lists' opening order, how many entries a card holds, whether a trash asks first) belongs to no single page, so no single page owns the way in. It spent a while as a full-width button at the foot of the Orders rail, findable from one tab of one screen and titled for the one part of itself that screen happened to own.

### Icons

The system uses 39 glyphs across the entire app, every one stroke-drawn in the same style and named for its meaning. When a new page needs an icon, it reaches for one of these before inventing a fortieth — a glyph that exists twice in slightly different paths is the drift the uniformity rule exists to stop.

**Sizes are set by the component that carries the icon**, not by the call site: a button's icon follows the button's tier (15px in the 38px tier, 14px in the 32px tier), a row's glyph follows the row family. Sizes run 12–20px; each one belongs to a component's spec.

**Icon buttons** (`.icon-button`) are the square control carrying nothing but a glyph — so the accessible label is mandatory, because there is no text to read.

**The rule:** Use an icon when the meaning is universal (trash = delete, search = find). Never use one alone when the meaning is private to this app — label it.

---

## Views

Views are screens. They're composed from foundations and components.

### Home

The landing screen, top to bottom: the stretch of time being viewed, the hero chart, then a card grid the user owns.

**The hero card is this month, and it is named at the top of itself.** The heading, the total, what it saved against retail and the line under them are all the current month's, and there is no control on the card to make them anything else. It carried the same five widths [Statistics](#statistics) offers for a while, which is two screens where a stretch of time is chosen and only one of them with a pager, a comparison, summary tiles and a returns card to go with it. Home answers *where am I this month*; another month, or a week, or a year, is a question the page built for it answers. What the records only hold per month — the category split under the chart — names that month in its own heading rather than borrowing the card's, exactly as the month-wide cards on Statistics do.

Whatever a card names, the rule the widths were removed *from* still holds: a figure that a control above it cannot move is not a figure that control has an opinion about, and a heading fixed at *Spent this month* while five widths pass under it is the [label describing a state its control has moved on from](#charts) ([the numbers](docs/defects.md#home--the-hero-card-said-spent-this-month-under-every-width-there-was)).

**A card that names a window links to that window.** The hero's header opens Statistics on the month the card is showing — Statistics' own default, so arriving there is a continuation rather than a fresh question — and the total printed on the two pages is the same number, because it is derived from the same days.

**A row that opens a list opens the list its own card is describing.** A card naming a stretch of time is a claim about which orders it counted, so a row inside it that opens "the orders behind this slice" carries that stretch: a category row under *Where it went | Aug* opens August's orders in that category, not every one since the account was made. The check is the figure, not the query string — the row's own amount and the total of the list it lands on are the same number, or the link is wrong however plausible its filters look. A card with no window to pass on, an all-time vendor total or a link into the whole return history, passes none rather than inventing one.

**The dashboard is personal.** Which cards appear, and in what order, is the user's choice: an edit mode exposes a grip per card, cards drag (or move by arrow key, Home and End for the ends), and the arrangement persists. Everyone sees the same Orders page; Home shows what this user chose to see.

**Cards share a row, so they are filled to the same depth.** A grid row is as tall as its tallest card, and a card that holds three of something beside a card that holds ten is not a shorter card — it is the same card with a hole under it. Every list in the app holds up to the same number of entries — [one setting](#settings), read everywhere a card truncates a list, on every page and not just this one — and is *filled* to it wherever the account has that many; every chart grows into whatever its row gives it rather than standing at a height chosen elsewhere ([the numbers](docs/defects.md#home--three-cards-in-a-row-and-two-of-them-mostly-empty)).

**A card with nothing beside it takes the whole count.** The deduction below exists only to keep a card level with the card next to it, so a card standing alone does not pay it — a shorter card in a row of its own is not a hole, it is just a card, and cutting its list to leave room for a neighbour it does not have costs entries and buys nothing. That is every card on a phone, where the grid is one column.

**What sits above a list is height the list does not get.** A card that spends a donut before its first row and then draws as many rows as its neighbour stands taller than the neighbour by exactly the donut, so a card's entries are the setting less what it drew above them — *rounded*, not rounded up, or a card whose header runs a hair past one row's height gives up two and stands a row short of everything beside it — and that is *measured*, by the list, against the card it is in. A table of "the donut costs three rows, the sparkline two" is a second copy of the layout kept somewhere nothing renders, wrong the day a chart's height or a row's leading changes, and it would have to name every card. Measured, a headline figure, a caption, a chart, a ring or any three together all subtract themselves, and the next thing put above a list needs no rule of its own.

**Running out is allowed; shrinking is not.** A card with four returns in a month that offers room for ten draws four — an invented row is worse than an empty inch — and it keeps the height of the card beside it rather than collapsing, because a grid row of cards at different heights reads as a rendering fault.

**Where the list feeds a graphic, it folds rather than drops.** The category ring is drawn from the same array as the rows under it, so cutting the tail would leave a circle that does not add up to the figure in its own middle. The tail becomes one segment worth the sum of what it holds, with a row that says how many and links to the full list — and that folded entry is a whole record, not a label and a number, because the row it lands in asks it the same questions it asks a real one.

**A drag shows what is moving and where it lands.** The lifted card leaves the flow at the size it had, follows the pointer on a shadow, and a dashed slot of exactly that size travels through the grid. A dimmed card shuffled in place is a drag where the most important thing on screen is the faintest.

**The scan promo card can say LATER** — and LATER writes the same setting the Settings switch writes, so dismissing it here and re-enabling it there are one setting seen twice, not two flags that drift.

### Orders Overview

The month in review: this month against the one before, side by side with the same structure in both columns — same rows, same order, so the eye compares without re-reading. Then the month's two lists of orders side by side — the latest, and the returned — and the category breakdown beside them.

**The returns card is the one on [Statistics](#statistics), at this page's width.** Same rows, same count line, same link — one card, drawn from the window each page is showing, because two copies of it is how one page came to report four returns in August while the other reported none. It sits beside the latest orders, since the two are the same shape reading the same month.

### All Orders

The working list. Top to bottom: sub-tabs (Ordered / Delivered / Returned — the status filter in one tap), the toolbar (search field, FILTERS disclosure, the sort chip), the chip row with the match count over it, the rows, and the pager.

Every piece of that state lives in the URL:

```
#/orders/all?category=groceries&vendor=bilka&from=2024-01-01
```

Arriving at that URL shows a filtered list. The chips reflect the URL, the panel's fields reflect the URL, the count reflects the rows.

**A filtered list is a place, not a mode.** It can be linked to, bookmarked, sent — and it *is* linked to: category tiles, vendor cards and chart legend rows all land here carrying filters. Closing the filter panel doesn't clear the filters; they stay in the URL.

**Two controls describing one filter may never disagree** — the sub-tab and the panel's status control are the same filter in two places, and so are a chip and its combobox.

**Every working list sorts with the same control, and its options name the column and the direction — both directions on every column that ranks.** All orders, All vendors and All categories ask one question — "order this list by" — so it is one combobox on all three, not a combobox on one and a segmented control on the others. An option reads *Spend, highest*, never a bare *Spend* that is secretly highest-first: half-named options make the reader press to find out. And each ranking column comes as a pair — *Amount, highest / Amount, lowest*, *Date, newest / Date, oldest* — because a list that can be ranked by a column can be ranked by it both ways, and one list offering pairs while another offers singles is the two-controls defect written into one control's options. An alphabetical column is the exception: the alphabet orders a list for *finding* a record, not for ranking it, and Z to A finds nothing that A to Z cannot — so Vendor on the orders list and Name on the vendors and categories lists offer *A to Z* alone. Each list offers the pairs every list shares plus its own columns', and it opens in [the account's chosen order](#settings), direction included ([`docs/defects.md`](docs/defects.md#data-rows--one-saving-three-styles-and-one-question-sorted-three-ways)).

**On a phone the toolbar is two rows, not three.** The search field takes the first row; FILTERS and the sort control are one group and share the second, the sort taking whatever the disclosure leaves. They shape the same list, so they read as a pair — and a row each pushes the first order further down the page for nothing. See `docs/defects.md`, *Responsive Layout*.

### Order Detail

One order's full record. The header band holds the identity and the actions: vendor, date, edit — and the trash, which follows the [deletion policy](#deletion). Below it: the line items with what each cost and saved, then the attachments card — add a file, open one, remove one (that trash follows the same [deletion policy](#deletion)), with the header counting them. The summary card states the status, kind and total.

**Everything shown is derived from the record.** The subtotal is the lines added up; the saving is retail minus paid. A stored total beside stored lines is two claims that can disagree while both look right.

**The detail page shows; the form page changes.** Status is read here and edited on the edit page like every other field — a status editor drawn on the reading view is the form's control paying rent twice, at a full band's height, and it stood here once.

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

A stretch of time in numbers: the window's name between two arrows with the widths beside them in one band, then a four-across summary row (each tile a figure, its delta and its trend arrow — trend and tone are separate, because spending *less* is a good *down*), then the charts, then the cards that break the window down.

**The range control and the pager are one control.** The range chooses how wide the window is; the pager steps by that width. Pick a week and the arrows move a week; pick a quarter and they move a quarter. A pager whose step is fixed while the range moves is paging something the page is not showing, and it says "previous" about a stretch of time nothing on screen names ([the numbers](docs/defects.md#statistics--the-range-chips-drew-a-week-and-the-pager-went-on-stepping-months)). The arrows name the step they take — *previous quarter*, *no later year* — and each disables only at its own end of the data.

**One control is drawn as one.** The two arrows, the name they step and the five widths share a band, and every button in it is the same box — a width button is the size of a paging button, because they are two halves of one control and a row of two heights reads as two. The name between the arrows holds a width wide enough for the longest one the pager can reach, so choosing a width does not slide the picker sideways under the pointer that just clicked one; that is the same rule as *selection is a fill, not a weight* one level out, and it costs about 30px of empty band next to the short names. On a phone the hold is released and the row is what is kept: a band that fits is worth more than a picker that never moves, when the alternative is the picker on a second row.

**Every width is a calendar unit, and it is named as one.** Week, month, quarter, year, and everything there is: *Week 30, 2026* | *July 2026* | *Quarter 2, 2026* | *2026* | *All time*. Not a count of days back from today — a window ninety days wide has no name, cannot be linked as one thing, and cannot be paged to the one before it. A week is an ISO week (Monday to Sunday, week 1 the one holding 4 January), so a week that runs across the end of a month runs across it, because weeks do. Where the records stop mid-unit the window holds the days that exist and says which they are.

**The control that offers the widths calls them what they are** — *Week*, *Month*, *Quarter*, *Year*, *All* — in the chip, in the arrow that steps one, and in the URL that links one. A chip reading *3M* or *YTD* names a duration, and a duration is the one thing this control cannot deliver: what it draws is the quarter the window lands in, which may be a single month of records, and the year, which pages back to whole years that are not to any date ([the numbers](docs/defects.md#statistics--the-chips-named-durations-and-the-windows-were-calendar-units)). A name that has to be decoded against the calendar to be checked is a name nobody checks.

**A unit says what it is, the window says which days.** The pager names the unit; the card over the chart names the days it actually covers — *Overview | 1 May – 30 June* under *Quarter 2, 2026* — because a unit name does not tell you where the records begin and end inside it, and a clipped window would otherwise claim a whole quarter.

**A window is drawn under the name it is announced under.** One string, read by eye and by screen reader. *W30, 2026* was drawn short enough for the band and announced unabbreviated beside it, because a letter, a number and a year says nothing about weeks — one window under two names, of which the readable one was the one nobody could read. Writing the unit out costs about 30px in a band with room for it, and leaves a single name to keep true.

**Where the band has no room, the short name is the whole name.** A phone cannot hold two arrows, *Quarter 3, 2026* and five widths on one row, so there it draws *Q3 2026* and the widths go to two letters — and that shortened string is the one announced too, because only one of the pair is ever rendered. The defect was never brevity; it was a name drawn for the eye with a different one filed beside it for the screen reader. One string at every width, whichever string it is.

**The window is in the URL** — how wide it is and where it sits — so a week can be linked as a week, and the browser's Back walks the pager. A link to a month is still a link to that month. The width is in it under the name the chip carries, `?range=quarter`, so the link says which window it opens. A link naming a width the product no longer has opens the default and says so in the chips — the control shows what is drawn, never what was asked for.

**One control, one answer: every figure on the page covers the window the control names.** The total, the comparison, the chart, the scale under it, the summary tiles — and the cards below them, which is the half this rule was missing. The pace, the weekly rhythm, the category split, the recent-window columns and the returns note were the month's whatever the picker said, so choosing a week moved the tiles and the chart and left five cards reading *July*: a page with one control and two answers to it, of which the frozen one is printed in more places ([the numbers](docs/defects.md#statistics--the-picker-moved-the-tiles-and-the-chart-and-five-cards-went-on-reading-july)). Each card still names its own span *in its own heading*, never borrowing the page's, because a card that names nothing is one the reader has to scroll up to date.

**A window is measured from the days it holds, including what the records only author per month.** Which categories a purchase fell into is a month's fact, not a day's — so it is split across that month's days by what each day cost, the same way a month's savings and shipping already are. A window inside a month then carries that month's proportions scaled to its own spend, and the parts add up to the total printed above the chart instead of to a category's all-time figure.

**A projection is only offered where there is something left to project.** The newest window is the one still being written, and it is the only one whose figure is a projection; everywhere else the same figure is the total, and the line under it says which of the two it is. A window clipped by the *start* of the records — three days of a week that began before them — is missing days that already happened, and scaling those three days up to seven is a claim about a past the records do not have.

**The comparison card compares like with like.** Six of whatever width is chosen, the one on screen marked: pick a week and the columns are six weeks. A width with only one window has nothing to stand beside — *All time* is the records entire, and a single year is the only one in them — so it falls back to the months inside the window, and the heading says how many of what it drew.

**Nothing is a direction.** A figure that has not moved says it is *level with* what it is measured against, and draws no arrow: 0% up under a rising arrow is a claim about a change that did not happen, and a window narrow enough to count whole orders lands there often. A figure with nothing before it draws no delta at all — an arrow over a comparison that was never made is worse than a blank.

**The total and the line under it are one series.** The figure printed above a chart is where that chart's line ends, derived from the same numbers, so a window's total and the picture of it cannot drift apart — and a comparison line is drawn on the same scale as the line it is compared with.

### Settings

Every control here names what reads it, and the page proves it: default kind and status (what the order form opens with), rows per page and sort (what All Orders obeys), entries per card and the vendors-and-categories order (what every card and both lists open as), the scan card switch (the same setting Home's LATER writes), ask-before-deleting (what every trash reads), and clear stored data (back to the shipped state, said before it does it).

**A settings page whose switches change nothing is the decorative-control defect with more surface area.** A setting exists here only if something observably reads it.

**One card documents instead of controlling: the import card.** The orders-import endpoint exists for a program, not a form, so Settings states its address, its request shape and the rules the server enforces — sign in, post the orders with either credential (the session cookie, or the same token as an `Authorization: Bearer` header — one session row either way), read back what imported and what failed by index. Reference drawn from the validator itself, not a paraphrase of it: the card and `validateOrderDraft` state the same limits or one of them is wrong. Because it is reference and not a control, it is also the one card that opens closed — and the disclosure is the header band itself, the same whole-band control a navigating header is, with the same bare chevron in the same right-hand slot pointing down or up instead of right. A boxed icon-button riding a passive header would be a second implementation of a band the system already has. And the JSON it shows is a formatter's output, coloured by token, never hand-aligned: annotation columns kept by hand drift on the first edit.

**One question, one control — even where it is asked on two pages.** Vendors and categories are the same kind of list, so the order they open in is one setting and not two: a person who wants one alphabetical wants both. It offers only the orders *both* lists have, since a default naming one list's own column is a preference the other cannot obey — vendors can also sort by order count and categories by share, and those stay on the pages, one click from wherever the setting opens them.

**A setting stores only values something obeys.** Anything outside the set a control offers is refused and the stored value stands. A preference that saves, comes back, and is then quietly ignored is worse than no preference, because the settings page goes on saying it is in force.

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

Everything the app says back after an action — saved, added, removed, moved, refused — goes to **one layer**: top right, under the top bar, a single polite status region. A toast clears itself after five seconds, can be dismissed, stacks newest first, and is capped so the stack cannot wallpaper the screen. The layer never swallows a click meant for what is under it. Inside a toast, the glyph, the sentence and the dismiss share one vertical centre — a toast is one short line, and top-aligning it against a taller dismiss button reads as a misprint.

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
- **A control that rebuilds something rebuilds it visibly.** FILL WITH DEMO DATA wiped a year of orders and wrote back the same year — same count, same days, same vendors — so pressing it twice was indistinguishable from pressing it once, and from pressing nothing. Made-up data is made up afresh on every press. ([`docs/defects.md`](docs/defects.md#demo-data--the-button-rebuilt-the-same-year-every-time))
- **A control that replaces something replaces exactly what it names.** FILL WITH DEMO DATA says every order, vendor and category is removed first — and that is all it removes. Settings and the dashboard layout are preferences, not ledger data, and it once reset them too; CLEAR STORED DATA is the one control that returns preferences to the shipped state, and it says so.

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

**The screen is not a rectangle, and its corners and reserved strips are the platform's to declare.** Anything the app pins to an edge reads the platform's safe-area insets and adds them to its own padding — the home indicator below, the notch's side in landscape. Two things follow. Each inset is named once, so the rule that consumes it can be driven to a value in a harness: no desktop engine reports one, so a layout written directly against the platform's own query has a branch that never renders where it is verified. And an inset added to a floating element is added to whatever has to clear it, or the page below ends up under the element by exactly the inset.

**The bottom bar floats clear of the edge rather than filling to it.** Its own panel — colour, radius, shadow — stops short of every side, so the corner and the safe area below it show the page, not the bar. The current page is marked by tinting its icon and label, not by a filled background: a filled pill is the rail's device for sitting on the sidebar's own tint, and reads as a box inside a box once the bar is a panel in its own right.

**A control in a row is sized by the row, not by its own content.** An input's intrinsic width belongs to the engine, and it is the wrong number in any case: it is what one field wants, decided without reference to what shares the line. So a control on a toolbar states the width it takes, gives it back under pressure, and never refuses to shrink. A control that refuses hangs off the end of the row, and hides there — see below.

**The test:** every page renders at 390px with no horizontal overflow — `scrollWidth` equals `clientWidth` on the document element — **and no element extends past the box that holds it**. The second half is not implied by the first: the main panel clips, so a control hanging 38px off a card leaves the document exactly as wide as it was and the overflow test reads clean. Compare each element's right edge against its container's, not just the document's. See `docs/defects.md`, *Responsive Layout*.

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
- **The separator in copy is the vertical bar** — `34 orders | latest 12/8`, `Items | 2`, `Image | 1 KB` — never the middle dot (`·`). The dot is typographic filler that reads as machine-written, and this applies to every future string as much as the current ones: meta lines, card titles, file metas, the lot.
- **An ellipsis is three dots** — `Search vendors...`, `SAVING...` — never the single character (`…`), in copy, placeholders, button states and code alike, now and in everything written later. Same reason as the dot above: it reads as machine-written.
- **Field labels are questions where a question is clearer**: "Who did you buy from?" beats "Vendor" on a form a person fills once.
- **Back buttons name the destination**, not the direction: "Back to orders", never just "Back".
- **A rejection names the fields**: "Cannot continue — Vendor and Date need fixing."
- **Copy that enumerates is a contract**: if the words say "a PDF, photo or screenshot", each named case works ([Scan Flow](#scan-flow)).

### Documentation

Three documents, one job each — because a rule stated in two places is obeyed in one:

- **This file** holds the rules, in general terms, with the reasoning beside each. It names no framework, no build tool, no storage API: those are decisions downstream of the system, and the system outlives them.
- **[`docs/defects.md`](docs/defects.md)** holds the evidence — the defect a rule cost, the numbers that settled it, the instrument that measured it. Entries are keyed to the section they defend, by name, never to a date. It is not a changelog.
- **[`docs/porting.md`](docs/porting.md)** holds what an implementation has to build and the traps that belong to targets rather than to the design. A port's own README documents that port.
- **The screenshots are renders of the running app, and they are current or they are wrong.** Nothing in them is cropped by hand or touched up, and each one holds a named state — a page, a viewport, and whatever is open or typed into it. A shot that no longer matches the app is the one claim a reader believes without checking, so a change that moves one regenerates it; three of them once drifted through two changes at 226,194, 41,303 and 319,255 differing pixels ([the numbers](docs/defects.md#documentation--three-committed-screenshots-had-drifted-from-the-app)).

**How a change lands:** the rule goes here, in the section that owns it; the bug and its numbers go to the defect log; anything implementation-shaped goes to the porting notes. A fix that teaches nothing writes nothing.

---

## Ground Rules

**One source of truth:** If a decision lives in two places, they'll disagree eventually. Decisions live here. Implementation lives in the code.

**No hand-waving:** "It looks right" is not evidence. Measurements decide. Element walks. Pixel diffs. Interaction assertions.

**Honest affordances:** If a control can't do something, don't draw it as if it can. A button that doesn't work is a button that shouldn't be drawn yet.

**Uniformity:** When something repeats, count how many times. If three things do it one way and one does it another, change the one, not the three. Never add a new way.

**The stylesheet owns layout.** A layout value — a margin, a gap, a size, a colour that is the system's rather than a record's — lives in the stylesheet under a name. An element carries a style attribute only when the value is the data speaking: a category's colour, a bar's share, a dragged row's size. An inline copy of a system value outranks every rule the stylesheet can write, which is how a phone rule gets written, shipped and never rendered ([`docs/defects.md`](docs/defects.md#the-stylesheet-that-was-being-overruled-by-its-own-pages)).

**Elements before components before views:** An element is defined before the component that uses it. A component before the view that shows it. Reading top to bottom is reading in dependency order.

---

## This system evolves

Design systems are living things. They grow with the product. When something doesn't work, it gets fixed. When a new pattern emerges, it gets documented.

The hardest part is getting started. The payoff comes when the third new screen takes a day instead of a week because everything is already solved.
