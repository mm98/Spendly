---
category: Lists
---
A list of records drawn as a table: a summary line, a head row, one row per record from a template, and a foot that counts and loads more.

## Props

- `data`: the records loaded so far (default `[]`)
- `recordKey`: a function of one record that returns its key (required)
- `noun`: what the records are, plural, as in the count line (default `'records'`)
- `rowTo`: a function of one record that returns its route; each row then links to it by its title cell
- `onRowClick`: a function of one record, for a row that acts instead of going somewhere
- `pageSize`: how many records show before Load more (default `20`)
- `selectionKey`: when it changes, the list's own selection is cleared
- `picked` with `onPick`: the page keeps the selection. `picked` is the keys picked; `onPick` receives the next array of keys
- `rowVoid`: a function of one record; `true` draws that row faded (a record that does not count, such as a cancelled order)
- `bulkNote`: a line under the bulk bar while records are picked
- `compact`: tighter rows
- `total` with `onLoadMore`: the server pages. `data` is what is loaded, `total` is how many there are, and Load more calls `onLoadMore`
- `headless`: no head row; each cell then carries its column's width itself
- `locale`: whose way of grouping thousands the counts use; the browser's when absent

## Parts

Slot parts render nothing on their own; `List` reads them. They go as direct children of `List`.

- `Caption`: what sits in the summary line above the table. Content, or a function of the records. Without it the list states its own count, such as "4 orders".
- `ListHead`: the head row. One `ListCell` per column, each with a `width`.
- `ListRow`: the row template. Its child is a function of one record that returns that record's cells, in the head's order.
- `Foot`: anything the foot carries beside the count and Load more.
- `ListCell`: one cell. In the head: `width` `'title'` | `'flex'` | `'date'` | `'number'` | `'status'` | `'amount'` | `'menu'`. In a row: `cell` `'default'` | `'flex'` (a mark and text in a line) | `'amount'` (a stacked amount and a second line) | `'menu'` | `'number'` | `'checkbox'`, and `truncate`. A `checkbox` cell in the head and in the row makes the list selectable.
- `SelectAllBox`: the box that selects every record on the page: `selectedCount`, `total`, `noun`, `onToggleAll` (receives `true` or `false`). The list draws it itself in the head and the bulk bar; `BulkBar` and `ListToolbar` take its props as `selectAll`.

## Rules

- Takes no `className` or `style`.
- Takes only `Caption`, `ListHead`, `ListRow` and `Foot` as children.
- Needs a `ListRow`.
- The head needs exactly one `title` cell: it is the column that takes the free width.
- The row draws as many cells as the head has columns.
- A head with a `checkbox` cell needs a `checkbox` cell in the row as well.
- A row either goes somewhere (`rowTo`) or acts (`onRowClick`), not both.
- `total` needs `onLoadMore`, and `picked` needs `onPick`.
- While records are picked, the bulk bar takes the summary line's place. Escape clears the selection.
- Load more is gone once everything is loaded, never disabled.

## Example

```jsx
<List data={orders} recordKey={o => o.ref} noun="orders" rowTo={o => `/orders/${o.ref}`}>
	<ListHead>
		<ListCell cell="checkbox" />
		<ListCell width="title">Order</ListCell>
		<ListCell width="date">Date</ListCell>
		<ListCell width="amount">Amount</ListCell>
	</ListHead>
	<ListRow>{o => (
		<>
			<ListCell cell="checkbox" />
			<ListCell cell="flex">
				<Mark size="medium" fill="solid">{o.name}</Mark>
				<Stacked>
					<span className="sp-title sp-truncate">{o.name}</span>
					<span className="sp-subtitle">{o.ref}</span>
				</Stacked>
			</ListCell>
			<ListCell><span className="sp-data sp-number">{o.date}</span></ListCell>
			<ListCell cell="amount"><span className="sp-amount">{o.amount}</span></ListCell>
		</>
	)}</ListRow>
</List>
```
