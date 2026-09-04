---
category: Forms
---
The wrapper every control in Spendly sits in: it draws the label, the optional marker, the
rejection message and the help text, in that order. A control without a `Field` around it has
no label and no way to show an error.

## How to compose it

`Field` holds one control. Give the control an `id` and the field the same string as `htmlFor`,
so the label points at it.

```jsx
<Field label="Name" htmlFor="category-name">
  <FieldShell>
    <TextInput id="category-name" value={name} onChange={setName} aria-label="Category name" />
  </FieldShell>
</Field>
```

A plain `TextInput` needs a `FieldShell` around it to get its border. `Combobox`, `DateInput`
and `TextArea` bring their own shell, so they go straight inside the field.

## label or div

`Field` renders a `<label>` normally, and a `<div>` when you pass `group`. Use `group` whenever
the field holds more than one control — a `Segmented`, a colour picker, an icon picker. A label
wrapped around a group of buttons labels only the first of them.

Use `htmlFor` whenever anything clickable comes before the control inside the field. A `<label>`
with no `for` addresses its first clickable descendant, so a field whose chips come first would
send every stray tap to a chip's remove button.

## Saying a value is wrong

One rejection, in one place: the message under the field, plus `invalid` on the control. Do not
add a page-level summary or a toast repeating it, and do not mark a field before the form has
been submitted.

- `error` — the message, e.g. `Who did you buy from?`
- `errorId` — the id of that message span
- the control gets `invalid` and `describedBy={errorId}`

The convention for `errorId` is the control's id plus `-error`. `useFieldErrors` builds all four
values for you: `{...errors.propsFor('order-vendor')}`.

## Optional and help

Every field is required unless `optional` says otherwise; there is no "required" marker. The
`(optional)` word rides in the label so it survives the field filling up — a placeholder saying
the same thing disappears the moment something is typed.

`help` is a muted sentence under the field. Use it for what the reader cannot see: what a value
is used for, or what leaving it empty means.

## Props

- `label`, `optional`, `help`
- `error`, `errorId`
- `group` — renders a div, for a field holding a group of controls
- `htmlFor` — the control's id
- `className`; anything else is spread onto the element

## Example

```jsx
<Field label="Monthly budget" optional htmlFor="category-budget"
  help="Leave it empty for no budget."
  error={budgetField.error} errorId={budgetField.errorId}>
  <FieldShell>
    <TextInput id="category-budget" inputMode="decimal" value={budget}
      invalid={budgetField.invalid} describedBy={budgetField.describedBy}
      onChange={setBudget} aria-label="Monthly budget" />
    <FieldUnit>kr.</FieldUnit>
  </FieldShell>
</Field>
```
