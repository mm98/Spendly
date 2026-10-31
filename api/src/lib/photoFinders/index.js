import { groceries } from './groceries.js'

export { productKey } from './productKey.js'

/* A finder is `{ key, works(), find(title) }`, `find` answering `{ image, contentType, sourceUrl }` or null.
   A new finder is one file here and one entry in this list; nothing outside this folder names a finder. */
export const PHOTO_FINDERS = [groceries]

/** Every finder a vendor may hold, working on this server or not. */
export const photoFinderKeys = PHOTO_FINDERS.map(f => f.key)
/** The finders a vendor may choose on this server. */
export const workingPhotoFinderKeys = () => PHOTO_FINDERS.filter(f => f.works()).map(f => f.key)
/** The finder a vendor holds, or null when it does not work on this server. */
export const photoFinderOf = key => PHOTO_FINDERS.find(f => f.key === key && f.works()) ?? null
