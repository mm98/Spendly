import { useState } from 'react'
import { Card } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { FileDrop } from '../components/FileDrop.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Well } from '../components/Well.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Gauge, Stat } from '../components/Data.jsx'
import { Spinner } from '../components/Utilities.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import { getVendors, importOrders, vendorByAnyName } from '../api/client.js'
import { amount, amountRound, plural } from '../api/format.js'
import { Heading } from './SettingsParts.jsx'

/* The server takes 50 MB per request and a receipt rides along as base64, so orders are sent
   in slices under this many bytes of JSON. */
const BATCH_BYTES = 40 * 1024 * 1024

function slices(orders) {
	const out = []
	let batch = [], bytes = 0, offset = 0
	for (const order of orders) {
		const size = JSON.stringify(order).length + 1
		if (batch.length && bytes + size > BATCH_BYTES) {
			out.push({ orders: batch, offset })
			offset += batch.length
			batch = []; bytes = 0
		}
		batch.push(order); bytes += size
	}
	out.push({ orders: batch, offset })
	return out
}

const itemsOf = order => (Array.isArray(order?.items) ? order.items : [])
const linesIn = orders => orders.reduce((n, o) => n + itemsOf(o).length, 0)
// summed as a saved order's total is: its lines, plus shipping, less discount
const totalOf = orders => orders.reduce((sum, o) => sum
	+ itemsOf(o).reduce((n, i) => n + (Number(i?.price) * Number(i?.quantity) || 0), 0)
	+ (Number(o?.shipping) || 0) - (Number(o?.discount) || 0), 0)

// names the account has no vendor for yet, matched the way the server files them
const newVendors = (orders, vendors) => {
	const seen = new Set()
	for (const o of orders) {
		const name = String(o?.vendor ?? '').trim()
		if (name && !vendorByAnyName(vendors, name)) seen.add(name.toLowerCase())
	}
	return seen.size
}

const ordersWord = n => `${amount(n, 0)} ${n === 1 ? 'order' : 'orders'}`

/* The server refuses a row in the order form's words, which ask a question; a skipped row needs
   what is wrong with it. Kept in step with api/src/lib/validate.js; any other text shows as sent. */
const REASONS = [
	[/^Who did you buy from\?$/, 'The vendor is missing.'],
	[/^80 characters at most\.$/, 'The vendor name is longer than 80 characters.'],
	[/^When was the order placed\?$/, 'The date is missing, or is not written like 2026-08-18.'],
	[/^An order cannot be dated in the future\.$/, 'The date is in the future.'],
	[/^Pick a kind\.$/, 'The kind is missing.'],
	[/^Kind is one of: (.+)$/, m => `The kind is not one Spendly knows. Use one of: ${m[1]}`],
	[/^Status is one of: (.+)$/, m => `The status is not one Spendly knows. Use one of: ${m[1]}`],
	[/^That is not a valid date\.$/, 'A delivery or return date is not written like 2026-08-18.'],
	[/^A delivery cannot be dated in the future\.$/, 'The delivery date is in the future.'],
	[/^That is before the order date\.$/, 'The delivery date is before the order date.'],
	[/^A return cannot be dated in the future\.$/, 'The return date is in the future.'],
	[/^That is before the delivery date\.$/, 'The return date is before the delivery date.'],
	[/^Shipping must be/, 'The shipping is not an amount, or is below zero.'],
	[/^Discount must be/, 'The discount is not an amount, or is below zero.'],
	[/^An order needs at least one item\.$/, 'It has no items.'],
	[/^Describe the item\.$/, 'An item has no name.'],
	[/^120 characters at most\.$/, 'An item name or note is longer than 120 characters.'],
	[/^Quantity must be/, 'An item quantity is wrong. Use a number above 0 and at most 9999.'],
	[/^What did you pay\?$/, 'An item has no price.'],
	[/^Price cannot go below zero/, 'An item price is below zero.'],
	[/^Retail price must be/, 'An item retail price is not an amount, or is below zero.']
]
const reason = error => {
	for (const [pattern, plain] of REASONS) {
		const m = String(error).match(pattern)
		if (m) return typeof plain === 'function' ? plain(m) : plain
	}
	return error
}

/* Import, as 11b's first, third and fourth steps: pick a file, check what it holds, then
   write it. Nothing is written before Import is pressed. */
export function ImportCard() {
	const vendors = useApi(getVendors)
	const [stage, setStage] = useState({ name: 'rest' })

	// a refused file mounts a fresh picker, which is what lets the same file be chosen again
	const refuse = problem => setStage(s => ({ name: 'rest', problem, attempt: (s.attempt ?? 0) + 1 }))

	const read = async files => {
		const file = files?.[0]
		if (!file) return
		let parsed
		try { parsed = JSON.parse(await file.text()) } catch {
			return refuse('unreadable')
		}
		const orders = Array.isArray(parsed) ? parsed : parsed?.orders
		if (!Array.isArray(orders) || !orders.length) return refuse('empty')
		setStage({ name: 'review', file: file.name, orders })
	}

	const run = async () => {
		const { orders, file } = stage
		const failed = []
		let imported = 0, lines = 0
		setStage({ name: 'importing', file, orders, done: 0 })
		try {
			for (const batch of slices(orders)) {
				try {
					const result = await importOrders(batch.orders, {
						onRows: done => setStage(s => (s.name === 'importing' ? { ...s, done: batch.offset + done } : s))
					})
					imported += result.imported
					lines += result.orders.reduce((n, o) => n + itemsOf(o).length, 0)
					failed.push(...result.failed.map(f => ({ ...f, index: f.index + batch.offset })))
				} catch (e) {
					// a 400 here names every refused row; anything else stops the import
					if (e.status === 400 && e.body?.failed) failed.push(...e.body.failed.map(f => ({ ...f, index: f.index + batch.offset })))
					else if (e.status === 413) failed.push({ index: batch.offset, error: 'This order is too big to send.' })
					else throw e
				}
			}
			if (imported) invalidate()
			setStage({ name: 'done', imported, lines, failed })
		} catch {
			// the batch in flight may have written orders that never came back counted
			invalidate()
			setStage({ name: 'done', imported, lines, failed, stopped: true })
		}
	}

	const heading = <Heading section="import">Import</Heading>
	const restart = () => setStage({ name: 'rest' })

	if (stage.name === 'review' || stage.name === 'importing') {
		const { orders, file } = stage
		const busy = stage.name === 'importing'
		const fresh = vendors.data ? newVendors(orders, vendors.data) : null
		return (
			<Card footerCommits footerLayout="split" footer={[
				<Button key="cancel" variant="outline" disabled={busy} onClick={restart}>Cancel</Button>,
				busy
					? <Button key="import" disabled><Spinner />Importing…</Button>
					: <Button key="import" onClick={run}>Import {ordersWord(orders.length)}</Button>
			]}>
				{heading}
				<div className="sp-row-flex sp-gap-12">
					<span className="sp-row-flex sp-flex-none"><Icon name="file" /></span>
					<span className="sp-title sp-truncate">{file}</span>
				</div>
				<div className="st-quad">
					<Stat large label="Orders" figure={amount(orders.length, 0)} />
					<Stat large label="Item lines" figure={amount(linesIn(orders), 0)} />
					{fresh === null ? null : <Stat large label="New vendors" figure={amount(fresh, 0)} />}
					<Stat large label="Total" figure={amountRound(totalOf(orders))} />
				</div>
				{busy
					? (
						<>
							<Gauge thin value={(stage.done / orders.length) * 100} aria-label="Import progress" />
							<div className="sp-row-flex sp-gap-8">
								<span className="sp-meta">{amount(stage.done, 0)} of {amount(orders.length, 0)}</span>
								<span className="sp-grow" />
								<span className="sp-meta">This can take a moment.</span>
							</div>
						</>
					)
					: <span className="sp-meta">Orders that can't be imported are skipped. The rest are added to your lists.</span>}
			</Card>
		)
	}

	if (stage.name === 'done') {
		const { imported, lines, failed, stopped } = stage
		const again = <Button key="again" variant="outline" onClick={restart}>Import another file</Button>
		const reasons = failed.length
			? (
				<ListItem color="danger">
					<span className="sp-stack sp-gap-6">
						{failed.slice(0, 3).map(f => (
							<span key={f.index} className="sp-data sp-ink-danger">Order {f.index + 1} in the file: {reason(f.error)}</span>
						))}
						{failed.length > 3 ? <span className="sp-meta sp-ink-danger">And {plural(failed.length - 3, 'more order')}.</span> : null}
					</span>
				</ListItem>
			)
			: null

		if (stopped) return (
			<Card footerCommits footerLayout="split" footer={[again, <Button key="see" to="/orders">See your orders</Button>]}>
				{heading}
				<Well color="danger">
					<span className="sp-title sp-ink-danger">The import stopped before the end.</span>
					<span className="sp-meta sp-ink-danger">
						{imported
							? `At least ${ordersWord(imported)} ${imported === 1 ? 'was' : 'were'} imported. `
							: 'Some orders may have been imported. '}
						Look at your orders to see what was added before you import this file again.
					</span>
				</Well>
				{reasons}
			</Card>
		)

		if (!imported) return (
			<Card footerCommits footer={again}>
				{heading}
				<Well color="danger">
					<span className="sp-title sp-ink-danger">No orders were imported.</span>
					<span className="sp-meta sp-ink-danger">Fix the orders in the file, then import it again.</span>
				</Well>
				{reasons}
			</Card>
		)

		const facts = [plural(lines, 'item line')]
		if (failed.length) facts.push(`${plural(failed.length, 'order')} skipped`)
		return (
			<Card footerCommits footerLayout="split" footer={[again, <Button key="see" to="/orders">See the {ordersWord(imported)}</Button>]}>
				{heading}
				<div className="sp-row-flex sp-gap-12">
					<Mark size="medium" round aria-label="Imported"><Icon name="check" /></Mark>
					<div className="sp-stack sp-gap-6">
						<span className="sp-heading sp-truncate">{ordersWord(imported)} imported</span>
						<span className="sp-subtitle">{facts.join(' · ')}</span>
					</div>
				</div>
				{reasons}
			</Card>
		)
	}

	return (
		<Card>
			{heading}
			<FileDrop key={stage.attempt ?? 0} accept=".json,application/json" onFiles={read}
				onDragOver={ev => ev.preventDefault()}
				onDrop={ev => { ev.preventDefault(); read(ev.dataTransfer.files) }}>
				<Mark size="medium" fill="solid" aria-label="Upload" aria-hidden="true"><Icon name="upload" /></Mark>
				<span className="sp-title">Drop a file, or choose one</span>
				<span className="sp-subtitle">Orders exported from Spendly or a similar app, as a .json file.</span>
			</FileDrop>
			{stage.problem
				? (
					<Well color="danger">
						<span className="sp-title sp-ink-danger">
							{stage.problem === 'empty' ? 'There are no orders in that file.' : 'That file could not be read.'}
						</span>
						<span className="sp-meta sp-ink-danger">Choose a .json file with orders in it, exported from Spendly or a similar app.</span>
					</Well>
				)
				: null}
		</Card>
	)
}
