---
category: Feedback
---
A value shown as formatted, coloured JSON. Reach for it wherever the app has to show a reader
the literal shape of a request, a response, or what a machine read — an API reference block, or
the raw answer behind a screen of fields.

## How it colours

The block is `JSON.stringify(value, null, 2)`, then a small tokenizer over that output — keys
bold, strings green, numbers blue, punctuation muted. Because the colour is applied to
`stringify`'s own text, the block can never drift from the value it stands for. Do not
hand-format a string and pass it: pass the value.

```jsx
<Card aria-label="Import from another system">
	<CardBody variant="card-body-page">
		<div className="card-headline">Import from another system</div>
		<JsonBlock value={importExample} label="Import request shape" />
		<span className="field-help">Each order imports on its own, so one bad row fails alone.</span>
	</CardBody>
</Card>
```

## How to compose it

- Inside a `CardBody`, one block per request or response. The block already carries its own
  bottom gap, so do not add a margin.
- Never annotate inside the block. Rules and explanations go in ordinary prose under it — a
  `field-help` line or a `<ul>` — because annotation columns inside the JSON drift out of
  alignment the moment a field is added.
- Long lines scroll sideways inside the block; the block never widens its card.
- Keep the example short enough to read whole. Trim optional fields rather than showing a
  screenful; the prose under it can name the rest.

## Props

- `value` — any JSON-serialisable value. Required.
- `label` — the block's accessible name, e.g. `"Import request shape"`.
- `className` — extra classes on the `<pre>`. The app passes `json-dialog-body` when the block
  is the scrolling body of a `JsonDialog`, and nothing otherwise.
