import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconButton, Button } from '../components/Button.jsx'
import { Sum } from '../components/Data.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Anchor, DialogActions, Leaving, Popover } from '../components/Overlays.jsx'
import { Scrim } from '../components/Shell.jsx'
import { Sheet } from '../components/Touch.jsx'
import { LinkOut, useFocusTrap } from '../components/Utilities.jsx'
import { getOrderOffers } from '../api/client.js'
import { dot, plural, quantity, shortDate } from '../api/format.js'
import { swatchOf } from '../app/categoryMark.jsx'
import { useShellShape } from '../app/useMedia.js'
import { money } from './OrderParts.jsx'

/* This week's grocery offers on an order (Order editing layouts 1a): asked for only by Check offers, one
   request for every line; on opening, only an answer the server already keeps is read. */

const UNIT = {
	'ltr.': { size: 'L', per: 'Per litre', after: 'per l' },
	'kg.': { size: 'kg', per: 'Per kg', after: 'per kg' },
	'stk.': { size: 'pcs.', per: 'Per piece', after: 'per piece' }
}

const sentLines = lines => lines.map(l => ({ title: l.title ?? '', quantity: Number(l.quantity) || 0, price: Number(l.price) || 0 }))

/** The offers for an order: `vendor` is { id } or { name }, `categories` ({ id }) or names. State is `unchecked`,
    `checking`, `checked`, `failed` or `wait`; `offerOf(index)` is a line's offer, `counted` what At this week's offers sums. */
export function useOrderOffers({ vendor, categories = [], date, lines }) {
	const sent = {
		...(vendor?.id ? { vendorId: vendor.id } : { vendorName: vendor?.name ?? '' }),
		...(categories.every(c => typeof c === 'string') ? { categoryNames: categories } : { categoryIds: categories.map(c => c.id) }),
		date,
		lines: sentLines(lines)
	}
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

/** The shop's place on an offer (c2): its logo on white, else the reader's own vendor mark, else its initials in grey. */
export function ShopMark({ offer }) {
	if (offer.shopLogo) return <Mark size="medium" logo aria-hidden="true" aria-label={offer.shop}><img src={offer.shopLogo} alt="" /></Mark>
	if (offer.vendor) {
		return (
			<Mark size="medium" logo fill="solid" swatch={swatchOf(offer.vendor.colour)} aria-hidden="true" aria-label={offer.vendor.name}>
				<span>{initialsOf(offer.vendor.name)}</span>
			</Mark>
		)
	}
	return <Mark size="medium" logo fill="none" aria-hidden="true">{offer.shop}</Mark>
}

/** The product's name as a link to where the offer can be seen (c28): the shop's own paper, or the source's search. */
export function OfferName({ offer, source, nameClass }) {
	const named = offerName(offer)
	if (!offer.link) return <span className={nameClass}>{named}</span>
	const label = offer.link.paper ? `${offer.shop}'s offer paper` : `Search on ${source.name}`
	return <LinkOut href={offer.link.url} label={label} nameClass={nameClass}>{named}</LinkOut>
}

/** The tag between a line's name and its amount, and the offer it opens (1a, 1c): a panel from the tag, or
    on touch a sheet. `date` is the order's, said with what was paid when it is older than the offer. */
export function OfferTag({ line, offer, source, date, open, onOpen, onClose }) {
	const touch = useShellShape() === 'touch'
	const box = useRef(null)
	const sheet = useRef(null)
	useFocusTrap(sheet, open && touch)
	useEffect(() => {
		if (!open || touch) return undefined
		const away = ev => { if (!box.current?.contains(ev.target)) onClose() }
		const key = ev => { if (ev.key === 'Escape') { onClose(); box.current?.querySelector('button')?.focus() } }
		document.addEventListener('pointerdown', away)
		document.addEventListener('keydown', key)
		return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key) }
	}, [open, touch])
	const per = offer.perUnit && UNIT[offer.perUnit.unit]
	const head = (
		<span className="sp-cell-flex">
			<ShopMark offer={offer} />
			<span className="sp-stacked">
				<OfferName offer={offer} source={source} nameClass="sp-title" />
				<span className="sp-subtitle">{offer.shop}{dot}until {shortDate(offer.to)}</span>
			</span>
		</span>
	)
	const members = offer.membersOnly ? <span className="sp-subtitle">For members only</span> : null
	const paid = `${money(line.price)} each${date && offer.from && date < offer.from ? ` on ${shortDate(date)}` : ''}`
	const sums = (
		<>
			<div className="sp-stack">
				<Sum value={offerPrice(offer)}>Offer</Sum>
				{per ? <Sum value={money(offer.perUnit.price)}>{per.per}</Sum> : null}
				<Sum value={paid}>You paid</Sum>
			</div>
			<span className="sp-meta">{credit(source)}</span>
		</>
	)
	const label = `Offer for ${line.title}`
	return (
		<Anchor open={open && !touch} ref={box}>
			<IconButton size="small" icon="tag" aria-label={`Offer at ${offer.shop}`} data-tip={`On offer at ${offer.shop}`}
				aria-expanded={open ? 'true' : 'false'} aria-haspopup="dialog" onClick={() => (open ? onClose() : onOpen())} />
			<Leaving>{open && !touch
				? (
					<Popover position="end" role="dialog" aria-label={label}
						head={<><span className="sp-section-label">Possible match</span>{head}</>} note={members}>
						{sums}
					</Popover>
				)
				: null}</Leaving>
			{touch
				? createPortal(
					<Leaving>{open
						? (
							<Scrim dialog onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
								<Sheet role="dialog" aria-modal="true" aria-label={label} ref={sheet} onDismiss={onClose}
									onKeyDown={ev => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }}>
									<span className="sp-heading">Possible match</span>
									{head}
									{members}
									{sums}
									<DialogActions><Button variant="outline" fullWidth onClick={onClose}>Close</Button></DialogActions>
								</Sheet>
							</Scrim>
						)
						: null}</Leaving>,
					document.body
				)
				: null}
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
