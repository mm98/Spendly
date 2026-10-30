# Language setting

## Fixed from handoff_language_setting

Language and formats now comes before Appearance: the second row of the Settings section nav, the second card of the pane, the Settings list row on a phone, and the c22 and c35 specimens (`Settings and import 11a`, `Mobile screens 11a`, `Components c22`, `c35`). App: `react/src/pages/Settings.jsx`, the order of the sections and their cards.

Answers point 1 of the brief "a Language setting, and how components get their text": the Language control in Settings. The rest of the brief is code, for Claude Code; the decisions it needs are recorded in section 3, so nothing is left to ask.

later.md on main was read first. It has one entry, Recently deleted, kept for later at the user's decision. This package settles no entry.

## 1. Language in Settings

**The problem.** Spendly is to show its text in English or Danish, as a setting of its own, and Settings had nowhere to choose it.

**What changed.** Language is the first field of the card, full width, with Currency and Date and time format side by side under it. It is a combobox, the same as Currency, with these three options in this order:

- "Match my browser (English)" - the bracket names what the browser resolves to: the first of the browser's languages (`navigator.languages`) that is English or Danish, else English.
- "English"
- "Dansk"

"English" and "Dansk" are always written in their own language, whatever language is in use. The help line under the field reads "The language Spendly's words are shown in. Currency, dates and times keep their own format."

A pick applies at once, as Theme does, and is kept with Save. Language is stored apart from Currency and Date and time format: Danish money and dates with English text is a valid combination.

**Where.** `Settings and import 11a`, the card and its implementation note. Phone: the card is the same on the pane's own page; its row in the Settings list is `Mobile screens 11a`. App: `react/src/pages/Settings.jsx`.

**What is still open.** Nothing.

## 2. The card is now Language and formats

**The problem.** With Language in it, the title "Money, dates and times" no longer named what the card holds.

**What changed.** The card's title is "LANGUAGE AND FORMATS", and the Settings section nav row and the phone's Settings list row read "Language and formats". It is still the longest label in the section nav, so the nav's 224 width and its comment hold.

**Where.**
- `Settings and import 11a`: the section nav row, the card head and the note.
- `Mobile screens 11a`: the Settings list row.
- `Components c22` and `c35`: the specimen rows, and the c35 note.
- `styles/components.css`: the comment above `.sp-section-nav`. No rule changed.
- App: `react/src/pages/Settings.jsx`, the pane's name in the section nav and on its card.

**What is still open.** Nothing.

## 3. Decisions for the code side

These were answered in this project's chat. Nothing in them needed drawing.

- **Before sign-in** (Sign in, Register, Reset password): the language follows the browser, by the same rule as Match my browser, and is English for any other language. These pages have no switch.
- **How a component gets its text:** the component reads its own text from the shared language files by key. The text props a component already takes (such as `doing`, `hint`, `commit`, `kind`, `word`, `placeholder`) still override it.
- **Numbers inside a text:** a number goes into a message already formatted by "Money, dates and times". The message's plural choice reads the raw count.
- **Sentences built from pieces:** a sentence that splices in a word a page passes, such as `noun` in `List` and `Picker` ("Select all 5 orders on this page") or `what` in `LineEditor` ("Move the row up"), becomes whole sentences. The message then chooses between them by that word, using ICU `select`. `countOf` in `Combobox.jsx` builds "6 vendors" the same way. The brief's table does not list it, but it needs the same treatment.
- **Danish wording:** `da.json` is left for Carsten. A key missing from `da.json` shows the English text.
- **Storybook:** one Language switch in the toolbar (English, Dansk), for every story.

## Files

- `CHANGES.md` - this note.
- `README.md` - the design's overview, unchanged from the project root.
- `Settings and import.dc.html` - sections 1 and 2.
- `Mobile screens.dc.html` - section 2, the phone's Settings row.
- `Components.dc.html` - section 2, the c22 and c35 specimens and the c35 note.
- `styles/components.css` - section 2, one comment.
- `support.js`, `components.js`, `view.js`, `icons.js`, `styles/tokens.css`, `styles/schemes.css`, `styles/doc.css`, `styles/pages/settings.css`, `styles/pages/mobile-screens.css`, `styles/pages/budget.css`, `assets/two-step-qr.svg` - loaded by the three pages, unchanged from main.

Every file is main's `design/` copy as of 2026-10-30T08:04Z, with only the changes above.

`styles/check.js`: 0 findings across 28 pages.
