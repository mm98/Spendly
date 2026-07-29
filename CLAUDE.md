# Working in this repo

Spendly is one prototype and its documentation. `spendly.html` is the entire prototype — every route,
markup, CSS, JS and three Poppins weights as woff2 data URIs, with no build, no dependencies and no
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

### The environment, settled -- do not re-derive it

Re-checking these each session is the waste this heading exists to stop. They are facts about the
box, not about any change.

- **All three engines are installed, every session. Just launch them.** Blink **141.0.7390.37**,
  Gecko **142.0.1** and WebKit **26.0**, under the globally installed Playwright 1.56.1
  (`/opt/node22/lib/node_modules/playwright`). The environment's setup script installs them with
  their system libraries before the session starts and the environment cache keeps them, so their
  presence is a given, not a thing to confirm. `PLAYWRIGHT_BROWSERS_PATH` is already set to
  `/opt/pw-browsers`, so `chromium`, `firefox` and `webkit` resolve with no configuration. Do not
  `ls` the directory first, do not probe a launcher in a try/catch before the real run, and never
  run `playwright install` -- each of those spends a step per session re-confirming something
  settled.
- **That build is a valid pixel baseline.** 141.0.7390.37 under the 1.56.1 bundle is the pair the
  screenshot section names as rendering `docs/` at 0 of 5,184,000, so this container is the good
  case rather than the text-rasterisation case -- still run the unchanged file against `docs/` once
  to confirm it before trusting a diff. Confirmed on 2026-07-29: 0 of 5,184,000 on `home.png` and
  `all-orders.png`, 0 of 1,035,840 on `phone.png`.
- **If a browser download 403s, it is egress policy and not the CDN.** `playwright install` fails
  with a bare `Download failure, code=1`, which names no host and no cause; guessing one from it is
  guessing. `curl -sS "$HTTPS_PROXY/__agentproxy/status"` lists `recentRelayFailures` with the host
  and the reason, and `/root/.ccr/README.md` says a 403 is reported, never retried or routed around.
  `cdn.playwright.dev` and `playwright.download.prss.microsoft.com` were denied that way until the
  environment's network policy was widened to allow them; the host being up, or loading from a
  laptop, was never the question, because the 403 is raised by this container's gateway before
  anything reaches the CDN and the allowlist is per environment. Report a denial rather than hunting
  a route around it.
- **The phone shot is `devices['iPhone 13']` with `deviceScaleFactor` overridden to 2** -- 390x664 at
  dSF2, so the committed file is 780x1328. A bare 390x844 viewport at dSF3 renders 1170x2532 and the
  comparison dies on a size mismatch, which reads as a layout change and is not one.
- **No PNG library is installed.** Do not import one from inside the Playwright bundle; the path
  moves between versions and the import fails. Read the committed shot as base64 in node, hand both
  images to a `<canvas>` in the page and diff `getImageData` there -- the browser is already open
  and it decodes PNG for free.
- **Contrast needs no DOM.** The sRGB relative-luminance formula is arithmetic -- run it in plain
  node. Settled: `--green` #14AC72 is **2.93:1** on white, `#838C84` is **3.47:1**.
- **Match counts:** `grep -o 'pattern' file | wc -l`, never `grep -c`.

### When a page can be rendered

**When a fetch fails, ask the proxy rather than reading the failure.** `Download failure, code=1`
names no host and no cause; guessing one from it happened to be right once and was still a guess.
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` records what was actually refused and why.

The README's standard is the floor: render the prototype, screenshot it at desktop and 390px, and say
what was measured rather than that it looks right. Three axes it does not name have each shipped a
bug, so they are part of the standard now.

**One engine is not coverage.** Blink is the easiest thing to render and the least representative.
Date fields carried two calendar icons in Firefox for as long as they existed — Gecko draws a picker
button no selector can reach, so ours landed on top of it — and every screenshot taken in Chromium
showed a single correct glyph. Anything touching a native form control, a shadow-DOM pseudo-element,
a `-webkit-`/`-moz-` prefix or the platform's own chrome is engine-shaped by default: check Gecko and
WebKit before calling it fixed.

**A vendor prefix names the engine that invented the feature, not one that obeys you.** That rule was
written and then not run for two years, and the thing it would have caught was hiding inside its own
evidence: `::-webkit-search-cancel-button` carries the prefix, so the rule sitting on it read as the
WebKit fix and got counted as coverage nobody had. `-webkit-appearance:none` removes that button in
Blink and Safari goes on drawing it; `display:none` removes it in both. All four search fields shipped
a native circled `×`. Reading a `-webkit-` selector as "handled in WebKit" is the inference to
distrust — the prefix says who shipped the pseudo-element first, and nothing whatever about which
engines honour the property you set on it. Launch the engine.

**A shot cannot document a state it does not hold.** That defect needed a search field with a value
in it, and all three committed shots have empty ones with the finder closed, so `docs/` renders it
identically before and after the fix — 0 of 11,403,840 pixels, on a machine that reproduces those
files exactly. The pixel diff was not weak evidence here, it was evidence about a different question,
and a clean one would have been read as "nothing changed" by anyone who did not first ask whether the
shot contains the control in the state that breaks. Before trusting a shot to clear a control, put the
control in the state under test and check the shot actually holds it.

**Payload has no selector, so no instrument here points at it.** A `@font-face` nothing uses renders
nothing, so the pixel diff is silent; it is not an element, so the walk never records it; it is not a
rule, so a match count never counts it. The unused Poppins 400 face survived every one of them and was
found only by asking the font system which faces it had actually pulled — `[...document.fonts]` had it
`unloaded` in Blink and Gecko, which is the engine saying outright that nothing requested it. Ask that
question of any embedded asset: the file's whole cost is bytes, and the instruments here all measure
rendering. Not `document.fonts.check()`, though — with the face removed it answers `true` for weight
400, because it tests whether text can be rendered, not whether the face you named exists. A probe
that cannot fail is not evidence.

**Then prove the removal in pixels, not in the walk.** Deleting a face cannot move a rect and cannot
change a computed `font-weight` — the cascade still says 400 and only the face behind it changes — so
the element walk returns 0 differences whether the face was dead or load-bearing, and that 0 means
nothing. Full-page shots of every state are the instrument that can fail: 28 states, 0 differing
pixels of 129,081,480 in Blink, 128,930,760 in Gecko and 128,411,280 in WebKit. Match the instrument
to what the change can actually move, or the clean result is just the wrong question answered twice.

**One state is not coverage.** A screenshot captures one state of one control. The segmented control
changed width when the selection moved, because the active segment was bolder and the track is
`width:max-content` — visible in any engine, invisible in any single screenshot. Exercise every state
a control has (selected/resting, empty/filled, open/closed, wrapped/unwrapped) and compare geometry
across them.

**A declaration that is redundant in one viewport is not a redundant declaration.** Dropping each
remaining inline declaration, reading the computed value back and restoring it found 8 that changed
nothing — a clean, mechanical proof, run at 1440 only. Three of the 8 were phone overrides: the
`@media (max-width:700px)` rule `.row-inline { flex-wrap:wrap }` is exactly what they were holding
off, and they read as dead at desktop because that is where they agree with the cascade. The full
walk caught all three at 390px, 42 fields across 14 states. Any probe that decides a value is
unnecessary has to run at every width the stylesheet has an opinion about, or it is only testing
where nothing disagrees.

**A correct render is not a correct control.** The status segmented control read Delivered / Ordered
/ Returned in all three places it appears, for as long as it existed — pixel-perfect in every engine,
identical in every state, and saying that an order is delivered before it is placed. FILTERS, one
card above it, was drawn complete and toggled nothing. Geometry has no opinion about the order of
labels and a screenshot has none about whether a button is wired, so neither defect could fail a
measurement nobody thought to write. Where a control enumerates something that happens in sequence,
read it left to right and check the sequence is true; where it names an action, fire it and assert
the state it promises actually moved.

**Firing a control is not enough if only one of its states was ever drawn.** The rule above says to
fire a control and assert the state it promises moved, and that is still where the "More details?"
switch was caught -- but the assertion it passes matters. The switch had no handler *and* no
`[aria-checked="false"]` rule, so a probe that flips the attribute and reads the attribute back would
have gone green on a control that renders identically in both states: green track, knob hard right,
44x26 either way. Read the computed style and the geometry the state is supposed to move -- track
colour `rgb(20,172,114)` to `rgb(131,140,132)`, knob `right:3px` to `left:3px`, the section 271.7px
to 56px. An ARIA attribute is a claim about the pixels, and only the pixels can settle it.

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

**An audit tool reports on the DOM it loaded and the rules it happened to run.** Lighthouse scored
the accessibility of this file by opening it: one page of thirteen, at one width. It found 17
insufficient-contrast elements. The same rule driven over 14 states at two breakpoints found 170,
and 108 elements outside any landmark that its one-page view had no way to count. Then the reverse
error, in the other direction: a walk filtered to the WCAG and best-practice tags came back with
zero violations while Lighthouse was still failing `label-content-name-mismatch`, because that rule
ships **experimental** and axe leaves experimental rules off unless asked. Enabling every rule
(`for (const r of axe.getRules()) rules[r.ruleId] = { enabled: true }`) turned that one finding into
30 across 15 states, and surfaced two more defects on top. Run the checker over every state the app
has, with every rule it owns, and read its defaults before believing a clean sheet.

**Key elements by document order, not by ancestry.** Wrapping the page in one `<main>` renumbered
every path below it, and a diff keyed on `tag[index]/tag[index]/…` reported 49,612 elements added
and 49,584 removed for a change that moved nothing. Both runs hold the same elements in the same
order; number them in `querySelectorAll('*')` order, skip the element you inserted, and assert the
tag matches at each position — the same walk then read 238 rect diffs, all in one place.

Document order is not immune to the same trap, only cheaper to fix: seven `<span>`s wrapped around
seven bare labels renumbered the tail of every state they appear in, and the walk came back with
45,223 tag mismatches, 245 added and 6,285 text diffs on a change that touched five CSS rules. The
tag assertion is what says so — an index diff with no tag check would have reported those 45,223 as
geometry. Filter the inserted selector out of the record on both runs (`SKIP='.new-part'`) and the
numbering realigns; the same walk then read 0 added, 0 removed, 0 tag mismatches and 0 text diffs.
Skipping is safe only because the elements are new on one side; never skip an element that exists in
both runs, or the diff stops covering it.

**Freeze before you wait, not after.** The settle loop and the freeze are both required and the order
between them is not free: a wait-for-stable-geometry loop started before the freeze samples the
indeterminate progress bar forever and never returns. It does not fail — it hangs, with a browser
open and nothing on stdout, which reads as "the walk is slow" for as long as you let it. Freeze,
then settle, then freeze again for anything the settle woke.

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

**Toggling that class is still not navigating.** `show()` also builds the sub-tab bar, sets the page
title, moves the sidebar highlight and retargets the back button, and it is a closure — not on
`window`. A harness that only toggles `.is-on` therefore renders eleven of twelve pages carrying
home's title and home's tabs, and measures that without complaint. The gap is not cosmetic:
`docs/all-orders.png` is the orders page with its *All orders* sub-tab selected, which no toggle can
reach, so diffing a toggled render against it reported 696,674 differing pixels of 5,184,000 that had
nothing to do with the change under test. Navigate by clicking what a user clicks — sidebar link,
`[data-go]`, sub-tab — and print the title and the tab labels on arrival, not just the page name.

**Iterate against the full walk, never a cheap proxy for it.** Converting 196 elements, a computed-style
comparison of one page said 13 things were wrong; they were fixed, and the page agreed. The full walk
then found 566 moved rectangles on `scan3` — a page the single-page check never loaded. A proxy that
only samples where you are looking will tell you that you are finished, and the fix that follows a
false all-clear is the one that ships. The walk costs four minutes; a wrong answer costs the change.

**Say which of these you actually ran.** An engine that could not be launched is an engine that was
not checked, and the honest report is "verified in Blink, Gecko unverified — no binary available",
not silence. Never let a reader infer coverage that does not exist.

"No binary available" is a fact with a short shelf life, though, and it was wrong here: Gecko and
WebKit both install and run in this container. `npx playwright install firefox webkit` fetches them,
WebKit additionally needs `npx playwright install-deps webkit` — without it, it fails at launch on
about thirty missing shared libraries and no amount of re-running the harness will say why. Firefox
takes no `isMobile` or `userAgent` in a context descriptor, so a coarse-pointer run has to omit both
rather than pass the device profile whole. All three then drive identically: 51,292 element records
per engine across 28 states, byte-identical between engines, 0 differences run-to-run. Check before
reporting an engine as unavailable — that sentence is only honest on the day it is true.

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

**`docs/` is not a baseline unless your machine reproduces it.** The tab conversion was accepted on 0
differing pixels against these shots; the same comparison run in a container came back 83,630 of
5,184,000 on a file that had not been touched — every one a glyph edge, boxes and icons identical,
because a different Chromium build rasterises text and resolves advances differently. That floor
swallows the change under test: a 4,829-pixel edit to `all-orders.png` arrives inside a 89,367-pixel
disagreement. Diff your own before and after renders, which are deterministic to the pixel on one
machine, and check `docs/` only for the states and the sizes. When a change does move a shot, say
where it was regenerated — a shot re-rendered elsewhere carries that machine's text with it, so the
committed image changes far more than the edit did.

**So measure the floor rather than assuming it.** The container that renders these shots is not
always the wrong container: Chromium 141.0.7390.37 under the Playwright 1.56.1 bundle rendered the
untouched file at 0 of 5,184,000 against all three committed shots, and a regeneration from there
carries only the edit. One run of the unchanged file against `docs/` is what tells you which case you
are in, and it costs a minute — claiming a shot is clean, and claiming it is unusable, are the same
unverified claim in opposite directions.

## Uniformity

Before adding a variant, grep for the pattern and match the tally, not the one neighbour in view. The
`README` states this as a principle; in practice it means counting first —

```bash
grep -c 'the-pattern' spendly.html    # then match the majority, or change all of them
```

Four date fields existed and only three carried the glyph, which is exactly how the fourth kept a bare
native icon nobody had looked at in a while.

**`grep -c` counts lines, not matches.** The file's inline styles were reported as 291 and were 421 —
markup lines here carry several elements each, so a third of the job was invisible to the count that
opened it. `grep -o 'pattern' file | wc -l` is the number of occurrences; `grep -c` is the number of
lines holding at least one. Any tally that decides scope needs the first.

**A shared value has to be deleted from every copy, not set in one more place.** Unifying five row
families meant the grouped rule and then removing `display`, `align-items`, `gap` and `padding` from
each family's own block — a rule added beside four survivors is a fifth near-miss with better
intentions, and the cascade hides it wherever the two happen to agree. Read the count back
(`document.querySelectorAll(sel).length` against the union of the families) and check the survivors
declare only their differences.

**A comment that names a value it does not own goes stale silently.** The `.field-pair-stack-early`
note called it "the 300px sidebar" for the 701 to 900 band; the sidebar is 236px across all of it,
and the 300px rule sat in the very next block down, under `min-width:2200px`, where it had always
been. Nothing renders a comment, so no walk, shot or pixel diff has an opinion about one, and
`grep -n '300px'` returns it beside two live rail min-widths — the wrong line arrives looking like
the right ones. Its own arithmetic is what dated it: the 165px in the next clause measures 164.5
against a 236px sidebar and 132.5 against a 300px one, so it was written for the value the comment
does not state. When you move a value, grep the number in prose as well as in CSS, and re-derive
the figures a comment computes from it.

**Removing a declaration hands the property back to whatever was underneath.** `.chart-legend-row`
lost its `font-size:12.5px` and the row went to the inherited 14px, which reached the swatch, the
chevron, the icon and its path — 245 elements' worth of computed-style diff, all of it inert, since
every one of those is sized in px. Inert is not the same as intended: the same removal is what left
the label at 14px until it was given a part of its own. Diff the computed styles either side and
account for every property that moved, including the ones that changed nothing.

**A new selector is a claim about how many elements it matches.** Moving 409 declarations into the
stylesheet meant writing about thirty rules, and three reached further than intended — `.inset-panel
.item-row .amount` was meant for four vendor figures and painted twelve, because the line-item lists
sit in an inset panel too. Geometry was identical in all twelve; only the computed colour moved, so
nothing but the walk's style fields could have caught it. Read the match count back
(`document.querySelectorAll(sel).length`) and require the number you meant, before and after. A rule
that renders plausibly is not a rule that matched what you aimed at.

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
