---
category: Forms
---
The control for choosing one value from a list: a trigger that opens a panel of options. Never a native select, because an option can carry a status dot, a mark, a meta value and a check.

## Props

- `value`: what the trigger shows
- `children`: `ComboboxOption`s, with `ComboboxGroup`, `ComboboxSeparator` and `ComboboxEmpty` between them
- `variant`: `'default'` | `'sort'` | `'sort-end'` (a sort control last in its bar, opens leftward) | `'end'` | `'stretch'` | `'bare'` | `'narrow'` (at most the field's width)
- `lead`: content before the value in the trigger, e.g. a status dot
- `prefix`: a word kept in the trigger before the value ("Sort")
- `open` with `onOpenChange(open)`: controlled open state; or `defaultOpen`
- `searchable` with `search` and `onSearch(text)`: the trigger is a text input; the page filters its own options
- `placeholder`: in a searchable trigger
- `noun`: plural name of the options, for the count read out as they narrow ("vendors")
- `disabled`, `autoFocus`, `id`, `aria-label`

## Parts

- `ComboboxOption`: one option. `selected` (shows a check), `onSelect`, `dot` (`'draft' | 'progress' | 'done' | 'returned' | 'cancelled'`),
  `mark` (e.g. a small `Mark`), `meta` (text at the end), `create` (the row that adds the typed value), `truncate`, `disabled`.
- `ComboboxGroup`: a heading over a set of options.
- `ComboboxSeparator`: a rule between sets.
- `ComboboxEmpty`: the panel's text when nothing matches.

## Rules

- Takes no `className` or `style`.
- `searchable` needs `onSearch`, and a query belongs only to a searchable one. Both are reported.
- Picking an option applies it and closes the panel; focus stays on the trigger.
- On touch the panel opens as a sheet from the bottom edge.

## Example

```jsx
<Field label="Vendor">
	<Combobox value={vendor}>
		<ComboboxGroup>Recent</ComboboxGroup>
		<ComboboxOption selected={vendor === 'Indbo Møbler'} meta="7 orders" onSelect={() => setVendor('Indbo Møbler')}>Indbo Møbler</ComboboxOption>
		<ComboboxOption selected={vendor === 'HAY'} meta="3 orders" onSelect={() => setVendor('HAY')}>HAY</ComboboxOption>
	</Combobox>
</Field>
```
