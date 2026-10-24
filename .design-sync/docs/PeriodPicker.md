---
category: Dates
---
The period bar on Statistics: window presets, a stepper, the dates the window covers, and room for a switch and actions.

## Props

- `presets`: `{ value, label }[]`; values are `'days30'` | `'week'` | `'month'` | `'quarter'` | `'year'` | `'custom'`. Default: This week, This month, This quarter, This year, Custom
- `value`: the chosen preset
- `onChange`: receives `{ period, selected: { from, to } | null, past: { from, to, name } | null }`
- `from`, `to`: ISO dates of a custom range
- `at`: an ISO date the presets resolve around (today when left out)
- `stepper`: a `PeriodWindow`, shown after the presets
- `onPresent`: when given and the window does not hold today, a "Back to this month" button replaces the note
- `custom`: what opens under the last preset (Custom), usually a `RangePicker`
- `extra`: after the dates, e.g. a `Choice` with a `Switch`
- `actions`: at the row's end
- `name`: the radio group's name
- `locale`: a language tag (`'da-DK'`)
- `children`: only a `Selected`, whose children (or a function of the periods) draw the comparison area

## Parts

- `Selected`: the comparison slot. It renders nothing itself.

## Rules

- Takes no `className` or `style`.
- Any child other than `Selected` is reported, and so is an empty `Selected`.
- A running window shows its dates up to today, never days that have not happened.

## Example

```jsx
<PeriodPicker name="period" value="month" locale="da-DK" onChange={choose}
	stepper={<PeriodWindow unit="month" label="August 2026" onPrevious={back} onNext={on} />} />
```
