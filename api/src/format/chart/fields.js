/* What every chart kind reads from what Claude sent, held to the size the app draws. */

const TEXT_MOST = 80
export const ID = /^[\w-]{1,64}$/
export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export const textOf = value => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MOST)
export const numberOf = value => (Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : 0)

// the line a chart that could not be made shows in its frame
export const CHART_EMPTY = 'This chart could not be made: there are no numbers to draw for this.'
