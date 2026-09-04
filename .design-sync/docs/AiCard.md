---
category: Cards
---
The dark green card that offers the scan flow: a headline, a sentence, and the actions that
start it. It is the app's one inverted surface, so anything placed inside it has to be the
inverted variant of itself.

The card supplies its own background (a dark gradient) and its own text colour. Do not wrap it
in another `Card` and do not give it a light body.

## The action row

`children` become the row at the foot. Use exactly these:

- `<Button variant="invert">SCAN A RECEIPT</Button>` — a default or `primary` button
  disappears into the dark fill.
- `<ButtonLink className="button-link-invert">LATER</ButtonLink>` — for the quiet second action.
- `<AiCardMark />` — the brand glyph, which pushes itself to the right end of the row.

## The header band

`header` is an object, not markup, and the whole band becomes a link to `header.to`:

```jsx
header={{
	to: '/scan',
	title: 'Get receipts read for you',
	meta: 'Finish setting up Spendly',
	destination: 'Scan receipt',
	progress: true
}}
```

- `title` is the line the eye reads first; `meta` is the quiet line under it.
- `destination` is added to the spoken name as ", open Scan receipt", so it must be words a
  person could say, not a path.
- `progress` draws the scan glyph in a tile to the left of the title. Use it while the account
  is still being set up.

Leave `header` out entirely for the form-rail version: the card then opens straight on the
headline.

## Props

- `header` — the object above, or nothing
- `headline` — the bold line
- `body` — the sentence under it
- `children` — the action row
- anything else is spread onto the `<section>`

## Example

```jsx
<AiCard headline="Have the receipt? Skip the form."
	body="A photo or PDF fills every field for you; you only review it.">
	<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
	<AiCardMark size={34} />
</AiCard>
```
