# Release notes in Settings > This build

## Fixed from handoff_release_notes

States 6 (All versions shown) and 7 (This version has no notes) were in the Demo data states grid, after its "5 - FAILED" card. They now sit in 11d, after "5 - CHECK FAILED". Nothing else changed.

Answers `uploads/Brief-release-notes.md`. The user left every question to Design; the choices below are Design's, each drawn in `Settings and import` 11d.

## 1. Where the running version's notes sit

**The problem.** The This build card shows the running version but not what changed in it.

**What changed.** A part labelled WHAT CHANGED sits under the hint (or the result that takes the hint's place) and above the button, in every state. Each version is its number in bold ink (`sp-meta` with `<b class="sp-ink">`), then its lines as a bulleted list, at most three. The list is the 6d notice's list, `.sp-toast__changes`, in plain ink. No new class.

**Where.** `Settings and import`: the resting This build card on the Settings page, and states 1 to 5 in 11d. App: `react/src/pages/SettingsBuild.jsx`.

**What is still open.** Nothing.

## 2. Earlier versions

**The problem.** The app returns up to 20 versions; the card needs a first view and a way to the rest.

**What changed.** The running version and the two before it are shown. When there are more, a small outline button under them reads "Show all N earlier versions", N counting every earlier version with notes. Pressed, it lists every version in place and is gone (11d state 6). The card returns to three versions when it leaves the screen.

**Where.** `Settings and import` 11d states 1 and 6.

**What is still open.** Nothing.

## 3. No notes

**The problem.** Versions made before this feature have no notes; the list is empty or short at first.

**What changed.** A version with no notes is not listed. When the running version has none, the list starts at the newest earlier version that has some (11d state 7). When no version has notes, the part is left out, label included, and the card is as it was before.

**Where.** `Settings and import` 11d state 7 and the note "A version without notes is not listed".

**What is still open.** Nothing.

## 4. After Check for updates finds a newer version

**The problem.** State 4 named the newer version but not what is in it.

**What changed.** Inside the amber notice, under its words, every version newer than the running one, newest first, each with its number and lines in the notice's ink (`sp-ink-warning`), as the 6d notice does. A newer version with no notes is not listed. The running version's part stays below the notice.

**Where.** `Settings and import` 11d state 4.

**What is still open.** Nothing.

## 5. Phone and dark

**What changed.** Nothing is drawn differently: the same markup and order, the lines wrap inside the card, and dark comes from the tokens.

**Where.** `Settings and import` 11d, note "Phone and dark".

**What is still open.** Nothing.

## later.md

Nothing in later.md is settled here. "A deleted record should not be removed for good at once" asks Design for a "Recently deleted" place, but it needs answers first (how long a copy is kept, which kinds, whether bulk delete keeps copies, where the place lives). Please confirm those answers in a later brief.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note, with the fix at the top.
- `Settings and import.dc.html` - the page that changed: the resting This build card and 11d, states 1 to 7, and its notes.
- `support.js`, `components.js` - what the page needs to open.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/settings.css` - the stylesheets the page links. None changed.

## styles/check.js

0 findings across 27 pages.
