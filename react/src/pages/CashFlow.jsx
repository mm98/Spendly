import { Link } from 'react-router'
import { Button } from '../components/Button.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { CashFlow, ChartTip } from '../components/Data.jsx'
import { Failed } from '../components/Failed.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { getCashFlow } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { currency, dot, percent } from '../api/format.js'
import { phrase, usePhrase } from '../language/phrases.js'

// the readout lists this many of a group's rows from 640 to 1099 before "N more"
const TIP_ROWS = 3

/** The months of a period, up to the current month: `{ from, to }` as YYYY-MM. */
export function wholeMonths(fromIso, toIso, todayIso) {
	const now = todayIso.slice(0, 7)
	const to = toIso.slice(0, 7) > now ? now : toIso.slice(0, 7)
	const from = fromIso.slice(0, 7) > to ? to : fromIso.slice(0, 7)
	return { from, to }
}

const nameOf = node => {
	if (node.other) return phrase('stats.cash.other')
	if (node.otherCategories) return phrase('stats.cash.otherCategories')
	if (node.spending) return phrase('stats.cash.spending')
	if (node.name != null) return node.name
	if (node.id.startsWith('income:')) return phrase('stats.cash.income')
	if (node.id.startsWith('account:')) return phrase('stats.cash.noAccount')
	// an order with no category
	return phrase('orderRow.noCategory')
}

/** The server's answer as the chart takes it; with `amounts` false no amount is written, so none is in the page (4h). */
function drawn(flow, amounts) {
	const total = flow.income.reduce((a, n) => a + n.value, 0)
	const out = flow.branches.reduce((a, b) => a + b.value, 0)
	const bar = node => ({
		...node,
		name: nameOf(node),
		amount: amounts ? currency(node.value, 0) : '',
		share: total > 0 ? percent((node.value / total) * 100, 0) : ''
	})
	return {
		income: flow.income.map(bar),
		branches: flow.branches.map(b => ({
			...bar(b),
			groups: b.groups.map(g => ({ ...bar(g), branch: b, lines: g.lines.map(bar) }))
		})),
		// Left and Over only beside an income; equal draws neither
		left: total > 0 && total - out >= 0.5 ? { value: total - out, amount: amounts ? currency(total - out, 0) : '' } : undefined,
		over: total > 0 && out - total >= 0.5 ? { value: out - total, amount: amounts ? currency(out - total, 0) : '' } : undefined
	}
}

/** The readout of a pointed bar (c18): its name and amount, Of income, and where it sits. */
function tipFor(chart, amounts) {
	const where = new Map()
	for (const b of chart.branches) {
		where.set(b.id, phrase('stats.cash.where', { place: b.name, count: b.spending ? phrase('stats.cash.vendors', { count: b.groups.reduce((a, g) => a + g.rows, 0) }) : phrase('stats.cash.rows', { count: b.groups.reduce((a, g) => a + g.rows, 0) }) }))
		for (const g of b.groups) {
			const count = b.spending ? phrase('stats.cash.vendors', { count: g.rows }) : phrase('stats.cash.rows', { count: g.rows })
			where.set(g.id, phrase('stats.cash.where', { place: b.name, count }))
			for (const l of g.lines) where.set(l.id, g.name)
		}
	}
	return (bar, { opens }) => {
		const lines = bar.other || bar.otherCategories ? bar.joined.map(j => ({ name: j.name ?? phrase('orderRow.noCategory'), value: amounts ? currency(j.value, 0) : '' })) : opens ? bar.lines : []
		const shown = opens ? lines.slice(0, TIP_ROWS) : lines
		const rows = [
			...(bar.share ? [{ key: 'share', name: phrase('stats.cash.ofIncome'), value: bar.share }] : []),
			...shown.map((l, i) => ({ key: `row${i}`, name: l.name, value: l.amount ?? l.value }))
		]
		const note = [
			where.get(bar.id),
			opens && lines.length > TIP_ROWS ? phrase('stats.cash.more', { count: lines.length - TIP_ROWS }) : null,
			opens ? phrase('stats.cash.clickToOpen') : null
		].filter(Boolean).join(dot)
		return <ChartTip title={bar.name} value={bar.amount} rows={rows} note={note || undefined} />
	}
}

/** The Cash flow card for the months `from` to `to` (YYYY-MM). */
export function CashFlowCard({ from, to, touch, amounts }) {
	usePhrase()
	const answer = useApi(getCashFlow, [from, to])
	const head = <CardHeader name={phrase('stats.cash.title')} />
	if (answer.error) return <Failed what={phrase('stats.cash.title')} error={answer.error} onRetry={answer.refresh} />
	if (!answer.data) {
		return (
			<Card>
				{head}
				<div className="sp-stack sp-gap-8">
					<Skeleton shape="line" />
					<Skeleton shape="line" />
					<Skeleton shape="short" />
				</div>
			</Card>
		)
	}
	const flow = answer.data.flow
	if (!flow) {
		return (
			<Card>
				{head}
				<Empty>
					<EmptyTitle>{phrase('stats.cash.noBudget')}</EmptyTitle>
					<EmptyBody>{phrase('stats.cash.noBudgetBody')}</EmptyBody>
					<div className="sp-row-flex sp-gap-8">
						<Button size="small" to="/budget">{phrase('stats.cash.openBudget')}</Button>
					</div>
				</Empty>
			</Card>
		)
	}
	const chart = drawn(flow, amounts)
	return (
		<Card>
			{head}
			{flow.income.length
				? null
				: <span className="sp-meta">{phrase('stats.cash.noIncome', { year: to.slice(0, 4) })} <Link to={`/budget/${to.slice(0, 4)}`}>{phrase('stats.cash.addIncome')}</Link></span>}
			<CashFlow key={`${flow.from}~${flow.to}`} {...chart} tip={tipFor(chart, amounts)} down={touch} label={phrase('stats.cash.label')} />
		</Card>
	)
}
