import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Card, Panel } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { Check } from '../components/Choice.jsx'
import { Segmented } from '../components/Segmented.jsx'
import { ListItem } from '../components/ListItem.jsx'
import { Sum } from '../components/Data.jsx'
import { Pill } from '../components/Pill.jsx'
import { SaveBar } from '../components/Touch.jsx'
import { Alert, Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { useApi } from '../api/useApi.js'
import { failureMessage, getOrder, getScanDraft, invalidateOrderData, updateOrder } from '../api/client.js'
import { dot, plural } from '../api/format.js'
import { useShellShape } from '../app/useMedia.js'
import { useStatuses } from '../app/statuses.js'
import { Reading } from './OrderNew.jsx'
import { OrderFailed, OrderLoading, LinePhoto, itemPhoto, lineTotal, money, totalsOf } from './OrderParts.jsx'
import { apiDraft, draftOf, useStacked } from './OrderForm.jsx'
import { newSaveKey, shortened } from './orderSave.js'
import { changesOrder, compareLines, defaultPicks, resultingLines } from './compareLines.js'

// Nothing changes until Apply; the receipt is already one of the order's files, so Cancel leaves it there (Order create 3d)

// a receipt whose total is further than this from the order's is asked about first
const FAR = 0.25

export default function OrderCompare() {
	const { id } = useParams()
	const [params] = useSearchParams()
	const documentKey = params.get('doc')
	const fileId = params.get('file')
	const navigate = useNavigate()
	const order = useApi(getOrder, [id])
	const read = useApi(getScanDraft, [documentKey], { enabled: Boolean(documentKey) })
	const held = order.data?.id === id ? order.data : null
	const answer = read.data?.documentKey === documentKey ? read.data : null
	const file = held?.attachments.find(a => a.id === fileId) ?? null
	const back = () => navigate(`/orders/${id}`)

	if (!documentKey || !fileId || (held && !file))
		return <OrderFailed what="This receipt" error={{ message: 'It is not on this order any more.' }} retry={back} />
	if (!held && order.error) return <OrderFailed error={order.error} retry={order.refresh} />
	if (!held) return <OrderLoading />
	if (read.error)
		return (
			<Alert color="danger" mark="!" title="This receipt could not be opened."
				action={<Button variant="outline" size="small" onClick={back}>Back to the order</Button>}>
				{failureMessage(read.error, 'Check your connection, then try again.')}
			</Alert>
		)
	if (!answer) return <Reading file={{ key: documentKey, name: file.name, hasThumbnail: file.hasThumbnail }} documentKey={documentKey} onCancel={back} />
	if (answer.failure)
		return (
			<Alert color="danger" mark="!" title="This receipt could not be read."
				action={<Button variant="outline" size="small" onClick={back}>Back to the order</Button>}>
				The file is kept with the order. You can check the lines yourself.
			</Alert>
		)
	return <Comparison order={held} file={file} answer={answer} documentKey={documentKey} />
}

/** What the receipt says it comes to: its printed total, else its lines with shipping and discount. */
const receiptTotal = answer => (answer.total != null
	? answer.total
	: totalsOf(answer.lines, answer.shipping, answer.discount).total)

function Comparison({ order, file, answer }) {
	const navigate = useNavigate()
	const toast = useToast()
	const touch = useShellShape() === 'touch'
	const statuses = useStatuses()
	const column = useRef(null)
	const stacked = useStacked(column)
	const narrow = touch || stacked
	const { rows, matched } = useMemo(() => compareLines(order.items, answer.lines), [order, answer])
	const [picks, setPicks] = useState(() => defaultPicks(rows))
	const [saving, setSaving] = useState(false)
	const [far, setFar] = useState(() => {
		const total = receiptTotal(answer)
		const sameVendor = answer.vendorMatched && answer.vendor === order.vendor?.name
		return !sameVendor || (order.total > 0 && Math.abs(total - order.total) / order.total > FAR)
	})
	const back = () => navigate(`/orders/${order.id}`)

	const result = useMemo(() => resultingLines(order.items, rows, picks), [order, rows, picks])
	const changes = rows.filter(r => changesOrder(r, picks[r.key])).length
	const after = totalsOf(result, order.shipping, order.discount).total
	const printed = receiptTotal(answer)
	const gap = Math.abs(after - printed)

	// one apply only: the order refetched by its own save would otherwise find nothing left to compare and apply again
	const started = useRef(false)
	const apply = async (counted = changes) => {
		if (started.current) return
		started.current = true
		setSaving(true)
		const form = draftOf(order)
		const dated = new Set(statuses.filter(s => s.ownDate).map(s => s.key))
		const lines = result.map(l => ({ note: '', url: '', ...l }))
		try {
			await updateOrder(order.id, {
				...apiDraft(form, lines, dated), clientKey: newSaveKey(),
				...(order.revision ? { revision: order.revision } : {}), validatedBy: file.id
			})
		} catch (e) {
			started.current = false
			setSaving(false)
			toast({
				message: e.status === 409 ? 'This order was changed somewhere else. Open it again, then compare once more.' : failureMessage(e, 'The order was not changed. Try again.'),
				color: 'danger'
			})
			return
		}
		invalidateOrderData()
		navigate(`/orders/${order.id}`, { state: { validated: { name: file.name, changes: counted } } })
	}

	// nothing differs: the order is marked as checked and the order page says so
	useEffect(() => {
		if (!rows.length && !far) apply(0)
	}, [rows.length, far])

	if (far)
		return (
			<Dialog onCancel={back} aria-label="This receipt may belong to another order">
				<DialogTitle>This receipt may belong to another order</DialogTitle>
				<DialogBody>
					The receipt is from {answer.vendor}, {money(printed)} This order is {order.vendor?.name}, {money(order.total)}
				</DialogBody>
				<DialogActions>
					<Button variant="outline" onClick={() => setFar(false)}>Compare anyway</Button>
					<Button onClick={back}>Attach only</Button>
				</DialogActions>
			</Dialog>
		)
	if (!rows.length) return <OrderLoading />

	const set = (key, value) => setPicks(p => ({ ...p, [key]: value }))
	const jump = () => document.querySelector('[data-compare-row] input')?.focus()

	const applyLabel = saving ? 'Applying…' : changes ? (narrow ? `Apply ${changes}` : `Apply ${plural(changes, 'change')}`) : 'Mark validated'
	const commits = [
		<Button key="cancel" variant="outline" disabled={saving} onClick={back}>Cancel</Button>,
		<Button key="apply" disabled={saving} onClick={() => apply()}>{applyLabel}</Button>
	]
	const matchedNote = matched.length
		? `${plural(matched.length, 'line')} ${matched.length === 1 ? 'matches' : 'match'} the receipt${!narrow && matched.length <= 3 ? `: ${matched.map(l => l.title).join(', ')}` : ''}`
		: null

	const list = (
		<Card>
			<div className="sp-row-flex sp-gap-8">
				<span className="sp-section-label">Lines that differ{dot}{rows.length}</span>
				<span className="sp-grow" />
				<Button variant="outline" size="small" onClick={() => setPicks(defaultPicks(rows))}>{narrow ? 'Accept all' : 'Accept all from receipt'}</Button>
			</div>
			<div className="sp-stack sp-gap-8">
				{rows.map(row => <Difference key={row.key} row={row} pick={picks[row.key]} onPick={v => set(row.key, v)} order={order} narrow={narrow} />)}
			</div>
			{matchedNote ? <span className="sp-meta">{matchedNote}</span> : null}
		</Card>
	)
	const notice = (
		<Alert mark="!" title={`${plural(rows.length, 'line')} ${rows.length === 1 ? 'differs' : 'differ'} from the receipt.`}
			action={<Button variant="outline" size="small" onClick={jump}>Jump to first</Button>}>
			The receipt's version is picked on each line. Change any you want to keep from the order.
		</Alert>
	)
	const totals = (
		<Card footer={narrow ? [] : commits} footerLayout="split" footerCommits>
			<span className="sp-section-label">Totals</span>
			<div className="sp-stack">
				<Sum value={money(order.total)}>Order now</Sum>
				<Sum value={money(after)}>After changes</Sum>
				<Sum value={money(printed)}>On the receipt</Sum>
			</div>
			{gap < 0.005
				? <Pill color="success">Totals match</Pill>
				: <Pill state="progress">{money(gap)} {after > printed ? 'more' : 'less'} than the receipt</Pill>}
		</Card>
	)

	if (touch)
		return (
			<div className="sp-stack sp-gap-12" ref={column}>
				{notice}{list}
				<SaveBar>
					<span className="sp-subtitle sp-grow">Total {money(after)}</span>
					{commits}
				</SaveBar>
			</div>
		)
	return (
		<>
			{notice}
			<div className="sp-shell__body--split">
				<div className="sp-stack sp-gap-12" ref={column}>
					{list}
					{stacked
						? (
							<ListItem variant="sticky">
								<span className="sp-subtitle sp-grow">Total {money(after)}</span>
								{commits}
							</ListItem>
						)
						: null}
				</div>
				{stacked ? null : <Panel>{totals}</Panel>}
			</div>
		</>
	)
}

const figures = line => `${Number(line.quantity) === 1 ? '' : `${Number(line.quantity)} × `}${money(line.price)}`

/** Why a line is listed, in the words a reader sees under its name. */
function reason(row) {
	if (row.kind === 'renamed') return `Name on the receipt: ${row.receipt.title}`
	if (row.kind === 'receiptOnly') return 'Only on the receipt - ticked lines are added'
	if (row.kind === 'orderOnly') return 'Not on the receipt - removed unless ticked'
	const [a, b] = [row.order, row.receipt]
	const price = Number(a.price) !== Number(b.price)
	const count = Number(a.quantity) !== Number(b.quantity)
	if (price && count) return `Price and quantity differ: ${figures(a)} on the order, ${figures(b)} on the receipt`
	if (count) return `Quantity differs: ${Number(a.quantity)} on the order, ${Number(b.quantity)} on the receipt`
	return `Price differs: ${money(a.price)} on the order, ${money(b.price)} on the receipt`
}

/** One line that differs: its choice, and the amount it will have, with the one it replaces under it. */
function Difference({ row, pick, onPick, order, narrow }) {
	const { kind } = row
	const title = (row.order ?? row.receipt).title
	const both = kind === 'differs' || kind === 'renamed'
	const used = pick === 'order' ? row.order : row.receipt
	const other = pick === 'order' ? row.receipt : row.order
	const box = kind === 'receiptOnly' || kind === 'orderOnly'
	const gone = box && pick !== true
	const shown = both ? used : row.order ?? row.receipt
	const struck = both && kind === 'differs' && lineTotal(other) !== lineTotal(used) ? lineTotal(other) : null
	const choice = both
		? (
			<Segmented name={`pick-${row.key}`} role="radiogroup" aria-label={`Keep ${shortened(title)} from`} value={pick} onChange={onPick}
				options={[{ value: 'order', label: 'Order' }, { value: 'receipt', label: 'Receipt' }]} />
		)
		: null
	const text = (
		<span className="sp-stacked">
			<span className="sp-title sp-truncate">{title}</span>
			<span className="sp-subtitle sp-ink-warning">{reason(row)}</span>
		</span>
	)
	return (
		<ListItem color="warning" variant={narrow ? 'top' : 'default'} data-compare-row=""
			mark={<>
				{box
					? <Check checked={pick === true} onChange={ev => onPick(ev.target.checked)} aria-label={`${kind === 'receiptOnly' ? 'Add' : 'Keep'} ${title}`} />
					: null}
				<LinePhoto src={row.order ? itemPhoto(order.id, row.order) : null} name={title} />
			</>}>
			{narrow
				? <span className="sp-stack sp-gap-8 sp-grow">{text}{choice}</span>
				: <>{text}<span className="sp-grow" />{choice}</>}
			<span className="sp-stacked sp-cell-amount">
				<span className={gone ? 'sp-amount sp-void' : 'sp-amount'}>{money(lineTotal(shown))}</span>
				{struck != null ? <span className="sp-amount-secondary sp-void">{money(struck)}</span> : null}
			</span>
		</ListItem>
	)
}
