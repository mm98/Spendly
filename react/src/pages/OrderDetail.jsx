import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DocumentPreview, ImageLightbox } from '../components/Viz.jsx'
import { DropZone, HiddenFileInput } from '../components/FileInput.jsx'
import { useDelete, useRowDelete } from '../components/FormPage.jsx'
import { AiCard } from '../components/AiCard.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { Segmented } from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { invalidate, useApi } from '../api/useApi.js'
import {
	addAttachments, attachmentFileUrl, attachmentThumbnailUrl, deleteOrder, getHomeContent, getHomeHero, getOrder,
	getOrderAsDraft, getOrders, getOrdersOverview, getStats, itemAttachmentFileUrl, itemAttachmentThumbnailUrl,
	removeAttachment, updateOrder
} from '../api/client.js'
import { kr, longDate, percent, shortDate } from '../api/format.js'

/* One order, and everything you can do to it.

   The items list and the summary lines under it are the same records: the subtotal is the
   lines added up, and the total is that plus shipping. Printing a stored total beside lines
   that do not add to it is the defect this page is most able to hide, because both halves
   look right on their own.

   Every control here acts. Status is a live segmented control rather than a chip, because
   marking an order delivered is the single commonest thing to do to one and walking through
   the edit form for it is three screens too many. Edit opens the New order flow with this
   order in it. Delete asks first, unless Settings says not to. */

export default function OrderDetail() {
	const { id } = useParams()
	const state = useApi(getOrder, [id])
	const navigate = useNavigate()
	/* Everything this page reports is the result of an action -- marked, attached, removed --
	   so all of it goes to the toast layer. Nothing here is a form verdict about fields the
	   user has to go back and fix, which is the one kind of message that stays on the page. */
	const toast = useToast()
	const [openFile, setOpenFile] = useState(null)
	const [openPhoto, setOpenPhoto] = useState(null)
	const filePicker = useRef(null)

	/* Anything that counts orders, or shows this one, is stale the moment it is written --
	   Statistics and the Home hero chart both aggregate over order rows and neither has any
	   other trigger to refetch. */
	const invalidateOrder = () => {
		invalidate(getOrder); invalidate(getOrders); invalidate(getHomeContent)
		invalidate(getOrdersOverview); invalidate(getOrderAsDraft)
		invalidate(getStats); invalidate(getHomeHero)
	}

	const setOrderStatus = (order, next) => {
		updateOrder(id, {
			vendor: order.vendor?.name, date: order.date, status: next, kind: order.kind,
			categories: order.categories.map(c => c.name),
			shipping: order.shipping ? String(order.shipping).replace('.', ',') : '',
			reference: order.reference, note: order.note, items: order.items
		})
			.then(() => { invalidateOrder(); state.refresh(); toast(`Marked ${next.toLowerCase()}.`) })
			.catch(() => toast('That did not save.', 'negative'))
	}

	/* The same asking, the same warm note and the same setting as deleting a category or a
	   vendor -- one destructive action written once, rather than one per screen that agrees
	   about whether to ask until the day one of them is changed. See FormPage.jsx. */
	const del = useDelete({
		what: 'order',
		variant: 'block',
		detail: state.data
			? `${state.data.vendor?.name}, ${longDate(state.data.date)}, ${kr(state.data.total)}.`
			: '',
		onDelete: () => deleteOrder(id)
			.then(() => { invalidateOrder(); navigate('/orders/all') })
			.catch(() => toast('That did not delete.', 'negative'))
	})

	const attach = files => {
		addAttachments(id, files)
			.then(({ added, skipped }) => {
				invalidateOrder(); state.refresh()
				const said = added.length
					? `${added.length} file${added.length === 1 ? '' : 's'} attached: ${added.map(a => a.name).join(', ')}.`
					: ''
				const also = skipped.length
					? `${skipped.join(', ')} ${skipped.length === 1 ? 'is' : 'are'} already attached.`
					: ''
				toast([said, also].filter(Boolean).join(' '), added.length ? 'positive' : 'negative')
			})
			.catch(() => toast('That did not attach.', 'negative'))
	}

	const detach = file => {
		removeAttachment(id, file.id)
			.then(() => {
				invalidateOrder(); state.refresh()
				if (openFile === file.id) setOpenFile(null)
				toast(`${file.name} removed.`)
			})
			.catch(() => toast('That did not remove.', 'negative'))
	}

	/* The row's trash asks the same way the header band's does -- one setting, every delete
	   (README: Deletion). Removing an attachment persists at once, so it earns the note as
	   much as the record does. */
	const fileDel = useRowDelete({
		what: 'attachment',
		label: file => `Delete ${file.name}`,
		detail: file => `${file.name}, ${file.meta}. This cannot be undone.`,
		onDelete: detach
	})

	return (
		<Page>
			<Async state={state} label="Loading the order">{order => (
				<>
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
										<IconButton icon="pencil" label="Edit order" to={`/orders/${id}/edit`} />
										{del.iconButton}
									</div>
								</div>

								{del.dialog}

								<div className="row-inline" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
									{order.categories.map(c => <Chip key={c.id}>{c.name}</Chip>)}
									{order.categories.length === 0
										? <span className="field-help">No categories on this order.</span>
										: null}
								</div>

								<div className="field" style={{ marginTop: 14 }}>
									<span>Status</span>
									<Segmented options={['Ordered', 'Delivered', 'Returned']} value={order.status}
										onChange={next => setOrderStatus(order, next)} label="Order status" />
								</div>
							</CardBody>
						</Card>

						<Card aria-label="Items">
							<CardHeader title={`Items · ${order.itemCount}`}>
								<span className="field-help tabular-figures">{kr(order.subtotal)}</span>
							</CardHeader>
							<CardDivider />
							<CardBody variant="card-body-tight">
								{order.items.map(item => {
									const photo = item.attachments?.[0]
									return (
									<ItemRow key={item.id}
										icon={photo ? undefined : 'cube'} thumb={photo ? 'photo' : undefined}
										thumbSrc={photo?.hasThumbnail ? itemAttachmentThumbnailUrl(order.id, item.id, photo.id) : undefined}
										onThumbClick={photo ? () => setOpenPhoto({ item, photo }) : undefined}
										title={item.title}
										meta={`${item.quantity} × ${kr(item.price)}`
											+ (item.retail ? ` · retail ${kr(item.retail)}` : '')
											+ (item.note ? ` · ${item.note}` : '')}
										amount={kr(item.price * item.quantity)} />
									)
								})}
								{/* A receipt with more lines than are listed says so rather than letting the
								    count above and the rows below quietly disagree. */}
								{order.itemCount > order.items.length ? (
									<ItemRow icon="dots" iconTone={{ background: '#EFF3EE', color: 'var(--text-muted)' }}
										title={`${order.itemCount - order.items.length} more lines`}
										meta="On the receipt, and in the total below." />
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
								<Button variant="block" icon="pencil" to={`/orders/${id}/edit`}>EDIT ORDER</Button>
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
									<span className="summary-row-value">
										{order.categories.map(c => c.name).join(', ') || '—'}</span></div>
								<div className="summary-row">Kind<span className="summary-row-value">{order.kind}</span></div>
								{order.reference ? (
									<div className="summary-row">Reference
										<span className="summary-row-value">{order.reference}</span></div>
								) : null}
								<div className="summary-row">Saved vs retail
									<span className="summary-row-value tabular-figures summary-row-value-saving">
										{kr(order.saved)} ({percent(order.savedPercent)})</span></div>
								{order.note ? (
									<>
										<div className="card-divider card-divider-tight" />
										<span className="field-help">{order.note}</span>
									</>
								) : null}
							</CardBody>
						</Card>

						<Card aria-label="Attachments">
							<CardHeader title={`Attachments · ${order.attachments.length}`}>
								<button type="button" className="button button-pill"
									onClick={() => filePicker.current?.click()}>ADD FILES</button>
							</CardHeader>
							<CardDivider />
							{/* Dropping a stack of receipts on a card is how anyone with a scanner works, so
							    the card takes a drop and takes several at once. The header button opens the
							    same picker for anyone not dragging. */}
							<CardBody variant="card-body-tight"
								onDragOver={e => e.preventDefault()}
								onDrop={e => {
									e.preventDefault()
									const files = [...(e.dataTransfer?.files ?? [])]
									if (files.length) attach(files)
								}}>
								<HiddenFileInput ref={filePicker} multiple accept="image/*,.pdf"
									label="Add attachments" onFiles={attach} />
								{order.attachments.length ? order.attachments.map(file => (
									<div key={file.id}>
										<ItemRow thumb={file.kind === 'pdf' ? 'document' : 'photo'}
											thumbSrc={file.hasThumbnail ? attachmentThumbnailUrl(order.id, file.id) : undefined}
											title={file.name} meta={file.meta}>
											<span className="row-inline row-inline-nowrap" style={{ gap: 4, marginLeft: 'auto' }}>
												<IconButton icon={openFile === file.id ? 'chevronDown' : 'chevronRight'}
													label={`${openFile === file.id ? 'Close' : 'Open'} ${file.name}`}
													aria-expanded={openFile === file.id}
													onClick={() => setOpenFile(openFile === file.id ? null : file.id)} />
												{fileDel.iconButton(file)}
											</span>
										</ItemRow>
										{openFile === file.id ? (
											<div style={{ padding: '0 4px 10px' }}>
												<DocumentPreview kind={file.kind}
													src={file.hasThumbnail ? attachmentThumbnailUrl(order.id, file.id) : undefined} />
												<span className="field-help">{file.name} · {file.meta}</span>
												{/* The preview above is a raster -- a rendered first page for a PDF,
												    stretched no larger than the box lets it. Reading the document
												    means the real file, not that render: a plain link, not the
												    Link-based Button, since /api/... is a real file the browser
												    opens with its own viewer, not a route this app has. README:
												    Honest Affordances. */}
												<a className="button button-pill" style={{ marginTop: 8 }}
													href={attachmentFileUrl(order.id, file.id)}
													target="_blank" rel="noopener noreferrer">OPEN FULL FILE</a>
											</div>
										) : null}
									</div>
								)) : (
									<DropZone icon="photo" accept="image/*,.pdf" label="Add attachments"
										hint="Drop receipts here — as many as you like — or choose them."
										action="CHOOSE FILES" onFiles={attach} />
								)}
								{fileDel.dialog}
							</CardBody>
						</Card>

						<AiCard headline="Another receipt from this trip?"
							body="Scan it and Spendly checks it against this order for duplicates.">
							<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
						</AiCard>
					</div>
				</div>

				{openPhoto ? (
					<ImageLightbox
						src={itemAttachmentFileUrl(order.id, openPhoto.item.id, openPhoto.photo.id)}
						alt={`${openPhoto.item.title} photo`}
						onClose={() => setOpenPhoto(null)} />
				) : null}
				</>
			)}</Async>
		</Page>
	)
}
