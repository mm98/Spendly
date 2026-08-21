import { useEffect, useRef } from 'react'
import { Navigate, useSearchParams } from 'react-router'

/* What a list was showing, kept for the length of the visit.

   Every one of the three listing tabs holds its whole state in the query string -- the
   keyword, the sort, the page, and on All orders the eight filters -- because a filtered
   list is a place you can link to, and that is the design system's rule (README:
   Pagination, All Orders). It is also the reason the state evaporated: the app's own way
   back into these pages is a bare URL every time. The sub-tab is a literal `/orders/all`,
   the back button off an order detail is a fixed `/orders`, SEE ALL and the palette are
   bare too -- so filtering a list, opening a row and coming back landed on an unfiltered
   list without anybody having cleared anything. The URL was doing its job; the links were
   not saying anything for it to do.

   So the query string is still the only source of truth, and this is a memory of the last
   one, consulted in exactly one case: arriving with nothing. A URL that carries state wins
   outright -- `?vendor=bilka` from a chart legend row still means that vendor, never the
   last thing this tab was looking at -- and CLEAR ALL leaves an empty query, which is
   stored as empty and restores as empty, so clearing stays cleared.

   sessionStorage rather than localStorage, deliberately. Where you were in a list is
   working state for this visit, not a preference: it belongs to the tab, dies with it, and
   does not follow the account onto another device or turn up a week later filtered to a
   month nobody remembers choosing. Two tabs open on two different filters keep their own,
   which localStorage would not give them.

   Restoring is a redirect during render rather than an effect, so the unfiltered request
   is never made: an effect would fire after the first commit, and the page below would have
   already asked the API for page 1 of everything and painted the answer. */

const KEY = name => 'spendly:list:' + name

/* Storage is denied outright in some privacy modes and full in others, and a list that
   cannot remember its filters still has to render. Every access answers, or gives up. */
const store = {
	get: name => { try { return sessionStorage.getItem(KEY(name)) } catch { return null } },
	set: (name, value) => { try { sessionStorage.setItem(KEY(name), value) } catch { /* storage denied */ } }
}

/** Remembers this list's query string, and puts it back when the page is reached bare. */
export function ListState({ name, children }) {
	const [params] = useSearchParams()
	const search = params.toString()

	/* Decided once per mount, and the decision itself is what is stored -- not a flag saying
	   a decision was made. StrictMode renders every component twice, so a latch that flips a
	   ref while rendering answers "restore" the first time and "carry on" the second, which
	   is a restore that works in the build and not in the dev server. Keeping the answer
	   makes the second render agree with the first.

	   Re-deciding on every render instead is the other bug, and it has a name in CLAUDE.md:
	   "no query string" is not only true on arrival, it is true again the instant CLEAR ALL
	   empties one -- so a live condition reads a snapshot taken before the click and writes
	   the cleared filters straight back. Measured before this was fixed: clearing left
	   `/orders/all` for a frame and bounced to `?vendor=...&status=Delivered`, the page
	   overruling the one control whose whole job is to empty it.

	   The decision is spent as soon as it has been acted on, which is what the effect below
	   does, so the children mount once already carrying the restored query -- no request is
	   ever made for the unfiltered list, and nothing can restore twice. */
	const decision = useRef(undefined)
	if (decision.current === undefined) decision.current = (!search && store.get(name)) || null
	const restore = decision.current

	useEffect(() => { decision.current = null }, [])

	useEffect(() => {
		/* Not on the redirecting render: saving the empty query there would erase the very
		   snapshot being restored, and the restore would work exactly once. */
		if (restore !== null) return
		store.set(name, search)
	}, [name, search, restore])

	return restore !== null ? <Navigate to={{ search: '?' + restore }} replace /> : children
}
