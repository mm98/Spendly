import { Link } from 'react-router'
import { IconButton } from './Button.jsx'

/* The favourites spotlight both overview pages share: a grid of small stat tiles, three
   across on a wide panel and one per row on a phone, each carrying the record's mark, its
   headline spend, one line of meta and a labelled stat pair under a hairline.

   Vendors and Categories each used to draw their own spotlight (a pair of nested cards on
   Vendors, nothing at all on Categories), so the same standing preference rendered two
   different ways -- or not at all -- depending on which kind of record it was pinned to.
   One tile, fed by both, is the two-pages-one-fact rule made structural. README: Favourites.

   The tile used to carry its own star, a shortcut back out of the list with a confirm dialog
   behind it -- a stray click landed on it easily, so it asked before acting. A favourite is
   a form choice now (VendorForm and CategoryForm's own Favourite row), turned off the same
   way it is turned on. What the tile offers instead is the way to that row: a plain edit
   icon in its own corner, the same pencil and the same destination Vendors' and Categories'
   own record pages use everywhere else. */

const join = (...parts) => parts.filter(Boolean).join(' ')

export const FavouriteTileGrid = ({ children }) => <div className="fav-tile-grid">{children}</div>

/** One favourite. `mark` is the record's own tile (avatar or category icon), `stats` is the
    labelled pair under the hairline -- `tone: 'positive'` prints a value as savings green.
    The name is the way into the record's orders; `editTo` is the way into the record itself,
    where its Favourite row lives. */
export function FavouriteTile({ mark, name, to, linkLabel, amount, meta, stats, editTo, editLabel }) {
	return (
		<article className="fav-tile">
			<div className="fav-tile-head">
				{mark}
				<Link className="fav-tile-name" to={to} data-go={to} aria-label={linkLabel}>{name}</Link>
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
			<IconButton className="fav-tile-edit" icon="pencil" label={editLabel} to={editTo} />
		</article>
	)
}
