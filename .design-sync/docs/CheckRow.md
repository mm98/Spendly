---
category: Forms
---
A checkbox with a bold name and a sentence of description under it, where the whole row is the
label and the whole row is the tap target. This is how Spendly asks every yes/no question in a
form.

## How to compose it

`id` is required: the name and the help text get their ids from it, so the control's accessible
name stays the name alone rather than the whole paragraph.

```jsx
<CheckRow id="setting-confirm-delete" checked={confirm} onChange={setConfirm}
  label="Ask before deleting anything"
  help="An order, a category, a vendor, a line item, an attachment. With this off, deleting happens immediately." />
```

It is a row, not a field, so it does not go inside a `Field` and takes no label above it. Put
one or more rows directly in a `FilterSection` or a card body.

## Stacking

Rows placed next to each other become one stack: a divider appears between them and only the
outer corners of the stack stay rounded. Nothing extra is needed — just put them one after the
other.

## Writing the two lines

- `label` is the name, and it is what gets announced. Say the thing itself:
  "Import attachments", "Show the scan card on Home".
- `help` says what changes, and above all what turning it *off* means. It is not a repeat of the
  name in more words.

## CheckRow or Switch

A `CheckRow` asks what the next act should include — read once, when IMPORT or SAVE runs. A
`Switch` states what is true now, and must change something visible the instant it moves. When
in doubt, use a `CheckRow`: every binary option in the app is one.

## Props

- `id` — required; the help and name ids are derived from it
- `checked` — controlled
- `onChange(checked)` — gets the new state
- `label` — the bold name
- `help` — the sentence under it, optional
