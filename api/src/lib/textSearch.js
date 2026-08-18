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

/** Whether LIKE's ASCII fold can match this (already JS-lowercased) needle correctly. */
export const asciiNeedle = needle => /^[\x00-\x7F]*$/.test(needle)

/** The needle as a literal LIKE pattern body -- pair with ESCAPE '\' on the LIKE itself. */
export const escapeLike = needle => needle.replace(/[\\%_]/g, ch => '\\' + ch)
