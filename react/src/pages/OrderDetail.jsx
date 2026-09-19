import { Fragment, useEffect, useRef, useState } from 'react'
import { Sep } from '../components/Sep.jsx'
import { Link, useNavigate, useParams } from 'react-router'
import { Page } from '../components/Shell.jsx'
import { Async } from '../components/Async.jsx'
import { SkeletonCard, SkeletonRows } from '../components/Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader } from '../components/Card.jsx'
import { ItemRow, SummaryRow, SummaryTotal } from '../components/Rows.jsx'
import { ImageLightbox } from '../components/Viz.jsx'
import { DropZone, HiddenFileInput } from '../components/FileInput.jsx'
import { RECEIPT_FILES } from '../components/fileKinds.js'
import { useDelete, useRowDelete } from '../components/FormPage.jsx'
import { Button, IconButton } from '../components/Button.jsx'
import { Chip } from '../components/Chip.jsx'
import { useToast } from '../components/Toast.jsx'
import { useApi } from '../api/useApi.js'
import {
	addAttachments, attachmentFileUrl, attachmentThumbnailUrl, deleteOrder, failureMessage, getOrder,
	invalidateOrderData, itemAttachmentFileUrl, itemAttachmentThumbnailUrl,
	ordersIn, removeAttachment
} from '../api/client.js'
import { currency, fullStop, longDate, percent, plural, quantity as qtyText, sep, shortDate } from '../api/format.js'

/* One order, and everything you can do to it.

   The items list and the summary lines under it are the same records: the subtotal is the
   lines added up, and the total is that plus shipping. Printing a stored total beside lines
   that do not add to it is the defect this page is most able to hide, because both halves
   look right on their own.

   Every control here acts, and the page shows the record rather than editing it: status is
   read in the summary card and changed on the edit page. A live status editor stood on this
   card once -- a full-width segmented band duplicating the control the edit form already has,
   which is the reading view paying rent for the form's job (README: Order Detail). Edit opens
   the form on this order, Copy the same form on an unsaved order prefilled from it. Delete asks
   first, unless Settings says not to. */

export default function OrderDetail() {
	const { id } = useParams()
	const state = useApi(getOrder, [id])
	const navigate = useNavigate()
	/* Everything this page reports is the result of an action -- marked, attached, removed --
	   so all of it goes to the toast layer. Nothing here is a form verdict about fields the
	   user has to go back and fix, which is the one kind of message that stays on the page. */
	const toast = useToast()
	const [openPhoto, setOpenPhoto] = useState(null)
	const [showHistory, setShowHistory] = useState(false)
	/* Walking from one order to the next keeps this component mounted, so the state has to be
	   put back or the next order arrives already open on a log nobody asked to see. */
	useEffect(() => setShowHistory(false), [id])
	const filePicker = useRef(null)

	const invalidateOrder = () => invalidateOrderData()

	/* The same asking, the same warm note and the same setting as deleting a category or a
	   vendor -- one destructive action written once, rather than one per screen that agrees
	   about whether to ask until the day one of them is changed. See FormPage.jsx. */
	const del = useDelete({
		what: 'order',
		variant: 'block',
		detail: state.data
			? `${state.data.vendor?.name}, ${longDate(state.data.date)}, ${currency(state.data.total)}${fullStop()}`
			: '',
		onDelete: () => deleteOrder(id)
			.then(() => { invalidateOrder(); navigate('/orders/all') })
			.catch(e => toast(failureMessage(e, 'That did not delete.'), 'negative'))
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
			.catch(e => toast(failureMessage(e, 'That did not attach.'), 'negative'))
	}

	const detach = file => {
		removeAttachment(id, file.id)
			.then(() => {
				invalidateOrder(); state.refresh()
				toast(`${file.name} removed.`)
			})
			.catch(e => toast(failureMessage(e, 'That did not remove.'), 'negative'))
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
			<Async state={state} label="Loading the order"
				skeleton={<div className="order-list-grid" aria-hidden="true">
					<div className="order-list-column">
						<SkeletonCard title={false} lines={2} />
						<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={3} /></SkeletonCard>
					</div>
					<div className="order-list-column">
						<SkeletonCard lines={3} />
						<SkeletonCard lines={1} />
					</div>
				</div>}>{order => (
				<>
				<div className="order-list-grid">
					<div className="order-list-column">
						<Card aria-label="Order">
							<CardBody variant="card-body-page">
								<div className="space-between space-between-top">
									<div className="order-head-text">
										<div className="order-title">
											{order.vendor?.name}</div>
										<div className="field-help order-subtitle">
											{longDate(order.date)}<Sep />{plural(order.itemCount, 'item')}</div>
									</div>
									<div className="row-inline row-inline-nowrap order-head-actions">
										<IconButton icon="pencil" label="Edit order" to={`/orders/${id}/edit`} />
										{/* Beside edit and delete: it acts on this record too.
										    README: Copying an Order. */}
										<IconButton icon="copy" label="Copy this order"
											to={`/orders/${id}/copy`} />
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
							<CardHeader title={`Items${sep}${order.itemCount}`} />
							<CardDivider />
							<CardBody variant="card-body-tight">
								{order.items.map(item => {
									const photo = item.attachments?.[0]
									return (
									<ItemRow key={item.id} className="item-row-group"
										icon={photo ? undefined : 'cube'} thumb={photo ? 'photo' : undefined}
										thumbSrc={photo?.hasThumbnail ? itemAttachmentThumbnailUrl(order.id, item.id, photo.id) : undefined}
										onThumbClick={photo ? () => setOpenPhoto({ item, photo }) : undefined}
										title={item.title}
										meta={`${qtyText(item.quantity)} × ${currency(item.price)}`
											+ (item.retail ? `${sep}retail ${currency(item.retail)}` : '')
											+ (item.note ? `${sep}${item.note}` : '')}
										amount={currency(item.price * item.quantity)} />
									)
								})}
								{/* A receipt with more lines than are listed says so rather than letting the
								    count above and the rows below quietly disagree. */}
								{order.itemCount > order.items.length ? (
									<ItemRow icon="dots" iconTone={{ background: 'var(--bg-tile)', color: 'var(--text-muted)' }}
										title={plural(order.itemCount - order.items.length, 'more line', 'more lines')}
										meta="On the receipt, and in the total below." />
								) : null}
								<div className="card-divider card-divider-gap" />
								<SummaryRow label="Items subtotal" value={currency(order.subtotal)} />
								{order.discount ? <SummaryRow label="Discount" value={'-' + currency(order.discount)} /> : null}
								<SummaryRow label="Shipping" value={currency(order.shipping)} />
								<div className="card-divider card-divider-tight" />
								<SummaryTotal value={currency(order.total)} />
								{order.saved > 0 ? (
									<span className="field-help summary-saved">
										saved {currency(order.saved)} vs retail ({percent(order.savedPercent)})
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
								<SummaryRow label="Status" value={order.status} />
								<SummaryRow label="Date" value={shortDate(order.date)} />
								{/* The vendor and each category open the orders list filtered to themselves --
								    the name is the link, all time rather than any window, since this card
								    states the record and names no window of its own. */}
								<SummaryRow label="Vendor" value={order.vendor ? (
									<Link className="summary-row-link" to={ordersIn({ vendor: order.vendor.id })}>
										{order.vendor.name}</Link>
								) : null} />
								<SummaryRow label="Categories" value={order.categories.length ? order.categories.map((c, i) => (
									<Fragment key={c.id}>{i ? ', ' : ''}
										<Link className="summary-row-link" to={ordersIn({ category: c.id })}>
											{c.name}</Link></Fragment>
								)) : '-'} />
								<SummaryRow label="Kind" value={order.kind} />
								{order.reference ? (
									<SummaryRow label="Reference" value={order.reference} />
								) : null}
								<SummaryRow label="Total" value={currency(order.total)} />
								<SummaryRow label="Saved vs retail" variant="summary-row-value-saving"
									value={`${currency(order.saved)} (${percent(order.savedPercent)})`} />
							</CardBody>
						</Card>

						{/* Every step names itself here, which the Details card cannot do -- its date
						    row is the order's own date, and a status list has no fixed length: a
						    returned item can be replaced and delivered again. */}
						{order.statusHistory.length > 1 ? (
							<Card aria-label="Status history">
								<CardHeader title="Status history" open={showHistory} controls="order-status-history"
									onToggle={() => setShowHistory(open => !open)} />
								{showHistory ? <CardDivider /> : null}
								<CardBody variant="card-body-tight" id="order-status-history" hidden={!showHistory}>
									{order.statusHistory.map((s, i) => (
										<SummaryRow key={i} label={s.status} value={shortDate(s.date)} />
									))}
								</CardBody>
							</Card>
						) : null}

						{order.note ? (
							<Card aria-label="Note">
								<CardHeader title="Note" />
								<CardDivider />
								<CardBody><span className="field-help">{order.note}</span></CardBody>
							</Card>
						) : null}

						<Card aria-label="Attachments">
							<CardHeader title={`Attachments${sep}${order.attachments.length}`}>
								<Button variant="pill" onClick={() => filePicker.current?.click()}>ADD FILES</Button>
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
								<HiddenFileInput ref={filePicker} multiple kind={RECEIPT_FILES}
									label="Add attachments" onFiles={attach} />
								{order.attachments.length ? order.attachments.map(file => (
									<div key={file.id}>
										{/* The thumbnail opens the real file in a new tab -- the expanding
										    preview it replaces only ever showed a raster (page one, for a PDF)
										    one click deeper, so the picture of the file now goes to the file
										    itself. Download sits beside it for the same URL saved rather than
										    read. README: Honest Affordances. */}
										<ItemRow className="item-row-group" thumb={file.kind === 'pdf' ? 'document' : 'photo'}
											thumbSrc={file.hasThumbnail ? attachmentThumbnailUrl(order.id, file.id) : undefined}
											thumbHref={attachmentFileUrl(order.id, file.id)}
											thumbLabel={`Open ${file.name} in a new tab`}
											title={file.name} meta={file.meta}>
											<span className="row-inline row-inline-nowrap row-actions push-end">
												<IconButton icon="download" label={`Download ${file.name}`}
													href={attachmentFileUrl(order.id, file.id)} download={file.name} />
												{fileDel.iconButton(file)}
											</span>
										</ItemRow>
									</div>
								)) : (
									<DropZone icon="photo" kind={RECEIPT_FILES} label="Add attachments"
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
