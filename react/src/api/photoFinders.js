import { phrase } from '../language/phrases.js'

/* The photo finders a vendor can choose (Vendors and categories 5b), in step with the API's
   lib/photoFinders/index.js. A new finder is one key here and its name in the phrase files. */
export const PHOTO_FINDERS = ['groceries']

/** A finder's name as the vendor form lists it; no finder reads as Off. */
export const photoFinderName = key => (key ? phrase(`photoFinder.${key}`) : phrase('photoFinder.off'))
