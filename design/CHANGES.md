# Tip placement: a tip shows over any box, and moves only at the window's edge

Answers the later.md entry "For Claude Design: a tip shows over any box, and moves only at the window's edge".

## Tips are placed against the window (settles the later.md entry above)

**The problem:** a tip (c18) was drawn inside its control with absolute placement, so a box that scrolls cut it off at its edge, as on the first row of Chats and Files (Ask 24e, 24f). The app fixed this in `react/src/styles/app.css` with an `@supports (anchor-name: ...)` block that the design did not have.

**What changed:** the rule is now the design's. A tip is placed against the window and anchored to its control: above and centred, `--sp-6` clear, and it moves to the side along the top, then under the control, only when it would leave the window. On the last control of the chat field and on the conversation menu it starts aligned to the control's right side. The tip's appearance (ground, radius, type, padding, timing) is unchanged. Without anchor positioning the existing absolute placement above the control stays.

**Where:** `styles/components.css`, the `@supports (anchor-name: --tip)` block directly after the c18 tooltip rules and `.sp-chat__more` (unlayered, beside the component). Components c18 gains a "Placement" note. App side: remove the same block from `react/src/styles/app.css` (the one under "a tip shows over any box that scrolls or clips (c18)"), and remove this entry from `later.md`.

**What is still open:** nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - c18 with the Placement note.
- `styles/components.css` - the tip placement block.
- `styles/tokens.css`, `styles/doc.css`, `support.js`, `components.js` - what Components loads to open from the folder.

## Check

`styles/check.js`: 0 finding(s) across 27 pages.
