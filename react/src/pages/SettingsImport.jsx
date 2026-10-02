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
import { amount, plural } from '../api/format.js'
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

const linesIn = orders => orders.reduce((n, o) => n + (Array.isArray(o?.items) ? o.items.length : 0), 0)

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

/* Import, as 11b's first, third and fourth steps: pick a file, check what it holds, then
   write it. Nothing is written before Import is pressed. */
export function ImportCard() {
	const vendors = useApi(getVendors)
	const [stage, setStage] = useState({ name: 'rest' })

	const read = async files => {
		const file = files?.[0]
		if (!file) return
		let parsed
		try { parsed = JSON.parse(await file.text()) } catch {
			return setStage({ name: 'rest', problem: 'unreadable' })
		}
		const orders = Array.isArray(parsed) ? parsed : parsed?.orders
		if (!Array.isArray(orders) || !orders.length) return setStage({ name: 'rest', problem: 'empty' })
		setStage({ name: 'review', file: file.name, orders })
	}

	const run = async () => {
		const { orders, file } = stage
		const failed = []
		let imported = 0
		setStage({ name: 'importing', file, orders, done: 0 })
		try {
			for (const batch of slices(orders)) {
				try {
					const result = await importOrders(batch.orders, {
						onRows: done => setStage(s => (s.name === 'importing' ? { ...s, done: batch.offset + done } : s))
					})
					imported += result.imported
					failed.push(...result.failed.map(f => ({ ...f, index: f.index + batch.offset })))
				} catch (e) {
					// a 400 here names every refused row; anything else stops the import
					if (e.status === 400 && e.body?.failed) failed.push(...e.body.failed.map(f => ({ ...f, index: f.index + batch.offset })))
					else if (e.status === 413) failed.push({ index: batch.offset, error: 'This order is too big to send.' })
					else throw e
				}
			}
			if (imported) invalidate()
			setStage({ name: 'done', orders, imported, failed })
		} catch {
			if (imported) invalidate()
			setStage({ name: 'done', orders, imported, failed, stopped: true })
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
					<Icon name="file" />
					<span className="sp-title sp-truncate">{file}</span>
				</div>
				<div className="sp-row-flex sp-wrap sp-top sp-gap-12">
					<Stat large label="Orders" figure={amount(orders.length, 0)} />
					<Stat large label="Item lines" figure={amount(linesIn(orders), 0)} />
					{fresh === null ? null : <Stat large label="New vendors" figure={amount(fresh, 0)} />}
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
		const { orders, imported, failed, stopped } = stage
		const skipped = new Set(failed.map(f => f.index))
		const lines = linesIn(orders.filter((o, i) => !skipped.has(i)))
		const facts = [plural(lines, 'item line')]
		if (failed.length) facts.push(`${plural(failed.length, 'order')} skipped`)
		return (
			<Card footerCommits footerLayout="split" footer={[
				<Button key="again" variant="outline" onClick={restart}>Import another file</Button>,
				<Button key="see" to="/orders">See the {ordersWord(imported)}</Button>
			]}>
				{heading}
				<div className="sp-row-flex sp-gap-12">
					<Mark size="medium" round aria-label="Imported"><Icon name="check" /></Mark>
					<div className="sp-stack sp-gap-6">
						<span className="sp-heading sp-truncate">{ordersWord(imported)} imported</span>
						<span className="sp-subtitle">{facts.join(' · ')}</span>
					</div>
				</div>
				{stopped
					? (
						<Well color="danger">
							<span className="sp-title sp-ink-danger">The import stopped before the end.</span>
							<span className="sp-meta sp-ink-danger">The orders above were imported. The rest of the file was not.</span>
						</Well>
					)
					: null}
				{failed.length
					? (
						<ListItem color="danger">
							<span className="sp-stack sp-gap-6">
								{failed.slice(0, 3).map(f => (
									<span key={f.index} className="sp-data sp-ink-danger">Order {f.index + 1} in the file: {f.error}</span>
								))}
								{failed.length > 3 ? <span className="sp-meta sp-ink-danger">And {plural(failed.length - 3, 'more order')}.</span> : null}
							</span>
						</ListItem>
					)
					: null}
			</Card>
		)
	}

	return (
		<Card>
			{heading}
			<FileDrop accept=".json,application/json" onFiles={read}
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
