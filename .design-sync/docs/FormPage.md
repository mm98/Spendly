---
category: Forms
---
The whole page a record is created or edited on: the card with its headline, lead, fields and
footer, and the rail of summary cards beside it. Five screens are built on it — order details,
order items, scan review, category and vendor — so reach for it for any create or edit screen
rather than arranging a card and a form yourself.

## How to compose it

Pass the fields as children, in order. Everything around them is drawn for you: the card, the
headline, the lead, the step banner, and the split CANCEL / save footer.

```jsx
<FormPage
  title="Edit category"
  lead="Its name, its look, and how much it can spend each month."
  cancel={{ to: '/categories/all' }}
  submit={{ label: saving ? 'SAVING...' : 'SAVE CHANGES', onClick: save, disabled: saving }}
  rail={<CategorySummary values={values} />}>
  <Field label="Name" htmlFor="category-name">…</Field>
  <Field label="Monthly budget" optional htmlFor="category-budget">…</Field>
</FormPage>
```

Never pass a `FormActions` of your own — there would then be two footers on the page.

## The two buttons

`cancel` and `submit` are descriptions, not elements. The page decides how each is drawn, which
is what keeps every form's footer the same:

- `cancel` — `{ to }` for a route, `{ onClick }` for anything else, plus `label` and `icon`
  where the way out is not "CANCEL" (a wizard's step 2 uses `{ label: 'BACK', icon: 'chevronLeft' }`).
- `submit` — `{ label, onClick, disabled }`. Write the label in capitals, name the act
  (ADD CATEGORY, SAVE ORDER, NEXT STEP), and swap it for "SAVING..." with `disabled` while the
  request is in flight.

## steps, notice and rail

- `steps` draws the banner above the card: `[{ label, icon, done, on }]`. `done` puts a check
  on a step behind you. Leave it out for a form that is not a wizard.
- `notice` sits between the lead and the first field. It is for a verdict about the whole form
  — "Total matches." A rejected field is drawn under that field by `Field`, never here, and
  never as a toast.
- `rail` is the column beside the form. It carries the live summary that mirrors the fields,
  and on an edit form a `DeleteCard`. Pass a fragment for both. Below 1180px the rail drops
  under the form, so nothing in it may be needed to fill the form in.

## Waiting for the record

An edit form's fields are hooks, so they may only mount once the record has arrived. Render
`RecordWait` while it is on its way, not `FormPage` with empty values:

```jsx
if (!record.data) return <RecordWait state={record} label="Loading the category" steps={steps} />
```

## Props

- `title`, `lead`, `label`
- `steps` — `[{ label, icon, done, on }]`
- `notice` — a node, normally a `Note`
- `rail` — the cards beside the form
- `cancel` — `{ to, onClick, label, icon }`
- `submit` — `{ label, onClick, disabled }`
- `children` — the fields
