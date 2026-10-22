/* The pieces a maker's or a format's input is described with, for Claude. */

export const text = (description, extra = {}) => ({ type: 'string', description, ...extra })
export const day = description => text(`${description} As YYYY-MM-DD.`, { pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
