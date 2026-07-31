# Working in this repo

Spendly is an application and its documentation. **`react/` is the source.** The app is what runs,
what a change is made in and what a claim is measured against: `npm install && npm run dev` in that
directory, and the pages are real ones with the controls wired.

`spendly.html` is the prototype the design system was drawn in, and it is a copy now. Its `<style>`
block is written from `react/src/styles/spendly.css` by `npm run css:sync`, and `npm run css:check`
fails when the two have drifted — so a rule typed into the HTML is a rule the next sync deletes. Edit
the app; sync afterwards. The prototype is still worth rendering for what it is good at — one file,
no build, every page in the DOM at once — but it draws some controls where the app builds them, and
where the two disagree the app is right by definition.

`README.md` is the design system the app implements; `docs/` holds the screenshots that document shows
and the defect log its rules link to.

## Division of labour

Four documents, one job each. Putting a paragraph in the wrong one is how the same rule ends up
stated twice and obeyed once.

- **`README.md` is the design system** — what the UI must do, in general terms, numbered by section.
  Rules, not case histories: a reader who needs to know what a control must do should not have to
  read a defect report to find it. It names **no implementation** — not a framework, a router or a
  bundler. Those are decisions downstream of it and they change; the design system outlives them.
- **`docs/defects.md` is the evidence** — the defect a rule cost, the numbers that settled it, the
  instrument and the engine. A README rule that looks arbitrary without its history links here. This
  is not a changelog: entries are keyed to the section they defend, never to a date.
- **The app's own README is the app's own business** — its framework, its build, its chunking, its
  measurements. `react/README.md` today; something else tomorrow, since the design system outlives
  whatever renders it. Nothing in it is a rule about the product.
- **This file holds rules about the work** — how to verify, what counts as done, what may be claimed.
  Nothing here describes the UI.
- **A fix usually teaches three of them.** The rule goes to the README in general terms, the bug and
  its numbers to `docs/defects.md`, and how the bug got past us comes here. Do not copy the design
  system into this file; do not copy working procedure into that one; do not narrate a fix in either.

## Verification

### Verification is one pass at the end, not a gate on every edit

> [!IMPORTANT]
> Nothing below runs while the work is in progress. The harness runs, the pixel diffs, the element
> walks and the `docs/` baseline check are **one pass, run when the change is finished and a pull
> request is about to be opened** -- or whenever the user asks for them sooner.

This section used to read as a standing bar with no place in the session named, so it got paid for
continuously: validating one form spent about as long on measurement as on the edit, interleaved
with it, on a change nobody had yet asked to have proved. The measurements below are good
measurements -- that is why they are still written down -- but they answer *is this change sound*,
which is a question the finished change can answer once. Asking it after every edit buys the same
answer several times.

So the shape of a session is: build the change, then verify it, then open the pull request. The PR
is the trigger, and since a PR is only ever opened on an explicit request, so is the run. Between
those two points, say plainly what has and has not been checked -- "not rendered yet" is a complete
report mid-work, and it is the honest one.

Two things need no trigger, because neither costs a browser: **never claim what was not run**
([Reporting](#reporting)), and read the file you are changing before changing it.

Everything from here down is how to run that pass well.

### The environment, settled -- do not re-derive it

Re-checking these each session is the waste this heading exists to stop. They are facts about the
box, not about any change.

- **Chromium is the default engine and the only one installed. Do not reach for the other two
  unless asked.** `/opt/pw-browsers` holds `chromium`, `chromium_headless_shell` and `ffmpeg`, and
  nothing else, under the globally installed Playwright 1.56.1
  (`/opt/node22/lib/node_modules/playwright`). `PLAYWRIGHT_BROWSERS_PATH` is already set to
  `/opt/pw-browsers`, so `chromium` resolves with no configuration; `firefox` and `webkit` do not
  resolve and launching either fails. Verify in Blink by default. Gecko and WebKit are an explicit
  request, not a standing part of the standard -- when one is asked for, install it first
  (`npx playwright install firefox`, or `webkit` plus `npx playwright install-deps webkit`).
  Everything below about engine-shaped defects still holds; it is the reason to ask for the other
  two when a change touches a native control. The honest report on a default run is "verified in
  Blink, Gecko and WebKit unverified", never silence.
- **There is no session setup script, and nothing needs one.** Chromium is baked into the base image,
  so it is present at boot with no install to wait for. The `.claude/setup.sh` that used to fetch and
  launch-check all three engines is gone with the cross-engine default -- it spent about a minute of
  every cold session downloading Gecko and WebKit for a run that no longer happens by default, and it
  aborted the session with exit 1 when either failed. `/opt/pw-browsers/SETUP_STATUS.txt` was its
  output and no longer exists; do not look for it, and do not read its absence as a failed install.
- **When an on-request install is needed, `--with-deps` is one command that fails as two.** It
  installs system dependencies *first* and aborts the whole run if apt is unhappy, so two unrelated
  third-party PPAs in the base image (deadsnakes, ondrej/php) 403ing through the proxy once cost the
  session every browser -- none of which had been downloaded yet. apt exits 100 for any unreachable
  repo, however irrelevant. Split it: `install` the engine, then `install-deps`, so an apt problem
  still leaves it on disk and a launch, not apt's exit code, decides whether it is usable.
- **That build is a valid pixel baseline.** 141.0.7390.37 under the 1.56.1 bundle is the pair the
  screenshot section names as rendering `docs/` at 0 of 5,184,000, so this container is the good
  case rather than the text-rasterisation case -- still run the unchanged file against `docs/` once
  to confirm it before trusting a diff. Confirmed on 2026-07-29: 0 of 5,184,000 on `home.png` and
  `all-orders.png`, 0 of 1,035,840 on `phone.png`. **`all-orders.png` holds three pieces of state at
  once**, and each one has to be driven: the FILTERS panel is open, which is no longer the state the
  page loads in; the list is filtered to July 2026, Delivered and Vendor: Bilka, 3 of 142 matching;
  and the global finder has `bil` typed into it. Render it closed and the confirmation run comes back
  484,879 of 5,184,000 on a file nobody has touched, which reads exactly like the rasterisation case
  it is not -- and a run that opens the panel but leaves the list and the finder alone comes back
  611,948, which reads the same way and is the same mistake two thirds fixed. A floor measured in the wrong state is not a floor; drive each shot into the state
  it holds (`docs/defects.md` says which) before believing the number, in either direction.
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

When that pass runs, the README's standard is its floor: render the app, screenshot it at desktop and
390px, and say what was measured rather than that it looks right. Three axes it does not name have
each shipped a bug, so a requested run covers them too.

**Render the app, not the copy.** `npm run dev` in `react/` and drive `http://localhost:5173/`; the
routes are real routes, so a harness navigates by clicking what a user clicks and reads the title back
on arrival. The prototype renders the same stylesheet over drawn stand-ins -- useful for a CSS
question, wrong for anything a control actually does. Where the two disagree, the app is the product.

**One engine is not coverage.** Blink is the easiest thing to render and the least representative.
Date fields carried two calendar icons in Firefox for as long as they existed — Gecko draws a picker
button no selector can reach, so ours landed on top of it — and every screenshot taken in Chromium
showed a single correct glyph. Anything touching a native form control, a shadow-DOM pseudo-element,
a `-webkit-`/`-moz-` prefix or the platform's own chrome is engine-shaped by default. Chromium is
still the default and only installed engine; a change of that shape is not something to check in
Gecko and WebKit unasked, it is something to *say* is unverified there and offer to check, so the
call to spend a cross-engine run stays the user's.

**A vendor prefix names the engine that invented the feature, not one that obeys you.** That rule was
written and then not run for two years, and the thing it would have caught was hiding inside its own
evidence: `::-webkit-search-cancel-button` carries the prefix, so the rule sitting on it read as the
WebKit fix and got counted as coverage nobody had. `-webkit-appearance:none` removes that button in
Blink and Safari goes on drawing it; `display:none` removes it in both. All four search fields shipped
a native circled `×`. Reading a `-webkit-` selector as "handled in WebKit" is the inference to
distrust — the prefix says who shipped the pseudo-element first, and nothing whatever about which
engines honour the property you set on it. Only launching the engine settles it -- so where that
reading is the whole of the evidence, say so and ask for the run rather than counting the prefix.

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

**Copy that enumerates inputs is a list of states to render.** The scan hero says the app takes "a
PDF, photo or screenshot" and four entry buttons name the formats one by one -- and all four landed
on a review screen reading `kvittering-bilka.jpg`, 2,1 MB, drawn with a receipt glyph. Nothing could
catch it: one document was the only document, so every screenshot, every walk and all three engines
agreed with each other about the wrong thing. Where the product's own words enumerate what it
accepts, drive each one through and read back what the screen then says about it -- the same move as
firing a control and asserting the state it promises, one level up, on the content.

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

**Quiet is not the same as resting: a probe leaves the page where it left it.** A tab-order walk on
Home presses Tab 37 times, and every press scrolls; the screenshot taken after it came back
**1,158,555 differing of 5,184,000** against `docs/home.png` on a file whose change could not move
more than a 264x53 box. Two runs of it agreed at **0** with each other, which is the trap -- the
harness was perfectly quiet and perfectly wrong, because both runs were scrolled by the same amount.
The same thing one page over, quieter: a probe that focuses an element leaves the document's one
`:focus-visible` ring behind it, and that was **7,256 pixels of 1,035,840** on a phone shot of a
change that does not render on phones. Put the pointer, the focus and every scroll offset back where
a fresh load has them before rendering anything, and read run-to-run agreement as evidence about the
harness only -- never about which state it is holding.

**A hover probe has to aim at a point the thing it reveals does not cover.** `page.hover(selector)`
aims at the element's centre, and a tooltip over the middle of a chart is exactly what then sits
there -- so the call fails its actionability check with *intercepts pointer events*, which reads as a
broken selector and is the tooltip working. Aim at a point on the target the revealed element leaves
alone, then walk onto the revealed element deliberately: it stays up under the pointer, or it is a
bubble that vanishes when you reach for it.

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

**A defect that reproduces nowhere may be a defect in a different build.** "Doesn't work on mobile"
cost two rounds of hypotheses -- keypad locale, lost taps, label nesting, hit-testing under the iOS
stylesheet -- and every instrument said the code was fine, because it was. The reporter's phone was
serving a cached copy of the file from before the change: the two symptoms, a button that did nothing
and empty fields that passed, are exactly what the *previous* build does, and neither is a plausible
pair of new bugs. Before hunting an unreproducible report, establish which build is in front of the
reporter -- one question about a string only the new file contains settles it, and it is cheaper than
any of the four theories it replaces.

**A narrow viewport is not a phone, in a harness any more than in a screenshot.** The cross-engine run
that cleared this change used a plain 390px window, so `pointer: coarse` never matched and the whole
`@media (pointer: coarse)` block -- the 16px-and-scale-back rule on every field -- was inert. It
reported three engines agreeing about a layout no phone renders. The screenshot section already says
the shot needs `devices['iPhone 13']`; the same is true of anything driving the page, and `tap()`
rather than `click()`, or the hit-testing under those transforms is never exercised at all.

**No engine here has a safe area, so a rule written on `env()` has a branch that never renders.**
`env(safe-area-inset-bottom)` computes to 0 in Blink on this box, device descriptor or not -- the
insets belong to the phone, and nothing in a container reports one. The bottom bar adds the home
indicator to its own padding while the sheet below it cleared a constant 76px, so on any phone that
has an indicator the sheet finished 12px *under* the bar -- and every instrument here agreed the two
fitted, because every one of them measured at inset 0. Name each inset in a custom property
(`--safe-bottom`) instead of writing `env()` at the site that uses it: a variable can be overridden
from the harness, and forcing it to 34px is what renders the branch the phone renders. A value only
the device supplies is a value the harness has to be able to supply too.

**An inert stand-in has the geometry of a stand-in.** The prototype draws the sort control as a chip
with a chevron and no handler; where the same design system runs a real one, it is a combobox. The chip
is 157px and the combobox asks for 366px on a phone, so the phone toolbar the prototype renders is two
rows and the one the stylesheet actually produces is three, with 38px of control hanging off the card.
Every instrument here reads the prototype, so every instrument agreed with the narrower thing. Where a
control is drawn rather than built, its width, its height and its wrapping are a placeholder's -- so a
layout rule the stand-in satisfies is a rule that has not been tested. Render whatever runs the real
control, or say the layout is verified on the stand-in only.

**A test whose failure is clipped is not a test.** The phone check is `scrollWidth` against
`clientWidth`, and it read 0 the whole time that control hung off its card, because `.main-panel` sets
`overflow:hidden` and a clipped overhang never widens the document. The measurement was correct and the
question was wrong: it asks whether the *document* overflows, and the defect was an element overflowing
its *container*. Compare `el.getBoundingClientRect().right` against the parent's, per element -- and
when a check passes, ask what would have to be true for it to fail, because a check that cannot fail
costs the same as one that can and buys nothing.

**An inline style in a port outranks every rule the shared stylesheet can write.** The width that
overhung was `style="flex:none;min-width:190px"` on a wrapper div, and the phone rule that would have
fixed it could not: a class loses to an attribute whatever the media query says. It is the same
near-miss as a duplicated declaration, one level up -- the stylesheet and the element agree until the
day the stylesheet is fixed. When a layout value has a name in the design system, put it on the
element as that name and delete the inline copy; `grep -o 'style="[^"]*flex' | wc -l` finds the rest.

**Say which of these you actually ran.** An engine that could not be launched is an engine that was
not checked, and the honest report is "verified in Blink, Gecko unverified — no binary available",
not silence. Never let a reader infer coverage that does not exist.

A default run is a Blink run, so that sentence is the normal ending rather than an apology — Gecko
and WebKit are not installed and are not part of the standard unless asked for.

When they *are* asked for, they do install and run in this container, and the details cost a session
each to find. `npx playwright install firefox webkit` fetches them; WebKit additionally needs
`npx playwright install-deps webkit` — without it, it fails at launch on about thirty missing shared
libraries and no amount of re-running the harness will say why. Firefox takes no `isMobile` or
`userAgent` in a context descriptor, so a coarse-pointer run has to omit both rather than pass the
device profile whole. All three then drive identically: 51,292 element records per engine across 28
states, byte-identical between engines, 0 differences run-to-run.

## Measuring

When there is measuring to do, measure in the DOM. Eyes do not catch 2px, and 2px is the size of a
real defect here — the toggle moved 300px to 298px and dragged the search field with it. This is
about *how* to measure; *when* is the pass before the pull request, per the note opening
[Verification](#verification-is-one-pass-at-the-end-not-a-gate-on-every-edit).

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

The shots in `docs/` are rendered from the running app and never cropped by hand or touched up:
Chromium at 1440x900 for the two desktop ones, an iPhone 13 descriptor for the phone one, all at
`deviceScaleFactor: 2` and driven by the same harness used for measuring.

**Only one of the three has been re-rendered from the app so far, and the other two numbers are not
a floor.** The app reproduces `phone.png` exactly -- 0 differing pixels of 1,035,840 with the change
under test reverted -- which is what made it safe to regenerate that file from the app. The desktop
pair was not reproduced in that pass: 55,595 of 5,184,000 against `home.png` and 611,948 against
`all-orders.png`, both identical to the pixel with the change reverted, so none of it is the change
and none of it is text rasterisation either. `all-orders.png` holds a state the harness has to drive
it into and that one did not -- see the bullet above for what the state actually is. `home.png`
differs in the donut, the bar chart and the figures that follow today's date: a settle loop watching
bounding rects does not catch a path that redraws inside a box that never moves, and the shot was
taken on another day. Drive the state and freeze the drawing before treating either as a baseline.

**That 55,595 is the app, and the prototype is what those two desktop shots were rendered from.** The
two numbers this file carries for `home.png` -- 0 in the environment bullet, 55,595 here -- are both
right and are about different files: rendering the *prototype* at 1440x900 dSF2 reproduces the
committed `home.png` at **0 of 5,184,000**, and rendering the app reproduces it at 55,595. So the
55,595 is not drift, a stale day or a rasteriser; it is the app and the prototype drawing the same
page slightly differently, in the donut, the bar chart and the figures that follow the date. Until the
desktop pair is re-rendered from the app -- which is a change of its own, and a 55,595-pixel one --
regenerate those two from the prototype, so the committed file moves by the edit and nothing else, and
name which file you rendered from. `phone.png` is the app's, and stays the app's.

The phone shot needs that descriptor rather than a 390px window. `pointer: coarse` is what the iOS
rules key off, and a plain narrow viewport does not match it — the shot would show a layout no phone
renders. A stale screenshot is a wrong claim about the product, and it is the one claim a reader
believes without checking — so a change that moves one of these three is regenerated in the same
pass that verifies it, and never before: a shot regenerated mid-work is a shot that has to be
regenerated again when the next edit lands.

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
- **Reformatting keeps its pixel diff, and half of it is free.** The tab conversion was accepted on
  0 differing pixels of 5,184,000 rather than on inspection, and a whitespace-only change is exactly
  the shape where "it obviously changed nothing" is a guess. Expanding the leading tabs back should
  reproduce the previous file byte for byte -- that half needs no browser, so run it as you go. The
  pixel diff goes in the pass at the end.

## Reporting

- Never claim what was not run. "Tests pass" means they were executed; "fixed in Firefox" means
  Firefox rendered it. Mid-work that will usually mean "not rendered yet", which is a fact about
  where the change is, not an apology; the pass before the pull request is what turns it into a
  number.
- Lead with what was measured, then what changed. Numbers before adjectives.
- Flag the part you could not close, in the same breath as the part you did.
