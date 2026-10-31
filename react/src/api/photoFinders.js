import { phrase } from '../language/phrases.js'

/* The photo finders a vendor can choose (Vendors and categories 5b) come from the server, which leaves
   out one it cannot run. A new finder in the API's lib/photoFinders/index.js is its name in the phrase files. */

/** A finder's name as the vendor form lists it; no finder reads as Off. */
export const photoFinderName = key => (key ? phrase(`photoFinder.${key}`) : phrase('photoFinder.off'))
