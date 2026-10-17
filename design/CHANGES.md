# Brief: dialog spacing, Previous imports on a phone, and two notes in design/

Answers the four points of BRIEF-a68c9703.md, plus one change asked for in review: Previous imports drops its small x for a menu.

## 1. Dialogs: 12 between every part

**The problem** - The drawn dialogs (Settings and import 11b, States and confirmations 6d) put every part straight in `.sp-dialog`, 12 apart. `Dialog` in `react_handoff/Overlays.jsx` wrapped everything above the actions in `sp-stack sp-gap-6`, so the app showed the title and the text 6 apart.

**What changed** - The drawings are right. `Dialog` no longer wraps the title, body and note in a stack: each part is a direct child of `.sp-dialog` and takes its 12 gap. The space above the actions stays 12. The component's doc comment and `react_handoff/README.md` (Dialog) now say so.

**Where** - `react_handoff/Overlays.jsx`, `Dialog`; `react_handoff/README.md`. In the app: `react/src/components/Overlays.jsx`, `Dialog`, which reaches all 21 dialog titles in the 15 files the brief lists. "Delete this order?" already sets 12 and does not change.

**What is still open** - Nothing.

## 2. Previous imports: a menu at the end of each line, and the line on a phone

**The problem** - On a phone, Undo and Reuse mapping (or Reuse mapping and the x) sat beside the file name and cut it to a few letters. Separately, in review the small x at the end of an older line was judged a poor way to offer Remove from this list.

**What changed** - Every line in Previous imports ends in a menu (the Menu component, c9, the same trigger and panel as a table row's actions). It holds Reuse mapping, and Remove from this list on a line older than 24 hours. The x and the Reuse mapping button are gone. A line from the last 24 hours keeps Undo as an outline button before the menu, on desktop.

On a phone the name and its facts keep the whole row beside the menu, and Undo goes on its own full-width row beneath them, as the scan choices do (Mobile screens 7a). A line older than 24 hours has no button row. Drawn in both states, with the older line's menu open.

Remove from this list behaves as before: it hides the line only, with the toast and its Undo.

**Where** - Settings and import 11b: the PREVIOUS IMPORTS card in stage 1, the new PREVIOUS IMPORTS · PHONE specimen (361px, `sp-touch`) beneath the toast, and the implementation notes. App: `react/src/pages/SettingsImport.jsx`, `History`.

**What is still open** - Please confirm that Undo stays a visible button rather than going into the menu.

## 3. design/README.md: four open questions restored

**The problem** - Four open questions from the last full overview (commit 2eea677) were no longer written anywhere in design/.

**What changed** - All four are back under Known and open, each marked not decided: the three card heads at 280px; the variant groups that mix structure and colour (`Combobox`, `Menu`, `ListItem`, `TextField`); the three near-empty `Mark` fills (`plain`, `none`, `empty`); the list behaviours not built.

**Where** - `README.md`, Known and open.

**What is still open** - Each of the four, please confirm a decision when one is made.

## 4. mobile-screens.css comment

**The problem** - The comment on `.ms-device .sp-stack` said the scan choices are 6 apart. They are drawn as `.sp-stacked`, 2 apart.

**What changed** - The scan choices are removed from that comment. No rule changed.

**Where** - `styles/pages/mobile-screens.css`, comment above `.ms-device .sp-stack`.

**What is still open** - Nothing.

## Files

- `README.md` - the design overview, with the four open questions restored.
- `CHANGES.md` - this note.
- `Settings and import.dc.html` - Previous imports with its menu, the phone specimen and the notes (11b).
- `react_handoff/Overlays.jsx` - `Dialog` without the 6 stack.
- `react_handoff/README.md` - the Dialog paragraph.
- `styles/pages/mobile-screens.css` - the corrected comment.
- `styles/pages/settings.css` - loaded by Settings and import.
- `support.js`, `components.js`, `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - what the page loads to open from this folder.

## styles/check.js

0 finding(s) across 26 pages
