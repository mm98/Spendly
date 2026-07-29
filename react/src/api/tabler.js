import { NAMES, PER_SHARD, SHARDS } from './tabler/index.js'

/* The Tabler catalogue, in pieces.

   5,129 icons is 800 kB of path data, and it used to arrive as one object: the picker opened,
   the whole set came down, and Rollup reported a 919.61 kB chunk against a 500 kB warning.
   What made that wasteful rather than merely large is that the picker never draws more than a
   screenful -- it opens on the app's own 39 glyphs and a search is capped at 240 hits -- so a
   search for "carrot" was paying for 5,128 paths it would not put on screen.

   So the two halves travel separately, because they answer different questions:

   - The **names** are what a search reads, and it has to read all of them to answer. They are
     69 kB for the set, one dynamic import when the picker first renders.
   - The **paths** are what a tile draws, and only the matched ones are ever drawn. They are cut
     into twelve shards along the same sorted order the names are in, so an icon's shard is its
     position in NAMES divided by PER_SHARD and no index has to be shipped to find it.

   A search therefore pulls the names plus however many shards its hits land in -- for anything
   lexically clustered, which is most searches, that is one or two of twelve. See
   components/Pickers.jsx for the drawing half, and ../README.md for the measurements.

   Nothing outside the picker imports any of this. What a record needs in order to be *drawn*
   is the path string, and that is stored on the record when the icon is chosen, so the rows,
   the rings and the donut never load a shard at all. */

export { NAMES, PER_SHARD }

/** Which shard holds the path for `NAMES[index]`. */
export const shardOf = index => Math.floor(index / PER_SHARD)

/* Keyed by shard, holding the promise rather than the result: two searches a keystroke apart
   both want shard 3, and the second must join the first request instead of starting a second. */
const shards = new Map()

/** Resolves to `{ [name]: path }` for one shard. Cached for the life of the page. */
export const loadShard = i => {
	let pending = shards.get(i)
	if (!pending) {
		pending = SHARDS[i]().then(module => {
			/* The shard is an array read by position -- it carries no names, since the names
			   are already here and repeating them would be the 69 kB again. */
			const from = i * PER_SHARD
			const paths = {}
			module.default.forEach((d, at) => { paths[NAMES[from + at]] = d })
			return paths
		})
		shards.set(i, pending)
	}
	return pending
}
