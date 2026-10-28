---
category: Forms
---
The control for choosing one value from a list: a trigger that opens a panel of options. With `multiple`, a field of typed values shown as chips, each with its own remove button, and an input after them to add one more. Never a native select, because an option can carry a status dot, a mark, a meta value and a check.

## Props

- `value`: what the trigger shows
- `children`: `ComboboxOption`s, with `ComboboxGroup`, `ComboboxSeparator` and `ComboboxEmpty` between them
- `variant`: `'default'` | `'sort'` | `'sort-end'` (a sort control last in its bar, opens leftward) | `'end'` | `'stretch'` | `'narrow'` (at most the field's width)
- `fullWidth`: takes all the room it is given: the width of its column, or what is left in its row
- `lead`: content before the value in the trigger, e.g. a status dot
- `prefix`: a word kept in the trigger before the value ("Sort")
- `open` with `onOpenChange(open)`: controlled open state; or `defaultOpen`
- `searchable` with `search` and `onSearch(text)`: the trigger is a text input; the page filters its own options
- `placeholder`: in a searchable trigger
- `noun`: plural name of the options, for the count read out as they narrow ("vendors")
- `disabled`, `autoFocus`, `id`, `aria-label`

With `multiple`:

- `value`: the list of values (default `[]`); `onChange(values)` receives the whole new list
- `placeholder`: in the add input ("Add…")
- `marked`: one value drawn in green, as the name that matched
- `trails`: maps a value to a mark drawn before its remove, e.g. a status dot
- `end`: a button at the field's right end; the chips keep clear of it
- `children`: `ComboboxOption`s offered in a panel as the reader types; with `onSearch(text)` to filter them and `noun` (plural) for the count read out
- `danger`: marks the input invalid

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
- The panel is the field's width. It grows past it only for an option that would not fit, up to 288; a longer option stays on one line and ends in an ellipsis.
- A panel moved to fit (hung from the field's edge, lifted out of a box that would cut it, turned upwards) fades out where it stood, then goes back under the field. The same holds for a `Menu` opened from a button.
- A list longer than its cap scrolls inside, with the thin scrollbar every scrolling list shares.
- With `multiple`: only Enter or a new line ends a value, never a comma, since a name can hold one. Backspace in the empty input removes the last value. A pasted list adds one value per line. The same value is never added twice. An added chip grows in and a removed one shrinks out.

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

```jsx
<Field label="Other names for this vendor">
	<Combobox multiple value={names} onChange={setNames} placeholder="Add…" />
</Field>
```
