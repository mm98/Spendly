# Working in this repo

Spendly is one prototype and its documentation. `spendly.html` is the entire prototype — every route,
markup, CSS, JS and four Poppins weights as woff2 data URIs, with no build, no dependencies and no
network. `README.md` is the design system it proves, and `docs/` holds the screenshots that document
shows. Opening the HTML in a browser is the whole toolchain.

## Division of labour

- **`README.md` holds rules about the product** — what the UI must do, numbered by section, written to
  survive the port to Blazor. If a developer who never opens this file would need it, it is a README
  rule.
- **This file holds rules about the work** — how to verify, what counts as done, what may be claimed.
  Nothing here describes the UI.
- **A fix usually teaches both.** The rule goes to the README, with the bug that bought it, per that
  document's ground rule. How the bug got past us comes here. Do not copy the design system into this
  file; do not copy working procedure into that one.

## Verification

The README's standard is the floor: render the prototype, screenshot it at desktop and 390px, and say
what was measured rather than that it looks right. Three axes it does not name have each shipped a
bug, so they are part of the standard now.

**One engine is not coverage.** Blink is the easiest thing to render and the least representative.
Date fields carried two calendar icons in Firefox for as long as they existed — Gecko draws a picker
button no selector can reach, so ours landed on top of it — and every screenshot taken in Chromium
showed a single correct glyph. Anything touching a native form control, a shadow-DOM pseudo-element,
a `-webkit-`/`-moz-` prefix or the platform's own chrome is engine-shaped by default: check Gecko and
WebKit before calling it fixed.

**One state is not coverage.** A screenshot captures one state of one control. The segmented control
changed width when the selection moved, because the active segment was bolder and the track is
`width:max-content` — visible in any engine, invisible in any single screenshot. Exercise every state
a control has (selected/resting, empty/filled, open/closed, wrapped/unwrapped) and compare geometry
across them.

**A correct render is not a correct control.** The status segmented control read Delivered / Ordered
/ Returned in all three places it appears, for as long as it existed — pixel-perfect in every engine,
identical in every state, and saying that an order is delivered before it is placed. FILTERS, one
card above it, was drawn complete and toggled nothing. Geometry has no opinion about the order of
labels and a screenshot has none about whether a button is wired, so neither defect could fail a
measurement nobody thought to write. Where a control enumerates something that happens in sequence,
read it left to right and check the sequence is true; where it names an action, fire it and assert
the state it promises actually moved.

**Three screens are not the file.** `docs/` holds three states of thirteen pages, so a change that
touches everything needs a wider net than a re-render. Renaming every class broke the sidebar icons
to 114px unstyled — that one happened to sit on `docs/home.png`, which was luck: the same break on
the scan or create page would have shipped, because nothing renders those. Walk every page at every
breakpoint, read back `getBoundingClientRect()` and the computed styles, and diff the two runs.
75,582 element records across 39 states cost a minute and caught two defects no screenshot was
pointed at — the other was five rules left scoped to an identifier the markup no longer carried,
which reported itself as 661 moved rectangles on a page no shot covers. Freeze animations first
(`getAnimations().forEach(a => { a.pause(); a.currentTime = 0 })`), or the indeterminate progress bar
reports itself as a difference on every run and buries the real ones.

Rects do not cover everything: a bare text label is not an element, so a button whose label shifts
inside an unmoved box shows nothing. Keep at least one instance of anything you fold on a shot.

**Prove the harness is quiet before you trust its diff.** Freezing animations is not the whole of it:
charts are drawn from JS and redrawn by a `ResizeObserver` when a hidden page is shown, and that
callback lands after the click returns. Measuring straight after navigating raced it — two runs of a
byte-identical file disagreed on 38 geometry fields across 11 chart elements, and 26 of those went on
to appear in a real before/after diff as if the change had caused them. Run the baseline against the
unchanged file twice and require zero differences first; a diff with a floor of noise cannot tell you
that the floor is all it found. Waiting for drawn geometry to stop changing across three frames took
it to 0 of 92,916.

**Drive the app the way the app drives itself.** The router shows a page by toggling `.is-on`, and
`.page:not(.is-on)` is `display:none !important`, so a harness that hid pages with the `hidden`
attribute instead rendered nothing and cheerfully recorded 75,348 measurements of it. Read how the
state is actually set before scripting it, then assert you arrived — one line printing which page is
on catches an entire run that measured the wrong thing, or nothing at all.

**Say which of these you actually ran.** An engine that could not be launched is an engine that was
not checked, and the honest report is "verified in Blink, Gecko unverified — no binary available",
not silence. Never let a reader infer coverage that does not exist.

## Measuring

Measure in the DOM. Eyes do not catch 2px, and 2px is the size of a real defect here — the toggle
moved 300px to 298px and dragged the search field with it.

Drive a headless browser, read geometry back, and assert on numbers:

```js
const widths = buttons.map(b => {
  buttons.forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  return el.getBoundingClientRect().width;   // one value for every state, or it is a bug
});
```

The same shape covers overhang and clipping (`el.right - parent.right`), the phone layout
(`documentElement.scrollWidth` against `clientWidth`), and wiring (spy on the API a handler is meant
to call, dispatch the event, assert it fired). Screenshots are for the reader; the number is the
evidence.

## Screenshots in the README

The shots in `docs/` are rendered from the prototype and never cropped by hand or touched up:
Chromium at 1440x900 for the two desktop ones, an iPhone 13 descriptor for the phone one, all at
`deviceScaleFactor: 2` and driven by the same harness used for measuring.

The phone shot needs that descriptor rather than a 390px window. `pointer: coarse` is what the iOS
rules key off, and a plain narrow viewport does not match it — the shot would show a layout no phone
renders. Regenerate whatever a change moves: a stale screenshot is a wrong claim about the product,
and it is the one claim a reader believes without checking.

## Uniformity

Before adding a variant, grep for the pattern and match the tally, not the one neighbour in view. The
`README` states this as a principle; in practice it means counting first —

```bash
grep -c 'the-pattern' spendly.html    # then match the majority, or change all of them
```

Four date fields existed and only three carried the glyph, which is exactly how the fourth kept a bare
native icon nobody had looked at in a while.

## Changing spendly.html

- **The single file is a constraint, not an accident.** No dependency, no build step, no network
  request, no external asset. A fix that needs any of those is the wrong fix.
- **A comment is a tripwire, not documentation.** The README holds the argument; the comment exists
  because nobody greps a spec before deleting what looks like a magic number, and this file is full of
  values that look like mistakes — `calc(100% + 56px)`, `min-height:38px`, the iOS rule that computes
  16px and scales it back. State the constraint, what breaks without it, and the section that explains
  it. Three or four lines. Re-arguing the case inline gives one rule two homes and they drift; a
  restatement of the CSS is noise either way.
- **Match the surrounding idiom** — naming, comment voice, `--` for dashes inside CSS comments, the
  house habit of stating the defect before the rule.
- **Tabs indent, spaces align.** One tab per level of nesting, in markup, CSS and script alike. The
  only spaces at the start of a line are the ones holding a comment's continuation under the text it
  hangs from — `<!-- ` is five columns and `/* ` is three, and a tab there would only line up at one
  tab width. Never mix the two in the same run: tabs first, then any alignment.
- **Reformatting must prove it changed nothing.** Re-render and diff the pixels against `docs/` — the
  tab conversion was accepted on 0 differing pixels of 5,184,000, not on inspection. Expanding the
  leading tabs back should reproduce the previous file byte for byte; if it does not, the diff is
  hiding an edit.

## Reporting

- Never claim what was not run. "Tests pass" means they were executed; "fixed in Firefox" means
  Firefox rendered it.
- Lead with what was measured, then what changed. Numbers before adjectives.
- Flag the part you could not close, in the same breath as the part you did.
