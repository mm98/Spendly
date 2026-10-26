# Where Ask finds offers

Spendly can tell what shops have on offer now: in an Ask answer, and on a grocery order. It reads that
from other websites, one **source** each.
The folder:

```
offers/
  index.js          the sources, in order; the limits; one lookup, and the pictures for its offers
  tilbudsugen.js    groceries in Denmark, from tilbudsugen.dk
  tilbudsugen.md    everything known about that site: its addresses, answers, keys, terms and faults
  picks.js          the vendors and categories whose orders get each source's Check offers
  lines.js          the offers for an order's lines: which order shows them, and how a line is matched
```

Ask's tool is the offers maker, `format/offers/`, which shows the offers as a block in the answer and
keeps it with the chat. It and `lines.js` read only `index.js`; nothing else in the server names a
source. `/mcp` never offers the tool: it fetches another site, and a token only opens routes that
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
	currencyName: 'Swedish kronor',   // Settings, Offers: "works only for accounts kept in Swedish kronor"
	limits: { perMinute: 10 },    // optional; any of the limits below
	shopKey: name => 'ica',       // the site's own key for a shop name the reader wrote, or null
	async find({ items, shopKeys }, signal) {
		// one request for the whole list; an Error with retryAfter (seconds) when the site refuses
		return [{ item, offersFound, offers: [{ product, brand, shop, shopLogo, borderShop, price, forHowMany,
			membersOnly, size: { amount, unit }, perUnit: { price, unit }, image, from, to }] }]
	},
	picturesOrigin: 'https://img.pricesite.se',   // optional, with pictures: where they are served from
	async pictures({ item, offers }, signal) {   // optional: the small picture of each offer, or null
		return offers.map(() => null)
	}
}
```

- `find` is called with every item of one question, never once per item, and only with shop keys
  `shopKey` gave. A shop it does not know is told back to Claude without a request.
- `image` is the address of the product's small picture, or null. A source whose search has none fills it
  with `pictures`, one request an item, only for the offers matched to an order's lines. Its
  `picturesOrigin` is added to the pages' Content-Security-Policy, so the browser may load them.
- `shopLogo` is the address of the shop's logo, or null when the source has none for that shop.
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

A kept answer is used before any limit is counted. A request for pictures is kept the same way but
not counted, and a failed one only pauses the source when the site said how long to wait. A limit reached or a pause is told to Claude, which
says it in the answer, never waited out, so a question is never held up by it. The counts and kept
answers are in memory: a restart forgets them.

## Which orders get Check offers

Each source has its own picked vendors and categories (`picks.js`). An order dated in the last 2 months
gets Check offers from the first source the account can use whose picks hold its vendor or one of its
categories. The search itself always covers every shop of the source. The first time an account's
picks are read, each source picks the vendors its `shopKey` knows by name or alias, and never again.
The picks are read and saved by `GET` and `PUT /api/offers/picks` (Settings, Offers) and
`/api/offers/picks/vendor/:id` or `/category/:id` (the Offers card on a vendor's or category's page).
