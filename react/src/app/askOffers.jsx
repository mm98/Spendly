import { Mark, initialsOf } from '../components/Mark.jsx'
import { LinkOut } from '../components/Utilities.jsx'
import { quantity } from '../api/format.js'
import { swatchOf } from './categoryMark.jsx'
import { money } from '../pages/OrderParts.jsx'

/* How one offer in an Ask answer is named, priced and marked (Ask 24d 11). */

const UNIT = {
	'ltr.': { size: 'L', after: 'per l' },
	'kg.': { size: 'kg', after: 'per kg' },
	'stk.': { size: 'pcs.', after: 'per piece' }
}

/** Where the offers come from, a link to the site in a new tab: "Offers from Tilbudsugen". */
export const credit = source => <a href={`https://${source.site}`} target="_blank" rel="noopener">Offers from {source.name}</a>

const sizeOf = size => (size ? ` ${quantity(size.amount)} ${UNIT[size.unit]?.size ?? size.unit}` : '')

/** The product as the shop lists it, with its size. */
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
