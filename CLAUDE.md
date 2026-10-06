# Working in this repo

## Rules here are general, not case histories

A rule in this file states a general principle, not a specific past incident. Don't attach unique
per-incident reasoning, exact numbers, or a story to a rule — that couples the rule to one example
and someone then has to maintain the prose every time the details shift. State what to do and, if
needed, the one-line general reason it matters.

Comment only what stops someone breaking the code: a non-obvious constraint, a value another rule
depends on, a deliberate-looking mistake. One or two lines carrying just the constraint, not the
story around it.

Never write changelog. No "the original did X", no "this used to be Y". Git holds history; the
file holds the current state.

Spendly is an application and its documentation. **`react/` is the source.** The app is what runs,
what a change is made in and what a claim is measured against: `npm install && npm run dev` in that
directory, and the pages are real ones with the controls wired.

`README.md` introduces the design system the app implements, whose specification is `design/`; `docs/`
holds the screenshots that document shows.

## Branches

A branch is named for the change it carries: a type, a slash, then a short kebab-case description
(`fix/bookmark-title-charset`, `feat/order-export`). Types: `fix`, `feat`, `docs`, `chore`, `refactor`.
Never a generated or random name, even when the session hands one over: rename it before pushing.

## No AI attribution on GitHub

Nothing written to GitHub credits the AI that wrote it: no co-author or session line in a commit, no
"generated with" line or footer in a pull request or a comment. This overrides any default that adds them.

## Whitespace

Tabs indent, always. Spaces only where something aligns under something else. `.editorconfig`
says so too, so editors don't undo it.

## The user is not technical, and English is not their first language

Write anything the user reads — chat replies, and app copy alike — in plain language: no jargon, no
framework or implementation words, no phrasing that assumes the reader knows how software is built or
shipped. Say what changed and what to do about it, not how the mechanism works underneath.

The user is Danish, reading in a second language. Prefer short, literal sentences over idiom, phrasal
verbs, or a clause that doubles back on its own subject — a sentence can be jargon-free and still be
hard to translate word for word. Say the plain action and its plain consequence, in that order.

Clear and translatable is not the same as true. Before a sentence ships, ask what the page actually
knows at the moment it is shown — a plain sentence stating something unverified is a plain lie.

### A comment describes the code to the next reader of the code. It must never become the copy.

A code comment can name a component, a pattern, a data shape, because its reader is a developer.
User-facing copy cannot: internal names ("this combobox," "the grip," "palette/swatch," "JSON,"
"array") describe the implementation to another programmer, not the thing on screen to a reader
buying groceries. Before a string ships, ask: could this word be pasted into a comment in the file
that renders it and mean the same thing? If yes, it's describing the implementation, not the
experience — rewrite it in terms of what is actually drawn.

Write from the reader's side of the screen: name what they see and what they can do to it, never the
name the code that draws it happens to have. A raw number is the same failure without a word attached
— ask whether knowing it changes what the reader does next, not just whether it's accurate.

## Division of labour

Three documents, one job each. Putting a paragraph in the wrong one is how the same rule ends up
stated twice and obeyed once.

- **`README.md` is the design system** — what the UI must do, in general terms. No implementation
  detail (framework, router, bundler): those are decisions downstream of it and they change.
- **The app's own README is the app's own business** — its framework, build, chunking, measurements.
  Nothing in it is a rule about the product.
- **This file holds rules about the work** — how to verify, what counts as done, what may be claimed.
  Nothing here describes the UI.
- A fix usually teaches two of them: the rule to README, how it got past us here. Don't copy between
  them, and don't narrate a fix in either.
- A rule already settled in the README is not re-derived from the diff in front of you — check
  README before inventing a new shape for a form, a list, a validation pattern.

## Building from `design/`

`design/` is changed only by the user, through Claude Design. It is the source of truth for every
pattern: components, tokens, layouts, behaviour rules. A new pattern is never invented in the app; it
is proposed to Claude Design as a written brief, and built once it is in `design/`.

`design/` is a design system, not an assembly manual. It does not draw every case, and it does not
have to. Putting screens together from its patterns is the build's job:

- **Decide, don't ask,** when no drawing covers the exact case but an existing pattern fits and the
  choice does not change what the user can do: fallback or loading text, which existing variant, an
  empty or error state shaped like a drawn one, spacing by the layout rules. Use the closest pattern,
  and list each such decision once in the pull request so the user can overrule it.
- **Ask Claude Design** only for a real design question: a pattern that does not exist, two pages
  that contradict each other, or a choice that changes what the user can do.
- **Ask in one batch.** Compare the whole change with `design/` before building, and put every real
  question in one brief, not one per round of building.
- A design fault (a rule that breaks in practice, such as a clipped outline) goes in that same brief;
  the app may carry a minimal workaround in `app.css` until the design takes it in.
- **A brief is deleted once it is read.** The one change the build makes in `design/`: a `Brief*.md`
  file found there is deleted in the same pull request that builds its answers.

## The API's queries

### `npm run queries:check` is the standing guard, and it is a guard rather than a goal

`api/scripts/check-queries.mjs` captures every SQL statement the API runs against a seeded account,
reads back SQLite's plan for each, and compares against `api/query-plans.json`. Runs in CI on every
PR. `npm run queries:bless` records the current plans as accepted.

It reports only what changed, so review only has to judge the new plan, not re-litigate every plan already accepted.
A finding fires when a new/changed statement scans a big table, sorts in a temp B-tree, walks a whole
account's table through an index that doesn't cover what it selects, or reads a per-account table
without filtering on `user_id`.

When it flags something, an index is the last option, not the first:

1. **Is the path hot?** A rare admin action doesn't need a plan at all — bless it.
2. **Can the query be rewritten?** The biggest wins have been rewrites (correlated subquery →
   grouped pass, wrong-side join turned around), and they cost nothing to maintain.
3. **Can the row carry the answer?** Denormalized counts/totals maintained by a trigger, read for
   free forever — this is already how `item_count`, `category_count` and stored totals work.
4. **Then an index** — and only if it earns its write cost. Order totals are trigger-maintained, so
   an index on `total`/`saved`/`discount` is rewritten on every line-item edit.

The fixture is ten accounts (one large, nine small) because that's the real shape: a person's own
ledger grows, the tenancy doesn't. A single-account fixture can't test this at all — with one user,
`WHERE user_id = ?` matches everything and no per-account index ever proves itself.

Stop when the plan is sound, not when it's fastest — a blessed plan stays blessed, and re-optimizing
a query nobody is waiting on costs the same review and risk as the first optimization, for nothing.

## The API's responses

### A single-record endpoint returns the record. A list, overview or search result returns only what its own consumers read — never the shape a detail page happens to have.

`GET /api/orders/:id` (and vendor/category equivalents) backs a detail/edit page that genuinely uses
most of the record — decorate it in full. `GET /api/orders`, `/api/stats` and `/api/search`
are row/summary shapes; giving them the full decorator means DB work and bandwidth spent on fields the
row never renders. Each list shape gets its own decorator, built from only the child queries it needs
(`decorateOrderListRows` and `decorateOrderSearchRows` beside the single-
record `decorateOrder`).

The test is "is it read anywhere," not "might it be handy": before a list route returns a field, grep
every consumer in `react/src` and confirm it's actually rendered or branched on. A field used by more
than one consumer still isn't "keep everywhere" — each shape gets what *its own* consumers read.

## The API's migrations

### A migration that any database may have run is never edited

The runner records each file by name and never runs it twice, so an edited migration never reaches a
database that ran the old one. That includes the user's own copy of an unmerged branch: change the
schema in a new migration.

## Verification

### Verification is one pass at the end, not a gate on every edit

> [!IMPORTANT]
> Nothing below runs while work is in progress. The harness, pixel diffs, element walks and `docs/`
> baseline check are one pass, run when the change is finished and a pull request is about to be
> opened — or whenever the user asks for it sooner. Committing and pushing is not that trigger.

Interleaving verification with every edit answers the same question ("is this change sound") several
times for one answer. Build the change, then verify it, then open the PR. Between those points, say
plainly what has and hasn't been checked — "not rendered yet" is a complete report mid-work.

**Default to the smallest check that could fail, and a one-line report.** Size the probe to the
claim — an oversized instrument (a full harness for a three-line change) costs more than the standard
it's supposedly enforcing.

**Two seconds is the Playwright timeout.** `page.setDefaultTimeout(2000)` and
`setDefaultNavigationTimeout(2000)` — nothing in this app renders slower, and the 30s defaults just
hide a broken selector as a slow run. Warm a cold dev server with one request rather than raising it.

Two things need no trigger: never claim what was not run ([Reporting](#reporting)), and read the file
you're changing before changing it.

**`git add` before running a diff-scoped check, or a new file is invisible to it.**
`check-comments.mjs` and the other guards read `git diff`, which does not see an untracked file at
all. A brand-new file therefore passes every local run and fails in CI, where it is committed.
Stage first, and pass CI's own base (`CHECK_BASE_SHA=<merge base>`) so the local run is the run CI
does.

### Never assume or guess. Always validate first.

A threshold, or a claim that something fits or is safe, is a claim about the full range it applies
to, not the one point you happened to check. Sweep the range and find the real boundary before
writing a number down; don't call a guess "measured" because it passed once.

### Never size a design on demo data or on any one account

Spendly has many accounts, and their data sizes are unknown. Every list that can grow per account is
paged or searched on the server, and is tested with more rows than the demo data has.

### The environment, settled — do not re-derive it

- **A rendered account with real records is one flow.** No seed script, no shortcut route: register
  at `#/register`, open Settings' "Demo data" section, click "Fill with demo data", then confirm ("Yes,
  fill it"). Seeds two favourite vendors and three favourite categories every time.
- **A change is tried on the edge-case account, not on the demo data alone.** The demo data is
  tidy and hides cases real accounts have. `react/scripts/edge-account.mjs` adds them to an
  account, at least one case for every kind of record, and is safe to run again. A case found
  later that it lacks is added to the script in the same change that handles it.
- **Chromium is the default and only installed engine.** `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`
  (Playwright 1.56.1). Firefox/WebKit need an explicit install first
  (`npx playwright install firefox`, or `webkit` + `install-deps webkit`) and are an explicit
  request, not a standing default. Report "verified in Blink, others unverified," never silence.
- **A fault on an iPhone is reproduced in WebKit, not Chromium.** Native date fields, the phone's
  keyboard-facing inputs and other controls the engine draws itself differ there. Use the
  `devices['iPhone 15']` profile, and say "verified in WebKit" only when WebKit rendered it.
- **`--with-deps` fails as two steps, not one.** It installs system deps first and aborts the whole
  run if any apt source is unreachable — even an irrelevant one. Split it: `install` the engine, then
  `install-deps` separately, so an apt failure doesn't cost you an already-downloaded browser.
- **Screenshot rendering is dated.** `regen-docs.mjs` shifts seed data so the newest order lands
  "today," and Home's hero names the current month — so a shot re-rendered on a later day differs
  from the calendar alone, with zero app change. Before trusting a diff, render the *unchanged*
  source and confirm it reproduces the committed shot at 0 pixels; only then diff the real change.
  `all-orders.png` is a filtered, dateless view and should always come back byte-identical.
- **`all-orders.png` holds three pieces of state**, each has to be driven into it: the facet rail
  showing, the list filtered to a specific vendor/status/date range, and the search palette open with
  text typed in. `react/scripts/regen-docs.mjs` is the canonical record of how. Demo data is a function of
  (seed, today), so a render day picks its own `SEED` — the one giving the account the three August
  Bilka deliveries that shot is filtered to; the script reads the count back and refuses to shoot when
  it does not hold, so the seed is found by trying rather than reasoned about.
- **A 403 on a browser download is egress policy, not the CDN.** Check
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"` for `recentRelayFailures` before guessing a cause.
- **Locale is the harness's to name — except inside a native control, which this build ignores.**
  App-drawn dates obey `locale`/timezone context options; a native `<input type="date">` does not
  (verified: `locale`, `--lang=en-GB`, `--lang=de-DE` all render the same). Don't try to fix a native
  control's rendering by varying locale.
- **The phone shot is `devices['iPhone 15']` with `deviceScaleFactor: 2`** (786x1318). Treat this as
  the floor device — a bare viewport at a different scale factor renders a different size and reads
  as a layout regression that isn't one.
- **No PNG library is installed.** Read a committed shot as base64, diff via `<canvas>`/`getImageData`
  in the already-open browser rather than importing one from inside the Playwright bundle.
- **Lighthouse is the only instrument here that measures the wire.** Point it at a served build
  (`node api/src/server.js` over `react/dist`), never the dev server — Vite serves unminified,
  unbundled modules. Run it at least twice and report the spread; the first run is noisy.
  **Always `--preset=desktop`** unless a phone number is specifically being asked for — Lighthouse's
  own default is a throttled mobile profile, the wrong lens on a small, desktop-baseline app.
- **Match counts:** `grep -o 'pattern' file | wc -l`, never `grep -c` (which counts lines, not
  occurrences).

### When a page can be rendered

When a fetch fails, ask the proxy (`curl -sS "$HTTPS_PROXY/__agentproxy/status"`) rather than
guessing a cause from an opaque `Download failure` message.

Render the app, screenshot at desktop and 390px, and say what was measured rather than that it looks
right.

**Render the app.** `npm run dev` in `react/`, drive `http://localhost:5173/` by clicking real routes.

**The router is a hash router — every URL needs the `#`.** A bare `/orders/all` serves index.html
with an empty hash and silently renders Home; the address is `BASE + '/#/orders/all?...'`, and the
query string lives inside the hash (`location.hash.split('?')[1]`, not `location.search`). Print the
page title on arrival to catch this in one line. The API (`npm run dev` in `api/`) has to be running
too, or every page renders its error state.

**The exact commands, so they stop being re-derived each session:**

```bash
# api/ -- PORT 4000 is not a suggestion: react/vite.config.js's dev proxy hard-codes
# 'http://localhost:4000' as its default target. SPENDLY_DB to a scratch path keeps
# a verification run off the real database.
cd api && SPENDLY_DB=/tmp/<scratch>/spendly.sqlite3 PORT=4000 npm run dev

# react/ -- plain `npm run dev`, no env needed; proxies /api to :4000 by default.
cd react && npm run dev
```

`api/` and `react/` are separate installs with separate lockfiles and no shared `node_modules` — `cd`
into the right one. Playwright itself is not a project dependency; it's the global install at
`/opt/node22/lib/node_modules/playwright` (CJS) — a standalone script needs
`NODE_PATH=/opt/node22/lib/node_modules node script.mjs` or an explicit path import, not a bare
`import { chromium } from 'playwright'`.

**State can lag the action that caused it** (a redirect, an async refetch, a resize-driven redraw). Wait
for the value under test to actually change, never a fixed timeout or the first render after a click —
a stale read looks like a plausible answer instead of failing.

**Navigating within a single-page app doesn't always reload the document.** Two records behind the same
route, or a route reached without an in-app path, need `reload()` or a value that must differ between
them waited on — a selector both states satisfy proves nothing.

**A render can be correct and a control still wrong.** Check the underlying fact, not just that
something plausible was drawn: a control's own state actually moved (geometry/computed style, not just
an attribute), a related control agrees with it, a chosen value survived rather than falling back
silently, a shared fact matches across every place it's shown, a query genuinely ran rather than being
skipped into an empty state that looks the same as a real one.

**A sticky element is checked by scrolling and measuring where it lands.** `position: sticky` is only
a request: an ancestor that clips into a scroll box of its own turns it off without a sound.

**A fix or a defect report usually generalizes.** Enumerate every instance (DOM, codebase, every label
carrying the same string) rather than fixing only the one shown, and verify on a fixture actually large
enough to trigger the condition, not the smallest one that happens to pass.

**A probe has to actually measure what can move.** Match the instrument to the claim: filter hidden
elements out of hand-rolled geometry, check an element's own edges against its container (not just
document-level overflow), count selector matches before trusting a deletion is safe, diff computed
styles instead of assuming a removed rule is inert, and treat inline styles and vendor-prefixed/native
controls as needing their own explicit check — a class-based rule or a single-engine pass can't reach
them.

**Reset what the harness itself leaves behind** (scroll position, focus ring, hover, in-flight
animations) before measuring, and freeze animations before waiting for stable geometry, not after.
Diff an unchanged baseline against itself first and require zero difference, so noise in the harness
isn't mistaken for a real change.

**Drive the app the way a real user and a real device would**: real navigation (not a shortcut that
skips app state), a real device descriptor for phone/touch behavior, the actual wired control rather
than a stand-in, every engine a change could be shaped by. Say exactly what was and wasn't
covered — never let a report imply more than was run.

## Measuring

Measure geometry in the DOM, not by eye — a 2px shift is a real, reportable defect here. This is
about *how* to measure; *when* is the pass before the PR (see
[Verification](#verification-is-one-pass-at-the-end-not-a-gate-on-every-edit)).

```js
const widths = buttons.map(b => {
  buttons.forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  return el.getBoundingClientRect().width;   // one value for every state, or it is a bug
});
```

The same shape covers overhang/clipping (`el.right - parent.right`), phone layout
(`documentElement.scrollWidth` vs `clientWidth`), and wiring (spy on the API a handler should call,
dispatch the event, assert it fired). Screenshots are for the reader; the number is the evidence.

## Screenshots in the README

`docs/` shots are rendered from the running app, never hand-cropped or touched up: Chromium at
1440x900 for the three desktop shots, an iPhone 15 descriptor for the phone shot, all at
`deviceScaleFactor: 2`, via the same harness used for measuring. All four are the app's render.

The phone shot needs the actual device descriptor, not a narrow viewport, since `pointer: coarse`
media queries key off it. A change that moves one of these four is regenerated in the same pass that
verifies it, never before.

Two of the four (`home.png`, `phone.png`) are dated content and go stale on their own, with no app
change — render the *unchanged* source first to attribute any drift to the calendar, then re-render
deliberately and say so. `all-orders.png` and `order-list.png` are dateless: the unchanged source
should reproduce them byte for byte, and if it doesn't, the diff is the code.

`docs/` is only a baseline if your machine reproduces it — a different Chromium build can rasterize
text differently and swamp a real diff in noise. Diff your own before/after renders (deterministic on
one machine) and check `docs/` only for state/size correctness; run the unchanged file against `docs/`
once to confirm your machine is in the reproducing case before trusting any diff against it.

## Uniformity

Before adding a variant, grep the pattern and match the majority, not just the one neighbour in view
(`grep -o 'pattern' file | wc -l` — `-c` counts lines, not occurrences, and undercounts markup with
several matches per line).

**A shared value or rule has to be removed from every place it's duplicated, not just centralized in
one more.** A rule added beside surviving per-copy declarations is a near-miss the cascade hides until
they disagree — read the match count back and check survivors declare only their real differences.

**A value with a design-system token is written as the token, always** — check `:root` before writing
a literal. Where a value has no token and repeats, name it as a scoped custom property instead of
repeating the literal.

**Selector and rule placement matters as much as content.** New base rules go above the file's
responsive block, not after it, or they can silently win over the override on equal specificity. A new
or widened selector is a claim about how many elements it matches and what specificity it holds against
competing rules — check the match count and any properties it now competes over before and after.

**Comments that name a specific value go stale silently** — nothing renders a comment, so no
verification catches a drifted one. When a value moves, grep for it in prose too.

## Reporting

- Never claim what was not run. "Tests pass" means executed; "fixed in Firefox" means Firefox
  rendered it. Mid-work, "not rendered yet" is a complete, honest status.
- Lead with what was measured, then what changed. Numbers before adjectives.
- Flag what you couldn't close, in the same breath as what you did.
- **The pull request is where the session ends. Never offer to watch it.** This has been asked and
  declined repeatedly across this repo's history — it isn't a default choice to offer. If watching is
  wanted, it will be asked for explicitly, and then the PR is subscribed to and driven to merge.
- **When waiting on a run, poll the thing that actually knows, at an interval matched to how fast it
  finishes** (CI here finishes in 20-90s — a 20s poll interval is fine, longer than that just makes
  the wait look like the work). Prefer asking an API for run state over sleeping between guesses.
- **A follow-up requested after a PR merged is a new branch, not a new commit on the old one.** A
  merged branch is finished — check `git fetch origin main` first; if the branch's history is already
  in `main`, restart it from `main` (`git checkout -B <branch> origin/main`, rebasing any unmerged
  commit onto the new base) before pushing. A push to a dead branch is not a delivery.
