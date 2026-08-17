# Working in this repo

Spendly is an application and its documentation. **`react/` is the source.** The app is what runs,
what a change is made in and what a claim is measured against: `npm install && npm run dev` in that
directory, and the pages are real ones with the controls wired.

`spendly.html` is the prototype the design system was first drawn in. It is no longer synced or
checked against `react/src/styles/app.css`, and no fix needs to reach it — it stays in the repo only
as a frozen, historical artifact, not a document this file has rules about. Where anything below
still mentions it, that is history: react/ is the one place the system is built.

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
> request is about to be opened** -- or whenever the user asks for them sooner. Committing and
> pushing is not that trigger; the request for a pull request is.

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

**The default is the change, the smallest check that could fail, and a one-line report.** For "hide
this element" that is one page load and three assertions, about fifteen seconds -- not a harness. The
last time this rule was ignored, a 180-line general instrument was written to answer *is it hidden at
rest*, re-ran five times on its own bugs, and turned a three-declaration change into twenty minutes.
The standard was not what was expensive; the instrument was. Size the probe to the claim, and treat
anything past about two minutes -- pixel floors, element walks, `docs/` regeneration, cross-engine
runs, a stale screenshot -- as something to propose in one sentence and wait on, never to spend first
and report afterwards.

**Two seconds is the Playwright timeout.** `page.setDefaultTimeout(2000)` and
`setDefaultNavigationTimeout(2000)` at the top of anything that drives a browser: nothing in this app
renders slower than that, so the 30-second defaults buy nothing and hide everything. A
`waitForSelector` on the element the change had just hidden sat there for the full 30, and an
intercepted hover retried for another 30 -- a minute of silence bought by two harness bugs, which
reads as "the run is slow" and is not. A wrong probe should fail in two seconds and say so. If a cold
dev server needs longer for the first navigation, warm it with one request rather than raising the
number.

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
  screenshot section names as rendering `docs/` at 0 of 5,184,000 from the app, so this container is
  the good case rather than the text-rasterisation case -- still run the unchanged app against
  `docs/` once to confirm it before trusting a diff. Two runs of the same source on the same day
  agree at 0 of 5,184,000 and 0 of 1,035,840, reproduced twice in a row, so the *engine* is not the
  variable here.
- **Two of the three shots are dated, and the date is the data.** `regen-docs.mjs` shifts every seed
  order so the newest lands *today*, and Home's hero names the current month -- so a shot rendered on
  one day and re-rendered on another differs by the whole dataset, with no change to the app at all.
  Re-rendering on 2026-08-15 a file last written on 2026-07-31 came back **849,085 of 5,184,000** on
  `home.png` and **51,738 of 1,035,840** on `phone.png`, spread over every band that carries a
  figure. That is a number to attribute before believing it: `git stash`, restart both servers,
  render, and compare. The pre-change source produced *the same two numbers to the pixel*, which is
  what said the change under test contributed 0. `all-orders.png` is unaffected -- it is a filtered
  list of a fixed window, so it comes back byte-identical -- and that contrast is the quickest tell
  that a diff is the calendar rather than the code.
- **`all-orders.png` holds three pieces of state at once**, and each one has to be driven:
  the FILTERS panel is open, which is no longer the state the page loads in; the list is filtered to
  Bilka + Delivered + 1-31 July 2026, 3 matching; and the global finder
  (`input[aria-label="Search everything"]`) has `bil` typed into it, open. Render it closed or drop
  any one of the three and the comparison reads like a rasterisation-floor mismatch and is not one --
  drive each shot into the state it holds before believing the number, in either direction.
  `react/scripts/regen-docs.mjs` drives all three shots into their states and is the canonical
  record of how. Two traps it already steps around: the server filters by `vendorId` (an exact,
  per-account generated id -- read it back from `/api/vendors`; it ignores an unknown `vendor=`
  param, so a hand-built `?vendor=bilka` URL quietly matches nothing), and the demo fill is a
  function of (params, today) -- the whole year re-rolls daily, so the fill parameters that gave
  the committed shot its 3 matches may give 0 on a later day and have to be re-picked then. The
  params behind the current shots are in the script; a count in the render is checked against the
  API before it is believed.
- **If a browser download 403s, it is egress policy and not the CDN.** `playwright install` fails
  with a bare `Download failure, code=1`, which names no host and no cause; guessing one from it is
  guessing. `curl -sS "$HTTPS_PROXY/__agentproxy/status"` lists `recentRelayFailures` with the host
  and the reason, and `/root/.ccr/README.md` says a 403 is reported, never retried or routed around.
  `cdn.playwright.dev` and `playwright.download.prss.microsoft.com` were denied that way until the
  environment's network policy was widened to allow them; the host being up, or loading from a
  laptop, was never the question, because the 403 is raised by this container's gateway before
  anything reaches the CDN and the allowlist is per environment. Report a denial rather than hunting
  a route around it.
- **The locale is the harness's to name, except inside a native control, where this build ignores
  it.** Every date and time the app draws is rendered by the reader's locale and zone now, so a
  context that names neither documents whichever machine ran it -- `regen-docs.mjs` pins
  `locale: 'en-GB'` and `timezoneId: 'Europe/Copenhagen'`, which is the render the committed shots
  already held, so pinning changed 0 pixels. The app's own dates obey it: verified rendering
  da-DK, en-US, en-GB and ja-JP, four different shapes of the same day. A native
  `<input type="date">` does not. It renders `07/01/2026` in this Chromium whatever it is told --
  context `locale`, `--lang=en-GB` and `--lang=de-DE` all produce a byte-identical field -- so
  `all-orders.png` documents US-shaped date inputs beside day-first app dates, and that mixture is
  the instrument, not the product. A real reader's native controls follow their browser's own UI
  language. Do not read those two fields as a formatting defect, and do not try to fix the shot by
  varying the locale: nothing here moves them.
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

**A fresh account is a state of every page, and no walk here had ever held it.** Every sweep in
this file drives the demo data, so absence never renders: a card whose empty branch sits left, a
SEE ALL over a list with no rows, a "no match" sentence blaming filters nobody set — none of them
can fail a run that always has records. When one was finally pointed at, the same sweep on an
empty account found the class in one pass: two empty states at 20px/840px against ten at 20/20,
seven list-opening actions with nothing behind them, one card with no empty branch at all. So any
walk that claims the app's states covers the account with none — register fresh, drive every
route, and read back what is offered: an action that opens a list is a claim that the list has
rows, and the probe is the same `querySelectorAll` the other enumerations use. The demo-filled run
stays beside it, because every one of those hides is a regression the moment it hides over data.

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

**The bundler passes an unimported name, so "build clean" says nothing about a page rendering.**
Rollup treats a bare identifier as a global and emits it unresolved: `useToast()` with no import
built without a warning twice in one session and threw `ReferenceError` on Home's first render,
which the route error boundary turned into "Something went wrong loading this page" on the front
page of a merged branch. The user found it, on first load, which is the whole failure. Two rules,
both cheap: every file a change touches gets its page *opened* before the push — the smoke is one
navigation per route asserting the error card is absent, under a minute for all thirteen — and a
name added to N files by search-and-replace is checked by parsing the import lists back
(`matchAll(/import\s*{([^}]*)}/)` against uses), not by grepping lines, because a multiline import
defeats a line-shaped grep and an ad-hoc checker that cannot parse is a probe that cannot fail. The scan
review's save checked `lines.length` beside a server that validates every line's contents, and the
count read as the coverage — so a blank line ADD LINE had seeded into the draft passed where zero
lines were refused, and the server's 400 ("Describe the item.") was caught and reported as "Try
again", which is a network blip's sentence over a validation failure. Two validators of one draft
are the two-controls rule below wearing an API: submit one invalid draft and read back which door
refuses it and in what words, because while the client's catch rewrites the server's answer, the
only place the two can be seen to disagree is the network log nobody ships.

**Two controls that are each right on their own can still disagree with each other.** Both controls
on Statistics passed the rule above for as long as they existed: the range chips changed the chart on
every click, and the period arrows moved the period on every click. They meant different periods --
the chips drew seven days and the arrows stepped a month past them -- and no probe that ends at "the
control I fired did its own job" can see that, because the defect is in the sentence the two make
together and only one of them is ever under the pointer. Where two controls describe one thing, fire
one and then read what the *other* now says about it: set the width, then read the pager's label and
its step; page the pager, then read the width. Labels count as the other control -- the hero chart's
name was fixed at "Daily spend through July" while the tabs beside it chose the series and the chips
chose the span, so it announced neither, and a screen reader heard "spend" over a line of order counts.

**Two pages that state the same fact are a probe, and only reading both of them runs it.** Statistics
listed August's four returns; Orders overview, scoped to the same month, said *No open returns found*
-- and it said it because the card was markup with no data path behind it, so it would have said it
over four hundred. Every instrument here cleared it: it renders, it renders identically run to run, it
is in every engine, its rects and computed styles are right, and its empty state is the shape the
design system defines. An empty state is *supposed* to look like that; the only thing that can
distinguish a correct one from a card that cannot fill is a second source for the fact it is empty of.
So when a page prints a figure, a count or a list that another page also prints, read it in both and
require them to agree -- this is the two-controls rule one level up, where the disagreement is between
pages rather than between controls, and neither side is ever wrong on its own terms. Where they share
one component, the check is free and the defect cannot recur.

**Ask what a card would have to be given to be empty, and check it was given it.** The gap above is
not really about pages -- it is that an empty state, a zero and a "none" are the three renderings that
look correct when the data never arrived. `returns` was `null` because it sat behind a `summary` flag
whose job was skipping expensive work nothing renders, and a null list draws the same empty branch a
genuinely empty list draws. Any probe reading a card that can legitimately be empty has to assert the
*query* was empty, not just the card: read the endpoint the page called, and compare its payload to
what was drawn. A rendered "none" is not evidence of none.

**Fix the class, not the instance you were shown.** Three rounds of this session went: a defect is
pointed at, the one card is fixed, and the next round points at its neighbour. Every one of them was
the same rule broken in several places -- the entry count in six, the money column in four, the
today-marker in five -- and each time the fix touched only what was on screen in the screenshot.
The cheap move is to stop hand-checking and enumerate: build the list from the DOM rather than from
the call sites you remember, assert one rule over all of it, and read the failures. The sweep for
the markers found the app already right in ten of eleven charts and the eleventh was the probe's
expectation, which is a minute well spent; the sweep for the money column found a regression I had
introduced two minutes earlier in the very same edit. Neither was reachable by looking harder at the
thing that was reported.

The rule covers requests, not just defects. "Remove the Z to A" was read as the one option the
previous reply had discussed, so *Vendor, Z to A* came out of All orders while *Name, Z to A* went
on rendering on two toolbars and in Settings -- and the user had to come back and point at it, which
is this rule failing in a sentence instead of a screenshot. A request phrased against a label is a
request against every element carrying it: grep the label app-wide first (`grep -rn 'Z to A'
react/src` returned all four in under a second), and either take the whole class out or say in the
reply which instances stayed and why. Narrowing a general instruction to its nearest instance is the
same mistake as fixing the one card on screen, made while reading instead of while coding.

**Check the rule, not the gap it leaves -- a fixture can hide an outcome the arithmetic gives
away.** The rounding that decides how many rows a card gives up to the graphic above it was written
as `ceil`, which charges a whole row for any overflow at all: a headline figure and caption came to
58.7px against a 56px row, 1.05 rows, billed as two, and the card stood 56px short. The check for it
measured *unused space per card* and came back 1px, 17px, 1px -- clean -- because the account under
test had six categories, fewer than the budget, so the card beside it never stretched the row and
there was no gap for the short card to fail to fill. A screenshot of an account with nine showed it
at a glance. The instrument was fine and the question was wrong: "is there a gap" is answerable only
when something else is tall enough to make one, which is a fact about the data, while "does the card
land within half a row of the height it is aiming at" is answerable on any data and fails at
-53.3px. When a check comes back clean, ask which part of the fixture is making it clean -- and if
the answer is "the fixture happens to be small", the check is measuring the fixture.

**A stand-in for N things has to be the same shape as one thing.** The "5 more categories" row a
ring folds its tail into was built as `{id, name, colour, spend}` -- exactly the four fields the
legend row that first drew it takes as props -- and the first component to receive one as a *record*
crashed on it, because a category row asks the record for its own share and got `undefined.toFixed`.
Nothing had been wrong with the fold; what was wrong was that its shape had been fitted to one
caller's questions rather than to the thing it stands for. When a value is a placeholder for a
record, give it every field a record has, and reach it through a component that renders it -- the
crash surfaced only at settings small enough to make the fold appear at all, which is three clicks
into a picker, on one card, on one page.

**The loading state is a card, so `waitForSelector('.card')` waits for nothing.** The screenshot
harness waited on `.card`, and Home's Async placeholder *is* a card -- so it proceeded while the
page still read "Loading your month...". The settle loop behind it agreed: it compares the `d` of
every `svg.chart path`, and a page that has drawn no charts has none, so `''` equalled `''` three
times in 180ms and it returned. Two checks that cannot fail compose into a harness that screenshots
a spinner and reports a byte count, which is what it did -- 79,524 bytes against a committed 344,406,
a number that reads as "the page got simpler". Every pixel comparison taken against those files was
then a spinner against a page, including the one reported as evidence that a change moved nothing.
Wait on the content the page exists to show, assert the loading text is gone, and make any settle
loop require the thing it claims to be settling; a screenshot step should refuse to write a file
while the word "Loading" is on screen. And when a rendered artefact changes size by 4x, open it --
the byte count was in front of me twice before the image was.

**A size check is not a position check.** The weekday bars were re-cut as a percentage of a track
and the probe read every bar back at `track x share` with a worst error of 0px, on a chart hanging
from the ceiling: `align-self:stretch` on an item with a definite height resolves to flex-start, so
all seven were the right size in the wrong place and the measurement had no opinion about where a
box sits. Any check on a box's dimension needs its edge too -- assert the bar's bottom against the
track's bottom, the row's left against its container's left -- and look at the render, because
"correct height, wrong baseline" is invisible to arithmetic and obvious to an eye.

**Deleting a component is a claim about how many elements used it, and the count is cheap.**
Removing two cards took their component and their CSS with them, and three of those rules were
still live: the scan page writes `class="card card-question"` by hand rather than using the
component, so the rules read as the component's and were not. Nothing in the change touched that
page, so no diff, shot or walk of the *changed* pages had an opinion — `document.querySelectorAll`
over every screen did, in one run, returning 1 where the deletion assumed 0. Before deleting a
selector, count what it matches app-wide and require the number to be zero; the same count
afterwards is what says an orphan really was one (`.card-headline-question`: 0 matches, 0 source
references, safe).

**A decoration has no state to read back, so every probe above skips it.** The tick strip under every
chart was a `repeating-linear-gradient` -- a line every 24px, from one declaration, with no element per
tick, no attribute, no handler and no data behind it. Fire it and nothing moves; walk the DOM and it is
one 9px div; diff the pixels and it is identical before and after, because it is identical. It sat 47
ticks under 5 labels for as long as it existed, and the labels beside it were spread evenly under dates
that are not evenly spaced, so the last one was 74px from the day it names. Both were *drawn* correctly
-- each on its own terms, which is the trap one rule up: they were never measured **against each
other**, and neither had anything to say about the other. So when two things are drawn to be read
together, measure the distance between them rather than each on its own -- and treat a CSS-only
graphic as unverified by default, because it is the one thing on the page that cannot fail a test until
you write the test that compares it to something real (here: the x of every tick against the
coordinates in the chart's own path `d`, which is where the data actually is).

**Fixing the label a rule names is not fixing the rule.** That chart label was made to follow both of
its controls, and the fix stopped at the string the paragraph above happens to quote. One line up, the
card's own heading went on reading "Spent this month" under all five widths, over a total, a saving and
two tab figures that were July's under all five too -- six claims about which stretch of time the card
was showing, of which the one that got fixed was the smallest, the only unrendered one, and the only
one anybody had written a probe for. It passed. So when a control changes what a card is *about*,
enumerate every place in that card that says what it is about -- heading, accessible name, headline
figure, delta line, tab value, caption, tooltip -- and read all of them back in every state.

Count the distinct values **per field**, not per state. Rolling those fields into one tuple per state
and requiring N distinct tuples is the check that feels rigorous and is not: the broken card's chart
did move, five names and 7, 35, 13, 12 and 6 points, so all five tuples differ and the run goes green
over a heading and a total that never changed. Field by field, the same five states give the heading
one value, the total one, the saving one and the order count one, and each of those is a failure with
a name on it. One moving field is all a tuple needs to hide five frozen ones.

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

**A fixture built for the harness is not a fixture built for the product, and the app is not the
place to keep the difference.** The demo generator is deterministic on purpose -- that is what lets
two runs be compared rather than eyeballed, and it is a good property. It was held by a *default*
seed on the generator, and the app's own FILL WITH DEMO DATA was the only caller and never passed
one, so the button rebuilt the identical year on every press: the property the measurement wanted was
the property the product must not have, and one constant in the wrong place gave the harness what it
needed by taking it out of the product. Every probe here was happier for it, which is exactly why it
sat. Put the reproducibility on the call -- the harness names its seed, the button rolls one -- so the
determinism a run depends on is something a run asks for, never something the shipped path is stuck
with. Then say which you used: a number in a report that cannot be re-rolled is not evidence.

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

**All three are the app's now.** `phone.png` was regenerated from the app first; `home.png` and
`all-orders.png` used to be rendered from the prototype instead -- 55,595 of 5,184,000 against the
app for `home.png`, 440,582 for `all-orders.png` once the app was actually driven into the state the
file holds (see the environment bullet above), neither number the change under test, both the app
and the prototype drawing the same pages slightly differently. Both were re-rendered from the app on
2026-07-31, reproduced twice in a row at 0 differing pixels, and `spendly.html` is no longer a
baseline for either: react/ is the one place the system is built, so a shot is the app's render or
it is out of date, with nothing left to reconcile against a second file.

The phone shot needs that descriptor rather than a 390px window. `pointer: coarse` is what the iOS
rules key off, and a plain narrow viewport does not match it — the shot would show a layout no phone
renders. A stale screenshot is a wrong claim about the product, and it is the one claim a reader
believes without checking — so a change that moves one of these three is regenerated in the same
pass that verifies it, and never before: a shot regenerated mid-work is a shot that has to be
regenerated again when the next edit lands.

**"Moves one of these three" is not the only reason to re-render two of them.** `home.png` and
`phone.png` are dated -- the environment bullet above has the numbers -- so they go out of date on
their own, without anybody touching the app, and a re-render on a later day is a legitimate change to
those files that no diff of the source explains. That is a change to make deliberately and to say so
in the report, never one to let arrive quietly inside a pass that was about something else: the way
to keep both honest is to render the *unchanged* source first, attribute that number to the calendar,
and only then re-render. `all-orders.png` is dateless and should come back byte-identical; if it
does not, the diff is the code.

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
grep -c 'the-pattern' react/src/styles/app.css    # then match the majority, or change all of them
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

**Widening a selector keeps its reach and resigns its rank.** `.field-shell > .field-file-input`
was rewritten as bare `.field-file-input` so the hiding would also reach file inputs outside shells
— and inside them, the one place with a competing rule, `.field-shell > input`'s `width:100%`
started winning again: class-plus-type outweighs a lone class, property by property, so the input
stayed absolute and invisible and became a viewport wide, and every order form scrolled 657px into
blank space. The comment beside the rule went on naming the scoped selector as the reason this
could not happen — nothing renders a comment, so no instrument has an opinion about one, and a
claim of specificity is checked by reading the selector, not the prose beside it. When loosening a
selector, list the fights its old form was winning (grep the properties it declares for other rules
that set them on the same elements) and keep a scoped variant in the selector list wherever a fight
exists; the reach and the rank are separate decisions, and one selector was carrying both.

## spendly.html is frozen

It no longer gets edited: react/ is the one place the design system is built, and there is no sync
step left to carry a fix anywhere else. The constraints this section used to state — one file, no
dependency, no build step, no network request, no external asset, tabs indenting and spaces only
aligning a comment's continuation — were about editing it directly, which nothing does now. They
are git history (`git log -- spendly.html`) if the file is ever un-frozen; they are not rules to
follow in the meantime, since following them would mean editing a file this repo has decided not to.

## Reporting

- Never claim what was not run. "Tests pass" means they were executed; "fixed in Firefox" means
  Firefox rendered it. Mid-work that will usually mean "not rendered yet", which is a fact about
  where the change is, not an apology; the pass before the pull request is what turns it into a
  number.
- Lead with what was measured, then what changed. Numbers before adjectives.
- Flag the part you could not close, in the same breath as the part you did.
- **The pull request is where the session ends. Never offer to watch it.** No standing question about
  following CI, autofixing a red check or answering review comments -- it has been asked many times
  across the 162 commits in this repository and declined every one of them, so it is not a choice being
  offered, it is a turn spent asking and a turn spent refusing. If watching is ever wanted it will be
  asked for in those words, and then the PR is subscribed to and driven until it merges. Unasked, the
  report ends at what changed, what was measured and what was left open.
- **A follow-up asked for after the pull request merged is a new branch, or it is a commit into
  nothing.** The branch a session pushes to is a PR branch, and a merged PR is finished -- it cannot
  track new work, so anything pushed to that branch afterwards sits outside the default branch
  forever while the report says it landed. That is exactly how a rule written, committed and pushed
  in good faith stayed out of `main` until someone asked where it was. So the first move on any push
  that follows a "done" is `git fetch origin main` and one question -- is this branch's history
  already in it? If it is, restart the branch from `main` (`git checkout -B <branch> origin/main`,
  rebasing any unmerged commit onto the new base rather than dropping it), force-with-lease, and say
  in the report that the work needs a new pull request, because the merged one will never carry it.
  A push is not a delivery.
