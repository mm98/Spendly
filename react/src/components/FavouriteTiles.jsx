import { Link } from 'react-router'

/* The favourites spotlight both overview pages share: a grid of small stat tiles, three
   across on a wide panel and one per row on a phone, each carrying the record's mark, its
   name and order count, and its total with what it saved underneath -- the same shape
   Latest orders and every other entry row in the app already draws a figure in
   (`EntryRow`'s `sub`, README: Data Rows), so a favourite reads the same way its record
   does everywhere else it appears.

   Vendors and Categories each used to draw their own spotlight (a pair of nested cards on
   Vendors, nothing at all on Categories), so the same standing preference rendered two
   different ways -- or not at all -- depending on which kind of record it was pinned to.
   One tile, fed by both, is the two-pages-one-fact rule made structural. README: Favourites.

   The tile used to carry its own star, a shortcut back out of the list with a confirm dialog
   behind it -- a stray click landed on it easily, so it asked before acting, and it once also
   carried a labelled Saved/Latest stat pair under a hairline and an edit button of its own.
   A favourite is a form choice now (VendorForm and CategoryForm's own Favourite row), turned
   off the same way it is turned on, and the record's own edit page is a click away from the
   All vendors / All categories list either way -- where the favourite mark shows up too -- so
   the tile does not need its own way there. */

export const FavouriteTileGrid = ({ children }) => <div className="fav-tile-grid">{children}</div>

/** One favourite: the mark, the name with its order count underneath, and the total with what
    it saved underneath -- the same head-row-plus-sub shape `EntryRow` draws everywhere else a
    record's figure appears. The whole tile is the way into the record's own filtered orders
    (`to`), the same as every other row in the app that goes somewhere. */
export function FavouriteTile({ mark, name, to, linkLabel, meta, amount, saved }) {
	return (
		<Link className="fav-tile" to={to} data-go={to} aria-label={linkLabel}>
			{mark}
			<div className="fav-tile-name-block">
				<span className="fav-tile-name">{name}</span>
				<div className="fav-tile-meta">{meta}</div>
			</div>
			<div className="fav-tile-headline">
				<div className="fav-tile-figure tabular-figures">{amount}</div>
				<div className="fav-tile-sub">{saved}</div>
			</div>
		</Link>
	)
}
