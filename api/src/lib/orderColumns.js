/* The columns of the order_totals view (migrations/001_init.sql) that decorateOrder actually
   reads — excludes user_id (already the query's filter, never the output) and the view's
   internal paid/retail intermediates (folded into saved/saved_percent already). Shared between
   lib/decorate.js and routes/orders.js's list query so both SELECT the same trimmed set instead
   of each re-deciding it. */
export const ORDER_TOTALS_COLUMNS = [
	'id', 'vendor_id', 'date', 'status', 'kind', 'shipping', 'note', 'reference', 'refunded',
	'item_count', 'subtotal', 'total', 'saved', 'saved_percent'
]

/** "id, vendor_id, ..." or, with an alias, "ot.id, ot.vendor_id, ..." — needed once a query
    joins order_totals against another table that also has an `id` column (vendors does). */
export const orderTotalsSelectList = (alias = '') =>
	ORDER_TOTALS_COLUMNS.map(c => (alias ? `${alias}.${c}` : c)).join(', ')
