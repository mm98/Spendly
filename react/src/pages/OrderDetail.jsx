import { useParams } from 'react-router-dom'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { AiCard } from '../components/AiCard.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip, StatusChip } from '../components/Chip.jsx'
import { useApi } from '../api/useApi.js'
import { getOrder } from '../api/client.js'
import { kr, longDate, percent, shortDate } from '../api/format.js'

/* One order.

   The items list and the three summary lines under it are the same records: the subtotal is
   the lines added up, and the total is that plus shipping. Printing a stored total beside
   lines that do not add to it is the defect this page is most able to hide, because both
   halves look right on their own. */

export default function OrderDetail() {
	const { id } = useParams()
	const state = useApi(getOrder, [id])

	return (
		<Page>
			<Async state={state} label="Loading the order">{order => (
				<div className="order-list-grid">
					<div className="order-list-column">
						<Card aria-label="Order">
							<CardBody variant="card-body-page">
								<div className="space-between" style={{ alignItems: 'flex-start' }}>
									<div>
										<div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.01em' }}>
											{order.vendor?.name}</div>
										<div className="field-help" style={{ fontSize: 12.5 }}>
											{longDate(order.date)} · {order.itemCount} items</div>
									</div>
									<div className="row-inline row-inline-nowrap" style={{ gap: 8 }}>
										<StatusChip>{order.status}</StatusChip>
										<IconButton icon="pencil" label="Edit order" />
										<IconButton icon="trash" label="Delete order" />
									</div>
								</div>
								<div className="row-inline" style={{ gap: 6, marginTop: 12 }}>
									{order.categories.map(c => <Chip key={c.id}>{c.name}</Chip>)}
								</div>
							</CardBody>
						</Card>

						<Card aria-label="Items">
							<CardHeader title={`Items · ${order.itemCount}`}>
								<span className="field-help tabular-figures">{kr(order.subtotal)}</span>
							</CardHeader>
							<CardDivider />
							<CardBody variant="card-body-tight">
								{order.items.map(item => (
									<ItemRow key={item.id} thumb="photo" title={item.title}
										meta={`${item.quantity} × ${kr(item.price)}`
											+ (item.note ? ` · ${item.note}` : '')}
										amount={kr(item.price * item.quantity)} />
								))}
								{order.itemCount > order.items.length ? (
									<ItemRow icon="dots" iconTone={{ background: '#EFF3EE', color: 'var(--text-muted)' }}
										title={`${order.itemCount - order.items.length} more lines`}
										meta="On the receipt, not shown here." />
								) : null}
								<div className="card-divider" style={{ margin: '6px 0 0' }} />
								<SummaryRow label="Items subtotal" value={kr(order.subtotal)} />
								<SummaryRow label="Shipping" value={kr(order.shipping)} />
								<div className="card-divider" style={{ margin: '2px 0 0' }} />
								<SummaryTotal value={kr(order.total)} />
								{order.saved > 0 ? (
									<span className="field-help" style={{ color: 'var(--text-positive)', fontWeight: 600 }}>
										saved {kr(order.saved)} vs retail ({percent(order.savedPercent)})
									</span>
								) : null}
							</CardBody>
						</Card>
					</div>

					<div className="order-list-column">
						<Card aria-label="Details">
							<CardHeader title="Details" />
							<CardDivider />
							<CardBody variant="card-body-tight">
								<div className="summary-row">Status<span className="summary-row-value">{order.status}</span></div>
								<SummaryRow label="Date" value={shortDate(order.date)} />
								<div className="summary-row">Vendor<span className="summary-row-value">{order.vendor?.name}</span></div>
								<div className="summary-row">Categories
									<span className="summary-row-value">{order.categories.map(c => c.name).join(', ')}</span></div>
								<div className="summary-row">Kind<span className="summary-row-value">{order.kind}</span></div>
								<div className="summary-row">Saved vs retail
									<span className="summary-row-value tabular-figures summary-row-value-saving">
										{kr(order.saved)} ({percent(order.savedPercent)})</span></div>
							</CardBody>
						</Card>

						<Card aria-label="Attachments">
							<CardHeader title={`Attachments · ${order.attachments.length}`}>
								<button type="button" className="button button-pill">ADD FILE</button>
							</CardHeader>
							<CardDivider />
							<CardBody variant="card-body-tight">
								{order.attachments.length ? order.attachments.map(file => (
									<ItemRow key={file.id} thumb={file.kind === 'pdf' ? 'document' : 'photo'}
										title={file.name} meta={file.meta}>
										<span className="row-inline row-inline-nowrap" style={{ gap: 4, marginLeft: 'auto' }}>
											<IconButton icon="chevronRight" label={`Open ${file.name}`} />
											<IconButton icon="trash" label={`Delete ${file.name}`} />
										</span>
									</ItemRow>
								)) : <p className="field-help">Nothing attached to this order yet.</p>}
							</CardBody>
						</Card>

						<AiCard headline="Another receipt from this trip?"
							body="Scan it and Spendly checks it against this order for duplicates.">
							<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
						</AiCard>
					</div>
				</div>
			)}</Async>
		</Page>
	)
}
