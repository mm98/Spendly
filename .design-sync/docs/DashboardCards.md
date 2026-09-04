---
category: Cards
---
Home's dashboard: the cards the reader chose, in the order they chose, with an EDIT band above
them that lets them reorder, remove and add. Use it only for that arrangement — it owns the
grid, the section header and the whole editing mode.

It takes three props and draws everything else itself.

## The contract

```jsx
<DashboardCards
	all={[{ key: 'top_vendors', name: 'Top vendors', desc: 'The shops you spend the most at, all time' }, …]}
	initial={['spending_rhythm', 'top_vendors']}
	render={key => <>…</>} />
```

- `all` — the catalogue of every card that exists. `name` labels the card; `desc` is the
  sentence in the "cards you can add" tray while editing.
- `initial` — the keys this account has on, in its own order. **Every key must exist in `all`**;
  the component looks each one up to name it, and a key it cannot find throws.
- `render(key)` — draws the inside of one card. The component already supplies the
  `<section class="card">` around it, so return a `CardHeader` / `CardDivider` / `CardBody`
  group in a fragment — **never another `Card`**, or you get a card inside a card.

## What it decides for you

The grid (three columns on a wide screen, two under 900px, one on a phone), the "Your cards"
section header and its EDIT button, the reorder grips, the remove buttons, the tray of cards
that are off, and saving the arrangement. The empty case draws its own dashed panel reading
"No cards on your dashboard yet. Press EDIT to add some." — do not write that yourself.

## Props

- `all` — `Array<{ key, name, desc }>`
- `initial` — `string[]`
- `render` — `(key: string) => React.ReactNode`
