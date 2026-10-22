import { MONEY_BACK_KINDS } from './constants.js'

// every total of spend counts by these; `alias` is the orders table's with its dot ('ot.'), or ''

/** A returned order, or an order of a money-back kind: money that came to the account. */
export const moneyBack = (alias = '') => `(${alias}status_type = 'returned' OR ${alias}kind IN (${MONEY_BACK_KINDS.map(k => `'${k}'`).join(', ')}))`

/** Money paid: a draft or a cancelled order moved no money, and money back is not spend. */
export const moneyPaid = (alias = '') => `${alias}status_type NOT IN ('cancelled', 'draft') AND NOT ${moneyBack(alias)}`
