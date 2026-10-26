# Every version shows what it brings, even with no change you can see

Answers `Brief-versions-without-visible-change.md`, and the follow-up: the newer-version notice lists it too.

## 1. What changed in Settings, This build

**The problem.** A version with no release notes was not listed. The reader saw "Version 1.11.3 is available" with no lines under it and wondered what was updated.

**What changed.** Every version from 1.10.0 on is listed. A version with no change you can see is drawn like any other version: its number in bold, then one line in the same list, "No change you can see." No new part and no new class: the line is an item of `.sp-toast__changes`. Versions before 1.10.0 had no notes, and some did change things you can see, so they are still not listed. When no version is listed, the WHAT CHANGED part is left out, label and all, as before.

**Where.** `Settings and import` 11d state 7, now titled "7 - NO CHANGE YOU CAN SEE": the running 1.4.2 is listed with the line. The note "A version without notes is not listed" is replaced by "Every version is listed, from 1.10.0 on." App: the This build card in `react/src/pages/Settings*`, and the release notes the update check returns.

**What is still open.** Nothing.

## 2. The amber "Version X is available" notice in This build

**The problem.** A newer version with no notes was not listed inside the notice.

**What changed.** Every newer version is listed with its number. One with no change you can see gives the line "No change you can see." in the notice's ink (`sp-ink-warning`).

**Where.** `Settings and import` 11d state 4: 1.4.3 now reads "No change you can see." The note "State 4 lists what is new" is updated.

**What is still open.** Nothing.

## 3. The count on Show all

**The problem.** "Show all N earlier versions" counted only earlier versions with notes.

**What changed.** N counts every earlier version listed, from 1.10.0 on.

**Where.** `Settings and import` 11d, note "Three versions at first".

**What is still open.** Nothing.

## 4. The newer-version notice at the bottom of the page

**The problem.** "A newer version is available" showed no list when the newer version had no notes, so the reader could not tell what it brings.

**What changed.** The notice always has its list. It shows up to three lines from the newer versions, newest first. Only when no newer version has a change you can see is the list the one line "No change you can see.", the same line as in Settings. Same markup, same `.sp-toast__changes`.

**Where.** `States and confirmations` 6d: a new drawn state, SECTION NOTICE "no change you can see", under the desktop notice. The note "The list is what changed in the newer version" is updated. App: the update notice component that renders `.sp-toast--asks` for a newer version.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - 11d states 4 and 7 and their notes.
- `States and confirmations.dc.html` - 6d, the new notice state and its note.
- `support.js`, `components.js` - needed to open the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - loaded by both pages; unchanged.
- `styles/pages/settings.css`, `styles/pages/states.css` - loaded by the two pages; unchanged.

## styles/check.js

Not run to completion: the checker timed out (30 s limit) in this session, before and after the edit. No stylesheet changed. A sweep of both pages for em dashes, en dashes and curly quotes found none.
