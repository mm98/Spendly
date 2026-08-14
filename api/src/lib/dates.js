/** The API's date boundary: the frontend sends/reads plain "YYYY-MM-DD" strings (order dates
    carry no time-of-day anywhere in the UI), the database stores unix seconds at 00:00:00 UTC
    of that date. Every route converts at the edge so nothing past this file sees an epoch. */

export const toEpoch = isoDate => Math.floor(Date.parse(isoDate + 'T00:00:00Z') / 1000)

export const fromEpoch = epoch => new Date(epoch * 1000).toISOString().slice(0, 10)

export const nowEpoch = () => Math.floor(Date.now() / 1000)
