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
what was measured rather than that it looks right. Two axes it does not name have each shipped a bug,
so they are part of the standard now.

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

## Reporting

- Never claim what was not run. "Tests pass" means they were executed; "fixed in Firefox" means
  Firefox rendered it.
- Lead with what was measured, then what changed. Numbers before adjectives.
- Flag the part you could not close, in the same breath as the part you did.
