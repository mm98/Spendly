import { randomBytes } from 'node:crypto'

/** A short, collision-safe id with a readable prefix, e.g. "o-l3f9a2b8c1d4e6f0". */
export const newId = prefix => `${prefix}-${randomBytes(8).toString('hex')}`
