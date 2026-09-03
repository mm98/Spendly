import { randomBytes } from 'node:crypto'

/** A short, collision-safe id with a readable prefix, e.g. "o-l3f9a2b8c1d4e6f0". */
export const newId = prefix => `${prefix}-${randomBytes(8).toString('hex')}`

/** A session token, not a record id: it is the whole proof of who someone is, so it is sized as a
    secret rather than for readability. 32 bytes, and never routed through newId's 8. */
export const newSessionId = () => `sess-${randomBytes(32).toString('hex')}`
