import { useRef, useState } from 'react'
import { Sep } from '../components/Sep.jsx'
import { useNavigate, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { DocumentPreview, ImageLightbox } from '../components/Viz.jsx'
import { DropZone, HiddenFileInput } from '../components/FileInput.jsx'
import { useDelete, useRowDelete } from '../components/FormPage.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import {
	addAttachments, attachmentFileUrl, attachmentThumbnailUrl, deleteOrder, getOrder,
	invalidateOrderData, itemAttachmentFileUrl, itemAttachmentThumbnailUrl,
	removeAttachment
} from '../api/client.js'
import { kr, longDate, percent, shortDate, sep } from '../api/format.js'

/* One order, and everything you can do to it.

   The items list and the summary lines under it are the same records: the subtotal is the
   lines added up, and the total is that plus shipping. Printing a stored total beside lines
   that do not add to it is the defect this page is most able to hide, because both halves
   look right on their own.

   Every control here acts, and the page shows the record rather than editing it: status is
   read in the summary card and changed on the edit page. A live status editor stood on this
   card once -- a full-width segmented band duplicating the control the edit form already has,
   which is the reading view paying rent for the form's job (README: Order Detail). Edit opens
   the New order flow with this order in it. Delete asks first, unless Settings says not to. */

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

	const invalidateOrder = () => invalidateOrderData()

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
								<div className="space-between space-between-top">
									<div>
										<div className="order-title">
											{order.vendor?.name}</div>
										<div className="field-help order-subtitle">
											{longDate(order.date)}<Sep />{order.itemCount} items</div>
									</div>
									<div className="row-inline row-inline-nowrap order-head-actions">
										<IconButton icon="pencil" label="Edit order" to={`/orders/${id}/edit`} />
										{del.iconButton}
									</div>
								</div>

								{del.dialog}

								<div className="row-inline order-chips">
									{order.categories.map(c => <Chip key={c.id}>{c.name}</Chip>)}
									{order.categories.length === 0
										? <span className="field-help">No categories on this order.</span>
										: null}
								</div>
							</CardBody>
						</Card>

						<Card aria-label="Items">
							<CardHeader title={`Items${sep}${order.itemCount}`}>
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
											+ (item.retail ? `${sep}retail ${kr(item.retail)}` : '')
											+ (item.note ? `${sep}${item.note}` : '')}
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
								<div className="card-divider card-divider-gap" />
								<SummaryRow label="Items subtotal" value={kr(order.subtotal)} />
								<SummaryRow label="Shipping" value={kr(order.shipping)} />
								<div className="card-divider card-divider-tight" />
								<SummaryTotal value={kr(order.total)} />
								{order.saved > 0 ? (
									<span className="field-help summary-saved">
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
							<CardHeader title={`Attachments${sep}${order.attachments.length}`}>
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
											<span className="row-inline row-inline-nowrap row-actions push-end">
												<IconButton icon={openFile === file.id ? 'chevronDown' : 'chevronRight'}
													label={`${openFile === file.id ? 'Close' : 'Open'} ${file.name}`}
													aria-expanded={openFile === file.id}
													onClick={() => setOpenFile(openFile === file.id ? null : file.id)} />
												{/* The row's own action, not one more click past an expand -- the
												    preview below is still a raster (page one, for a PDF), so the
												    real file needs its own control rather than living inside the
												    state that shows the raster. `download` is what turns the file
												    endpoint into a save rather than a navigation. README: Honest
												    Affordances. */}
												<IconButton icon="download" label={`Download ${file.name}`}
													href={attachmentFileUrl(order.id, file.id)} download={file.name} />
												{fileDel.iconButton(file)}
											</span>
										</ItemRow>
										{openFile === file.id ? (
											<div className="attachment-preview">
												<DocumentPreview kind={file.kind}
													src={file.hasThumbnail ? attachmentThumbnailUrl(order.id, file.id) : undefined} />
												<span className="field-help">{file.name}<Sep />{file.meta}</span>
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
