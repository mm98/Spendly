import { db } from '../db.js'

/* The two halves of an honest text search, shared by the orders list's text filter
   (routes/orders.js) and the command palette (routes/search.js).

   LIKE's case folding is ASCII-only, and both routes lowercase the needle in JS with the full
   Unicode fold -- so any stored text whose match needs a non-ASCII fold was unfindable: an
   order whose search_text holds 'Æg' never matched the needle 'æg', and since every needle is
   lowercased first, typing the stored casing exactly was rewritten into the one that cannot
   match. 1,563 such orders in a 50,000-order Danish demo account. SQLite's own lower() folds
   ASCII only too, so no SQL-side rewrite fixes it; a tiny deterministic function running
   JS's fold does, at ~37ms against LIKE's ~19ms for the worst case (a no-match needle over
   50,000 orders) -- paid only by needles that actually carry a non-ASCII letter, which is
   what asciiNeedle branches on at the call sites.

   The LIKE half has the opposite bug: % and _ in a needle acted as wildcards, so searching
   "100%" matched any text containing 100, and "_" matched every order there is. escapeLike
   plus ESCAPE '\' makes the needle literal, which is what a search box's text is. */

db.function('contains_fold', { deterministic: true }, (haystack, needle) =>
	haystack != null && String(haystack).toLowerCase().includes(needle) ? 1 : 0)

// the same full fold, for an equality: a whole name typed in another case than it is stored in
db.function('lower_fold', { deterministic: true }, text => (text == null ? null : String(text).toLowerCase()))

/** Whether LIKE's ASCII fold can match this (already JS-lowercased) needle correctly. */
export const asciiNeedle = needle => /^[\x00-\x7F]*$/.test(needle)

/** The needle as a literal LIKE pattern body -- pair with ESCAPE '\' on the LIKE itself. */
export const escapeLike = needle => needle.replace(/[\\%_]/g, ch => '\\' + ch)

/* The two match shapes those halves produce, named once: the LIKE form for ASCII needles,
   the fold form for a needle LIKE cannot case-fold. Both expect @needle -- the LIKE form as
   an escaped %...% pattern, the fold form as the bare lowercased text. No lower() around the
   column in the LIKE shape: LIKE is already case-insensitive for ASCII, so wrapping the
   column only re-derives per row what the operator does for free (measured at +4ms per
   palette search over 50,000 search_text values). */
export const MATCHERS = {
	ascii: col => `${col} LIKE @needle ESCAPE '\\'`,
	fold: col => `contains_fold(${col}, @needle)`
}

/** The vendor ids a text needle finds: the vendor's own name or any alias it answers to,
    as one SQL fragment for an `IN (...)`. This is search's version of the resolution rule
    findOrCreate.js states exactly (name first, then aliases, one vendor per string) -- a
    substring instead of an equality, membership instead of a single id, but the same claim
    about what a vendor is called.

    One fragment rather than a clause per route, because the clause was restated per route
    and the restatements drifted: the palette matched aliases and the orders list's text
    filter did not, so `Netto` found an order in the finder and zero orders on All orders,
    for the same account, in the same session. Every statement that asks "which vendors does
    this text match" composes this, so the next list cannot disagree with the last one.

    UNION ALL, not UNION: the fragment exists to sit inside an IN(...), which is a membership
    test, so deduplicating a vendor matched by both its name and an alias buys nothing -- and
    UNION pays for it with a merge that sorts both sides in temp B-trees, which is exactly
    what queries:check flagged on the first cut of this fragment. */
export const vendorIdsMatching = match => `
	SELECT id FROM vendors WHERE user_id = @userId AND ${match('name')}
	UNION ALL SELECT vendor_id FROM vendor_aliases WHERE user_id = @userId AND ${match('name')}
`
