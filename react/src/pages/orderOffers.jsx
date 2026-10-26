import { useEffect, useRef, useState } from 'react'
import { IconButton, Button } from '../components/Button.jsx'
import { Sum } from '../components/Data.jsx'
import { Anchor, Leaving, Popover } from '../components/Overlays.jsx'
import { getOrderOffers } from '../api/client.js'
import { dot, plural, quantity, shortDate } from '../api/format.js'
import { LinePhoto, money } from './OrderParts.jsx'

/* This week's grocery offers on an order (Order editing layouts 1a): asked for only by Check offers, one
   request for every line; on opening, only an answer the server already keeps is read. */

const UNIT = {
	'ltr.': { size: 'L', per: 'Per litre', after: 'per l' },
	'kg.': { size: 'kg', per: 'Per kg', after: 'per kg' },
	'stk.': { size: 'pcs.', per: 'Per piece', after: 'per piece' }
}

const sentLines = lines => lines.map(l => ({ title: l.title ?? '', quantity: Number(l.quantity) || 0, price: Number(l.price) || 0 }))

/** The offers for an order: `vendor` is { id } or { name }. State is `unchecked`, `checking`, `checked`,
    `failed` or `wait`; `offerOf(index)` is a line's offer, `counted` what At this week's offers sums. */
export function useOrderOffers({ vendor, date, lines }) {
	const sent = { ...(vendor?.id ? { vendorId: vendor.id } : { vendorName: vendor?.name ?? '' }), date, lines: sentLines(lines) }
	const key = JSON.stringify(sent)
	const [answer, setAnswer] = useState({ key: null, shown: false })
	const [checking, setChecking] = useState(false)
	const asking = useRef(null)
	const ask = check => {
		asking.current?.abort()
		const stop = new AbortController()
		asking.current = stop
		if (check) setChecking(true)
		getOrderOffers({ ...sent, check }, stop.signal)
			.then(out => { if (!stop.signal.aborted) setAnswer({ key, ...out }) })
			.catch(() => { if (!stop.signal.aborted) setAnswer(a => (check ? { key, shown: true, source: a.source, state: 'failed', lines: [] } : { key, shown: false })) })
			.finally(() => { if (asking.current === stop) { setChecking(false); asking.current = null } })
	}
	// a change of shop, date or lines reads the kept answer for the new lines; it never asks the site
	useEffect(() => {
		if (!date) return undefined
		const wait = setTimeout(() => ask(false), 300)
		return () => clearTimeout(wait)
	}, [key])
	useEffect(() => () => asking.current?.abort(), [])

	const current = answer.key === key ? answer : null
	const byIndex = new Map((current?.state === 'checked' ? current.lines : []).map(l => [l.index, l.offer]))
	const offerOf = index => byIndex.get(index) ?? null
	const counted = lines.map((line, index) => ({ line, offer: offerOf(index) }))
		.filter(({ line, offer }) => offer && Number(line.quantity) >= offer.forHowMany)
	return {
		shown: !!current?.shown,
		state: checking ? 'checking' : current?.state ?? 'unchecked',
		waitMinutes: current?.waitMinutes ?? null,
		source: current?.source ?? null,
		tagged: byIndex.size,
		offerOf,
		check: () => ask(true),
		counted: {
			lines: counted.length,
			paid: counted.reduce((sum, { line }) => sum + Number(line.price) * Number(line.quantity), 0),
			atOffers: counted.reduce((sum, { line, offer }) => sum + offer.price / offer.forHowMany * Number(line.quantity), 0)
		}
	}
}

/** What the Items card head carries for the offers: { aside, actions, control } for CardHeader, or nothing. */
export function offersHead(offers) {
	if (!offers.shown) return {}
	const check = label => ({ actions: [{ label, onClick: offers.check }] })
	switch (offers.state) {
		case 'checking': return { control: <Button variant="outline" size="small" disabled>Checking offers</Button> }
		case 'checked': return { aside: offers.tagged ? `${plural(offers.tagged, 'line')} on offer this week` : 'No lines on offer this week' }
		case 'failed': return { aside: 'Offers could not be checked', ...check('Try again') }
		case 'wait': return { aside: offers.waitMinutes ? `Offers can be checked again in ${plural(offers.waitMinutes, 'minute')}` : 'Offers can be checked again tomorrow' }
		default: return check('Check offers')
	}
}

/** Where the offers come from, a link to the site in a new tab: "Offers from Tilbudsugen". */
export const credit = source => <a href={`https://${source.site}`} target="_blank" rel="noopener">Offers from {source.name}</a>

/** An offer's picture once it has loaded, else null: a picture the site will not give stays the empty
    mark, never a broken image. */
export function useLoadedPicture(src) {
	const [loaded, setLoaded] = useState(null)
	useEffect(() => {
		if (!src) return undefined
		const picture = new Image()
		picture.onload = () => setLoaded(src)
		picture.src = src
		return () => { picture.onload = null }
	}, [src])
	return loaded === src ? src : null
}

const sizeOf = size => (size ? ` ${quantity(size.amount)} ${UNIT[size.unit]?.size ?? size.unit}` : '')

/** The product as the shop lists it, with its size, never the line's own words, so another brand reads as one. */
export const offerName = offer => `${[offer.brand, offer.product].filter(Boolean).join(' ')}${sizeOf(offer.size)}`

/** The offer as the shop states it: "15,00 kr.", "2 for 80,00 kr.". */
export const offerPrice = offer => (offer.forHowMany > 1 ? `${offer.forHowMany} for ${money(offer.price)}` : money(offer.price))

/** The price per litre, kg or piece after its amount, "10,00 kr. per l", or null when the source has none. */
export const offerUnitPrice = offer => {
	const unit = offer.perUnit && UNIT[offer.perUnit.unit]
	return unit ? `${money(offer.perUnit.price)} ${unit.after}` : null
}

/** The tag between a line's name and its amount, and the offer it opens (1a, 1c). */
export function OfferTag({ line, offer, source, open, onOpen, onClose }) {
	const box = useRef(null)
	useEffect(() => {
		if (!open) return undefined
		const away = ev => { if (!box.current?.contains(ev.target)) onClose() }
		const key = ev => { if (ev.key === 'Escape') { onClose(); box.current?.querySelector('button')?.focus() } }
		document.addEventListener('pointerdown', away)
		document.addEventListener('keydown', key)
		return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key) }
	}, [open])
	const picture = useLoadedPicture(open ? offer.image : null)
	const per = offer.perUnit && UNIT[offer.perUnit.unit]
	const named = offerName(offer)
	return (
		<Anchor open={open} ref={box}>
			<IconButton size="small" icon="tag" aria-label={`Offer at ${offer.shop}`} data-tip={`On offer at ${offer.shop}`}
				aria-expanded={open ? 'true' : 'false'} aria-haspopup="dialog" onClick={() => (open ? onClose() : onOpen())} />
			<Leaving>{open
				? (
					<Popover position="end" role="dialog" aria-label={`Offer for ${line.title}`}
						head={<>
							<span className="sp-section-label">Possible match</span>
							<span className="sp-cell-flex">
								<LinePhoto src={picture} name={named} />
								<span className="sp-stacked">
									<span className="sp-title">{named}</span>
									<span className="sp-subtitle">{offer.shop}{dot}until {shortDate(offer.to)}</span>
								</span>
							</span>
						</>}
						note={offer.membersOnly ? <span className="sp-subtitle">For members only</span> : null}>
						<div className="sp-stack">
							<Sum value={offerPrice(offer)}>Offer</Sum>
							{per ? <Sum value={money(offer.perUnit.price)}>{per.per}</Sum> : null}
							<Sum value={`${money(line.price)} each`}>You paid</Sum>
						</div>
						<span className="sp-meta">{credit(source)}</span>
					</Popover>
				)
				: null}</Leaving>
		</Anchor>
	)
}

/** "At this week's offers" under Saved in Totals (1a): only the lines with a tag that count, never green. */
export function OffersTotal({ offers, lineCount }) {
	if (!offers.shown || offers.state !== 'checked' || !offers.counted.lines) return null
	return (
		<div className="sp-stack">
			<Sum value={money(offers.counted.atOffers)}>At this week's offers</Sum>
			<span className="sp-meta">{offers.counted.lines} of {plural(lineCount, 'line')}, {money(offers.counted.paid)} paid for them. {credit(offers.source)}</span>
		</div>
	)
}
