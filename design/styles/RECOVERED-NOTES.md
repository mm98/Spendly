# Rules not yet written into a component

These rules came from sections that were deleted because their specimens redrew c2-c18. Every
other rule in those sections is carried by a component or a page, or no longer matches
`tokens.css`. What is left is kept here until it is written into the component that owns it. Move
each one there, then delete it from this file. Sizes and numbers are left out on purpose:
`tokens.css` and Components hold them.

## Inputs

- **Labels are always visible**, above the control. No floating labels and no placeholder-as-label:
  both lose the label when the person is typing and needs it.
- **Which side an icon sits on is a rule.** Left says what the field holds: the search glyph, a
  currency prefix, a category's mark. Right says what clicking does: the combobox chevron, the
  calendar that opens a date picker.

## Buttons

- **One primary per view.** Two primaries means neither is. Duplicate and Delete drop a level even
  though they matter.
- **Destructive is not a red primary.** It only exists inside a confirm dialog, so a red button on a
  page is a bug. The page-level Delete is a secondary that opens the dialog.
- **Loading keeps the width.** The label becomes a spinner and a verb ("Saving…"), with no layout
  shift, and the button stays disabled so a double click cannot submit twice.
- **Labels are specific verbs.** "Import 41 orders", not "Confirm".
- **The confirming action is rightmost**, cancel to its left, in every dialog and footer.
- **Never three buttons in a dialog.** A third option means the question is wrong.
- **If it navigates, it is a link**, an anchor, so cmd-click and middle-click work. A link may look
  like a button. A button must not do navigation.

## Identity marks

- **Initials are worked out inside the component** from the name, never passed in. First letter of
  the first two words, uppercased; one word gives its first two letters; one-character words and
  anything that is not a letter are skipped ("H&amp;M" is HM, not H&amp;). Letters such as Æ, Ø and Å
  are kept as themselves.
- **The mark takes `flex: none`** and the text block beside it `min-width: 0`, so a long name
  truncates instead of squeezing the mark.
- **The mark aligns to the centre of a two-line block**, not to the first line.
