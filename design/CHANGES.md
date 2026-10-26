# The version number in "This build"

Answers `Brief-build-version-number.md`, and carries the two `later.md` design entries that are already settled in the drawings.

## 1. The version number in the sentence

**The problem.** Settings > This build named the build only by its install date and short commit. Spendly now has a version number (`1.4`), and the card did not show it.

**What changed.** The number goes in the existing sentence, as the brief draws it:

> You're running version **1.4**, installed on **18.08.2026, 09.14** (a3f91c2).

- The version number is bold ink (`b.sp-ink`), the same as the date.
- The short commit stays last, in `sp-ink-5`.
- A build with no version number (an older image) keeps the drawn sentence: "You're running the version installed on **18.08.2026, 09.14** (a3f91c2)." This is written as a note beside 11d; it is not drawn as a sixth state.
- No component, class or style value changes.

**Where.** `Settings and import`: the resting card on the Settings page, and all five states in `11d` This build - every state, plus the note "The version number". App: `react/src/pages/SettingsBuild.jsx`, the card's first line (used once, in `react/src/pages/Settings.jsx`).

**What is still open.** Nothing.

## 2. "Version 1.5 is available." names the newer version

**The problem.** State 4 said "A newer version is available." without saying which version.

**What changed.** State 4's title reads "Version 1.5 is available.", the number of the build on the server. The meta line under it is unchanged ("Installed 22.08.2026, 07.02. Updating reloads the app; nothing you have saved is affected."). The `sp-well` with `data-color="warning"` and its `sp-title sp-ink-warning` stay as they were.

**Where.** `Settings and import 11d`, state 4 (UPDATE AVAILABLE), and the note "State 4 names the newer version". App: `react/src/pages/SettingsBuild.jsx`, plus the update check on the server, which has to return the newer build's version number next to its date and commit.

**What is still open.** The server change, please confirm. The design has no fallback wording: once the server sends the number, it is always shown. If the check can still return a build without a number, please confirm whether that build shows "A newer version is available." as before.

## later.md: "An offer's panel on a phone hangs from its row, not its tag"

**The problem.** On a phone the offer panel hung from the whole line and, hung from the tag, ran 19px past the left edge of a 393px screen.

**What changed.** Nothing in this package. The drawings already settle this (see `handoff_offer_shop_mark_fixed_2`): on a phone the offer opens in a sheet (c13), not a hung panel, so it cannot run past the screen's edge. No popover touch rule is needed.

**Where.** `Order editing layouts 1c` and the note "The offer is a suggestion"; `Components c25`, note "On touch". App: remove the three `.sp-touch .sp-list-item ... .sp-popover` rules from `react/src/styles/app.css`, have `OfferTag` open a `Sheet` on touch, and remove the entry from `later.md`.

**What is still open.** Nothing.

## later.md: "A phone's line row cannot carry an offer's tag while the row opens the line"

**The problem.** On a phone the whole row is one button, so the offer's tag had no place beside it.

**What changed.** Nothing in this package. The drawings already settle this (see `handoff_offer_shop_mark_fixed_2`): a row that opens carries one control beside the part that opens. `sp-list-item__open` holds the mark and the words, and `sp-list-item__control` follows it, raised over the open target, so tapping the tag opens the offer and tapping anywhere else opens the line.

**Where.** `styles/components.css`: `.sp-list-item__control`, `.sp-list-item:has(> .sp-list-item__control)`, `.sp-list-item:has(> .sp-list-item__control .sp-popover)`; `Components c15`, note "A control beside the part that opens"; `Order editing layouts 1c`; `Mobile screens 7a`; `react_handoff/ListItem.jsx` (`control`). App: `react/src/pages/OrderForm.jsx`, `react/src/pages/Order.jsx`. Then remove the entry from `later.md`.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - the version line in the resting card and in 11d's five states, state 4's title, two notes.
- `support.js`, `components.js` - what the page loads.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets, unchanged.
- `styles/pages/settings.css` - the page stylesheet Settings links, unchanged.

## styles/check.js

`styles/check.js` timed out in this session (30 s limit) and returned no report. The rendered checks (`checks.html`) report 118 findings across 27 pages, none on `Settings and import`. They come from earlier work and this package does not touch them. Please confirm against a full `check.js` run.
