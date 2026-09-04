---
category: Cards
---
The card listing the returns in a window — a month, a year — with a link to the whole return
history behind it. One component serves both the Orders overview and Statistics, so the two
pages cannot come to disagree about what a return looks like.

It draws the card, the header, the rows and the empty state. You supply the data.

## The data shape

```jsx
<ReturnsCard title="Returns • August 2026" span="August"
	returns={{
		total: 9,
		history: 41,
		items: [
			{ id: 11, vendor: { name: 'Elgiganten', colour: '#0E7A5F', initials: 'EL' },
			  date: '2026-08-22', total: 1899, saved: 200, refunded: true }
		]
	}} />
```

- `items` — the newest few returns, already cut to length. The card does not page: a window can
  hold forty, and paging inside it would be a second orders list beside the real one.
- `total` — how many the window holds. When it is larger than `items.length` the card adds
  "Showing the 3 most recent of 9 returns in August." Equal, and it says nothing — "5 of 5" is
  a count nobody asked for.
- `history` — the account's all-time count, **not the window's**. SEE RETURN HISTORY is drawn
  only when it is above zero, so a quiet month over a long history keeps the link and a fresh
  account is not offered a filtered list that answers nothing.
- Each item: `id`, `vendor` (`name`, `colour`, `initials` for the tile), `date` as `YYYY-MM-DD`,
  `total` and `saved` as numbers (the card formats them in the account's currency), and
  `refunded`, which adds "• refunded in full" to the row's meta.

## Props

- `title` — the header, e.g. `` `Returns${sep}${period.label}` ``
- `span` — the window in words, used in the sentences ("No returns in August.")
- `returns` — the object above

With no items the card shows an empty state reading "No returns in {span}." — that is the
card's own, so do not pass one.
