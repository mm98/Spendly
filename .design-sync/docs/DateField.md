---
category: Dates
---
One date: typed in the reader's own format or picked from a drawn calendar on desktop, the platform's own picker on touch.

## Props

- `value`: an ISO date (`'2026-08-14'`), or `''` for none
- `onChange`: receives the ISO date, not an event
- `min`, `max`: ISO dates; days outside them are disabled
- `unavailable`: a function `(isoDate) => boolean`, or an array of ISO dates, that blocks single days
- `native`: `true` uses the platform's date input; `false` draws the calendar. Left out, the field is native inside a `.sp-touch` surface
- `danger`: marks the field as wrong (a `Field` with `messageType="danger"` does the same)
- `showWeeks`: ISO week numbers beside the month (default `true`)
- `shortcuts`: the Today and Yesterday chips in the calendar (default `true`)
- `fullWidth`: takes all the room it is given: the width of its column, or what is left in its row. Inside a `Field`, set it on the `Field`
- `locale`: a language tag (`'da-DK'`); sets the date order, separator and first weekday
- `placeholder`: what the empty field says; defaults to the locale's pattern (`dd.mm.yyyy`). An open end can say `'Today'`
- `id`: the input's id (a `Field` passes it)

## Rules

- Takes no `className` or `style`.
- Every value in and out is an ISO date; only the shown text follows the locale.
- A `value` before `min`, after `max` or on an unavailable day is reported. The page fixes it; the field does not change it.
- A native picker cannot block single days: pass `native={false}` where `unavailable` matters.
- Put it in a `Field` for its label and message.

## Example

```jsx
<Field label="Order date">
	<DateField value={date} onChange={setDate} locale="da-DK" />
</Field>
```
