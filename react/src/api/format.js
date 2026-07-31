

const groups = whole => whole.replace(/\B(?=(\d{3})+$)/g, '.')

export const amount = n => {
	const [whole, decimals] = Math.abs(n).toFixed(2).split('.')
	return (n < 0 ? '-' : '') + groups(whole) + ',' + decimals
}

export const amountRound = n => (n < 0 ? '-' : '') + groups(String(Math.round(Math.abs(n))))

export const kr = n => amount(n) + ' kr.'

export const krRound = n => amountRound(n) + ' kr.'

export const percent = (n, decimals = 1) =>
	n.toFixed(decimals).replace('.', ',') + '%'

export const AMOUNT_PATTERN = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/
export const WHOLE_NUMBER_PATTERN = /^\d+$/
export const parseAmount = v => Number(String(v).replace(/\./g, '').replace(',', '.'))

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December']

export const dayMonth = iso => {
	const [, m, d] = iso.split('-')
	return Number(d) + ' ' + MONTHS[Number(m) - 1]
}

export const longDate = iso => dayMonth(iso) + ' ' + iso.slice(0, 4)

export const shortDate = iso => {
	const [y, m, d] = iso.split('-')
	return d + '.' + m + '.' + y
}

export const today = () => {
	const now = new Date()
	return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
