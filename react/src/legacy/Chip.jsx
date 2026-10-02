import { Icon } from './Icon.jsx'

/* The four chips, which differ by what they claim rather than by colour.

   `Chip` is a value the user put there and can take away -- a category on an order, a
   filter on a list -- so when it is removable it is a real <button> with the action it
   promises. A chip that draws a cross and removes nothing is worse as a button than it was
   as a span: focusable, and still inert. README: Honest Affordances.

   `StatusChip` states where an order is, `SavingChip` states a number against retail, and
   `TagChip` labels a promo. None of the three is interactive. */

const join = (...parts) => parts.filter(Boolean).join(' ')

export function Chip({ children, onRemove, label, icon, className, ...rest }) {
	const content = (
		<>
			<span className="chip-label">{children}</span>
			{icon ? <Icon name={icon} /> : null}
			{onRemove ? <Icon name="close" /> : null}
		</>
	)
	return onRemove
		? <button type="button" className={join('chip', className)} aria-label={label} onClick={onRemove} {...rest}>{content}</button>
		: <span className={join('chip', className)} {...rest}>{content}</span>
}

export const StatusChip = ({ children, tone, className, ...rest }) =>
	<span className={join('chip-status', tone && 'chip-status-' + tone, className)} {...rest}>{children}</span>

export const SavingChip = ({ children, ...rest }) =>
	<span className="chip-saving tabular-figures" {...rest}><Icon name="trendUp" />{children}</span>

export const TagChip = ({ tone = 'pink', icon, children }) =>
	<span className={join('chip-tag', 'chip-tag-' + tone)}><Icon name={icon} />{children}</span>
