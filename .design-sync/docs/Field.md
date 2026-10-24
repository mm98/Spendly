---
category: Forms
---
The label, help or error message, and slots around one control. It binds the label to the control and picks the right shape for the kind of control.

## Props

- `label`: the text above the control (beside it for a box, a legend for a set)
- `children`: exactly one control from the library (required)
- `message`, `messageType`: `'hint'` (default) | `'quiet'` (lighter help) | `'warning'` (colours the input) | `'danger'` (marks the input invalid)
- `required`: adds the `*` and passes `required` to the control
- `lead`: content at the input's start, e.g. `<Icon name="search" />`
- `trail`: content at the end, e.g. `<IconButton icon="x" size="field" />`
- `unit`: a unit at the end, e.g. `'kr.'`
- `kbd`: a key hint at the end, e.g. `<Kbd>S</Kbd>`
- `chevron`: a chevron at the end
- `labelAction`: a small button at the label's right end ("Forgot it?")
- `note`, `noteType`: a word beside the label about where the value came from; `'hint'` (default) | `'success'` | `'warning'`
- `after`: content under the message, e.g. a button that acts on it
- `id`: the control's id; generated when left out

## Rules

- Takes no `className` or `style`.
- A field with no control is reported and draws nothing.
- Three shapes, chosen by the control: a value (TextField, NumberField, Combobox, DateField…) gets a label above; a box (Check, Radio, Switch) gets its label beside it, inside a `Choice`; a set (Picker, RangeSlider, Segmented) gets a `FieldGroup` with a legend.
- The control's padding follows the slots. Do not repeat it on the control.

## Example

```jsx
<Field label="Amount" unit="kr." messageType="danger" message="An amount is required.">
	<NumberField value={amount} onChange={setAmount} locale="da-DK" />
</Field>
```
