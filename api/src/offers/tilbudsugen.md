# Tilbudsugen.dk, as Spendly reads it

What is known about the site behind `tilbudsugen.js`. Checked against the live site in October 2026;
the site changes without notice, so check again before relying on a detail.

## Who and what

- A Danish site that collects the current offers of Danish shops: supermarkets, discount chains,
  hypermarkets, weekly offer papers, and border shops in Germany (Scandinavian Park and others).
- Owned by the company behind MyShopping (images are served from `myshopping-eun.azurewebsites.net`).
  Contact: `post@tilbudsugen.dk`, page `https://www.tilbudsugen.dk/page/contact-7`.
- Built with Next.js on Vercel. Answers carry `cache-control: public` and `x-vercel-cache`.

## May Spendly use it?

- There is **no terms of use page**. The footer says "Alle rettigheder forbeholdes" (all rights
  reserved). The pages that exist: `/page/about-3`, `/page/personal-data-4`, `/page/cookies-5`,
  `/page/contact-7`, `/page/annoncering-paa-myshoppingdk-9`.
- `robots.txt` holds only a sitemap line and blocks nothing.
- The site publishes guides for programs and AI agents that invite use of its search:
  `/ai.md`, `/llms.txt` and `/agents.md`. These name `/api/ai/v1/search` as the preferred
  machine-readable source.
- Nothing says a product such as Spendly may use it, or how much. **Written permission from
  `post@tilbudsugen.dk` is still to be had.**
- No usage limit is published, and no answer carries a rate-limit header. Spendly's own limits are in
  `README.md` here.

## The public search (what Spendly uses)

```
GET https://www.tilbudsugen.dk/api/ai/v1/search?q=mælk,smør&chains=netto,rema_1000
```

- No sign-in and no key.
- Spendly's requests name Spendly as the `User-Agent`, never a browser, and ask for Danish first
  (`Accept-Language`).
- `q`: required. Items separated by commas, in the language the reader wrote them. The guide asks
  for one request per shopping list, never one per item. 30 items in one request was accepted.
- `chains`: optional. Shop keys separated by commas (below). Leave it out for every shop;
  `chains=all` is not allowed.
- Each item answers **at most 5 offers**, cheapest first by price per kilo or litre, else by price.
  `total_offers_found` says how many there were.
- Errors: `400` a missing `q`, a wrong parameter or too many items. `404` an unknown shop key, with
  `{"error":"AI search API request failed","status":404,"details":{"message":"Unsupported chains \"xyz\""}}`.
  `504` the search timed out.

The answer:

```json
{
	"query": "mælk, smør",
	"queries": ["mælk", "smør"],
	"country_code": "DK",
	"sort_strategy": { "direction": "ASC", "primary": "price_per_kg_or_liter_when_available", "fallback": "absolute_product_price" },
	"chains": [{ "id": 162, "name": "Netto", "key": "netto" }],
	"total_queries": 2,
	"total_offers_found": 81,
	"returned_offers_count": 10,
	"items": [{
		"query": "mælk",
		"total_offers_found": 30,
		"returned_offers_count": 5,
		"offers": [{
			"product_name": "Sødmælk",
			"brand": "Jeden Tag",
			"price": 74.99,
			"currency": "DKK",
			"promotion": { "minQuantity": 12, "totalPrice": 74.99, "unitPrice": 6.25, "requiresMembership": false, "maxQuantity": null, "rawText": "74.99 12" },
			"unit_metrics": { "quantity": 1, "unit_type": "ltr.", "price_per_ltr.": 6.25 },
			"availability": { "retail_chain": "Scandinavian Park", "is_border_shop": true, "eligible_regions": ["DK"] },
			"start_date": "2026-10-22T00:00:00Z",
			"end_date": "2026-11-25T23:59:59Z",
			"sorting": { "basis": "price_per_liter", "direction": "ASC", "sort_value": 6.25, "base_unit": "liter", "fallback_price": 74.99 }
		}]
	}],
	"deep_link_all_results": "/ai-basket?q=m%C3%A6lk,sm%C3%B8r",
	"data_source": "Tilbudsugen offer database",
	"last_updated": "2026-10-26T05:34:16+00:00"
}
```

- `price` is for `promotion.minQuantity` pieces when that is above 1 ("12 for 74.99").
- The price-per-unit key is named after the unit: `price_per_ltr.`, `price_per_kg.`.
- `deep_link_all_results` is relative: put `https://www.tilbudsugen.dk` in front. The page for people
  is `https://www.tilbudsugen.dk/dk/ai-basket?q=...`.

Shop keys, as `agents.md` lists them: `netto`, `rema_1000`, `coop365`, `lidl`, `foetex`, `bilka`,
`meny`, `super-brugsen`, `kvickly`, `loevbjerg`, `daglibrugsen`, `min-koebmand`, `spar`, `letkoeb`.
Other shops (ABC Lavpris, border shops) appear in answers but cannot be filtered by.

## The site's own search (used for offer papers only)

Spendly uses it for one thing: the address of a shown offer in the shop's offer paper (`offerUrl`),
found by shop, price and first day among the offers for the item's search words. The site's pages call routes under
`/api/` that are not published for other programs, and can change with any release of the site:

```
GET https://www.tilbudsugen.dk/api/api/product-offers-search/dk/{product}?page=1&numberPerPage=10&triggeredFromSearchField=1&sortBy=pricePerUnit&sortDirection=ASC
```

It pages through every offer for one product (not a list), and answers
`pageOfOrganicProductOffers` (`items`, `numberOfItemsOnPage`, `totalNumberOfItems`, `pageNumber`,
`lastValidPageNumber`), `seo` (`offerCount`, `minPrice`, `minUnitPrice`, `unitPriceUnit`,
`activeChainCount`), `sponsoredProductOffers`, `sponsoredCustomPartnerProducts`, `optionsForFilters`
(brands with counts) and `minPriceForPriceFilter` / `maxPriceForPriceFilter`. One offer there holds
more than the public search gives: ids for the offer, product, brand and shop, the category
(`productVariant.category`, such as "Mælk"), `quantity` with `quantityUnitCode` (`LTR`), labels such as
"Økologisk" and "Nøglehullet", and the offer's picture (`imageUrl`, `imageThumbnailUrl` on
`static.tilbudsugen.dk`). The thumbnail ends `_thumb.jpg`, the large picture `_zoom.jpg`; Spendly
shows only the thumbnail. A product name there is often without the brand ("Kaffe Formalet").

Spendly does not show the pictures. `static.tilbudsugen.dk` answered `403` with
`<Error><Code>AccessDenied</Code>...` to a cloud machine in October 2026, from a command line and from
a headless Chromium alike.

## Shop logos

No answer carries a shop's logo. The site's own pages draw one from a fixed folder,
`https://www.tilbudsugen.dk/chains/{file}` (`netto.png`, `rema-1000.svg`), picked by the shop's name in
the site's script; the offer papers page (`/tilbudsaviser`) shows them. `SHOP_LOGOS` in
`tilbudsugen.js` copies that list for the Danish shops, and every file answered `200` in October 2026.
Aldi, Coop.dk Mad and Zur Krone have none. Most logos are wide, with the shop's name written out.
`/api/chains/list/dk` answers the 31 Danish shops as `{ id, name, chainCategoryId, chainCategoryName }`.

Other routes the site's pages call: `/api/typeahead-search/`, `/api/chains/list/`,
`/api/chains/categories/list/`, `/api/product-offers-chain/`, `/api/product-offers-for-placement/`,
and signed-in ones for shopping lists, price alerts (`/api/price-agent/...`) and the user.

## What the data is like

- Only **offers**: what a shop has on offer, with the days it holds. A shop's normal price is not
  there, so an item with no offer this week has no price at all.
- Border shops are included and marked `is_border_shop`.
- The data has faults: one answer had "Smørbar, 2 kg., 16 kr, 8 kr per kg", which is the size of
  the pack wrong. Show the price and size as the site gives them, and never build a total on the
  price per unit alone.
