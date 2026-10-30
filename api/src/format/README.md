# What Ask makes

Ask answers with words, and with things it makes: a file to download or a chart drawn in the answer,
from the reader's own data. Each kind of thing is a **maker**, and each maker offers **formats**. The folders say which is which:

```
format/
  index.js          the makers, in the order Claude is offered their tools
  schema.js         how an input is described to Claude: text(), day()
  file/
    index.js        the file maker: its tool, how a file is made, shown and emailed
    formats.js      the file formats, in order; the first is the fallback
    document.js     the document every format builds from, and what they share
    xlsx.js  csv.js  docx.js  pdf.js
  chart/
    index.js        the chart maker
    kinds.js        the chart kinds, in order; the first is the fallback
    fields.js       how a chart's input is cleaned
    drawing.js      the canvas the email's chart pictures are drawn on
    bars.js  shares.js
```

The rest of the server reads only these lists. Claude's tools, the answer loop, a chat opened
again, Files and the emailed chat all take what they know from them. Nothing else in the server
names a format.

## A file format

One file in `file/`, and one line in `formats.js`.

```js
export const txt = {
	type: 'txt',                  // the file's ending, and the key a made file is stored under
	name: 'Text',                 // what the file's row calls it: "Text · 2 KB"
	word: 'text file',            // what Ask says while it makes one: "Making your text file"
	mime: 'text/plain; charset=utf-8',
	note: 'A text file holds no tables.',   // optional, added to what Claude is told about sections
	options: {                    // optional; Claude sets them under options.txt
		width: { type: 'number', description: 'Characters a line holds.', default: 80 },
		case: { type: 'string', enum: ['lower', 'upper'], description: 'Letters.', default: 'lower' }
	},
	build(doc, write, options) {  // the bytes, as a Buffer
		return Buffer.from(doc.title)
	}
}
```

- `doc` is described in `document.js`. `write` writes an amount, a count and a date the way the
  account does. `options` holds every option the format declares: as Claude set it when it is of
  the declared type or one of its values, else its default.
- An option is `type` `string`, `number` or `boolean`, or a list of values in `enum`, with a
  `description` for Claude and a `default`.
- A format with pages offers `PAGE_ORIENTATION` from `document.js` as its `orientation`, so every
  such format turns its page the same way.
- The app needs nothing: it shows the `name` and the `word` the server sends, and What Ask can do
  lists the `name`.

## A chart kind

One file in `chart/`, one line in `kinds.js`, and a drawing in the app.

```js
export const lines = {
	kind: 'lines',
	name: 'Line chart',                   // what What Ask can do calls it
	use: 'over time, as a line',          // told to Claude after "lines"
	properties: { points: { ... } },     // the tool's input fields this kind reads, each "With lines: ..."
	shape(asked, chart) { ... },         // the fields kept, or { failed } with the line the frame shows
	picture(chart, write) { ... },       // the email's picture, a PNG Buffer, drawn on drawing.js's canvas
	words(chart, money) { ... }          // the chart in words: its alt text, and the email's text
}
```

The app draws a chart by its kind: add the drawing to `CHART_DRAWINGS` in
`react/src/app/askAnswer.jsx`. A new drawing is a design question first: it is built from
what `design/` draws.

## A maker

A new folder with an `index.js`, and one line in `index.js` here.

```js
export const mapMaker = {
	place: 'map',                         // the place mark in an answer: {{map:ID}}
	name: 'Maps',                         // its part on What Ask can do (Ask 24c)
	formats: () => ['Street map'],        // its formats' names there, read each time; none keeps it off the list
	example: 'Show where I shop on a map',
	note: 'Maps are kept for 30 days',    // optional, the footnote under the list
	off: unlimited => null,               // optional, why this server makes none for the reader
	tool: { name, description, input_schema },   // or userId => that tool, or null when the reader has none
	rules: 'Use make_map only when ...',  // optional, added to what Claude is told when it has the tool
	doing: input => 'Drawing your map',   // what Ask says while it makes one
	make: async (input, making) => ({ item, said }),   // item has an id, or { items }; said is the tool's answer to Claude
	byIds: (userId, ids) => ({ [id]: item }),           // what was made, as it is now
	emailBlocks: (ids, items, { attached, write, money, tokens }) => [block],
	attachments: (userId, ids, items, write) => [{ id, inline, filename, content, contentType, cid }],
	sweep: () => {}                       // runs every minute, to remove what is past its days
}
```

- `making` holds the reader, the chat, the day, the question and its time, `write`, and the session
  to read the API with.
- What a maker keeps, and for how long, is its own: files are in `user_ask_files` with their
  bytes on disk, charts in `user_ask_charts`.
- An attachment that is `inline` is a picture the email shows in place, and always goes with it.
  The rest go in the order the answers name them, while they fit.
- The app draws a maker's place marks from `PLACES` in `react/src/app/askAnswer.jsx`, and an
  email block from `api/src/emails/ask-chat.html`. Both are design questions first.
