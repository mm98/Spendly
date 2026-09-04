---
category: Forms
---
A bordered box that keeps a group of fields together. Settings stacks four of them down one
form; All orders uses one as the filter panel under its toolbar. Reach for it whenever a form
holds more than one question and the reader would otherwise face an undifferentiated stack of
controls.

## How to compose it

Open it with a heading, then the fields. The section is a grid with its own 14px gap, so the
fields need nothing between them.

```jsx
<FilterSection>
  <span className="panel-heading">New orders</span>
  <FieldPair>
    <Field label="Kind" htmlFor="setting-default-kind">…</Field>
    <Field label="Status" group>…</Field>
  </FieldPair>
</FilterSection>
```

Group by the question being answered, not by the kind of control. Two sections of two controls
that each share a heading read better than one section of four that do not.

## As a panel that opens and closes

`id` names the panel for the button that opens it, and `hidden` closes it. The fields stay in
the DOM with their values, so nothing is lost and nothing above the panel moves.

```jsx
<ListToolbar … filters={{ open, panelId: 'filter-panel', onToggle: () => setOpen(o => !o) }} />
<FilterSection id="filter-panel" hidden={!open}>…</FilterSection>
```

Close such a panel on its own actions — an APPLY button and a CLEAR beside it, in a
`FormActions`.

## Props

- `children` — a `panel-heading` span, then the fields
- `id` — the panel's id, for `aria-controls`
- anything else is spread onto the div, which is how `hidden` reaches it

## Where the optional half goes

Fields that only appear once something above them is turned on go in a `FilterSectionBody`
inside the section, not in a plain div — a div takes them out of the section's grid and they
end up stacked with nothing between them.
