// Each tool reads one API route over this server's own port with the caller's token.
// A route a tool names must also be listed in lib/mcpTokens.js, or the token is refused there.

const PAGE_SIZE_MOST = 100

const text = (description, extra = {}) => ({ type: 'string', description, ...extra })
const number = (description, extra = {}) => ({ type: 'number', description, ...extra })
const day = description => text(`${description} As YYYY-MM-DD.`, { pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
const page = { page: number('Which page, from 1.', { minimum: 1 }) }
const pageSize = fallback => ({ pageSize: number(`Rows per page, at most ${PAGE_SIZE_MOST}. ${fallback} when left out.`, { minimum: 1, maximum: PAGE_SIZE_MOST }) })
const sizeOf = (value, fallback) => Math.min(PAGE_SIZE_MOST, Math.max(1, Math.floor(Number(value)) || fallback))

const query = params => {
	const search = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
	const written = search.toString()
	return written ? `?${written}` : ''
}

export const MCP_TOOLS = [
	{
		name: 'list_orders',
		description: 'Find orders (purchases, refunds, gifts and other money movements), newest first unless sorted otherwise. Every filter is optional. Amounts are in the account\'s own currency. Answers one page of rows, how many matched, and how many pages there are.',
		inputSchema: {
			type: 'object',
			properties: {
				query: text('Text to find in the shop name, a line\'s title, the note, the reference or a category name.'),
				from: day('The first day to include.'),
				to: day('The last day to include.'),
				vendorId: text('Only orders from this shop. Ids come from list_vendors.'),
				categoryId: text('Only orders in this category. Ids come from list_categories. "none" finds orders with no category.'),
				status: text('Only orders with this status key, as the order rows name it.'),
				kind: text('Only orders of this kind.', { enum: ['Expense', 'Gift', 'Sold', 'Work', 'Other'] }),
				minAmount: number('The smallest order total to include.'),
				maxAmount: number('The largest order total to include.'),
				sort: text('The order of the rows.', { enum: ['date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'discount-desc', 'discount-asc', 'vendor-asc'] }),
				...page,
				...pageSize(25)
			}
		},
		path: a => `/api/orders${query({
			with: 'rows', query: a.query, from: a.from, to: a.to, vendorId: a.vendorId, categoryId: a.categoryId, status: a.status,
			kind: a.kind, minAmount: a.minAmount, maxAmount: a.maxAmount, sort: a.sort, page: a.page, pageSize: sizeOf(a.pageSize, 25)
		})}`
	},
	{
		name: 'get_order',
		description: 'One order in full: shop, date, status, categories, every line with its price and quantity, shipping, discount, totals and the files it carries.',
		inputSchema: {
			type: 'object',
			properties: { id: text('The order\'s id, from list_orders or search.') },
			required: ['id']
		},
		path: a => `/api/orders/${encodeURIComponent(a.id)}`
	},
	{
		name: 'list_categories',
		description: 'The account\'s categories with their monthly limit, how many orders each has, whether it is a favourite, the spend in one month and the monthly average over the last twelve months. Spend is money paid: returned and sold orders are left out of it.',
		inputSchema: {
			type: 'object',
			properties: {
				query: text('Text to find in the category name.'),
				month: text('The month the spend is counted in, as YYYY-MM. This month when left out. When given, only categories with spend in that month are listed.', { pattern: '^\\d{4}-\\d{2}$' }),
				sort: text('The order of the rows. By name when left out. "month-desc" is the most spent in the month first, "limit-desc" the highest monthly limit first.', { enum: ['name-asc', 'month-desc', 'month-asc', 'limit-desc', 'orders-desc'] }),
				flag: text('Only some categories: "limited" those with a monthly limit, "over-limit" those past it in the month, "near-limit" those close to it but not past, from the warning level the account has chosen in Settings.', { enum: ['limited', 'over-limit', 'near-limit'] }),
				...page,
				...pageSize(100)
			}
		},
		path: a => `/api/categories${query({ with: 'month', query: a.query, month: a.month, sort: a.sort, flag: a.flag, page: a.page ?? 1, pageSize: sizeOf(a.pageSize, 100) })}`
	},
	{
		name: 'list_vendors',
		description: 'The shops the account buys from, with how many orders each has, the total spent and saved, the date of the last order, whether it is a favourite, and its other names. Spent is money paid: returned and sold orders are counted as orders but left out of it.',
		inputSchema: {
			type: 'object',
			properties: {
				query: text('Text to find in the shop name or one of its other names.'),
				sort: text('The order of the rows. Most spent first when left out. "recent" is the latest order first.', { enum: ['spend-desc', 'spend-asc', 'orders-desc', 'saved-desc', 'saved-asc', 'name-asc', 'recent'] }),
				archived: text('Shops put away: left out by default.', { enum: ['no', 'yes', 'all'] }),
				...page,
				...pageSize(50)
			}
		},
		path: a => `/api/vendors${query({ query: a.query, sort: a.sort ?? 'spend-desc', archived: a.archived, page: a.page ?? 1, pageSize: sizeOf(a.pageSize, 50) })}`
	},
	{
		name: 'list_budget_years',
		description: 'The years the account has a budget for.',
		inputSchema: { type: 'object', properties: {} },
		path: () => '/api/budget'
	},
	{
		name: 'get_budget',
		description: 'One year\'s budget: its groups, and every line with its expected and real amount for each month.',
		inputSchema: {
			type: 'object',
			properties: { year: number('The year, for example 2026. list_budget_years names the years there are.', { minimum: 1900, maximum: 9999 }) },
			required: ['year']
		},
		path: a => `/api/budget/${Math.floor(Number(a.year))}`
	},
	{
		name: 'get_statistics',
		description: 'Spending over one period: the total, the number of orders, what was saved, the split by category and shop, and the same figures for the period before to compare with. Cancelled orders, drafts and orders left out of statistics are not counted.',
		inputSchema: {
			type: 'object',
			properties: {
				range: text('How long the period is. "days30" is the last 30 days, "custom" is from and to.', { enum: ['week', 'month', 'quarter', 'year', 'days30', 'all', 'custom'] }),
				period: text('Which period of that length: 2026-W07 for a week, 2026-03 for a month, 2026-Q1 for a quarter, 2026 for a year. The current one when left out.'),
				from: day('The first day, with range "custom".'),
				to: day('The last day, with range "custom".'),
				flow: text('Which money to count. Money back is a returned order or an order of the kind Sold. "expenses" leaves money back out, "refunds" counts only money back.', { enum: ['all', 'expenses', 'refunds', 'net'] }),
				vendorId: text('Only this shop.'),
				categoryId: text('Only this category.'),
				compare: text('What the period is compared with: the period before, or the same period a year earlier.', { enum: ['previous', 'year'] })
			},
			required: ['range']
		},
		path: a => `/api/stats${query({
			range: a.range, windowId: a.range === 'custom' && a.from && a.to ? `${a.from}~${a.to}` : a.period,
			flow: a.flow, vendorId: a.vendorId, categoryId: a.categoryId, compare: a.compare
		})}`
	},
	{
		name: 'get_monthly_totals',
		description: 'What was spent and how many orders there were in each of the last months, ending with this month.',
		inputSchema: {
			type: 'object',
			properties: {
				months: number('How many months, 1 to 24. 12 when left out.', { minimum: 1, maximum: 24 }),
				flow: text('Which money to count.', { enum: ['all', 'expenses', 'refunds', 'net'] })
			}
		},
		path: a => `/api/stats/months${query({ count: a.months ?? 12, flow: a.flow })}`
	},
	{
		name: 'search',
		description: 'The app\'s own search: the shops and orders a piece of text appears in, by shop name, reference, note or a line\'s title.',
		inputSchema: {
			type: 'object',
			properties: { query: text('The text to find.') },
			required: ['query']
		},
		path: a => `/api/search${query({ query: a.query })}`
	}
]

const byName = new Map(MCP_TOOLS.map(tool => [tool.name, tool]))

/** What a client is told about each tool: everything but how the server answers it. */
export const toolList = () => MCP_TOOLS.map(({ name, description, inputSchema }) => ({
	name, description, inputSchema, annotations: { readOnlyHint: true, openWorldHint: false }
}))

/** A tool call's result. A refusal from the API is the tool's error, in the API's own words.
    `self` is this server's own address, from the port the call arrived on. */
export async function callTool(name, args, token, self) {
	const tool = byName.get(name)
	if (!tool) return null
	const missing = (tool.inputSchema.required ?? []).filter(key => args?.[key] === undefined || args[key] === '')
	if (missing.length) return failed(`Missing: ${missing.join(', ')}.`)
	const answer = await fetch(self + tool.path(args ?? {}), {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
		signal: AbortSignal.timeout(30_000)
	})
	const body = await answer.json().catch(() => null)
	if (!answer.ok) return failed(body?.error ?? `The answer was ${answer.status}.`)
	return { content: [{ type: 'text', text: JSON.stringify(body) }] }
}

const failed = message => ({ content: [{ type: 'text', text: message }], isError: true })
