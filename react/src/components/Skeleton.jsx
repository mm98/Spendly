import { Card, CardBody, CardDivider, CardHeader } from './Card.jsx'

/* What a region looks like before its data arrives, shaped like what it is about to become.

   Async used to show one thing while anything loaded: a one-line "Loading..." card, whatever
   the real content's size. The swap from that to a page of charts and cards is a layout shift
   the reader feels -- Lighthouse measured Home's at 0.386 (0.25 is "poor"), all of it the
   `.dashboard-cards` region going from a few words tall to over a thousand pixels in one frame.

   These are built from the real Card/CardHeader/CardDivider/CardBody a loaded card uses, not a
   bespoke lookalike -- the padding, the header height and the divider are exactly right because
   they are the same components, not a second copy of their metrics that could drift from them. */

const join = (...parts) => parts.filter(Boolean).join(' ')

/** One shimmering bar. Sized by the caller; this owns only the shimmer itself. */
export const SkeletonBlock = ({ width, height, round, className, style }) => (
	<span className={join('skeleton', round && 'skeleton-round', className)}
		style={{ width, height, ...style }} />
)

/** A card shaped like the one about to replace it. The default body is `lines` of text (a
    little shorter each time, so the block reads as text and not as one more bar) followed by
    `bodyHeight` standing in for a chart or a figure -- the order a card that opens with a
    figure and closes with a chart actually draws in. A body that doesn't fit that shape
    (Hero's figure-then-chart-then-legend, a form's fields) is passed as `children` instead,
    still inside the same real CardBody so its padding matches. */
export function SkeletonCard({ title = true, bodyHeight, lines = 0, bodyVariant, className, children }) {
	return (
		<Card aria-hidden="true" className={className}>
			{title ? (
				<>
					{/* A length, not a percentage: CardHeader puts the title in a flex item sized to its
					    own content, so a percentage resolves against a width that is itself waiting on
					    this, and the bar comes out 0px wide in every waiting card. */}
					<CardHeader title={<SkeletonBlock width={140} height={13} />} />
					<CardDivider />
				</>
			) : null}
			<CardBody variant={bodyVariant} className="skeleton-card-body">
				{children ?? (
					<>
						{Array.from({ length: lines }, (_, i) => (
							<SkeletonBlock key={i} width={i === lines - 1 ? '55%' : '90%'} height={12} className="skeleton-line" />
						))}
						{bodyHeight ? <SkeletonBlock width="100%" height={bodyHeight} className="skeleton-panel" /> : null}
					</>
				)}
			</CardBody>
		</Card>
	)
}

/** A row shaped like EntryRow/OrderRow/CategoryRow: a mark on the left, two lines of text, a
    figure on the right -- the shape every list of records in the app shares (Rows.jsx), and
    `.data-row`'s own padding is what gives it the right height without restating it. */
export const SkeletonRow = () => (
	<div className="data-row skeleton-row" aria-hidden="true">
		<SkeletonBlock round width={36} height={36} />
		<div className="skeleton-row-text">
			<SkeletonBlock width="55%" height={13} />
			<SkeletonBlock width="35%" height={11} />
		</div>
		<SkeletonBlock width={56} height={13} className="skeleton-row-amount" />
	</div>
)

export const SkeletonRows = ({ count = 4 }) => (
	<>{Array.from({ length: count }, (_, i) => <SkeletonRow key={i} />)}</>
)

/** The four-across summary tiles (KpiCard, Card.jsx) a few pages open with. */
export const SkeletonKpiRow = ({ count = 4 }) => (
	<div className="kpi-row" aria-hidden="true">
		{Array.from({ length: count }, (_, i) => (
			<div className="card card-kpi skeleton-kpi" key={i}>
				<SkeletonBlock width="50%" height={10} />
				<SkeletonBlock width="70%" height={20} className="skeleton-kpi-value" />
			</div>
		))}
	</div>
)
