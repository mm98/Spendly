import { Link } from 'react-router'
import { IconButton } from './Button.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'

/* The favourites spotlight both overview pages share: a grid of small stat tiles, three
   across on a wide panel and one per row on a phone, each carrying the record's mark, its
   headline spend, one line of meta and a labelled stat pair under a hairline.

   Vendors and Categories each used to draw their own spotlight (a pair of nested cards on
   Vendors, nothing at all on Categories), so the same standing preference rendered two
   different ways -- or not at all -- depending on which kind of record it was pinned to.
   One tile, fed by both, is the two-pages-one-fact rule made structural. README: Favourites. */

const join = (...parts) => parts.filter(Boolean).join(' ')

/* The unstar-shaped wording of the shared dialog (ConfirmDialog.jsx), the way FormPage's
   DeleteDialog is its delete-shaped one. The star sits in every tile's corner, so a stray
   click lands on it easily -- and though unstarring is reversible in principle, the tile it
   removes takes its own way back with it. The sentence says what is and is not lost, so the
   reader confirming knows the record survives and only the pin goes. */
export const UnstarDialog = ({ name, onConfirm, onCancel }) => (
	<ConfirmDialog title={`Remove ${name} from favourites?`}
		detail="Only the pin here is removed. The record itself stays, and starring it again brings it back."
		confirmLabel="REMOVE" onConfirm={onConfirm} onCancel={onCancel} />
)

export const FavouriteTileGrid = ({ children }) => <div className="fav-tile-grid">{children}</div>

/** One favourite. `mark` is the record's own tile (avatar or category icon), `stats` is the
    labelled pair under the hairline -- `tone: 'positive'` prints a value as savings green.
    The name is the way into the record's orders; the star is the way back out of the list. */
export function FavouriteTile({ mark, name, to, linkLabel, amount, meta, stats, onUnstar, unstarLabel }) {
	return (
		<article className="fav-tile">
			<div className="fav-tile-head">
				{mark}
				<Link className="fav-tile-name" to={to} data-go={to} aria-label={linkLabel}>{name}</Link>
				<IconButton icon="starFilled" label={unstarLabel} onClick={onUnstar} />
			</div>
			<div className="fav-tile-figure tabular-figures">{amount}</div>
			<div className="fav-tile-meta">{meta}</div>
			<div className="fav-tile-divider" />
			<div className="fav-tile-stats">
				{stats.map(stat => (
					<div key={stat.label} className="fav-tile-stat">
						<span className="fav-tile-stat-label">{stat.label}</span>
						<span className={join('fav-tile-stat-value', 'tabular-figures',
							stat.tone === 'positive' && 'fav-tile-stat-positive')}>{stat.value}</span>
					</div>
				))}
			</div>
		</article>
	)
}
