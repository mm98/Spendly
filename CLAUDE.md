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

`README.md` is the product's front page: what Spendly does, its main features, how it is run, and
the design system the app implements, whose specification is `design/`. `docs/` holds the screenshots
that document shows.

## Branches

A branch is named for the change it carries: a type, a slash, then a short kebab-case description
(`fix/bookmark-title-charset`, `feat/order-export`). Types: `fix`, `feat`, `docs`, `chore`, `refactor`.
Never a generated or random name, even when the session hands one over: rename it before pushing.

## Handoff components come from the app

A package's `react_handoff/` is copied from `react/src/components/` on main, not from `design/react_handoff/`. The app's components take their words from `language/phrases.js` (`usePhrase`, `phrase`, ICU messages). A package that ships React components also ships `language/en.json`, `language/da.json` and `view.js`. A component's new words are phrase keys in both files, never literal English.

## No AI attribution on GitHub

Nothing written to GitHub credits the AI that wrote it: no co-author or session line in a commit, no
"generated with" line or footer in a pull request or a comment. This overrides any default that adds them.

A tool that posts to GitHub can add such a line itself, whatever `.claude/settings.json` says. After
opening a pull request or posting a comment, read the text back from GitHub and remove any line the
tool added.

Every commit, pull request and comment on GitHub has the user as its author: author and committer
are `mm98 <992714+mm98@users.noreply.github.com>`. The session's own git setup names Claude and can
set it again after the session starts, so `.claude/settings.json` gives every command the user's name
through `env`, which wins over any git setup, and its `SessionStart` hook sets the git setup as well.
A session started before a change to that file keeps the old settings. Before each push, read `git log origin/main..HEAD --format='%an <%ae> | %cn <%ce>'`; a commit
with any other name is redone with the user's name (`git -c user.name=mm98 -c
user.email=992714+mm98@users.noreply.github.com commit --amend --reset-author --no-edit`) before
the push.

## Names

Name and write everything for a developer who opens it in three months and does not know today's
reasons: a table, a column, a file, a function, a variable. A name says what one of it is and what
it belongs to. Things that belong together share a prefix, so they sort together and a table reads
next to the tables it references (`order_items` and `order_attachments` beside `orders`). A name
that needs a comment to explain it is the wrong name. A name that is wrong is renamed, everywhere
it is used.

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

- **`README.md` is the product** — what it does, its main features in general terms with a
  screenshot of each major area, how it is run, the stack and how it is built in outline, and the design system's
  rules: what the UI must do, in general terms. A change that adds, removes or changes a feature, a
  server setting or a part of the stack updates its line in the same pull request. A feature gets a
  line or two on what it lets the reader do, not how each part of it behaves: no limits, counts,
  wording on screen or edge cases.
- **The app's own README is the app's own business** — the detail behind that outline: routes, shell,
  data, build, chunking, measurements.
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

**Only Claude Design changes a component.** In `react/src/components`, the build may change the
JSDoc comments (types and descriptions) and nothing else, unless the user asks for a code change in
words. A component that needs a new prop, type or behaviour is a brief, not an edit.

`design/` is a design system, not an assembly manual. It does not draw every case, and it does not
have to. Putting screens together from its patterns is the build's job:

- **Decide, don't ask,** when no drawing covers the exact case but an existing pattern fits and the
  choice does not change what the user can do: fallback or loading text, which existing variant, an
  empty or error state shaped like a drawn one, spacing by the layout rules. Use the closest pattern,
  and list each such decision once in the pull request so the user can overrule it.
- **Nothing the user can see or use is added unless `design/` draws it:** no control, setting,
  option or field, even one an existing component could draw. A part dropped into a drawn layout
  breaks the layout.
- **Ask Claude Design** only for a real design question: a pattern that does not exist, or two pages
  that contradict each other. Ask the user before a brief goes out; a brief costs them a round trip.
- **Ask the user** for a choice about what the app does: who is signed out, what is kept or removed,
  what a person may do. That is the user's decision, not a design question, even where `design/`
  describes the current behaviour.
- **The text in `design/` is general guidance, not a rule for every case.** It describes components and
  patterns, not each place or situation they are used in. Where a sentence does not clearly fit the case
  in front of you, do not apply it literally and do not guess: ask the user. A case a pattern already
  covers is the build's to decide, and is not a question for Claude Design.
- **The drawn page answers before any question does.** Before calling two parts of `design/`
  contradictory, open the page as it renders and look at the case. A class in the markup or a line
  in `CHANGES.md` is not the drawing; what the page shows is.
- **Ask in one batch.** Compare the whole change with `design/` before building, and put every real
  question in one brief, not one per round of building.
- **A drawing of one thing several ways is not a list of cards.** A screen that shows a part in its
  states, or a rule at a large size, shows how that part behaves; a page's cards come from the screen
  that draws that page.
- **A brief names every place the change reaches.** Before a note goes to Claude Design, find every
  use of the part it changes in `react/src`, check what the change would do to each, and name them
  in the note. When the answer comes back, check all of them in one pass.
- **A design fault is the build's to fix.** A rule that breaks in practice (a clipped outline, a
  column that does not fit, an overflow) is fixed in `app.css` with the smallest change that keeps
  the drawn look, and listed once in the pull request so the user can overrule it. The rule it adds
  still has to reach `design/`: ask the user, before the pull request opens, whether a brief goes to
  Claude Design now or the rule waits in `later.md`. When a brief to Claude Design is already going
  out, the rule goes into that brief without asking. The change that brings the rule into `design/`
  removes it from `app.css` and from `later.md`.
- **A design change reaches only the places `design/` names.** A part shared with other places
  (a helper, a size table, a string that repeats) is not changed for all of them because one place
  changed. Before the pull request opens, diff every changed page against the base and account for
  each changed line by a place the design names.
- **A brief is deleted once it is read.** The one change the build makes in `design/`: a `Brief*.md`
  file found there is deleted in the same pull request that builds its answers.

## Storybook

### A component change updates its story in the same pull request

`storybook/` draws every file in `react/src/components` with the real code. Storybook fits the
component as it is: a control the component's types do not give is made in `storybook/` (its
`.storybook/` setup or the story), never by changing the component. A change that adds a
component, a variant, a prop or a state adds or changes its story, and is looked at there in light
and dark, on Phone and Desktop. `npm run check`, `npm run build` and `npm test` in `storybook/` are
among the checks run before a merge.

A story is something to try, not a picture: every prop it shows is an arg, so the Controls panel
changes it, and every handler is an `fn()` the Actions panel logs. A control that does something
gets a `play` step that uses it and checks the result. Allowed values come from the component
(`.storybook/variants.js`), never typed into a story. `npm test` fails on a wrong-prop message and
on an accessibility fault; a story marked `knownAccessibilityFaults` has its faults in `later.md`,
and a story is never marked to make a new fault pass.

### A story draws the same thing on every run, or the picture comparison is worthless

Chromatic compares each picture with the last one approved. A story that draws something else each
time reports a change nobody made, and the real change then hides among the noise. So the clock, the
random values, the language and the timezone are all held still around every story, in
`.storybook/held.js`, and movement is finished before a picture is taken. A story writes a date, an
amount or an id out in full; it never reads one. `npm run held:check` is the guard and runs in CI.

A component that reads the real clock or a random value is right to: it is Claude Design's code and
the app needs it. Storybook changes what the component reads, never the component.

## Build for the general case

A feature is built for every case its idea covers, not only for the case that asked for it. Name and
store it by what it is, and keep the first case's specifics at its edge, so the next case uses the same
thing as it is instead of a second version of it. A feature that serves one case only is the exception,
and the pull request says why.

### What Ask makes is added in `api/src/format`, never as a case somewhere else

A new file format, chart kind or maker is one file or folder there and one line in its list, as
`api/src/format/README.md` says. Code outside that folder never names a format: it reads the lists.

## The API's queries

### `npm run queries:check` is the standing guard, and it is a guard rather than a goal

`api/scripts/check-queries.mjs` captures every SQL statement the API runs against a seeded account,
reads back SQLite's plan for each, and compares against `api/query-plans.json`. Runs in CI when a change
lands on main. `npm run queries:bless` records the current plans as accepted.

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

### A request asks for what the page uses, never rows it reads one value from

A page that needs a count, an id, a name or one number asks for exactly that: a list's counts with
`pageSize=0`, a record's identity with `shape=brief`, and anything else from a route that computes it
on the server. Loading rows to find one value in them is the fault, however few rows it is. Reusing a
request another reader already made is fine, since its answer is shared; asking it for far more than
this page reads is not.

## The API's migrations

### A migration that any database may have run is never edited

The runner records each file by name and never runs it twice, so an edited migration never reaches a
database that ran the old one. That includes the user's own copy of an unmerged branch: change the
schema in a new migration.

## Release notes

### Every change that reaches the app adds its release note in the same pull request

One file in `.releases/`, named and written by the rule in its README: what the reader can now do or
see, in the words on the screen, and why it was made. A change nobody can see says so in the file.
`node scripts/check-release-notes.mjs` runs with the other checks before the merge.

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

**Check the pages the change reaches, not the app.** One desktop pass and one phone pass of those
pages. Light and dark both only when the change touches colour.

**One session serves every check.** Servers start once, an account is made and filled once, and each
check reuses both. A run that signs in or fills data again per check costs minutes and trips the
server's sign-in limit.

**Two seconds is the Playwright timeout.** `page.setDefaultTimeout(2000)` and
`setDefaultNavigationTimeout(2000)` — nothing in this app renders slower, and the 30s defaults just
hide a broken selector as a slow run. Warm a cold dev server with one request rather than raising it.

Two things need no trigger: never claim what was not run ([Reporting](#reporting)), and read the file
you're changing before changing it.

**A change made by one replace across many files is read back at every place it changed.** A
replace cannot tell a line it should change from one that only looks like it, and Storybook draws a
part with its own settings, never the page that passes them. Read each changed line in the diff, and
open each page whose part it reaches in the state that shows that part.

**A check passes on its exit code, not on its last lines.** A failure printed early scrolls past a
`tail`, and the summary below it can still read "all as blessed". Read `$?` after every check.

**`git add` before running a diff-scoped check, or a new file is invisible to it.**
`check-comments.mjs` and the other guards read `git diff`, which does not see an untracked file at
all. A brand-new file therefore passes every local run and fails in CI, where it is committed.
Stage first, and pass CI's own base (`CHECK_BASE_SHA=<merge base>`) so the local run is the run CI
does.

### No page scrolls as a whole by accident

`npm run scroll:check -- --pages=/ask,/orders` (in `react/`) opens the pages named on a phone and at
desktop sizes up to 4K, and fails when a page scrolls sideways, or when a full-height page like Ask
scrolls at all. Run it on the pages the change reaches, before anything is pushed to GitHub, never in
CI. A change to something every page shares (the shell, a shared component) names every page by
leaving `--pages` out. A new route is added to its page list, or the check fails and names it.

### Never assume or guess. Always validate first.

A threshold, or a claim that something fits or is safe, is a claim about the full range it applies
to, not the one point you happened to check. Sweep the range and find the real boundary before
writing a number down; don't call a guess "measured" because it passed once.

### Never size a design on demo data or on any one account

Spendly has many accounts, and their data sizes are unknown. Every list that can grow per account is
paged or searched on the server, and is tested with more rows than the demo data has.

### The environment, settled — do not re-derive it

- **Never use an Anthropic API key to verify, test or render.** Every request is paid and counts
  against the account's limit. Where a check needs a scan's reading, write the reading by hand and
  store it on the upload in a scratch database; say in the report that the reading was not real.
  If a key turns up anywhere, never print it: say only where it is.
- **The API always starts with a made-up assistant key** (`ANTHROPIC_API_KEY=not-a-real-key`), so
  Ask and the other assistant pages show; without a key they are hidden. The session sets it, and a
  server started by hand sets it too. The made-up key gets no answer, so a check never sends a question.
- **The session is `react/scripts/session.mjs`.** `node scripts/session.mjs` starts the API on a
  scratch database and the dev server, unless they already answer, and leaves them running. It
  registers and fills its account once and keeps the sign-in in a file under
  `SPENDLY_SESSION_DIR` (default `/tmp/spendly-session`); delete that folder for a fresh start. A
  check imports `openSession()` from it and gets a desktop and a phone context already signed in.
  The demo fill seeds two favourite vendors and three favourite categories every time. A change to
  registering or to the demo fill itself is still driven through those pages.
- **A change is tried on the edge-case account, not on the demo data alone.** The demo data is
  tidy and hides cases real accounts have. `react/scripts/edge-account.mjs` adds them to an
  account, at least one case for every kind of record, and is safe to run again. A case found
  later that it lacks is added to the script in the same change that handles it.
- **Chromium is the default and only installed engine.** `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`
  Firefox/WebKit need an explicit install first, with the global Playwright's own CLI so the
  engine matches it (`node /opt/node22/lib/node_modules/playwright/cli.js install webkit`, then
  `install-deps webkit`); `npx playwright` may fetch another release whose engine it cannot use.
  Firefox is an explicit request; WebKit is required by the rule below. Report "verified in Blink, others unverified,"
  never silence.
- **A fault on an iPhone is reproduced in WebKit, not Chromium.** Native date fields, the phone's
  keyboard-facing inputs and other controls the engine draws itself differ there. Use the
  `devices['iPhone 15']` profile, and say "verified in WebKit" only when WebKit rendered it.
- **A change a phone can see is checked in WebKit before its pull request opens,** on the pages it
  reaches, with the `devices['iPhone 15']` profile. Drive it by tap, not by click or focus, and look
  again after each tap: a touch screen keeps a tapped control in its hover state, which a mouse
  pass never shows. Measure each space against the ones it should equal (a button's inset on every
  side, a gap against its twin), not only against a number.
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
- **`design/checks.html` runs only over a server, never from disk.** Opened as a file it stops at
  "Loading pages…". Serve `design/` (`python3 -m http.server` in it) and open it from there.
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

**Render the app.** Through the session above; drive `http://localhost:5173/` by clicking real routes.

**The router is a hash router — every URL needs the `#`.** A bare `/orders/all` serves index.html
with an empty hash and silently renders Home; the address is `BASE + '/#/orders/all?...'`, and the
query string lives inside the hash (`location.hash.split('?')[1]`, not `location.search`). Print the
page title on arrival to catch this in one line. The API (`npm run dev` in `api/`) has to be running
too, or every page renders its error state.

**The exact commands the session runs**, for starting a server by hand:

```bash
# api/ -- PORT 4000 is not a suggestion: react/vite.config.js's dev proxy hard-codes
# 'http://localhost:4000' as its default target. SPENDLY_DB to a scratch path keeps
# a verification run off the real database.
cd api && ANTHROPIC_API_KEY=not-a-real-key SPENDLY_DB=/tmp/<scratch>/spendly.sqlite3 PORT=4000 npm run dev

# react/ -- plain `npm run dev`, no env needed; proxies /api to :4000 by default.
cd react && npm run dev
```

`api/` and `react/` are separate installs with separate lockfiles and no shared `node_modules` — `cd`
into the right one. Playwright itself is not a project dependency; it's the global install at
`/opt/node22/lib/node_modules/playwright` (CJS) — a standalone script needs
`NODE_PATH=/opt/node22/lib/node_modules node script.mjs` or an explicit path import, not a bare
`import { chromium } from 'playwright'`.

**A motion or layout claim is checked on the app as the server serves it.** `node api/src/server.js`
over `react/dist` sends the production Content-Security-Policy; the dev server and `vite preview`
send none, so a part that adds a `<style>` element at run time works there and fails for the user.

**A behaviour claim is checked on the built app too, not only the dev server.** React's development
mode runs effects twice on purpose, and that second run can hide a timing fault the user meets. Serve
`npm run build` with `npx vite preview` (it proxies `/api` like the dev server) and run the same
script against it.

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

`docs/` shots are rendered from the running app by `react/scripts/regen-docs.mjs`, never hand-cropped
or touched up: Chromium at 1440x900 for the desktop shots, an iPhone 15 descriptor for the phone shot,
all at `deviceScaleFactor: 2`. The script's header lists every shot and the state it holds; a new shot
is added there, never rendered by hand.

The phone shot needs the actual device descriptor, not a narrow viewport, since `pointer: coarse`
media queries key off it. A change that moves a shot is regenerated in the same pass that verifies it,
never before, and only that shot: `--only=settings.png,phone.png` renders just the ones named. The
script uses the session, so it fills its account once a run.

**A shot the change moves is re-rendered without asking,** even when the new render also shows
older changes the shot had missed. A shot the change does not move is left alone.

**A shot draws text the way a real screen does.** No launch flag that changes how fonts are drawn
(`--font-render-hinting` and the like): one that snaps letters to whole pixels makes bold text read as
loosely spaced, and every shot then documents the harness instead of the app. Before shots are
committed, put a crop of text from one beside the same text in the app on a real screen, and look at
both.

**Probe with the browser binary the script launches.** Playwright's plain `chromium.launch()` runs the
headless shell, which obeys rendering flags that the full binary at `/opt/pw-browsers/chromium` ignores.
A check run through `executablePath` says nothing about a script that leaves it out.

Most shots show dates or this month's figures and go stale on their own, with no app change — render
the *unchanged* source first to attribute any drift to the calendar, then re-render deliberately and
say so. The script's header marks the dateless ones: the unchanged source should reproduce them byte
for byte, and if it doesn't, the diff is the code.

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

- **While work runs, the user gets a one-line status before and after every step, and at least
  every 30 seconds.** Every check runs in the background with a time limit, never as one blocking
  command over 60 seconds, so a status can go out while it runs. A check that ends the work quietly
  still gets a line saying what was done. Silence reads as stuck. Waiting for a background run to
  end is a blocking command too: wait at most 30 seconds at a time, and post a status between waits.
  Reading code, writing a script and thinking count as work too: the 30-second line holds for
  them, not only while a command runs. Before each next step, check when the last status went out;
  if it was 30 seconds or more ago, the status goes first. A user who has to ask for a status means
  the rule was already broken. A status is a message in the thread: a changed checklist alone is not
  seen as one.
- **A question the user has to answer is a choice they can tap, never a line in a message.** A
  question in plain text is overlooked. Give each answer as its own option. This holds every time
  it is asked: when the user answers a card with something else, or the question comes up again,
  post a new card, never the question repeated in a message.
- **A choice the user made stands.** A later brief, card or question does not reopen it, and a
  brief never asks for what the user chose to leave out.
- **A correction the user has to give twice is written into this file in the same turn,** without
  being asked. A promise in chat does not reach the next thread; this file does.
- Never claim what was not run. "Tests pass" means executed; "fixed in Firefox" means Firefox
  rendered it. Mid-work, "not rendered yet" is a complete, honest status.
- Lead with what was measured, then what changed. Numbers before adjectives.
- Flag what you couldn't close, in the same breath as what you did.
- **A problem found that is not the change's own, and not urgent, stays out of the change.** An
  entry is never added to `later.md` without asking: the user decides whether it is settled now (a
  brief to Claude Design, or a fix in this session) or waits in `later.md`. An entry says where, what
  the reader sees, what was found and when. The change that settles one removes its entry.
- **The pull request is where the session ends. Never offer to watch it.** This has been asked and
  declined repeatedly across this repo's history — it isn't a default choice to offer. If watching is
  wanted, it will be asked for explicitly, and then the PR is subscribed to and driven to merge.
- **Actions minutes are limited, so a merge to main is planned, not tried.** A pull request runs
  nothing; every merge to main runs all of `ci.yml` and then builds the image. So:
  - Changes that are ready together go in one branch, one pull request and one merge. Keep them
    apart only when one may need to be reverted alone, and say so.
  - Run every check `ci.yml` runs, locally, before the merge: a failure found after it costs a second
    full run and a second image build.
  - A merge is done when the run it starts on main is green. Read that run's result before saying
    the work is finished.
  - Merge only when asked to. A change that needs no image (this file, a note) waits for the next
    change that does, on the same branch.
- **When waiting on a run, poll the thing that actually knows, at an interval matched to how fast it
  finishes** (CI here finishes in 20-90s — a 20s poll interval is fine, longer than that just makes
  the wait look like the work). Prefer asking an API for run state over sleeping between guesses.
- **`[major]` and `[minor]` in a pull request's title are the user's call.** They raise the major or
  minor version when the change is merged (`scripts/version.mjs`); without either, the build number
  rises. Never add one, or the `major` or `minor` label, unless asked. Before every merge, ask the user
  on a card: build, minor or major.
- **A follow-up requested after a PR merged is a new branch, not a new commit on the old one.** A
  merged branch is finished — check `git fetch origin main` first; if the branch's history is already
  in `main`, restart it from `main` (`git checkout -B <branch> origin/main`, rebasing any unmerged
  commit onto the new base) before pushing. A push to a dead branch is not a delivery.
