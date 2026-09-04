# Building with Spendly

Spendly is a personal spending tracker: orders from real shops, what they cost, what was saved
against retail, and what it adds up to. Its look is quiet and dense — a light canvas, white
cards, one deep green for the thing you are meant to do next.

## Wrap every design in a router

Most of this library navigates. `Button`, `IconButton`, `ButtonLink`, `CardHeader`,
`EntryRow`, `ItemRow`, `OrderRow`, `CategoryRow`, `LegendRow`, `EntityRow` and `FavouriteTile`
all take a `to` prop, and when given one they render a react-router `<Link>`. **Outside a
router they throw and the whole screen goes blank.** Wrap the tree once:

```jsx
import { MemoryRouter } from 'react-router'

<MemoryRouter>
  <Page variant="page-grid">{/* your screen */}</Page>
</MemoryRouter>
```

Nothing else needs a provider. `ToastProvider` and `UpdateNoticeProvider` are exported and can
be wrapped when you want their behaviour, but every component reads its context safely without
them. `Page` is the root every screen sits in — it supplies the gap between cards, so stacking
cards in a plain `<div>` loses the spacing.

## There are no utility classes. Style with the tokens.

This is not a Tailwind-style system. Every component owns its own classes, and you should never
write a `card-`, `button-` or `chip-` class yourself — pass props instead. For your own layout
glue between components, write plain CSS using the design tokens, never raw values:

| Family | Tokens |
|---|---|
| Text | `--text` `--text-body` `--text-muted` `--text-faint` `--text-strong` `--text-inverse` `--text-on-dark` `--text-positive` `--text-negative` `--text-warn` |
| Surfaces | `--bg-app` `--bg-card` `--bg-inset` `--bg-tile` `--bg-hero` `--bg-dark` `--bg-dark-lift` `--bg-positive` `--bg-warn` `--bg-row-hover` `--bg-green-tint` |
| Edges | `--border-card` `--border-control` `--border-divider` |
| Spacing | `--gap-cards` `--gap-block` `--gap-row` `--gap-panel` `--gap-icon` `--pad-card` `--pad-row-y` `--pad-control` `--pad-inset` `--pad-chip` `--gutter-page` |
| Corners | `--radius-card` `--radius-page` `--radius-compact` `--radius-float` |
| Accents | `--green` `--green-deep` `--green-light` `--teal` `--blue` `--donut-blue` `--donut-red` `--donut-yellow` `--donut-purple` `--donut-orange` |

A colour token is named for the surface it paints, not for its hue: `--text-*` is glyphs,
`--bg-*` is a fill, `--border-*` is an edge.

## Variant spellings differ per component. Check before you write one.

Three conventions live side by side, and a wrong spelling renders a class that does nothing —
silently, with no error:

- **`Button`** splits `variant` on spaces and prefixes each word: `variant="ghost compact"`.
  Values: `primary` `outline` `ghost` `caps` `compact` `block` `pill` `invert` `link`.
  `block` is full width with its own resting surface, and it composes: `primary block` is a
  full-width green button.
- **`IconButton`** takes the whole string as one class: `arrow` `clear` `send` `reorder`.
- **`Card`, `CardBody`, `FieldShell`** take the class word in full: `card-body-tight`.

Tone words are per component too, not shared: `KpiCard` takes `good | bad | neutral`, `Note`
takes `positive | warning`, `TagChip` takes `pink | blue`. Read the component's own page.

## Where the truth is

Read `_ds/<folder>/styles.css` and the files it imports for the real rules and the full token
list. Every component has its own page next to it with its props, its modes and a worked
example — those are written from the app's own screens, so prefer them over guessing.

## A screen, put together

```jsx
<Page variant="page-grid">
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap-cards)' }}>
    <KpiCard label="Spent" amount={12480} delta="8% more than August" trend="up" tone="bad" />
    <KpiCard label="Saved" amount={1965} delta="Best month so far" trend="up" tone="good" />
  </div>

  <Card>
    <CardHeader title="Recent orders" to="/orders/all" label="See all orders" />
    <CardDivider />
    <CardBody variant="entry-list card-body-tight">
      <EntryRow to="/orders/1" avatar={{ initials: 'BI', colour: '#14AC72' }}
        name="Bilka" meta="18 April · 4 items" amount="1.284,00 kr." />
    </CardBody>
  </Card>
</Page>
```

Money is written Danish style — `1.284,00 kr.` — and components that format it themselves take
a number, not a string. Labels on buttons are usually capitals.

## There is one tooltip, and it wants a rectangle

Every hover label in the app is the same component — the chart hovers, the sidebar's build
scores, the icon grid. Do not build another one and do not style your own: `Tooltip` takes the
`DOMRect` of whatever is being pointed at and the words to say, and finds a side of that
rectangle with room for them. It draws into `document.body`, so it is never cut off by a card
or a scrolling box.

```jsx
const [at, setAt] = useState(null)

<div onPointerOver={e => {
      const tile = e.target.closest('.icon-picker-tile')
      setAt(tile ? tile.getBoundingClientRect() : null)
    }}
    onPointerLeave={() => setAt(null)}>
  {/* ...controls... */}
</div>
<Tooltip anchor={at}>gas station</Tooltip>
```

Give it no `anchor` and it draws nothing — that is how it is hidden. It never holds a control
and never carries a fact that is not also on the thing it points at, since it answers a pointer
only.

A tooltip is often more than one word. Pass `title` for a heading line, and build the body from
the four classes the chart hovers already use — do not style your own:

```jsx
<Tooltip anchor={at} title="4. september">
  <div className="tooltip-row">
    <span className="tooltip-swatch" style={{ background: '#14AC72' }} />
    <span className="tooltip-name">Spent</span>
    <span className="tooltip-value tabular-figures">402,17 kr.</span>
  </div>
</Tooltip>
```

Plain text in a tooltip is normal weight; `tooltip-value` is the bold half of a pair and sits
hard right. `tooltip-swatch` is an 8px chip — give it a `background`.
