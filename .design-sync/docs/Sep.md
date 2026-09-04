---
category: Layout
---
The one separator the app puts between two facts on the same line — a bullet with a space on
each side. It is a component so the character lives in one place.

Reach for it whenever a meta line carries more than one fact: a date and an item count, a
label and a number, two key hints. It is not a list separator (a comma does that inside one
fact, as in "Groceries, Household") and not a heading decoration.

```jsx
<div className="entry-meta">{order.dateLabel}<Sep />{plural(order.itemCount, 'item')}</div>
```

## In JSX, and in a string

`<Sep />` is for JSX, where the two sides are elements or expressions. When the line is built
as a template literal — a `title`, an `aria-label`, a toast — import the string form instead:

```jsx
import { sep } from '../api/format.js'
<CardHeader title={`Spent${sep}${period.label}`} />
```

The two are the same character. Never type a bullet, a dash, or a pipe by hand.

## Props

None. It takes nothing and renders one string.

## Example

```jsx
<span className="section-label">Lines read<Sep />{answer.linesRead}</span>
<span className="field-help">Enter saves<Sep />Escape cancels</span>
```
