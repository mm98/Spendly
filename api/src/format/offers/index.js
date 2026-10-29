import { keepOffers, offersById, onePerShop } from '../../lib/askOffers.js'
import { initialsOf } from '../../lib/names.js'
import { emailColour, inkOn } from '../../lib/palette.js'
import { ITEMS_MOST, offerSourcesFor, offersAsked, shownOffers, withPapers } from '../../offers/index.js'
import { text } from '../schema.js'

/* The offers maker (Ask 24d 11 to 14): this week's offers for an item, from a source in offers/, as a block in
   the answer, kept as they were answered. One call is one lookup for every item asked. */

const ROWS_MOST = 5
const SHOPS_MOST = 10

const cleanList = (list, most) => [...new Set((Array.isArray(list) ? list : [])
	.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean))].slice(0, most)

function toolFor(sources) {
	const covers = sources.map(s => `${s.key}: ${s.goods} in ${s.country}, from ${s.site}`).join('; ')
	return {
		name: 'find_offers',
		description: `What shops have on offer this week, read from other websites, not from the reader's own data. The sources: ${covers}. Give every item of the question in one call, never one call per item. Each item answers its cheapest offers per litre, kg or piece, and a place mark for the block that shows them. Prices are in ${sources[0].currency}.`,
		input_schema: {
			type: 'object',
			properties: {
				source: text('Which source to ask.', { enum: sources.map(s => s.key) }),
				items: {
					type: 'array', minItems: 1, maxItems: ITEMS_MOST,
					description: 'The items to find offers for, in the words and language of the question, one item each.',
					items: text('One item, for example "mælk".')
				},
				shops: {
					type: 'array', maxItems: SHOPS_MOST,
					description: 'Only offers from these shops, as the question names them. Leave it out for every shop.',
					items: text('A shop name, for example "Netto".')
				}
			},
			required: ['source', 'items']
		}
	}
}

const rules = `find_offers reads this week's offers from other websites. Use it only when the reader asks about prices or offers in shops now. State the cheapest in one sentence, with its price per litre, kg or piece, and the shop; a shop the reader has as a vendor is a link to it. Then write the item's place mark on a line of its own: the block shows the offers and where they come from, so never list them again. When an item has no offer, write "No shop has ITEM on offer this week." and its place mark. An offer is not the reader's money: never count it in the reader's figures, and never compare it with what the reader paid.`

// cheapest per litre, kg or piece first; an offer with no price per unit after those with one; a shop once, without sugar first
const unitPrice = offer => (offer.perUnit?.price > 0 ? offer.perUnit.price : null)
const rowsOf = offers => onePerShop([...offers]
	.sort((a, b) => (unitPrice(a) === null) - (unitPrice(b) === null) || (unitPrice(a) ?? a.price / a.forHowMany) - (unitPrice(b) ?? b.price / b.forHowMany)))
	.slice(0, ROWS_MOST)
	.map(({ product, brand, size, shop, shopLogo, membersOnly, withoutSugar, price, forHowMany, perUnit, paper, from, to }) => ({ product, brand, size, shop, shopLogo, membersOnly, withoutSugar, price, forHowMany, perUnit, paper, from, to }))

const waitSaid = minutes => `Tell the reader in one sentence: "Today's offer lookups are used up. Ask again in ${minutes} minutes." Write no place mark.`
const PER_DAY_SAID = 'Tell the reader in one sentence: "Today\'s offer lookups are used up. Ask again tomorrow." Write no place mark.'

async function make(input, making) {
	const sources = offerSourcesFor(making.userId)
	const source = sources.find(s => s.key === input?.source) ?? sources[0]
	const items = cleanList(input?.items, ITEMS_MOST)
	if (!items.length) return { items: [], said: 'Name at least one item.' }
	const asking = { userId: making.userId, today: making.today }
	const answer = await offersAsked(source, { items, shops: cleanList(input?.shops, SHOPS_MOST), ...asking }, making.signal)
	if (answer.unknownOnly) return { items: [], said: `${source.name} does not know the shop ${answer.unknownOnly.join(', ')}.` }
	if (answer.perDay) return { items: [], said: PER_DAY_SAID }
	if (answer.wait) return { items: [], said: waitSaid(Math.ceil(answer.wait / 60)) }
	if (!answer.found) return { items: [], said: `${source.name} did not answer just now. Tell the reader to ask again later. Write no place mark.` }

	const shown = answer.found.map(found => ({ item: found.item, rows: rowsOf(found.offers) }))
	// withPapers and shownOffers answer in the order they were given
	const papered = await withPapers(source, shown.flatMap(s => s.rows.map(offer => ({ item: s.item, offer }))), asking, making.signal)
	const offered = shownOffers(source, making.userId, papered).map(({ offer: { paper, from, ...offer } }) => offer)
	let at = 0
	const blocks = shown.map(s => keepOffers(making.userId, making.chatId, {
		item: s.item,
		source: { name: source.name, site: source.site },
		offers: s.rows.map(() => offered[at++])
	}))
	const said = blocks.map(b => ({
		item: b.item,
		placeMark: `{{offers:${b.id}}}`,
		offers: b.offers.map(({ shopLogo, vendor, link, ...offer }) => offer)
	}))
	return { items: blocks, said: JSON.stringify({ source: source.name, unknownShops: answer.unknownShops, items: said }) }
}

// the price per litre, kg or piece as the site writes its unit
const PER = { 'ltr.': 'per l', 'kg.': 'per kg', 'stk.': 'per piece' }
// a size after the product's name, as the app writes it: "1 L"
const SIZE = { 'ltr.': 'L', 'kg.': 'kg', 'stk.': 'pcs.' }
// a shop that is not one of the reader's vendors sits on the grey no-colour mark (24d, the email of a chat)
const NO_COLOUR = { bg: '#f0efe9', ink: '#686760' }

// an email paints a colour value: a swatch as the reader's scheme draws it, any other as stored
const colourOf = (offer, tokens) => {
	const colour = emailColour(offer.vendor?.colour, tokens)
	return /^#[0-9a-f]{6}$/i.test(colour ?? '') ? colour : null
}

/** Where an offer's name leads, said as its tip: "Netto's offer paper" or "Search on Tilbudsugen". */
const goesTo = (offer, source) => (offer.link?.paper ? `${offer.shop}'s offer paper` : `Search on ${source.name}`)

function emailBlocks(ids, blocks, { money, write, tokens }) {
	return ids.map(id => blocks[id]).filter(Boolean).flatMap(block => {
		const sourceUrl = `https://${block.source.site}`
		const credit = { p: true, runs: [{ text: `Offers from ${block.source.name}`, url: sourceUrl }] }
		if (!block.offers.length) return [credit]
		return [{
			offers: true,
			source_url: sourceUrl,
			source_name: block.source.name,
			items: block.offers.map((offer, i) => ({
				first: i === 0,
				mark_bg: colourOf(offer, tokens) ?? NO_COLOUR.bg,
				mark_ink: colourOf(offer, tokens) ? inkOn(colourOf(offer, tokens)) : NO_COLOUR.ink,
				initials: initialsOf(offer.vendor?.name ?? offer.shop),
				url: offer.link?.url ?? sourceUrl,
				goes_to: goesTo(offer, block.source),
				name: [offer.brand, offer.product, offer.size?.amount > 0 && `${write.quantity(offer.size.amount)} ${SIZE[offer.size.unit] ?? offer.size.unit}`].filter(Boolean).join(' '),
				shop: offer.shop,
				until: write.date(offer.to),
				members: offer.membersOnly ? 'Members only' : '',
				price: offer.forHowMany > 1 ? `${offer.forHowMany} for ${money(offer.price)}` : money(offer.price),
				per_unit: offer.perUnit?.price > 0 && PER[offer.perUnit.unit] ? `${money(offer.perUnit.price)} ${PER[offer.perUnit.unit]}` : ''
			}))
		}]
	})
}

export const offersMaker = {
	place: 'offers',
	name: 'Offers',
	// What Ask can do (24c) does not list offers
	formats: () => [],
	example: 'What are the cheapest milk prices this week?',
	// offered only to a reader with a source that sells in their currency
	tool: userId => {
		const sources = offerSourcesFor(userId)
		return sources.length ? toolFor(sources) : null
	},
	rules,
	doing: () => 'Looking up this week\'s offers',
	make,
	byIds: offersById,
	emailBlocks,
	attachments: () => [],
	// a block goes with its chat
	sweep: () => {}
}
