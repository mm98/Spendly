import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Card, CardHeader, Panel } from '../components/Card.jsx'
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
import { dot, plural, shortDate } from '../api/format.js'
import { ScreenBar } from '../app/screenBar.jsx'
import { useShellShape } from '../app/useMedia.js'
import { useStatuses } from '../app/statuses.js'
import { Reading } from './OrderNew.jsx'
import { OrderFailed, OrderLoading, LinePhoto, itemPhoto, lineTotal, money, totalsOf } from './OrderParts.jsx'
import { apiDraft, draftOf, useStacked } from './OrderForm.jsx'
import { newSaveKey, shortened } from './orderSave.js'
import { changesOrder, compareLines, defaultPicks, resultingLines } from './compareLines.js'
import { phrase, usePhrase } from '../language/phrases.js'

// Nothing changes until Apply; the receipt is already one of the order's files, so Cancel leaves it there (Order create 3d)

// a receipt whose total is further than this from the order's is asked about first
const FAR = 0.25

export default function OrderCompare() {
	const { id } = useParams()
	const phrase = usePhrase()
	const navigate = useNavigate()
	const order = useApi(getOrder, [id]).data
	const held = order?.id === id ? order : null
	return (
		<>
			<ScreenBar onBack={() => navigate(`/orders/${id}`)} title={phrase('page.compareWithReceipt')} meta={held ? [held.vendor?.name, shortDate(held.date)].filter(Boolean).join(dot) : null} />
			<Screen />
		</>
	)
}

function Screen() {
	const phrase = usePhrase()
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
		return <OrderFailed what={phrase('compare.thisReceipt')} error={{ message: phrase('compare.notOnOrder') }} retry={back} />
	if (!held && order.error) return <OrderFailed error={order.error} retry={order.refresh} />
	if (!held) return <OrderLoading />
	if (read.error)
		return (
			<Alert color="danger" mark="!" title={phrase('compare.notOpened')}
				action={<Button variant="outline" size="small" onClick={back}>{phrase('compare.backToOrder')}</Button>}>
				{failureMessage(read.error, phrase('failed.connection'))}
			</Alert>
		)
	if (!answer) return <Reading file={{ key: documentKey, name: file.name, hasThumbnail: file.hasThumbnail }} documentKey={documentKey} onCancel={back} />
	if (answer.failure)
		return (
			<Alert color="danger" mark="!" title={phrase('compare.notRead')}
				action={<Button variant="outline" size="small" onClick={back}>{phrase('compare.backToOrder')}</Button>}>
				{phrase('compare.notReadBody')}
			</Alert>
		)
	return <Comparison order={held} file={file} answer={answer} documentKey={documentKey} />
}

/** What the receipt says it comes to: its printed total, else its lines with shipping and discount. */
const receiptTotal = answer => (answer.total != null
	? answer.total
	: totalsOf(answer.lines, answer.shipping, answer.discount).total)

function Comparison({ order, file, answer }) {
	const phrase = usePhrase()
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
				message: e.status === 409 ? phrase('compare.changedElsewhere') : failureMessage(e, phrase('compare.notChanged')),
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
			<Dialog onCancel={back} aria-label={phrase('compare.otherOrder')}>
				<DialogTitle>{phrase('compare.otherOrder')}</DialogTitle>
				<DialogBody>
					{phrase('compare.otherOrderBody', { receiptVendor: answer.vendor, receiptAmount: money(printed), vendor: order.vendor?.name, amount: money(order.total) })}
				</DialogBody>
				<DialogActions>
					<Button variant="outline" onClick={() => setFar(false)}>{phrase('compare.anyway')}</Button>
					<Button onClick={back}>{phrase('compare.attachOnly')}</Button>
				</DialogActions>
			</Dialog>
		)
	if (!rows.length) return <OrderLoading />

	const set = (key, value) => setPicks(p => ({ ...p, [key]: value }))
	const jump = () => document.querySelector('[data-compare-row] input')?.focus()

	const applyLabel = saving ? phrase('compare.applying') : changes ? phrase('compare.apply', { what: narrow ? changes : plural(changes, 'change') }) : phrase('compare.markValidated')
	const commits = [
		<Button key="cancel" variant="outline" disabled={saving} onClick={back}>{phrase('action.cancel')}</Button>,
		<Button key="apply" disabled={saving} onClick={() => apply()}>{applyLabel}</Button>
	]
	const matchedNote = matched.length
		? phrase(!narrow && matched.length <= 3 ? 'compare.matchedNamed' : 'compare.matched', { count: matched.length, lines: plural(matched.length, 'line'), names: matched.map(l => l.title).join(', ') })
		: null

	const list = (
		<Card>
			<CardHeader name={phrase('compare.differ') + dot + rows.length} actions={[{ label: phrase(narrow ? 'compare.acceptAll' : 'compare.acceptAllReceipt'), onClick: () => setPicks(defaultPicks(rows)) }]} />
			<div className="sp-stack sp-gap-8">
				{rows.map(row => <Difference key={row.key} row={row} pick={picks[row.key]} onPick={v => set(row.key, v)} order={order} narrow={narrow} />)}
			</div>
			{matchedNote ? <span className="sp-meta">{matchedNote}</span> : null}
		</Card>
	)
	const notice = (
		<Alert mark="!" title={phrase('compare.differCount', { count: rows.length, lines: plural(rows.length, 'line') })}
			action={<Button variant="outline" size="small" onClick={jump}>{phrase('compare.jump')}</Button>} below={touch}>
			{phrase('compare.picked')}
		</Alert>
	)
	const totals = (
		<Card footer={narrow ? [] : commits} footerLayout="split" footerCommits>
			<CardHeader name={phrase('order.totals')} />
			<div className="sp-stack">
				<Sum value={money(order.total)}>{phrase('compare.orderNow')}</Sum>
				<Sum value={money(after)}>{phrase('compare.after')}</Sum>
				<Sum value={money(printed)}>{phrase('compare.onReceipt')}</Sum>
			</div>
			{gap < 0.005
				? <Pill color="success">{phrase('compare.totalsMatch')}</Pill>
				: <Pill state="progress">{phrase(after > printed ? 'compare.more' : 'compare.less', { amount: money(gap) })}</Pill>}
		</Card>
	)

	if (touch)
		return (
			<div className="sp-stack sp-gap-12" ref={column}>
				{notice}{list}
				<SaveBar>
					<span className="sp-subtitle sp-grow">{phrase('compare.total', { amount: money(after) })}</span>
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
								<span className="sp-subtitle sp-grow">{phrase('compare.total', { amount: money(after) })}</span>
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
	if (row.kind === 'renamed') return phrase('compare.renamed', { name: row.receipt.title })
	if (row.kind === 'receiptOnly') return phrase('compare.receiptOnly')
	if (row.kind === 'orderOnly') return phrase('compare.orderOnly')
	const [a, b] = [row.order, row.receipt]
	const price = Number(a.price) !== Number(b.price)
	const count = Number(a.quantity) !== Number(b.quantity)
	if (price && count) return phrase('compare.bothDiffer', { order: figures(a), receipt: figures(b) })
	if (count) return phrase('compare.quantityDiffers', { order: Number(a.quantity), receipt: Number(b.quantity) })
	return phrase('compare.priceDiffers', { order: money(a.price), receipt: money(b.price) })
}

/** One line that differs: its choice, and the amount it will have, with the one it replaces under it. */
function Difference({ row, pick, onPick, order, narrow }) {
	const phrase = usePhrase()
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
			<Segmented name={`pick-${row.key}`} role="radiogroup" aria-label={phrase('compare.keepFrom', { name: shortened(title) })} value={pick} onChange={onPick}
				options={[{ value: 'order', label: phrase('orderMenu.order') }, { value: 'receipt', label: phrase('repeats.receipt') }]} />
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
					? <Check checked={pick === true} onChange={ev => onPick(ev.target.checked)} aria-label={phrase(kind === 'receiptOnly' ? 'compare.add' : 'compare.keep', { name: title })} />
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
