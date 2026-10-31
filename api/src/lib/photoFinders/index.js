import { groceries } from './groceries.js'

export { productKey } from './productKey.js'

/* A finder is `{ key, find(title) }` answering `{ image, contentType, sourceUrl }` or null. A new
   finder is one file here and one entry in this list; nothing outside this folder names a finder. */
export const PHOTO_FINDERS = [groceries]

export const photoFinderKeys = PHOTO_FINDERS.map(f => f.key)
export const photoFinderOf = key => PHOTO_FINDERS.find(f => f.key === key) ?? null
