# Where Ask finds offers

Spendly can tell what shops have on offer now, in an Ask answer. It reads that from other websites,
one **source** each.
The folder:

```
offers/
  index.js          the sources, in order; the limits; one lookup, the papers of its offers, and how an offer is shown
  tilbudsugen.js    groceries in Denmark, from tilbudsugen.dk
  tilbudsugen.md    everything known about that site: its addresses, answers, keys, terms and faults
```

Ask's tool is the offers maker, `format/offers/`, which shows the offers as a block in the answer and
keeps it with the chat. It reads only `index.js`; nothing else in the server names a source. `/mcp` never offers the tool: it fetches another site, and a token only opens routes that
answer from what is stored.

## A source

One file here, one line in `OFFER_SOURCES`, and a notes file of the same name beside it. The notes
hold everything found out about the site: the addresses it answers, the shape of an answer, its keys
and errors, what its terms say, and the faults in its data, so the next change starts from them.

```js
export const pricesite = {
	key: 'pricesite',             // the value Claude sends in source
	name: 'PriceSite',            // what Ask calls it when it names where offers come from
	site: 'pricesite.se',
	goods: 'groceries',           // what it covers, told to Claude: "groceries in Sweden"
	country: 'Sweden',
	currency: 'SEK',              // the tool is only given to an account kept in this currency
	limits: { perMinute: 10 },    // optional; any of the limits below
	shopKey: name => 'ica',       // the site's own key for a shop name the reader wrote, or null
	async find({ items, shopKeys }, signal) {
		// one request for the whole list; an Error with retryAfter (seconds) when the site refuses
		return [{ item, offersFound, offers: [{ product, brand, shop, shopLogo, borderShop, price, forHowMany,
			membersOnly, size: { amount, unit }, perUnit: { price, unit }, paper, from, to }] }]
	},
	logosOrigin: 'https://img.pricesite.se',     // optional: where the shops' logos are served from
	searchUrl: item => `https://pricesite.se/search?q=${encodeURIComponent(item)}`,   // the site's own search for an item
	async papers({ item, offers }, signal) {     // optional: each offer's page in the shop's offer paper, or null
		return offers.map(() => null)
	}
}
```

- `find` is called with every item of one question, never once per item, and only with shop keys
  `shopKey` gave. A shop it does not know is told back to Claude without a request.
- `paper` is the address of the offer's page in the shop's offer paper, or null. A source whose search
  has none fills it with `papers`, one request an item, only for the offers that are shown.
- `shopLogo` is the address of the shop's logo, or null when the source has none for that shop. The
  source's `logosOrigin` is added to the pages' Content-Security-Policy, so the browser may load them.
- `shownOffers` in `index.js` adds what the reader sees with an offer: `vendor`, the reader's own
  vendor that the shop is, by name or alias, and `link`, the address the product's name opens: the
  `paper`, or else `searchUrl` for the item.
- A request names Spendly in its `User-Agent`. A source never poses as a browser.
- An offer is what the shop has on offer, with the days it holds, as `YYYY-MM-DD`. Prices are in
  the source's `currency`, and an offer in any other currency is left out.
- A request carries only the items and shops the question named. Nothing from the reader's own data
  is sent.

## The limits

Each source is asked with care. A source's `limits` change any of these:

| Limit              | Default | What it does                                                         |
| ------------------ | ------- | -------------------------------------------------------------------- |
| `perMinute`        | 20      | requests from the whole server in one minute                         |
| `perAccountPerDay` | 50      | requests for one account in one day                                  |
| `keptMinutes`      | 60      | how long one answer is used again for the same items and shops       |
| `pauseMinutes`     | 15      | how long the source is left alone after a failure, unless it says how long |

A kept answer is used before any limit is counted. A request for papers is kept the same way but
not counted, and a failed one only pauses the source when the site said how long to wait. A limit reached or a pause is told to Claude, which
says it in the answer, never waited out, so a question is never held up by it. The counts and kept
answers are in memory: a restart forgets them.
