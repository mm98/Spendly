# Version numbers now have three parts

Answers `Brief-version-three-parts.md`.

## 1. The example numbers have three parts

**The problem.** The app shows versions as three numbers, like `1.10.2`, but the drawings still said `1.4` and `1.5`.

**What changed.** Only the example numbers. The version line reads "You're running version **1.4.2**, installed on **18.08.2026, 09.14** (a3f91c2)." and state 4's title reads "Version 1.5.0 is available." No component, class, style value or other copy changes.

**Where.** `Settings and import`: the resting card on the Settings page, and all five states in `11d` This build - every state, plus the notes "The version number" and "State 4 names the newer version". App: `react/src/pages/SettingsBuild.jsx` (text only, unchanged).

**What is still open.** Nothing.

## 2. The note on how the number is counted

**The problem.** The note "The version number" in `11d` said the version is two numbers and explained when each goes up.

**What changed.** The note now reads: three numbers, such as `1.4.2`: major, minor and build. A big feature raises major, a merged change raises minor, and every build raises build; each raise sets the parts after it to 0.

**Where.** `Settings and import 11d`, note "The version number".

**What is still open.** Nothing.

## later.md: "A deleted record should not be removed for good at once"

**The problem.** The entry asks where "Recently deleted" lives, which `design/` does not draw yet.

**What changed.** Nothing. The user chose to keep it for a later task, so the entry stays in `later.md`.

**What is still open.** Where "Recently deleted" lives, and the entry's other open questions, for a later task.

## Files

- `README.md` - the design's overview, unchanged from the project root.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - the example numbers in the resting card and 11d's five states, and two notes.
- `support.js`, `components.js` - what the page loads.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the stylesheets, unchanged.
- `styles/pages/settings.css` - the page stylesheet Settings links, unchanged.

## styles/check.js

0 finding(s) across 27 pages.
