/** A line's title as one product, whatever its amount: lower case, no numbers, units or marks. */
export function productKey(title) {
	return String(title ?? '').toLowerCase()
		.replace(/\d+([.,]\d+)?\s*(kg|g|gr|l|ltr|cl|ml|stk|pk|%)?\.?(?=\s|$|[,;/-])/g, ' ')
		.replace(/[^\p{L}\s]/gu, ' ')
		.replace(/\s+/g, ' ').trim()
}
