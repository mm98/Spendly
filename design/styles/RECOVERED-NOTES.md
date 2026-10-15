# Notes recovered from the deleted Input types sections

The four sections (14a Input types, 14b Buttons, 14e Controls that appear once, 14f Identity marks) were removed because their specimens redrew c2-c18. Their notes are kept here until each is either carried into the component that owns it, or dropped as already stated.

## 14a - Input types

- Every control used across the set, with its states and what is specific about it here. This is the whole vocabulary - a screen needing something that isn't on this page is a signal to reconsider the screen.
- **One box, everywhere.** Every text-entry and select control is **1px solid #dedcd4**, radius **9px**, padding **10px 12px**, text **14px** - landing at **42px** tall. Controls that aren't text, like the stepper, get that height explicitly rather than sized by content, so a row of mixed controls needs no alignment work.
- **Focus is one treatment** - border **#1d4d33** plus a 3px **rgba(29,77,51,0.12)** ring, on every focusable control including toggles, checkboxes and drop zones.
- **Labels always visible** - 12px/600 above the control. No floating labels, no placeholder-as-label: both lose the label when the user is typing and needs it.
- **Which side an icon sits on is a rule, not a choice.** **Left** says what the field holds - the search glyph, a currency prefix, a category's IdentityMark. **Right** says what clicking does - the combobox chevron, and the calendar that opens a date picker. A date field therefore carries its calendar on the right, in the same place as the chevron, because it does the same kind of thing.
- **Validation on blur once touched, and on submit.** Never per keystroke. An error clears on the next valid blur, not the first character typed.
- **Touch** - 42px is under the 44px minimum, so on mobile vertical padding goes to **12px** and every control's row carries 44px of hit area.

## 14b - Buttons

- Four levels, and the level is decided by what the action does - not by how much attention the screen wants. One primary per view, always.
- **One primary per view.** Two primaries means neither is. On the edit screen it is Save; Duplicate and Delete drop a level even though they matter.
- **Destructive is not a red primary.** It only exists inside a confirm dialog, so a red button on a page is always a bug - the page-level Delete is a secondary that opens the dialog.
- **Disabled is a last resort.** Prefer letting the click happen and showing what is wrong: a disabled Save with no explanation is the most common dead end in a form. Where it is unavoidable, the tooltip says what would enable it.
- **Loading keeps the width** and swaps the label for a spinner plus a verb ("Saving…"). No layout shift, and the button stays disabled for the duration so a double-click can't double-submit.
- **Labels are verbs, and specific** - "Import 41 orders", not "Confirm". A button that names its consequence needs no explanatory sentence beside it.
- **Geometry:** radius 9px, 13px/600 text, padding 10px 17px primary / 10px 16px secondary (the 1px border keeps the box identical) / 10px 12px ghost. Small variant is 12px text at 8px 13px. Never full-width on desktop; always full-width in a mobile sheet.
- **Confirming action always rightmost**, cancel to its left, 8px gap. The same order everywhere so muscle memory holds.
- **The split button is used once** - New order, where the default is scan and the menu offers manual entry and import. Anywhere else, two buttons.
- **Never three buttons in a dialog.** A third option means the question is wrong.
- **If it navigates, it is a link** - an anchor, so cmd-click and middle-click work. Styling a link as a button is fine; making a button do navigation is not, because it silently removes open-in-new-tab.

## 14e - Controls that appear once

- Six controls that exist in exactly one place each, which is why they were missing from 14a. A control used once still has to be specified - a single unspecified control is a whole screen invented.
- **Inline in the rail, not a popover.** The fields appear under the presets and push the facet groups below them down. A floating panel would cover the list the range is filtering, which is the one thing the user is watching. Full behaviour is specified in **2d** - this card is the control, that screen is the rule.
- **One facet, four settings.** The presets are pill chips, and the range is the same facet: choosing a preset clears the range and closes the fields; opening **Custom…** deselects the other presets. Never a preset and a range at once.
- **No Apply button.** It filters on the first valid date, like every other facet. From alone means "from that date to today" - which is why To carries **Today** as its placeholder rather than refusing to filter.
- **Two DateFields, each with its calendar affordance.** Not an embedded calendar grid - The typing rules from 14a apply - **12/8**, **12-08-26** and **12 aug** all parse. Each field offers a picker; the group does not embed one.
- **An invalid range holds the last valid results.** To before From shows the error inline and the list does not recompute - dropping to zero mid-edit reads as "no orders exist".
- **The popover mode belongs to single dates.** Same DateField with **range={false}**, anchored to its own field - the order date on the edit screen. Inline is the range mode; anchored is the single mode.
- **Mobile:** the whole facet rail is already a sheet, so the range is inline within it. The fields stack full width.
- **The track is inset by half a thumb, not flush.** **margin: 0 9px** - half of the 18px thumb. The thumb is positioned by its centre, so a track running the container's full width puts the thumb 9px outside it at 0% and at 100%. Inset the track and the thumb's outer edge lands exactly on the container edge, level with the two amount fields below.
- The 9px is derived, not chosen: **14px + 2px border × 2 = 18px**, halved. Change the thumb size and this number changes with it. Same reasoning as the overlay-inset rule in 15a - the number comes from the thing it must align with.
- **Slider and fields are one control, two views.** Dragging updates the fields live; typing moves the handles on blur. Neither is a mirror of the other - both write the same pair of values.
- **The bounds come from the data**, not a constant. "0 - 25.000 kr." is the account's own range, rounded up to a sensible step, and it moves as orders are added.
- **The fields are the accurate path.** Handles snap to a step proportional to the range; typed values do not. This is why the slider alone is not enough - 3.000 exactly is typed, not dragged to.
- **Handles cannot cross.** Each stops at the other; they do not swap. Two handles at one position stay draggable - the one last moved keeps priority.
- **Filtering is debounced 300ms after the last change**, whichever input caused it. A drag does not fire a request per pixel.
- **Each handle is a real slider input** with its own aria-label ("Minimum amount"), arrow-key stepping, and Home/End. A pair of divs with a drag handler is not reachable by keyboard.
- **On touch the handles grow to 24px** hit areas without changing their painted size.
- **A Combobox in pick-only mode** with the word "Sort" kept inside the trigger, so the control reads as a sentence and needs no label above it. Options: Newest first, Oldest first, Amount high to low, Amount low to high, Vendor A - Z, Most items.
- **Radius 10px, not 9px.** The one control that deviates, because it sits beside the 10px search field and matches it rather than the form controls.
- **Ties break on order id descending** so paging stays stable - without it, two orders on the same date can swap between pages.
- **No ascending/descending arrow.** The direction is inside the label. A separate direction toggle doubles the states and produces "Vendor A - Z, descending".
- **A range sentence, not numbered pages.** "1 - 25 of 128" answers where you are and how much is left in one line. Page numbers would need 6 targets here and 40 at a larger account.
- **128 is the filtered total.** Never the account total - this is the same number the result count above the list shows, and they must agree.
- **Arrows disable at the ends** rather than disappearing, so the control does not change width. Sizes: 25, 50, 100.
- **Any filter, search or sort change resets to page 1** and clears the selection. Page and size are both in the URL.
- **Changing the size keeps the first visible row visible** - going 25 → 50 on page 3 lands you on page 2, not page 3 of a different pagination.
- **Top 6 by count, then "Show all N".** Expanded, the list scrolls at **240px** rather than growing - the rail must not become the longest column.
- **The filter field appears above 20 values.** It narrows this group only, is not part of the query, and clears when the group collapses.
- **Selected values always render**, above the top 6 and regardless of the group filter, so a selection can never be hidden by the control that displays it.
- **"42 total" is the group's value count**, not a result count - it says how much is behind "Show all".
- **A Segmented plus a resolved-range line.** The line below always states the actual dates, including for Month and Year, so what is being measured is never inferred from a word.
- **"Custom" opens the same popover as the date facet.** One control, two placements - do not build a second range picker for this screen.
- **The compare label names the period it computed**, not "previous period". It is the immediately preceding span of the same length, so for a custom range it reads as dates.
- **Compare off hides every delta** rather than showing zeros, and a delta against a zero base shows " - ", never a percentage.

## 14f - Identity marks

- One component, three kinds. A person is a circle, a vendor is a rounded square of initials, a category is a rounded square holding its icon. The shape carries the type, so a mark is identifiable before its content is read.
- **Five sizes: 20, 26, 34, 44, 56.** Radius scales with the box - 6, 8, 10, 12, and 50% for circles. Type is roughly 0.42 × the box at weight 700, and always two characters.
- **Where each size goes:** 20 inside a chip or a palette row, 26 in a list row, 34 in a card or a wide row, 44 in a form field, 56 in a profile header.
- **Never below 20px.** Two characters at 8px is a smudge; use the text alone instead.
- **The shape is the type.** Circle means person, rounded square means a thing. Do not make vendors round to match the account block - a user and a vendor appearing alike in the same list is the confusion this prevents.
- **Initials:** first letter of the first two words, uppercased. One word gives its first two letters. Words of one character, and anything that is not a letter, are skipped - "H&amp;M" is HM, not H&amp;. Danish letters are kept as themselves, never transliterated to OE or AA.
- **Size ladder:** 22, 26, 32, 40, 56px, with type at **2.7× smaller than the mark** - 22/8, 26/10, 32/12, 40/15, 56/20. Two initials in a circle need that ratio; anything tighter and the letters touch the edge. The 28px avatar in early sidebar drafts was 12px type at 2.3× and read as cramped, which is why the sidebar mark is 32px.
- **Colour is deterministic, from a fixed list.** Hash the normalised name to an index into the seven picker swatches from 14c. Same vendor, same colour, on every screen and after every reload - a mark that changes colour is worse than no mark. Derive from the canonical name, never an alias (5d), or one vendor gets two marks.
- **Never a random or generated colour.** The seven swatches are the whole range, for the reasons in 14c. A hash into an HSL wheel produces colours outside the palette on the first vendor it meets.
- **Ink flips above L 75**, the same threshold as the category tile - light fills take **#1b1a17** or the family's dark tone, not white.
- **The mark is decoration, not information.** It always sits beside the name it belongs to and carries **aria-hidden**; nothing is identified by colour alone.
- **No logos, ever.** No favicon fetching, no upload. A receipt tracker that reaches out to a vendor's website to render a list row is a privacy leak and a broken row when it fails.
- **The mark takes flex: none** and the text block beside it **min-width: 0**, so a long name truncates instead of squeezing the mark.
- **Gap is 11px at 26px**, 13px at 34 and above. The mark aligns to the centre of a two-line block, not to the first line.
- Initials and colour are derived inside the component from **name**, never passed in - that is what guarantees the same vendor looks the same in every list. Category is the exception: its icon and colour are stored on the record because the user chose them.
- Listed in the 14d table as the nineteenth component.
