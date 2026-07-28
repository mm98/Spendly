# Spendly

> A personal ledger. Orders, receipts, vendors and categories for one person, with a receipt scanner
> that drafts the order for you. Danish formats throughout.

This repository is the **design system** for Spendly and the prototype that proves it. Everything
below is a rule the prototype already implements and the port has to hold to — not a moodboard.

| File | What it is |
| --- | --- |
| [`spendly.html`](spendly.html) | The whole prototype. Every route, clickable, self-contained: markup, CSS, JS and four Poppins weights embedded as woff2 data URIs. |
| `README.md` | This document. The system, rule by rule. |
| `CLAUDE.md` | How to work in here — verifying, measuring, what may be claimed. |
| `docs/` | The screenshots below. Rendered from the prototype, never hand-edited. |

## Screens

**Home** — the spent-this-month hero, the personalised card row, one dark card per screen. The white
layer floats on the gray shell; the sidebar sits directly on it.

![Spendly's home screen at 1440px: sidebar, floating white layer, spend hero with chart and category split, and the Your cards row](docs/home.png)

**All orders** — the search surface, with the filter panel open. Both control tiers are visible: 38px
toolbar controls in the top row, 48px entry fields in the panel below them.

![Spendly's all-orders screen: search field, FILTERS and sort controls, removable filter chips, a filter panel with a full-width vendor combobox, category and kind comboboxes, date and amount fields and a segmented status control, then the first result row with its status chip](docs/all-orders.png)

**Phone, 390px** — flat white and edge to edge on one 12px gutter. The paper is square, the cards on
it keep their radius, the labels shorten to SCAN and NEW, and the sidebar has become five equal tabs.

<img src="docs/phone.png" alt="Spendly's home screen on a phone: shortened SCAN and NEW buttons, a full-width card on white, and a tinted bottom tab bar with five labelled destinations" width="320">

## Quick start

```bash
git clone https://github.com/mm98/spendly.git
cd spendly
open spendly.html          # macOS · use `xdg-open` on Linux, `start` on Windows
```

No build, no dependencies, no network. Resize to 390px to see the phone layout, or open it on a
phone — the mobile rules in [§16](#16-the-phone-layout) and [§17](#17-ios-and-webkit) only show up
there.

## Ground rules

- **Reference**: "AI-Powered Personal Finance Dashboard" (Savexa) by Tamim Al Arafat for Tenso UI UX
  Agency — [dribbble.com/shots/27234630](https://dribbble.com/shots/27234630). The layout language
  follows the reference; all content, structure and components are Spendly's own.
- **Verification standard**: every rule here was settled by rendering the prototype and comparing
  screenshots against the reference sheets, then re-rendering at 390px and on desktop after each
  change. Hold to the same standard: screenshot before claiming a match, and say what was measured.
- **Where a rule cost a bug, the bug is written down with it.** That is the argument for the rule and
  the reason not to quietly undo it.
- **Before adding a variant, count.** Grep for the pattern and match the tally, not the one neighbour
  you happened to be looking at.

## Contents

| | |
| --- | --- |
| [1. Shell and layout](#1-shell-and-layout) | [11. Page patterns](#11-page-patterns) |
| [2. Color](#2-color) | [12. Chrome](#12-chrome) |
| [3. Typography](#3-typography) | [13. Honest affordances](#13-honest-affordances) |
| [4. Elevation and shape](#4-elevation-and-shape) | [14. Charts](#14-charts) |
| [5. Control geometry](#5-control-geometry) | [15. Responsive containment](#15-responsive-containment) |
| [6. Buttons](#6-buttons) | [16. The phone layout](#16-the-phone-layout) |
| [7. Comboboxes](#7-comboboxes) | [17. iOS and WebKit](#17-ios-and-webkit) |
| [8. Icons](#8-icons) | [18. Accessibility](#18-accessibility) |
| [9. Forms and fields](#9-forms-and-fields) | [19. Names in the markup](#19-names-in-the-markup) |
| [10. Cards](#10-cards) | [20. Notes for the port](#20-notes-for-the-port) |

---

## 1. Shell and layout

- The app background is gray-green `#EFF1EF`. The sidebar sits directly on it, with no panel of its
  own.
- The whole main area — top bar, sub-tabs, content — is a **white floating layer**, left-rounded
  (`border-radius: 26px 0 0 26px`), ~12px top and bottom inset, flush right. It reads as a layer on
  top of the gray.
- The top bar lives inside the white layer: page title left, global finder and actions right,
  hairline underneath.
- Sub-tabs render in a white band under the top bar, **inside the same container as the content**, so
  their edges can never drift apart.
- **No content max-width. Full-bleed at every screen size, including 4K.** Explicit decision; do not
  reintroduce caps. Wide-screen alignment comes from shared edges, not from synced max-widths.
- Grid wrappers always declare `grid-template-columns: minmax(0,1fr)`. Never rely on an implicit
  track — it sizes to its widest child's min-content and overflows.

### Breakpoints

| Width | What changes |
| --- | --- |
| **≤700** | The phone layout ([§16](#16-the-phone-layout)) |
| **≤900** | Card rows go to two columns; twin cards and KPI rows stack |
| **≤1180** | Two-column page grids collapse to one, rail below main; the promo row starts scrolling |
| **≥2200** | Scales up rather than centring: 16px base text, 300px sidebar, wider content ratio |

### Document skeleton

> [!IMPORTANT]
> The document must be a whole HTML document: `<!doctype html>`, `<html lang="en">`, `<head>` and
> `<body>`, with `<meta charset="utf-8">` as the first thing in `<head>`. The file is saved as UTF-8
> **with** a byte-order mark.

`spendly.html` had none of that. It opened on the viewport tag and ended on `</script>`; a browser
synthesises the missing elements either way, so the prototype rendered and two defects rode along
unseen for as long as the file existed.

- **No doctype is quirks mode.** `document.compatMode` read `BackCompat`. Against the same file with
  a doctype prepended, 243 elements sat on different geometry and the phone layout ran 60px short.
  Every engine keeps its own quirks list, so a correct render in Blink says nothing about the other
  two — standards mode is the only mode all three agree on.
- **No declared encoding is a guess.** Opened from disk, Chromium sniffed UTF-8 and got away with it.
  Served as plain `text/html`, the same bytes decoded as windows-1252 and drew `Spent Â· July 2026`.
  99 characters in the file are non-ASCII — 68 `·`, the `…` in placeholders, `×`, `→`, `—`, and the
  æøå the Poppins subset in [§3](#3-typography) exists to carry.

Keep charset first in `<head>`: a browser stops looking for it after 1024 bytes, and the embedded
fonts underneath it are ~40KB, so anything inserted above it pushes it out of range. The BOM and the
meta tag are both there on purpose, because neither covers the other's failure. A server sending the
wrong `charset` header outranks the meta tag and only the BOM survives it; a pipeline that strips the
BOM leaves only the meta tag. Together the file decoded as UTF-8 from `file://`, over `text/html`
with no charset, and over `text/html; charset=windows-1252` — zero mojibake in all four cases.

`lang="en"` is the interface language. The money is Danish (`1.187,25 kr.`) and so are the vendor
names, but nothing on screen is written in Danish.

### Viewport

> [!IMPORTANT]
> The document must declare `<meta name="viewport" content="width=device-width, initial-scale=1">`.
> Without it a browser lays the page out at its ~980px fallback and scales the result down, so none
> of the breakpoints above ever match and device emulation shows a shrunken desktop.

This bit the standalone prototype: the mobile CSS was all present and correct, and one missing line
made it unreachable. `spendly.html` declares the tag and re-injects it from script if it is missing,
so a shell that strips it cannot silently take the mobile layout down.

**Never add `maximum-scale=1` or `user-scalable=no`.** It blocks pinch-zoom and fails WCAG 2.2 AA
(1.4.4 Resize Text) — and it does not do the job it gets added for, see [§17](#17-ios-and-webkit).

## 2. Color

Sampled from the reference sheets, declared once in `:root`.

| Token | Value | Use |
| --- | --- | --- |
| `--bg-app` | `#EFF1EF` | gray shell, sidebar ground (desktop only, see [§16](#16-the-phone-layout)) |
| `--bg-nav-active` | `#E4E7E2` + 1px lift | active nav pill; darker than the ground, never white |
| `--bg-card` | `#FFFFFF` | all cards, on the white layer |
| `--border-card` | `#E9ECE8` | 1px border, every card |
| `--border-divider` | `#EDEFEA` | dividers inside a card: between rows, under a header |
| `--bg-row-hover` | `#F6F7F4` | the pointer on a row or card header that navigates — never a divider |
| `--text` | `#0B0F0D` | headings, numbers |
| `--text-strong` | `#0B0F0D` | the active edge of a field — `:focus-within`, open combobox |
| `--text-body` | `#3A423D` | body copy, sidebar items |
| `--text-muted` | `#6C766D` | help text, meta — holds 4.5:1 on white |
| `--text-faint` | `#9AA39D` | the faintest readable tier — axis labels, resting chevrons, dashed edges |
| `--green` | `#14AC72` | savings, positive deltas, progress |
| `--bg-positive` | `#DFF3EA` | positive notes, status chip, match highlight |
| `--teal` | `#07625E` | split-bar dominant segment, focus ring |
| `--bg-dark` / `--bg-dark-lift` | `#0B1A12` → `#12241A` | the one dark card per screen, dark buttons; `-lift` is the gradient's lit end |
| `--text-on-dark` | `#ADB8AF` | body text on dark |
| `--blue` / `--blue-light` | `#4F5BD5` / `#B9BFF0` | the July and June comparison series |
| donut set | `#1FA8E0` `#14AC72` `#E8C51B` `#8B5CF6` `#D34F2E` `#F09A38` | category ring segments, with gaps |
| icon squares | `#C43F2A` `#E9C517` `#8B5CF6` `#1FA8E0` | 36–44px rounded-square category icons |
| warm (caution) | text `#8A6A1F`, tint `#F6ECD9` | duplicate warnings, unfavourable deltas, uncertain lines |
| track | `#E7EAE5` | meters, progress backgrounds |
| `--bg-bar-track` | `#E2ECE9` | unfilled weekday bars |

**Semantics**: green = favourable (savings up, cost metrics down); warm amber = caution or
unfavourable (spend above the previous period); neutral ink for counts.

> [!IMPORTANT]
> Color is never the only carrier. Always icon **plus** words — "21% up vs June".

`--canvas` (`#F3F5F3`) is still declared and no longer used anywhere: the inset tinted canvas went
away when the sheet went white. Delete it or use it, but do not reintroduce a tint under the cards.

## 3. Typography

- **Poppins**, weights 400/500/600/700, self-hosted — latin subset woff2, ~8KB per weight, includes
  æøå. The prototype embeds all four as data URIs so it stays one file.
- Base is **500 (Medium) at 14px**; 400 reads too light against the sheets. 16px at ≥2200.
- Headings and leads: 600, `letter-spacing: -0.01em` to `-0.02em`. Lead sentence style is 16px/600
  ("Your biggest vendor: …").
- Big numbers: 700, `-0.02em`, always `font-variant-numeric: tabular-nums`. The weight and tracking
  ride on the size class (`.figure-headline`, `.figure-card`, `.figure-large`); the tabular figures ride on `.tabular-figures`
  alongside it, so a headline figure carries both. **A class with no rule behind it is worse than no
  class**: `.figure-large` was applied at four sites and defined at none, so the Orders and Statistics
  headline figures quietly rendered at the body's 500 with proportional figures for as long as they
  existed. Nothing looked broken — they simply were not the number this section describes. Grep for
  the selector, not just the class attribute.
- Caps micro-labels — card headers, KPI labels: 11–11.5px, `letter-spacing: .08em`, uppercase, 600.
- Danish formats everywhere: `1.187,25 kr.`, dates `18.07.2026` or `24 July 2026`.

## 4. Elevation and shape

**Flat surfaces carry a border, never a shadow.** Shadows are reserved for the things that genuinely
float:

1. the white main layer on the gray shell,
2. open combobox and finder panels,
3. the active sidebar pill (1px lift).

On a phone the main layer stops floating — it goes edge to edge and drops its shadow — so only the
latter two carry one there.

Cards are white, `1px solid #E9ECE8`, radius 15px. The dark card matches the card radius and takes no
shadow. Floating panels use radius 14px and a real shadow.

**No pills, no circles.** Everything rectangular is a rounded rect: buttons 10–12px, chips 8–10px,
cards 15px, the scan prompt bar 16px. Circles are allowed only for genuinely round data marks — donut
and progress rings, legend dots, vendor initial badges, the toggle knob.

## 5. Control geometry

Two tiers, and nothing between them.

| Tier | Height | Radius | Where |
| --- | --- | --- | --- |
| **Toolbar** | 38px | 10px | top-bar finder, list search inputs, FILTERS, sort combobox chips, toolbar segmented sorts |
| **Form entry** | 48px | 12px | all entry fields, comboboxes in forms, date fields, segmented controls in forms (textarea 88px) |

Adjacent controls in one row share one tier.

**Form controls keep the same height in every state.** The photo field is 48px empty ("Add a product
photo…") and 48px filled — 32px thumbnail, filename, rounded-rect remove button. Variable-size
content such as photos and long values renders in list rows and panels, never inside the form grid.

## 6. Buttons

Two sizes carry almost everything. The prototype drifted to 12 distinct button geometries;
consolidating took it to 8, and most of the drift was inline `style=` overrides on a shared class
rather than real tiers — `.icon-button.icon-button-arrow` rendered at 30px in 8 places and 34px in 6, from one inline
override.

> [!WARNING]
> Never set a button's height or radius inline.

| Tier | Spec | Used for |
| --- | --- | --- |
| **Compact** | 32px / r10 | top bar SCAN RECEIPT and NEW ORDER, section pills (`.button.button-pill`), compact actions (`.button.button-caps.button-compact`, `.button.button-ghost.button-compact`), icon buttons (`.icon-button.icon-button-arrow`), card personalisation |
| **Page** | 38px / r12 | `.button.button-caps` dark and `.button.button-ghost` outline — SAVE ORDER, CANCEL, NEXT STEP, FILTERS |
| **Hero** | 48px | `.hero` CTAs only, on the page tier's radius |
| **Card foot** | 44px full-width | `.button.button-block`, the SEE ALL row. The one documented exception |
| **Key cap** | 22px / r7 | `.key-cap` shortcut hints (CTRL K) |

The compact tier is one size at both breakpoints and passes WCAG 2.5.8 AA (24px floor) with room.
**No circular buttons anywhere.**

> [!IMPORTANT]
> **A control that looks like a button is a `<button type="button">`.** Never a styled `<span>`.

`.button.button-block` shipped as 5 buttons and 4 spans, `.button-link` as 6 spans and none, and the split cost two
different defects at once. The spans were mouse-only — no focus, no Enter, and at 17px tall the
`.button-link` ones were under WCAG 2.5.8's 24px floor as well. And because `.button.button-block` never declared
`font:inherit`, the five real buttons rendered in the UA's Arial while their span twins rendered in
Poppins, on the same screen, for a year.

- **A button needs the type reset a span never did**: `font:inherit; background:none; border:0;
  padding:0` before the rule's own font-size and weight. Missing `font:inherit` is invisible until
  something else on the page uses the same class.
- **Every `<button>` carries an explicit `type="button"`.** All 87 do. Without it the default is
  `submit`, which is inert here only because this prototype has no `<form>` — inside a Blazor
  `EditForm` the same markup posts the form.
- **A converted control must gain the action it was pretending to have.** A dead span is mouse-only;
  a dead button is mouse-only *and* in the tab order, announced as a control that does nothing. So
  each one dismisses, clears, removes or navigates — and because each removes the element focus was
  on, each hands focus somewhere deliberate and announces once through the surface's live region.
- Every control mixing icon and text is a flex container (`align-items:center; gap`) — never
  baseline-aligned icons, never per-icon margins.
- Flow footers: CANCEL/BACK outline left, primary dark right (`justify-content: space-between`).
- **Button labels are ALWAYS caps.** All 32 of them are, so a title-case label is never acceptable,
  and two buttons side by side share one type spec — size, weight, tracking — rather than each
  carrying its own inline style. SCAN RECEIPT shipped title-case against 32 caps neighbours purely
  because nobody counted.
- Where a label shortens responsively, put the droppable words in a `<span class="wide-only">`
  **inside** the label span, never as a second flex child: `.button` has `gap:8px`, so a bare text node
  plus a span renders as two flex items with a gap between the words. Keep the full wording in
  `aria-label`; the visible text stays a substring of it, which is what WCAG 2.5.3 Label in Name
  requires.

## 7. Comboboxes

**No native selects, ever.** Every dropdown is the same searchable combobox.

- **Closed until asked for.** The field shows the current value and opens on click, Enter or Down. It
  closes on outside click, Escape (focus returns to the field), choosing an option, or navigating
  away. The chevron rotates 180° while open.
- **Field**: search icon, current or typed text, Tabler `chevron-down` right-aligned.
- **Panel**: white, r14, floating shadow, optgroups with caps headers (FAVOURITES / ALL VENDORS),
  options with light-green `mark` match-highlighting and right-aligned meta (counts, amounts).
- **Foot action**: `＋ CREATE VENDOR "…"` — create from search.
- **Keyboard**: type to filter, arrows move, Enter selects, Escape closes. Exposed as
  `role="listbox"` / `aria-selected`; options are deliberately not focusable, per the listbox pattern.
- ARIA 1.2 puts `role="combobox"` and `aria-expanded` **on the input**, not on a wrapper div. Space
  types a space; only Down and Enter open the list.

The **global finder** is this component in the top bar (38px tier, CTRL K): grouped cross-entity
results — Orders, Vendors, Notes and item text — plus a foot action into the filtered All-orders
view. Hidden on phones, where per-page search covers it.

**The command palette is not a dropdown.** It is anchored to the finder's left edge but takes its own
width (`width: max(100%, 560px)`) rather than inheriting the field's.

## 8. Icons

**Tabler only. No emoji, ever, and no typographic stand-ins.** Icons come from the Tabler sprite
(v3.44.0) at stroke-width 2. Three things are banned outright:

1. **Emoji as UI** — 🧾 📄 📷 📦 ✅ 👀 🏷️ and friends. They render differently per platform and break
   the visual system.
2. **Typographic glyphs used as icons** — `⋮ › ‹ ✓ ✦ ★ ＋ × ⚙ ⟳ ≡ ◎ ⇅ ⎋ ! … %` are icons wearing a
   text costume. Each has a real Tabler equivalent: `dots-vertical`, `chevron-right`, `chevron-left`,
   `check`, `sparkles`, `star`, `plus`, `x`, `settings`, `search`, `bolt`, `sparkles`, `arrows-sort`,
   `arrow-back-up`, `alert-triangle`, `dots`, `percentage`.
3. **Hand-drawn path data** — if a `d=` attribute was not copied from Tabler, it does not ship.
   Approximations drift off-grid and read as sloppy next to the real ones.

What stays as text: `×` as a multiplication sign in prices ("2 × 89,95 kr."), `·` as a separator, `…`
in truncated placeholder copy. That is typography, not iconography.

**Sizes** run 12–20px by context: nav 19, form and toolbar buttons 14–15, chevrons 15, list-row tiles
16–17, thumbnails 17–20, decorative panel marks 34–46 at stroke-width 1.6.

> [!WARNING]
> **Never set an icon's size in the markup.**

**The container sets the size.** `svg.icon` is 18px and each container overrides it once —
`.chevron svg.icon`, `.item-row-icon svg.icon`, `.button svg.icon`. 141 icons carried the size as an
inline `width`/`height` pair instead, and the values drifted in exactly the way a shared class exists
to prevent: `.icon-button-arrow` drew its glyph at 14px in 8 places, 15px in 4 and 16px in 3 — the
defect [§6](#6-buttons) already records for that button's own geometry, one element further in.
`.document-thumb` held 20px in 4 places and 18px in 2 for the same slot, and the two top-bar buttons
sat side by side at 14px and 15px against §6's rule that adjacent buttons share one spec. A size
written into the markup cannot be reached by a media query, by a theme, or by the next edit to the
class, which is the whole reason it must not live there. Thirteen of the 141 set `width:18px;height:18px`,
which is what the base already computes.

Never icon-only navigation: every nav icon has a visible label at every width.

**Brand mark**: `ti-receipt`, white stroke on a green `#14AC72` tile, 34px / radius 10, beside the
wordmark at 22px / 700. The green tile was chosen over dark and bare-stroke treatments; it is the one
place the accent is spent on chrome. **The wordmark is "Spendly" — never "Splendy".**

**Icons the port's sprite still needs**, all present in Tabler v3.44.0: `chevron-down`,
`dots-vertical`, `dots`, `arrows-sort`, `arrow-back-up`, `arrow-up`, `bolt`, `sparkles`, `settings`,
`camera`, `device-desktop`, `basket`, `plug`, `filter-2`, `percentage`.

## 9. Forms and fields

- Two-step order creation — **Order details → Add the items** — with the stepper card on top: icon
  tile, green progress bar, label; completed steps become green check tiles.
- Labels above fields, help text under, actions split left/right at the footer. One equal 16px gap
  horizontally and vertically; row fields top-aligned in `1fr 1fr` columns that collapse to one at
  ≤700.
- Unit suffix chips inside inputs (`kr.`, `pcs`), fixed width, excluded from shrinking.
- Enums are segmented controls — Status: Ordered / Delivered / Returned, plus "Any" in filters: one
  shared bordered container, dark active segment. **Inside a form a segmented control is an entry
  field, not a chip group.** It fills its column, stands 48px tall like the inputs beside it, and its
  segments flex to equal widths. The intrinsic-width 38px version belongs to toolbars, never to a
  form.
- **Segments run in the order the thing happens, not the order they were typed.** Status shipped as
  Delivered / Ordered / Returned in all three of its controls, which reads left to right as a claim
  that an order is delivered before it is placed. The lifecycle is the sort key — Ordered → Delivered
  → Returned — and it is the same in the create form, the scan review and the filter panel. A segment
  that stands outside the sequence rather than in it, filters' **Any**, leads; it is the default, not
  a stage. Which segment is *selected* is a separate decision from where it sits: both forms still
  open on Delivered, because most orders are entered after they arrive.
- **An enum earns a segmented control by being short and sequential; otherwise it is a combobox.**
  Kind — Expense / Gift / Sold / Work / Other, which records whether an order was your money at all —
  is an enum and is not segmented. Its values name ways an order reached Spendly, not stages an order
  passes through, so the sequence rule above has nothing to put in order, and six segments in a 48px
  row are unreadable at every width the form gets. It uses the same combobox as Vendor and Category,
  and carries its consequence in help text under the field, since "Kind" alone does not say what the
  field decides. Status stays segmented: three values, one lifecycle.
- **Selecting a segment may not change its text metrics.** The track is `width:max-content`, so a
  heavier active label widens the whole control, and every control sharing its row — the toolbar
  search is `flex:1` — resizes to absorb the difference; because the labels are not equal-width the
  jump differs per segment (300px on Spend, 298 on Name). The dark pill already carries the
  selection, so it carries it alone: weight on top of it bought a 1–2px shift on every click, at any
  number of segments. Nothing about this is per-control — it is why no toggle reserves widths.
- **A range stays on one line; a row of names breaks.** Two fields side by side are not all the same
  kind of pair. **From/To and Min/Max are one control each** — an end is read against the other end,
  so they hold their pairing down to the smallest phone (`.field-pair-keep`, past the ≤700 collapse that
  would otherwise split them). **Category and Kind are two independent values** that happen to share a
  row, and they carry names, so that row breaks to one field per line at ≤900 (`.field-pair-stack-early`) — the
  phone layout starts at 700, so from 701 to 900 the sidebar is still standing and a name is down to
  165px, with a phone in landscape (844px) inside that band. **Vendor holds a row by itself at every
  width**, because it carries the longest strings in the panel — `Silvan · Materialer`, and whatever a
  user creates — and a pair gave it half the room at exactly the widths where it had least. At 390px:
  names get the full 294px, each range column gets 139px, and the values fit it — a date wants 163px
  of text room and has it, an amount 81. Panel height 597px against the 687 it would take with the
  roles reversed; the fifth field is what the extra 88px bought, not a worse arrangement of the same
  four. **Which way a row splits is a question about what the fields mean, not about their width.**
  This holds for every range, not just these two: a from/to or a min/max pair added anywhere gets
  `.field-pair-keep` on the row. The tally today is two — All orders' dates and amounts — and both carry it;
  count before adding a third. Ports without these class names still owe the behaviour: a range does
  not break apart on a phone.
- Help text under a field is muted 12px. Watch the specificity trap: `.field > span` styles the
  label, so a `.field-help` span in the same field inherits label weight and colour unless it is
  overridden at equal or higher specificity.
- Multi-select as chips inside the field — categories, removable ×.
- Toggle-revealed optional sections ("More details?": green switch, right-aligned).
- A live **summary card** in the rail mirrors the form: key/value rows, a green "Total est." that
  builds as items are added, savings line.
- **Scan review**: every extracted value editable *including shipping*; VAT reconciliation note (the
  document total incl. 25% moms anchors the draft); matched-vendor chip; per-line checkmarks with
  uncertain lines flagged warm; duplicate warning linking to the existing order.
- **The receipt prefills the form; it does not decide which fields the form has.** The field set
  belongs to the order — everything it needs before it can be saved — and the scan fills in whatever
  it can read of that set. Vendor, date and lines arrive read from the document; Status, Shipping fee
  and Kind arrive as defaults the reviewer confirms or corrects, which is why the card says *every
  value is editable, nothing is stored until you save*. Which is which gets marked rather than
  assumed — the matched chip, the per-line checkmarks, the `Guessed:` line under an uncertain read —
  and that marking is what lets one form hold both kinds of value honestly. Asking instead whether a
  receipt could supply a value is how a field goes missing from the review, and a field missing from
  the review is one that takes its default forever, since the scan flow saves orders without the
  create form ever opening.
- **Create and scan are two doors to one saved order, so the review carries every field the order
  requires.** A required value stays required whichever door it came through, and the receipt may not
  carry it; the review is the last screen before save, so it is where the rest gets supplied.
  **Required: Vendor, Date, Kind, and at least one item.** Shipping fee is optional and zero by
  default; Categories is optional, which is why the review does not carry it and why the two forms
  differing there is not a drift. The required fields carry `aria-required` in both forms, so the
  sets can be compared with a grep instead of by eye — the check Kind failed when it was missing from
  the review.
- **Required and defaulted are not opposites.** Required means the field may not be saved empty;
  the default is what it holds before anyone touches it. Kind is both: required, and opening on
  **Expense**. Status is the same pattern one row up, opening on Delivered. **Where a default decides
  a total, it must be the value that counts.** An order wrongly counted as spend is visible — it sits
  in a figure the user recognises and can go find. An order wrongly excluded is invisible, and
  nothing on any screen says a number is missing something. So the safe default is the conservative
  one, and Kind's is `Expense`; the values that quietly remove money from the totals are never
  reached by leaving a field alone.

### Fields are real form controls

> [!WARNING]
> Never fake an input with a `<div>` and a `<span>`.

The prototype had 24 fake fields and zero real ones, and every field-level bug traced back to it: the
search "placeholder" wrapped to two lines and pushed the control off its geometry tier; date fields
showed a chevron and could not open a picker; nothing had a mobile keyboard, an accessible name, or
native truncation.

`.field-shell` is the **shell** — border, radius, tier height, flex row. Inside it sits a real control that
carries no chrome of its own:

```css
.field-shell > input, .field-shell > textarea {
  flex: 1; min-width: 0; font: inherit; color: inherit;
  background: none; border: 0; padding: 0; outline: none; text-overflow: ellipsis;
}
.field-shell:focus-within { border-color: var(--ink-strong); box-shadow: 0 0 0 1px var(--ink-strong); }
```

- Every input declares an explicit `type`, and every one has an `aria-label`.
- **Amounts are `type="text"` with `inputmode="decimal"`, deliberately.** Danish decimals use a
  comma, which `type="number"` rejects; `inputmode` gets the numeric keyboard without the parsing.
  Quantities use `inputmode="numeric"`.
- Dates are `type="date"` — the OS picker is the point. The calendar glyph and the click that opens it
  are ours on every engine, though: see [§17](#17-ios-and-webkit).
- The photo field is `<label class="field-shell">` wrapping `<input type="file" accept="image/*">`, with
  the chosen filename rendered as text.
- Combobox fields are typeable inputs, per [§7](#7-comboboxes).
- `:focus-within` on the shell replaces any hand-managed focus class.

**Control text never wraps.** `.field-shell`, `.combobox-option`, `.combobox-action`, `.chip` and segmented-control
labels are all `white-space: nowrap` with `text-overflow: ellipsis`. The single exception is `.field-shell-area`
(textarea), which must wrap. **Only the value column gives way** — units, key caps, status chips,
thumbnails and category chips are fixed tokens, excluded from shrinking. A wrapping placeholder also
knocks the control off its geometry tier: that is how the search field grew to two lines and stood
taller than the FILTERS and Sort controls sharing its row.

## 10. Cards

- Header: caps label left; optionally a bordered context chip (the `Save · 4.52% APY` pattern) or an
  EDIT-style pill (32px/r10) right. Hairline below the header.
- Inner gray panels: `#F2F4F1`, r12, rows with 40px rounded-square icons, **no dividers between rows**
  — spacing only — and green amounts right.
- SEE ALL is the 44px full-width outline button at the card foot. Underlined caps links
  (`.button-link`) appear only inside empty states.
- Empty states: loop glyph, one sentence, underlined caps action.
- Exactly **one dark card per screen** — the AI/contextual slot.
- A card header that navigates gets the chevron **and** the standard `.card-divider` hairline. The tally
  was 35 headers with the hairline against 4 without, and the 4 were the chart cards.
- **The body's `14px` top padding is the default for a reason: do not tighten it under a hairline.**
  The two spend cards overrode `.card-body` to `padding-top: 2px`, which left the first line of text
  4.5px below the rule on Orders / Overview and 10px on the Home hero, against an 18–24px band on
  every other card in the file. It does not read as tight spacing, it reads as the text colliding
  with the border. Measure from the hairline's bottom edge to the top of the first glyph's em box,
  not to the element box — a big number hides 5–6px of half-leading inside its line box and a
  12px label hides 2px, so equal padding on the two looks nothing alike.

### Dashboard personalisation

The home dashboard's second row is a set the user picks and orders.

> [!NOTE]
> It is **not** called Favourites. That word already means the `IsFavorite` star on a Vendor or
> Category record, and reusing it for pinned widgets collides with a concept the app already ships.
> The section is "Your cards".

- **Catalogue of six, three on by default**: Spending rhythm, Category breakdown, Top vendors *(on)*;
  Favourite categories, Saved vs retail, Monthly pace *(available)*. Every one is backed by data that
  already exists, so nothing here needs a new query.
- **Favourite categories must stay in the catalogue.** The live app renders a favourite-categories
  shortcut row on Home today (`CategoryService.GetFavoritesAsync`); dropping it from the redesign
  would orphan a working feature.
- EDIT swaps the section actions to DONE (dark, confirm-first) + CANCEL, dashes the card borders, and
  prepends a per-card toolbar: position readout ("2 of 3"), move earlier, move later, remove. A tray
  card below lists what can be added.
- **Reordering is button-driven, never drag-only.** A drag handle alone excludes keyboard and switch
  users; [§18](#18-accessibility) requires a button or menu equivalent, so start there rather than
  bolting one on.
- Ends are `disabled`, not hidden, so the control set does not reflow as cards move. When the button
  that just moved a card becomes disabled at position 1, focus falls to the sibling direction button
  rather than to `<body>`.
- One polite live region announces every change — "Top vendors moved to position 1 of 3", "Monthly
  pace added at position 3".
- CANCEL restores the snapshot taken on entering edit mode; Escape does the same. Nothing persists
  until DONE.
- Empty is a real state: removing every card shows a dashed placeholder, not a bare heading.
- The affordance is a dashed border, deliberately not an animation, because the
  [§18](#18-accessibility) reduced-motion reset would strip it.
- **Read unknown card keys defensively.** The stored list outlives any given catalogue, so filter it
  against the cards that actually exist before applying it, or a renamed card wipes the dashboard.
  The prototype persists to `localStorage['spendly.cards']` and tolerates storage being refused; the
  port stores it server-side ([§20](#20-notes-for-the-port)).

> [!CAUTION]
> **Cost us a bug.** Any class that sets a `display` value outranks the UA's `[hidden] {display:none}`
> rule, so `.button.button-pill` / `.button.button-caps` kept rendering while hidden and EDIT, DONE and CANCEL all showed
> at once. Ship a global `[hidden] { display: none !important; }`.

## 11. Page patterns

Routes in the prototype: `home`, `orders` (Overview), `orders2` (All orders), `detail`, `create` →
`create2`, `scan` → `scan2` → `scan3`, `vendors`, `categories`, `stats`.

**Range chips** — one control, one set, on both pages that carry a chart: **1W · 1M · 3M · YTD ·
ALL**, buttons in a `role="group"`, active one bordered and `aria-pressed="true"`. No 1D: a ledger of
orders has nothing to say about a single day. They re-plot the chart they sit in — 1W slices the last
seven days, 1M is the month the prototype holds, and the three longer ranges bucket that month into
the point count they would carry. Where a chart also has a series switcher, the switcher owns *which*
series and the range owns *how much*, so neither resets the other.

**Home** — spent-this-month hero (big number, savings line, range chips with a bordered active state,
chart with floating callout, Orders/Saved half-underline tabs, category split bar and expandable
legend), dark AI scan card, latest orders, saved-vs-retail, then the personalised card row. Title is
"Home", no greeting.

**Orders / Overview** — comparison chart card (current period solid, previous period in a lighter
tint of the same hue, dashed guide, halo marker, ruler ticks, a `.chart-series-key` naming both periods), twin LATEST
cards, FOR YOU promo row (tag pills;
horizontal scroll ≤1180, stacks ≤700), rail with returns, question of the day, category breakdown
(Expenses | Budget segmented plus donut), ORDER SETTINGS.

**Orders / All orders** — the search surface: 38px finder input (vendor, note, item text), FILTERS
disclosing the inline panel it opens and collapses (a full-width vendor combobox, then category and
kind comboboxes, from/to, min/max with `kr.` units, status segmented led by Any, APPLY 32px +
CLEAR), active filters as removable ×
chips plus CLEAR ALL, sort combobox chip, results line "N match · filtered from total", rows with
status chips and saved amounts, PREVIOUS/NEXT. Sub-tabs double as one-tap status filters.

**Order detail** — back arrow in the **top bar**, never floating in a card. **No internal ids shown.**
Header card (vendor, date and count, category chips, status chip, edit/delete); items with photos and
**paid prices only** — retail never displays on details; totals with the order-level green saved
line; rail with details facts (status, date, vendor, categories, **kind**, saved vs retail),
attachments (ADD FILE, open/delete) and the contextual dark scan card. **Every summary that shows
Categories shows Kind** — this rail and the create summary — so a total with a hole in it can be
explained from the order that made it.

**Scan flow** — three steps, Upload → Reading → Review, with the stepper. Reading is a full-width card
sharing the stepper's edges, with a centred column inside: document preview, filename headline, help
line, an **indeterminate progress bar** (a 38% segment sliding on a 420px track, `aria-busy` on the
card, no percentage claimed because a scan has none) and the review link. No spinner — the moving bar
carries the busy state on its own. Review as in [§9](#9-forms-and-fields), with the draft fields
paired two to a row under a full-width vendor: **Date and Status on the first line, Shipping fee and
Kind on the second** — the same shape as the create form, so the two teach one layout rather than
two. Kind was left off this form once, on the grounds that a receipt cannot say whose money paid for
the order — which is the wrong question, per [§9](#9-forms-and-fields): neither can it say the order
arrived, and Status is here, and Shipping fee is here with help text saying outright that it is not
on the receipt. The cost of getting it wrong is specific to this screen. A work-bought order scanned
from a receipt would have taken the default, landed in the month's spend, and stayed there until
someone went looking for it.

**A page hero is one component with two framings.** `.hero` holds the type — 30px/600 heading,
14px sentence at a 52ch measure, 48px caps action — and the variant holds the frame: `.hero-panel`
is the tinted, left-aligned block, `.hero-column` is the centred 760px column. They were two
unrelated classes and drifted: the scan page's heading was 26px/700 and its sentence 13px, which put
it outside [§3](#3-typography) on both counts, and its sentence ran the full 740px — about 95
characters, well past a readable measure. Unifying moved that one page and nothing else.

**Vendors** — hero panel (`.hero.hero-panel`: warm tint `#EDEEE7`, big sentence, dark caps CTA), favourite spotlight cards
(caps header and chip, sentence, inner panel rows, full-width VIEW ORDERS), full-width search with
Spend/Name/Orders/Saved segmented, horizontal all-vendors card row.

**Categories** — full-width search with Spend/Name/Orders segmented, icon-square list rows with
percentage of expenses and amounts, question card, breakdown donut.

**Statistics**, with every current metric kept — a period pager (‹ July 2026 ›) and a headline with
delta chip, plus the same five range chips as Home on the comparison card; four KPI cards each with
an explicit previous-period delta (trend icon, "x% up/down vs June", previous value); race chart;
**Pace** (projection, meter with fill and previous-period-end marker, plus note); **Weekly rhythm**
(weekend share, busiest day, 7 mini columns); breakdown ring with gaps; month columns; returns note.

## 12. Chrome

A personal, single-user system: **no avatar, no help "?", no bell, no greeting, no visible internal
ids.** Top bar = title + global finder + SCAN RECEIPT (dark) + NEW ORDER (outline).

**Both creation paths stay on the phone.** Scanning is the fast path, but typing an order is the one
you need when there is no receipt to scan, so it must never become the desktop-only option. The
prototype hid NEW ORDER below 700px and left the app scan-only on the device where orders are most
often added. On mobile the labels shorten to SCAN and NEW so the pair still fits one row, with the
full wording kept in the accessible name.

`.global-finder` carries the `margin-left:auto` that pushes the actions right and is hidden on mobile, so
`.topbar .topbar-actions` has to take that job over or the buttons sit against the title.

The sidebar foot is the wordmark line alone — `Spendly · personal ledger`. **No legal, privacy or
terms links**: there is no second party here to disclose anything to. Hidden entirely on mobile.

## 13. Honest affordances

The most common defect found in this design was chrome that looks interactive and is not. Every
instance below shipped because a shape was copied from the reference without asking what it would do.

- **A chevron means "this goes somewhere".** It appears only on something that navigates, and
  anything that navigates carries one. Audit both directions: the prototype had 12 chevrons, all
  dead, and after wiring them 9 rows were clickable with no chevron at all.
- **Chevron direction carries meaning** — right = navigate away, down = expand in place. Do not mix
  them; the Home legend used down-chevrons on rows that navigate.
- **Date fields carry the calendar icon, never a chevron.** A chevron promises a list; a date field
  opens the OS picker. The icon is ours on every engine and the browser's own is taken off the field
  ([§17](#17-ios-and-webkit)) — so the glyph is what opens the picker, on click or Alt+Down.
- **Anything clickable is the element for the job, not a div wearing its role.** Twenty-six rows, card
  headers and the brand were `<div role="link" tabindex="0">` with a hand-written Enter handler, against
  five real `<a>` in the whole file — a link rebuilt three attributes and nine lines at a time, and
  rebuilt only as far as someone remembered. They are `<a href="#">` now and the handler is one
  `preventDefault` (the href is `#`, so without it every row click appends a fragment and jumps to the
  top). Enter comes from the platform, Space still scrolls because that is what a link does, and
  middle-click, ⌘-click, the context menu and open-in-new-tab arrive with it — none of which a `role`
  can provide. `a[data-go]` carries `color:inherit; text-decoration:none`, keyed on the attribute
  rather than a class because eight different components navigate this way, and on `a` specifically so
  the `<button data-go>` elements keep their own colours.
- **A hover tint gets its own token, not the divider's.** One token drew both, and a value chosen to
  read as a 1px line edge-on is too heavy spread across a whole row: it announced a selection where
  the pointer only meant "this goes somewhere". `--bg-row-hover` is `#F6F7F4`, half the contrast against
  `--bg-card` — 9/8/11 off white against `--border-divider`'s 18/16/21. The card header that navigates takes the
  same token, since it is the same affordance one band up; two tints for one meaning would be the
  drift the token exists to stop. The rule under a lit header no longer vanishes into it — it reads
  as the bottom edge of the lit band, which is why that rule still goes full-bleed on hover
  ([§10](#10-cards)): the two lines a pixel apart were the defect, not the colour match.
- **A row's hover tint bleeds 10px past the body gutter; the row's content does not.** The card body's
  20px padding is right for text and too tight for a highlight -- the tint stopped hard against the
  first glyph and the chevron at both ends. The header above already lights up edge to edge, so this
  is the same affordance for a row that sits inside the padding. Ten is half the gutter and leaves
  11px of card either side; the full 20 reaches the card's inner border and reads as the row escaping
  the card. Draw it with two offset `box-shadow`s, not a wider box and not a positioned pseudo-element.
  A wider box drags every divider out with it, since the divider between rows is the row's own
  `border-top`. A pseudo-element needs `position:relative` on the row to hang off, and that alone
  dropped these rows from subpixel to grayscale text antialiasing -- 5,726 pixels of `docs/home.png`
  changed, every one a glyph edge, for a highlight that was not even on screen. The shadow form
  changes nothing until `:hover`: 0 differing fields across 110,560 elements.
- **A `role="tab"` is a promise.** Tabs are `<button>`, carry roving `tabindex` (selected 0, rest -1),
  respond to Left/Right, and keep `aria-selected` in sync. Twelve `<span role="tab">` elements
  announced as tabs while being inert. This holds for the inline segmented controls (`.segmented.segmented-compact`)
  and the hero's Orders/Saved pair as much as for the page sub-tabs.
- **A tab must change what is on screen.** Tabs that could not — Delivered, Returned, Reports, and the
  statistics period tabs that duplicated that page's own pager — were deleted, not left as decoration.
- **A disclosure button owns its panel.** All orders' FILTERS stood above the filter panel with a
  border, an icon and no handler — the decorative-control rule again, in its hardest form to spot,
  because this document already said the button toggled the panel and the screenshot showed both. The
  button carries `aria-expanded`, `aria-controls` names the panel, and the panel is `hidden` when
  collapsed; it starts open, so the page still shows both control tiers on load. **The label is the
  same string in both states** — the chevron rotates instead. "HIDE FILTERS" is wider than "FILTERS",
  and the search beside it is `flex:1` in a `nowrap` row, so a changing label would move the search on
  every click: the segmented control's rule ([§9](#9-forms-and-fields)) arriving from the button side.
- **No decorative controls at all.** The kebab was a `<span aria-hidden="true">` with no handler and
  no intended action, inherited from the reference's card menu; it invites a click that does nothing.
  Deleted. The hero `[+]` went too: it duplicated the top bar's NEW ORDER and existed only because
  that button was hidden on mobile.

> [!WARNING]
> **Changing an element's tag re-sorts every `*-of-type` selector around it.** `.order-row:last-of-type`
> means "the last row in the list" and counts tags instead. The pager `div` under the rows was the last
> `div`, so the rule matched nothing and all three rows kept a trailing hairline nobody had noticed in
> a screenshot that shows it. Making the first row an `<a>` then left it the only element of its type,
> so the dead rule woke on the wrong row and stripped the border from the top of the list — 190 moved
> rectangles, from one 1px line. Neither state is what the rule says. Write `:not(:has(~ .order-row))`,
> which counts the same thing the name does.

## 14. Charts

> [!WARNING]
> Never scale a fixed `viewBox` to fit. Both `preserveAspectRatio="none"` and
> `width:100% + aspect-ratio` zoom the whole drawing: the stroke thickens, marker circles turn into
> ellipses, and with `none` the curve's slope changes with window width, which misreads the data.

Instead, hold the height fixed and remap the viewBox onto the element's real pixel box on every
resize — `viewBox="0 0 <measuredWidth> <fixedHeight>"` — so one user unit is always one CSS pixel.
Stroke widths and markers then stay constant in screen pixels, and only the horizontal spacing of the
data changes.

- Keep the series as data (`data-series`) and regenerate the path rather than hand-authoring bezier
  control points: the numbers stay legible and re-plot at any width. Baselines (`data-baseline`) and
  markers (`data-marker`) are placed from data too.
- A `ResizeObserver` handles charts on hidden pages, which measure zero wide until shown — nothing has
  to be redrawn by hand on navigation.

### Comparison charts

- **The comparison period is always the one immediately before — never a picker.** Orders / Overview
  shipped a "Compare with: June ▾" chip that implied a choice the app does not have; a control that
  can only ever hold one value is a lie about the interface (§13). State the period instead: the
  Statistics card does it in the header (`Overview · July against June`), Orders / Overview does it
  in the series key.
- **A key names every plotted line or it is not a key.** Orders / Overview drew two series and
  labelled one of them, leaving the reader to guess that the pale line was June — the chip that
  actually said "June" sat on the far side of the card, styled as a control rather than as a legend.
  `.chart-series-key` is the pattern: one 9px swatch per series in that series' own stroke colour, 12px
  `--text-body` label, `flex-wrap` so it stacks rather than overflows at 390px.
- Do not repeat the card header in the body. Under a header reading `SPENT · JULY 2026`, an
  "Expenses" caption above the number says nothing the header has not already said, and it cost the
  number its leading.

## 15. Responsive containment

**Audit clipped content, not document overflow.** `document.scrollWidth - clientWidth` was 0 on every
page while the Orders filter panel was 76px wider than its card and simply cut off: a card clips its
own children without the document ever overflowing, so the controls become unreachable with no
scrollbar to reveal them. Measure `el.scrollWidth - el.clientWidth` on every element instead,
excluding the deliberate scrollers (`.scroll-row`, `.promo-row`).

**Then measure document overflow too -- it is a second check, not a superseded one.** The hidden file
input on New order step 2 set `width:1px` and lost to `.field-shell > input { width:100% }`, which is
one type selector heavier than a lone class; an absolutely positioned box whose ancestors are all
static resolves that against the viewport. It was 1440px wide, invisible, and hung 657px off the
right of the page, scrolling the document into blank space at every width from 390 up. The element
audit above cannot see it -- nothing clips a box that no ancestor contains, so every
`el.scrollWidth - el.clientWidth` reads 0 while the document grows. Assert
`documentElement.scrollWidth === clientWidth` on every page as well; it was the only page of twelve
that failed, and it failed at all five widths.

The cause is almost always the same — **flex and grid children default to `min-width:auto`**, so a
long placeholder, a `white-space:nowrap` price or a fixed-width chip refuses to shrink and bursts the
container. Rules that follow:

- Give every layout container in a form panel `min-width:0`: `.filter-section`, `.field`, `.field-shell`, and
  `.filter-section > *`, `.field-pair > *`, `.row-inline > *`, `.card-body > *`.
- A single-column grid's implicit column is `auto`, which sizes to its widest item's min-content and
  can exceed the container. Use `grid-template-columns: minmax(0,1fr)`.
- **Only the text column may shrink.** Icon tiles, nowrap prices and drag handles are fixed
  affordances; blanket `min-width:0` on row children clipped prices by 29px and squeezed a 15px drag
  handle to 6px. Target the description (`.item-row > span:has(b)`) and give the rest `flex:none`.
- Rows with fixed columns that cannot fit a phone stack instead — `.order-row` becomes two rows via
  `grid-template-areas`.
- **Row content sits flush with the card's content box.** Six row types use `padding: Npx 0`; `.order-row`
  alone had `12px 6px` and sat 6px inside the header and footer above and below it. Likewise a
  trailing chevron column is `auto`, not a fixed 26px around a 15px glyph, or the row stops short of
  the card edge.

## 16. The phone layout

Everything here is scoped to `≤700px`. It was settled after the desktop system and supersedes the
earlier "shrink the floating layer" approach.

- **The content area is flat white and edge to edge.** The canvas tint exists to frame the floating
  white sheet against the sidebar; a phone has no sidebar, so all the tint produced was an 8px border
  around the content — decoration paid for in width the dense rows actually need. `body` goes white
  and `.main-panel` drops its margin, radius and shadow.
- **Square corners stop at the paper.** The sheet and the main panel are the page's own edge and have
  nothing to be rounded against once they run full width, so they square off. **Cards keep their 15px
  radius** and controls keep theirs — they are objects on the paper, not the paper. "No round corners
  on mobile" was a rule about the layer, never about everything inside it.
- **One gutter for the whole phone layout: 12px.** Top bar, sub-tab strip and sheet all use it, so
  header, sub-tabs and cards share a left edge. The sheet's inset is split across a margin and a
  padding, which is exactly how a mismatch hides — `10 + 12` reads as intentional at a glance without
  ever totalling the gutter the rest of the layout uses. Keep it stated as `0 + 12` so the number
  stays legible.
- **The sidebar becomes a fixed bottom tab bar**: all five destinations as equal columns
  (`repeat(5, minmax(0,1fr))`), icon over label, labels always visible, ~48px targets,
  `env(safe-area-inset-bottom)` respected, and `.main-panel` padded to clear it.
- **The tab bar keeps the `#EFF1EF` tint** plus a top hairline. That tint is the one thing separating
  the bar from content scrolling under it; making it white cost that separation and had to be bought
  back with a shadow and a pill that were never asked for. On tint the active tab reads from its bare
  1px lift, no fill — which is how it was designed.
- **Layout shifts**: `.order-row` stacks to two rows; `.item-row` wraps with the description keeping a 60%
  basis; `.field-pair` and `.order-list-grid` go single-column — except the filter panel's From/To and Min/Max rows,
  which stay side by side ([§9](#9-forms-and-fields)); card rows go single-column; the hero callout is
  hidden; the global finder is hidden and `.topbar .topbar-actions` takes over the right-alignment; sub-tabs
  scroll horizontally without a visible scrollbar.
- **A wrapping segmented control takes its height from the buttons** (`min-height:38px`), not from the
  container. `.field .segmented button` zeroes vertical padding and outranks `.segmented.segmented-compact button` on
  source order alone, so with `height:auto` and no padding the control collapsed to text height — a
  ~26px strip under 48px inputs. At 38px the buttons put an unwrapped control back at 48px, matching
  the fields above it.

## 17. iOS and WebKit

Two WebKit-only bugs, each with a wrong-looking obvious fix. Neither is worth re-litigating.

### Zoom on focus

iOS zooms the page whenever a focused control computes under 16px, and every field here is 12.5 or
13.5px.

- Raising the sizes is the usual fix and the one thing this must not do — the sizes are the design.
- **Clamping the viewport does not work.** Safari has ignored `maximum-scale` and `user-scalable`
  since iOS 10, deliberately, so that a reader can always zoom. A clamp is dead weight that would
  also fail WCAG 1.4.4 if it were ever honoured.
- The computed font size is the only lever Safari reads, and it reads the *computed* one — a transform
  is a paint operation and does not touch it. So under `@media (pointer: coarse)` each control
  computes at 16px and is scaled straight back to the size it already was: `.84375` for the 13.5px
  form fields, `.78125` for the 12.5px toolbar and global search. Nothing looks bigger, which is the
  whole point.
- `transform-origin: left center` pins the left edge so text starts exactly where it did, and a
  negative `margin-right` hands the layout box back the width the scale took off it. Overshoot is
  bounded by whatever trailing chip shares the row — about `0.156 ×` its width, ~4px worst case — and
  `.field-shell` clips, so it stays inside the field.
- The textarea is scaled in both axes rather than one — it is a block with a real height, not a single
  line centred in a fixed row — so it gets a top-left origin and an inflated height instead.
- Coarse pointers only. Desktop has no such behaviour and keeps the untransformed, sharper text.

### Date fields

- iOS 15+ renders the value into `::-webkit-date-and-time-value`, which defaults to `width:100%` and
  `text-align:center`, and `text-align` on the input does not reach it. Ours is `flex:1` so it spans
  the row, which is what left the date stranded mid-field while every neighbouring value sat left.
  Overriding the pseudo-element is the documented fix (Apple DTS,
  [developer.apple.com/forums/thread/691305](https://developer.apple.com/forums/thread/691305)).
  **Not scoped to `[type=date]`** — time, month and datetime-local behave the same way, and the
  pseudo-element does not exist on other input types, so the rule is inert there. Blink and Gecko
  already left-align.
- iOS never renders `::-webkit-calendar-picker-indicator`, so date fields were the only ones on a
  phone with an empty trailing slot. **The glyph is ours on every platform** — and it is the only one
  the field may show. A browser-drawn calendar is a native icon, which [§8](#8-icons) does not allow
  whatever it looks like, so each engine's own affordance comes off the field:
  - Blink and WebKit expose theirs, so it goes outright:
    `::-webkit-calendar-picker-indicator { display:none }`, unscoped for the same reason as the value
    pseudo-element above.
  - **Gecko exposes nothing.** Firefox draws a picker button inside the input and no selector reaches
    it ([bugzilla 1830890](https://bugzilla.mozilla.org/show_bug.cgi?id=1830890), open), which is why
    desktop Firefox showed two calendars on every date field — its button and ours, near enough on top
    of each other to read as one smeared glyph. Since it cannot be hidden it is moved: the input runs
    `calc(100% + 56px)`, past the shell's right edge, and the button rides out with it into overflow
    `.field-shell` already clips. Only the button moves — the value sits at the left, the trail is out of
    flow.
- **The trail is what leaves flow, never the input.** An out-of-flow input would stop spanning the
  field, and the field being the input is what makes the whole of it the tap target on iOS.
- **Everything trailing rides in `.field-date-trail`**, so the one date field carrying a unit chip lays out like
  the others instead of opting out: chip first, glyph last, which keeps the affordance where it sits
  on every other date field.
- **The picker opens from the glyph**, through `showPicker()`, on every engine — no native affordance
  is left to click, and the field behaves the same everywhere instead of once per engine. Where
  `showPicker()` is missing (iOS before 16) nothing is bound at all: the trail stays inert inside
  `.field`, the label forwards the tap to the input, and iOS opens the picker off the input the way
  it always has. Binding a dead listener would take that away by swallowing the tap. Alt+Down does the
  same from the keyboard, so the glyph is not a mouse-only control ([§13](#13-honest-affordances)) —
  and typing the date into the segments never needed the picker at all.

## 18. Accessibility

- WCAG 2.2 AA floor; muted text tuned to hold 4.5:1 on white.
- Deltas and statuses are words plus icons, never colour alone.
- Comboboxes: listbox semantics, roving focus, Escape restores focus to the field.
- Panels and detail regions: focus moves to the heading on open, returns to the trigger on close.
- Live regions polite and single per surface — filter counts, period changes, card reordering.
- **The back arrow names where it goes**, and goes there. Its label was a fixed "Back to orders"
  while the two scan steps return to the scan page, so it announced the wrong destination on two of
  the three pages that carry it; it is `Back to ' + TITLES[target]` now. It was also inert for as
  long as it existed — the click handler is bound by a load-time `[data-go]` sweep and the button's
  target is assigned per page afterwards, so it drew, focused and announced correctly while
  navigating nowhere.
- Focus is always visible: `:focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }`.
- Touch targets ≥44px effective on mobile nav; drag actions always have a button or menu equivalent;
  Escape cancels inline edits.
- Pinch-zoom is never blocked ([§1](#1-shell-and-layout), [§17](#17-ios-and-webkit)).

> [!IMPORTANT]
> Progress indicators never freeze under `prefers-reduced-motion`. The blanket `* { animation: none }`
> reset is wrong — it turns a busy state into what looks like a hung app. Exclude busy indicators from
> the reset and slow them instead: `.progress-bar.progress-bar-indeterminate i` runs 1.5s normally, 2.6s linear under reduced
> motion.

## 19. Names in the markup

Two systems name things here — classes name components, ids name single elements — and both are
kebab-case whole words, so an element is not spelled two ways in one attribute pair.

### Class names

A class names a component. Its variants are written next to it, never instead of it:

```html
<button class="button button-caps button-compact">SAVE ORDER</button>
<section class="card card-kpi">
<button type="button" class="icon-button icon-button-arrow">
```

Three kinds of name, and the shape of the name tells you which one you are looking at:

| Kind | Form | Written | Examples |
| --- | --- | --- | --- |
| **Identifier** | whole words | alone, or followed by its variants | `.button`, `.card`, `.field-shell` |
| **Variant** | `identifier-variant` | only ever beside its identifier | `.button-caps`, `.card-kpi`, `.chip-status-warning` |
| **Part** | `identifier-part` | alone; styled only inside its identifier | `.card-header`, `.order-row-total` |

- **The identifier carries the shape, the variant carries only its difference.** `.button` holds the
  box, the 1px edge and the type a `<button>` does not inherit; `.button-caps` holds seven
  declarations, all of them differences. Four buttons used to restate that box in full and had
  drifted apart doing it — three gaps, three radii, four font sizes and two border treatments for
  what is one control.
- **A variant written alone is a bug.** It has no shape of its own by construction, so it renders as
  bare text rather than approximately right. That is deliberate: the failure is visible.
- **A base is only worth having when the variants share more than they override.** The four chips
  share two declarations and differ on eight, so they stay four components. Forcing a base there
  would make four different badges look like one family, which is a worse lie than the duplication.
  The six row components fail the same test: `display:flex` and `align-items:center` are all they
  share, against gaps of 10/11/12/13, paddings of 7/10/11/12 and a hairline four of them do not have.
- **A part carries its identifier in its name, not just in its selector.** `.entry-list-row`, never
  `.entry-list .row` -- the tally is 103 parts written bare against 47 scoped. A generic child name
  cannot be grepped: `class="row"` was 22 elements across two unrelated components that disagreed on
  gap, padding, border and font size, so moving one between them restyled it and no selector said
  which was which. Scoping also hides a part that has outlived its parent. `.account-row .amount` and
  `.account-row .chevron` matched nothing on any page for as long as that row had been a checklist,
  and neither end reports it -- nothing about `.account-row` says a child rule points at it, and
  nothing about `.amount` says one of its six parents is gone. Whichever way the port scopes CSS, it
  scopes by file and not by ancestor, so the ancestor buys nothing there either.
- **A colour token is named for the surface it paints.** That is the one thing its value cannot tell
  you, so the name carries it: `--text-*` is glyphs, `--bg-*` is a fill, `--border-*` is an edge.
  Nothing writes "color" — a token is one. Before this, `--hair` said a line was thin and never what
  it divided, and sat two lines from `--border-hairline`: two names reading as synonyms for greys
  three shades apart. They are `--border-divider`, `--border-card` and `--border-control` now, and
  which edge each draws is in the name. 247 references moved and not a pixel did.
- **The named hues are the deliberate exception.** `--green` is text on a positive delta and fill on
  a progress bar — 7 uses against 12 — so a surface prefix would be wrong half the time. `--green`,
  `--teal`, the blues, the donut set and the icon set stay named for the hue, because that is what
  they are: a palette, not a role.
- **`<b>` and `<i>` are not "bold span" and "small span".** 196 of them carried this file's type: row
  titles, meta lines, and 41 empty boxes drawing a bar fill, a swatch or a gauge marker, where `<i>`
  computed `font-style:italic` on an element holding no text at all. They are `<span>` with part
  names now — `.item-row-title`, `.category-row-meta`, `.chart-bar-fill`, `.meter-marker`. The one
  that stayed semantic went the other way: the note lead-ins ("Total matches.") are `<strong>`, which
  is what they always meant. Two things have to be measured before a tag can go:
  - **The UA's bold is often load-bearing.** `.promo b`, `.card-kpi b`, `.empty-note b` and two
    one-offs with no rule at all rendered 700 only because they were `<b>`. Grep each rule for
    `font-weight` before converting; where it is absent the tag was the declaration.
  - **A `<span>` lands in every rule keyed on a bare `span`.** `.card-kpi span` was sizing the label,
    the value *and* the delta together; `.item-row > span:has(b)` stopped matching at all, and the
    description column lost `min-width:0`, stopped shrinking and unwrapped a line on a page no
    screenshot covers. Do **not** rename the bare-tag rule to get it out of the way — that strips its
    styling from everything else it was feeding, which is how one fix became 566 moved rectangles.
    Scope the new part to outrank it (`.card-kpi .card-kpi-value` is (0,2,0) against (0,1,1)) and
    answer every property it sets: size, tracking, case, colour, weight.

- **No abbreviations, and no shorthand.** A name that has to be decoded gets a seventh variant
  bolted onto it by someone who did not decode it. The stylesheet had reached `.iic`, `.sic`,
  `.olcol`, `.dk-hl`, `.forr`, `.om`/`.ot`/`.ov` and the single letters `.c`/`.d`/`.n`/`.t`/`.v`.
- **Never number a variant, and that includes tokens.** Six classes existed and the digit meant three
  different things: `.frow2` was *two columns*, `.empty2`/`.ring2`/`.hero2`/`.lab2` were *the other
  one*, and `.chip2` was a second chip whose first had never existed. A number records the moment
  someone needed another one; it never records what makes it different. The token block had the same
  three — `--ink-2`, `--muted-2`, `--dark-2` — which could only be told from their unnumbered
  neighbours by reading their hex. They are `--text-body`, `--text-faint` and `--bg-dark-lift`.
- **Hiding is the `hidden` attribute — never a class, never an inline style.** A `.hidden` class
  would be a second mechanism for a job the platform already does, and it says nothing to a screen
  reader. `[hidden] { display: none !important }` carries the `!important` because any class that
  sets a display value outranks the UA rule, which is most of them — `.icon-button` is
  `inline-grid`, so the back button rendered straight through `hidden` until the reset was added.
- **A wrapper is named for the slot it fills, not for what a page happens to put in it.** `.page-bar`
  is the band under the top bar, sharing the sheet's gutters so its contents line up with the cards
  below ([§1](#1-shell-and-layout)); sub-tabs are merely what every page currently puts there.
  Naming it `.subtab-bar` made a container sound like a contract.
- **Shared values are tokens, not classes.** `--radius-compact`, `--radius-page`, `--radius-card`,
  `--border-hairline`. A utility class would put the value in the markup, and there is no single
  radius to name `.rounded` anyway — 22 distinct values across 89 declarations, the commonest
  covering 19% of them. `--radius-card` already proved the point: four surfaces shared it and one
  wrote `15px` out by hand, so the token only ever moved three of them.
- **A component gets a base rule, not only context-scoped ones.** This is where inline styles come
  from — not carelessness, but a class the stylesheet cannot see. `.section-label` was reached only as
  `.card-header .section-label` and `.section-header .section-label`, and `.card-caption` by nothing at
  all, so every instance outside a blessed container had no rule that could touch it and carried the
  full spec in the markup: 39 section labels took 11.5px from CSS while the 5 that sat elsewhere were
  hand-written at 11px, in the one micro-label spec [§3](#3-typography) pins to 11–11.5px. The copy in
  the markup always drifts from the rule it duplicates, because nothing makes them agree. Write the
  base rule first and let the container override it.
- **A default that most of its uses override is the wrong default.** `.item-row .amount` painted every
  amount green and 13 of its 17 uses set it back to `--text` inline. Green belonged to the vendor
  spotlight panel alone — four figures — so the rule now states the common case and
  `.spotlight-pair .item-row .amount` states the exception. Count which side is the majority before
  deciding which one gets the inline override; here it had been backwards for as long as the rule existed.
- **Structure that repeats is a selector, not an attribute.** Six summary rows ended their run with an
  inline `border-bottom:0` and five list rows opened theirs with `padding-top:0`. The runs end three
  different ways — at the end of the card body, at a `.card-divider` before the total, and at a
  `.section-label` starting the next group — so `:last-child` catches only four of the six;
  `:not(:has(+ .summary-row))` catches all six and says what the rule actually means.

> [!WARNING]
> **Folding a variant onto a base changes what wins.** A variant is two classes where it used to be
> one, so every context rule that tuned it — `.toolbar`, `.hero-panel`, and the compact size modifier
> — went from losing on specificity to tying, and a tie is decided by source order. Nothing errors:
> the control keeps rendering, at the wrong tier.

> [!WARNING]
> **A rule that cannot fire looks exactly like one that works.** `.subtab-bar:empty { display:none }`
> could never match: the tablist element is always in the markup, so the wrapper is never empty. What
> actually hid the band was the tab builder reaching up to `subtabs.parentElement.style` — JS styling
> an element it does not own, one wrapper away from hiding the wrong one, and an inline
> `display:none` in the served DOM for its trouble. It is `:not(:has(button))` now, in CSS, where it
> can be read. Grep for a selector's *match*, not just its presence.

> [!WARNING]
> **Renaming an identifier orphans its parts.** `.kpi span` and `.question-card .question-card-label`
> kept matching a class the markup no longer carried. Grep the old identifier as a *prefix and as an
> ancestor* before calling a rename done — 661 rect differences on the categories page were the only
> thing that said so.

### Ids

An id names one element. Same alphabet as a class — kebab-case, whole words:

```html
<button type="button" id="back-button" class="icon-button icon-button-arrow">
<div id="dashboard-cards" class="dashboard-cards">
```

- **Kebab-case, never camelCase.** 19 of the 28 ids were camelCase — `backBtn`, `cardsEdit`,
  `saveOrder` — sitting on the same elements as kebab-case classes, so the markup carried two
  spelling systems at once and neither told you which to expect on the next attribute.
- **No abbreviations, exactly as for a class.** `ptitle`, `gfind`, `favs`, `bl` and `gr` all had to
  be decoded before they could be used; they are `page-title`, `global-finder`, `dashboard-cards`,
  `home-spend-gradient` and `home-savings-gradient`.
- **Never number an id**, for the reason a variant is never numbered. `gr` and `gr2` were one
  gradient drawn on two pages; the digit recorded that a second was wanted and never which page
  wanted it. Naming the page says both: `home-savings-gradient` and `stats-spend-gradient`.
- **Where the element is a component, its id is its class.** `.dashboard-cards` carries
  `id="dashboard-cards"`. The two namespaces are separate and may agree, and agreeing leaves one
  name to remember instead of two to reconcile.
- **The script's handle mirrors the id in camelCase.** Kebab is not legal in a JS identifier, so
  this is the one place the two systems differ in shape — but never in words:
  `const dashboardCards = document.getElementById('dashboard-cards')`. `editBtn` standing for
  `id="dashboard-cards-edit"` is the drift this rule exists to stop.

> [!WARNING]
> **Most references to an id are not selectors.** A rename has to reach `aria-controls`,
> `data-dismiss`, `url(#…)` inside a `fill` or `stroke`, and any helper taking an id as a string —
> `say('filter-live-region', …)` passes one as an argument, where no grep for `getElementById` finds
> it. Grep the id itself, and check the rendered result: a stale `url(#…)` still parses, still
> renders, and silently drops the fill.

**For the port**: this is the component boundary. An identifier is a `.razor` component, its variants
are that component's parameters, and its parts are the markup inside it. Scoped `.razor.css` makes the
identifier prefix on a part redundant — keep it anyway while the prototype is the reference, or the
two stop matching. Ids do not survive the port as-is: a `.razor` component rendered twice would emit
the id twice, so anything the script reaches by id becomes an `@ref` or a parameter.

## 20. Notes for the port

- **Shell first**: `MainLayout.razor` plus tokens in `earnify.css`. Keep the single `--theme` master
  derivation and map [§2](#2-color) onto it; independent masters for green and warm, as danger is
  today. `earnify.min.css` is what ships — run `dotnet build` after edits, since the dev server locks
  `bin\`.
- **Fonts**: self-host Poppins woff2 in `wwwroot/fonts`, latin subset incl. æøå.
- **Sub-tabs must share the content container** — one constraint, nothing drifts.
- **The global finder needs a small cross-entity endpoint**: orders by vendor, note and item text,
  plus vendors and categories.
- **Drop `maximum-scale=1` from `Components/App.razor`** ([§1](#1-shell-and-layout),
  [§17](#17-ios-and-webkit)). Keep `viewport-fit=cover`, which the mobile tab bar depends on for
  `env(safe-area-inset-bottom)`.
- **`App.razor` owns the document skeleton** ([§1](#1-shell-and-layout)): doctype, `lang`, and
  `<meta charset="utf-8">` first in `<head>`. Kestrel sends `charset=utf-8` so the prototype's BOM
  stops being the thing holding the encoding up — the meta tag still has to be there, because a
  static export or a CDN in front of it need not be so careful.
- **Dashboard card choice needs somewhere to live.** There are six DbSets and none of them is
  settings. For one user the cheapest honest option is a key/value preference table (`Key` PK string,
  `Value` JSON string) holding a single row — `dashboard.cards` =
  `["rhythm","breakdown","vendors"]`: one migration, and the next preference (default statistics
  period, page size) costs nothing more. A `DashboardCard(CardKey, SortOrder, IsVisible)` table is
  more relational but only ever serves this one feature. Do not reach for `localStorage`: on Blazor
  Server that means JS interop for something the server already has a database for, and the choice
  would not follow the user between devices.
- **`Order.Status` is two fields, not one.** It shipped as `None/Expense/Gift/Sold/Work/Other`, which
  is not a status: no member can follow another, and `None = 0` is a stage no order is ever in. Those
  values answer whether the order was the user's money at all — `Work` means work bought it and it
  cost them nothing — and their only consumer is a yes/no. Split them. `OrderStatus { Ordered = 1,
  Delivered = 2, Returned = 3 }` is the lifecycle, numbered in that order because [§9](#9-forms-and-fields)
  makes the sequence the sort key, with no `None` and no `Any` — `Any` is a filter sentinel, null on
  the query object, never an enum member. `SpendKind` keeps the old integers so not a row migrates.
  **Rename that column, never redefine it in place**: reusing `Status` for the lifecycle silently
  reinterprets every existing row — `Expense` reads back as `Ordered`, `Sold` as `Returned`, `Work`
  and `Other` fall outside the enum — and nothing anywhere errors. **`None = 0` is not a state a new
  order can reach**: Kind is required on both forms and both open on `Expense`
  ([§9](#9-forms-and-fields)), so nothing writes it. It marks rows that predate the requirement, and
  what the predicate does with it is a decision about history, not about new orders — which is worth
  knowing before anyone treats a wall of zeroes as deliberate classification.
- **Whether an order counts as spend is derived, and one expression owns it.** Two inputs, not one: a
  returned order is refunded, so it stops counting the moment its status changes, and a stored flag
  would have to be rewritten by every path that touches status — the first one that forgets leaves a
  refund in the month's spend. The same expression gates **both** families of total: the spend
  figures and saved-vs-retail. A work-bought order carries real paid and retail prices, so leaving it
  in the saved total claims a discount that was never the user's. Write it as an
  `Expression<Func<Order, bool>>`, not a `[NotMapped]` property — EF cannot translate a property into
  SQL, and every headline on the overview sums through it. **Port the existing predicate verbatim
  before changing what it means**, in its own commit: `Gift` and `Sold` are recorded but their spend
  treatment was never written down, and if the enum and the rule move together a shifted total has
  two possible causes.
- **Follow CLAUDE.md's uniformity discipline** — before adding any variant, grep for the pattern and
  match the tally, not a single neighbour.
