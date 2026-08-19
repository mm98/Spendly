import { useRef, useState } from 'react'
import { Page } from '../components/Shell.jsx'
import { Card, CardBody } from '../components/Card.jsx'
import { Button } from '../components/Button.jsx'
import { CheckRow, FilterSection, FormActions } from '../components/Form.jsx'
import { useToast } from '../components/Toast.jsx'
import { HiddenFileInput } from '../components/FileInput.jsx'
import { EXPORT_FILES } from '../components/fileKinds.js'
import { ProgressBar } from '../components/Viz.jsx'
import { tokenizeJson } from '../components/Json.jsx'
import { percent } from '../api/format.js'
import { invalidate } from '../api/useApi.js'
import { failureMessage, importOrders } from '../api/client.js'

/* Importing, on its own tab.

   Settings held these two cards among the switches and defaults, and they are not settings:
   nothing here is stored, read back or obeyed by another page -- importing is an act, done
   once per file. The Import sub-tab keeps the act apart from the preferences, the same way
   Orders keeps its overview apart from the full list: a real URL, linkable and reloadable,
   never a view held in shell state. */

/* The reference block. Every JSON fragment is JSON.stringify's own output over a real example
   value -- a hand-formatted block with annotation columns drifted out of alignment
   immediately -- and the colour is a small tokenizer over that output: keys strong, strings
   green, numbers blue, punctuation muted. The rules the annotations used to carry sit in the
   list under the block instead. */
const IMPORT_EXAMPLE = {
	orders: [{
		vendor: 'Bilka', date: '2026-07-18', kind: 'Expense', status: 'Delivered',
		categories: ['Groceries'], shipping: 0, discount: 10.00, reference: 'A-10419', note: '',
		items: [{
			title: 'Rugbrød', quantity: 1, price: 24.95, retail: 32.00, note: '',
			attachments: [{ filename: 'brod.jpg', contentType: 'image/jpeg', data: '<base64>' }]
		}],
		attachments: [{ filename: 'receipt.pdf', contentType: 'application/pdf', data: '<base64>' }]
	}]
}

/* Three boxes, each holding only the request or response itself; what each one means is
   ordinary prose beneath its box, never annotation lines inside it. */
const RECIPE_LOGIN = [
	<span key="req" className="tok-req">POST /api/auth/login</span>, '\n',
	...tokenizeJson(JSON.stringify({ email: '...', password: '...' }, null, 2), 'login')
]
const RECIPE_REQUEST = [
	<span key="req" className="tok-req">POST /api/orders/import</span>, '\n',
	...tokenizeJson(JSON.stringify(IMPORT_EXAMPLE, null, 2), 'body')
]
const RECIPE_RESPONSE = [
	<span key="ok" className="tok-req">200</span>, '\n',
	...tokenizeJson(JSON.stringify({ imported: 1, orders: ['...'], failed: [{ index: 3, error: '...' }] }, null, 2), 'resp')
]

/* The server takes 50 MB per request (app.js raises the limit for /api/orders/import alone),
   and an export with receipts riding along as base64 can be well past that -- a whole file
   posted in one call comes back 413, "request entity too large". So the upload sends slices:
   orders accumulate until the next would push the slice's JSON past BATCH_BYTES, and each
   slice is its own request. 40 MB leaves headroom for the `{"orders":[...]}` wrapper and for
   UTF-8 bytes running past JSON.stringify's character count on non-ASCII text. */
const BATCH_BYTES = 40 * 1024 * 1024

/** Cuts orders into batches under BATCH_BYTES, each remembering the index its first order has
    in the whole file -- the server numbers failures within the request it saw, and a reported
    row has to be a row of the file the person chose -- and its own size, because the progress
    bar advances by bytes sent, not by slices: slices are cut by size, so the last one can be a
    sliver, and a bar that counts slices would crawl through the big ones and leap the small. */
function sliceOrders(orders) {
	const batches = []
	let batch = [], bytes = 0, offset = 0
	for (const order of orders) {
		const size = JSON.stringify(order).length + 1
		if (batch.length && bytes + size > BATCH_BYTES) {
			batches.push({ orders: batch, offset, bytes })
			offset += batch.length
			batch = []; bytes = 0
		}
		batch.push(order); bytes += size
	}
	batches.push({ orders: batch, offset, bytes })
	return batches
}

export default function SettingsImport() {
	const toast = useToast()
	const [importFile, setImportFile] = useState(null)
	/* Whether files ride along, on by default and split the way the schema splits them: the
	   order's own attachments (the receipt), and the images on its items (the photos). Off
	   strips them before slicing, so the batches are cut to the size of what is actually
	   sent and a file too big only for its attachments imports without them. */
	const [withAttachments, setWithAttachments] = useState(true)
	const [withImages, setWithImages] = useState(true)

	/* The file import. The picker takes one JSON file holding the same shape the reference
	   card documents -- `{ "orders": [...] }`, or a bare array of orders -- sliced under the
	   server's per-request cap (sliceOrders above) and posted through the same endpoint a
	   script would use. The two file-shaped failures (not JSON, no orders array) are told
	   apart from a refused import, because "try a different file" and "fix row 3" are
	   different instructions. `progress` is null when resting; while sending it counts slices
	   ({done, total}, for the button's label) and bytes ({doneBytes, totalBytes}, for the
	   bar), which stay at 0/0 while the file is still being read and parsed. Within the slice
	   on the wire, two live fractions keep the bar moving through both of its waits: sentFrac
	   is the request body handed to the network (the browser's own upload progress), rowsFrac
	   is rows the server says it has written (streamed back by the route). Each counts for
	   half the slice's span -- neither phase's real share is knowable up front, and a bar that
	   moves through both honestly beats one that freezes for either. */
	const importPicker = useRef(null)
	const [progress, setProgress] = useState(null)
	const runImport = async () => {
		setProgress({ done: 0, total: 0, doneBytes: 0, totalBytes: 0, sliceBytes: 0, sentFrac: 0, rowsFrac: 0 })
		let imported = 0
		const failed = []
		try {
			let parsed
			try { parsed = JSON.parse(await importFile.text()) } catch { throw new Error('import-not-json') }
			let orders = Array.isArray(parsed) ? parsed : parsed?.orders
			if (!Array.isArray(orders) || !orders.length) throw new Error('import-no-orders')
			if (!withAttachments) orders = orders.map(({ attachments, ...order }) => order)
			if (!withImages) {
				orders = orders.map(order => Array.isArray(order.items)
					? { ...order, items: order.items.map(({ attachments, ...item }) => item) }
					: order)
			}
			const batches = sliceOrders(orders)
			const totalBytes = batches.reduce((n, b) => n + b.bytes, 0)
			setProgress({ done: 0, total: batches.length, doneBytes: 0, totalBytes, sliceBytes: 0, sentFrac: 0, rowsFrac: 0 })
			for (const batch of batches) {
				setProgress(p => p && { ...p, sliceBytes: batch.bytes, sentFrac: 0, rowsFrac: 0 })
				try {
					const result = await importOrders(batch.orders, {
						onSent: f => setProgress(p => p && { ...p, sentFrac: f }),
						onRows: (done, total) => setProgress(p => p && { ...p, rowsFrac: total ? done / total : 0 })
					})
					imported += result.imported
					failed.push(...result.failed.map(f => ({ ...f, index: f.index + batch.offset })))
				} catch (e) {
					/* A 400 here is the route saying every row in this slice was refused --
					   its body still names each one. A 413 can only be a single order too big
					   for a request all by itself, since slices are cut under the cap; no
					   re-slicing helps it, so it is reported by row and the rest carry on. */
					if (e.status === 400 && e.body?.failed) failed.push(...e.body.failed.map(f => ({ ...f, index: f.index + batch.offset })))
					else if (e.status === 413) failed.push({ index: batch.offset, error: 'This one order is bigger than the 50 MB the server takes in a request.' })
					else throw e
				}
				setProgress(p => p && ({ ...p, done: p.done + 1, doneBytes: p.doneBytes + batch.bytes, sliceBytes: 0, sentFrac: 0, rowsFrac: 0 }))
			}
			// Imported orders reach every list, chart and card: every cached answer goes.
			if (imported) { invalidate(); setImportFile(null) }
			if (failed.length) toast(`${imported} imported, ${failed.length} failed. Row ${failed[0].index}: ${failed[0].error}`, 'negative')
			else toast(`${imported} order${imported === 1 ? '' : 's'} imported.`)
		} catch (e) {
			// A transport failure mid-run: what landed stays landed, and the report says so.
			if (imported) invalidate()
			const said = e.message === 'import-not-json' ? 'That file is not valid JSON.'
				: e.message === 'import-no-orders' ? 'No orders in that file. It needs an "orders" array.'
					: failureMessage(e, 'That did not import.')
			toast(imported ? `${said} ${imported} made it in before it stopped.` : said, 'negative')
		} finally {
			setProgress(null)
		}
	}

	return (
		<Page>
			{/* One column, upload first and the reference beneath it -- the reference is read
			    while writing a file or a script, and a narrow rail wrapped its schema blocks. */}
			<div className="order-list-column">
				{/* The upload half of importing: choose a JSON file, press IMPORT. The shape
				    the file must hold is the reference card beneath it -- one schema, two
				    doors, and the server validates both the same way. */}
				{/* Headline and lead inside the body, not a header band over a divider -- the
				    same card the other tab of this page is built from, and the same one every
				    form page opens with. Two tabs of one page drawing their titles two ways is
				    a shape to learn per tab. README: Cards, Settings. */}
				<Card aria-label="Import orders">
					<CardBody variant="card-body-page">
						<div className="card-headline">Import orders</div>
						<p className="card-lead">
							Bring orders in from a JSON file: an object holding an{' '}
							<code>orders</code> array, the shape the reference card documents. Each
							order imports on its own, so one bad row fails alone.
						</p>
						{/* Checkbox rows, not switches: these are form choices, read once when
						    IMPORT runs, and nothing observably changes on toggle -- a switch
						    here would state an effect it does not have (README: Checkbox Row).
						    Two rows because the schema carries two kinds of file, and someone
						    migrating may want the receipts without megabytes of photos.

						    In a headed section, like every group of controls on the other tab:
						    the card body there holds no bare control, and two tabs of one page
						    stacking their options two ways is a shape to learn per tab. */}
						<FilterSection>
							<span className="panel-heading">What comes along</span>
							<CheckRow id="import-attachments" checked={withAttachments}
								onChange={setWithAttachments} label="Import attachments"
								help="The receipt file riding on an order. With this off, orders import without their attachments." />
							<CheckRow id="import-images" checked={withImages}
								onChange={setWithImages} label="Import images"
								help="The photo riding on a line item. With this off, items import without their images." />
						</FilterSection>
						{importFile ? (
							<>
								<p className="field-help">{importFile.name}</p>
								{/* Indeterminate only while the file is still being read and parsed --
								    once slices are on the wire the percentage is measured, not
								    guessed: bytes the browser reports sent and rows the server
								    reports written, so it moves through both waits. The figure
								    beside the bar is the same number said in words. */}
								{progress ? (() => {
									const { doneBytes, totalBytes, sliceBytes, sentFrac, rowsFrac } = progress
									const pct = totalBytes
										? Math.min(100, ((doneBytes + sliceBytes * ((sentFrac + rowsFrac) / 2)) / totalBytes) * 100)
										: 0
									return (
										<div className="import-progress">
											<ProgressBar label="Import progress" indeterminate={!totalBytes}
												value={Math.round(pct)} />
											{totalBytes ? (
												<span className="field-help tabular-figures">{percent(pct, 0)}</span>
											) : null}
										</div>
									)
								})() : null}
								<FormActions>
									<Button variant="caps compact" disabled={!!progress} onClick={runImport}>
										{!progress ? 'IMPORT'
											: progress.total > 1 ? `IMPORTING ${Math.min(progress.done + 1, progress.total)} OF ${progress.total}...`
												: 'IMPORTING...'}
									</Button>
									<Button variant="ghost compact" disabled={!!progress}
										onClick={() => setImportFile(null)}>CANCEL</Button>
								</FormActions>
							</>
						) : (
							<Button variant="block" icon="upload"
								onClick={() => importPicker.current?.click()}>CHOOSE A JSON FILE</Button>
						)}
						<HiddenFileInput ref={importPicker} kind={EXPORT_FILES}
							label="Choose a JSON file of orders" onFiles={([file]) => setImportFile(file)} />
					</CardBody>
				</Card>
				{/* Documentation, not a control. It used to open closed to spare the settings
				    page a screenful of reference on every visit; on a tab that exists for
				    importing, the reference is half the point, so it stands open. The example
				    mirrors validateOrderDraft and the import route; change those and change
				    this. Every JSON fragment is JSON.stringify's own output, coloured by a
				    ten-line tokenizer -- hand-aligned annotation columns drifted immediately. */}
				<Card aria-label="Import from another system">
					<CardBody variant="card-body-page" id="import-reference">
							<div className="card-headline">Import from another system</div>
							<p className="card-lead">
								Bring orders in from another expense tracker, with a script of your own:
								sign in, post the orders, read back what landed. Vendors, categories,
								line items and receipt files all come along.
							</p>
							<pre className="import-schema" aria-label="Sign-in request">{RECIPE_LOGIN}</pre>
							<span className="field-help import-caption">
								Signing in sets the <code>spendly_session</code> cookie and returns the same
								token in the body. Every later call takes either credential: the cookie, or{' '}
								<code>Authorization: Bearer</code> with that token.
							</span>
							<pre className="import-schema" aria-label="Import request shape">{RECIPE_REQUEST}</pre>
							<ul className="import-rules">
								<li>Required: <code>vendor</code>, <code>date</code>, <code>kind</code>, and at
									least one item with <code>title</code>, <code>quantity</code> and{' '}
									<code>price</code>. Everything else is optional.</li>
								<li>No amount is negative. A rabat is <code>discount</code> on the order,
									entered as what was taken off; <code>price</code>, <code>retail</code> and{' '}
									<code>shipping</code> all stay at zero or above.</li>
								<li><code>vendor</code> ≤ 80 characters.</li>
								<li><code>title</code> ≤ 120 characters.</li>
								<li><code>quantity</code> a whole number, 1-9999.</li>
								<li><code>date</code> is YYYY-MM-DD and never in the future.</li>
								<li><code>kind</code>: Expense, Gift, Sold, Work or Other.</li>
								<li><code>status</code>: Ordered, Delivered or Returned; Delivered when omitted.</li>
								<li>Attachments carry base64 bytes: on the order for the receipt, on an item
									for its photo.</li>
								<li>Vendors and categories are matched by name, case-insensitively, and
									created when new.</li>
							</ul>
							<pre className="import-schema" aria-label="Import response shape">{RECIPE_RESPONSE}</pre>
							<span className="field-help">
								Each order imports in its own transaction, so one bad row fails alone: the
								response names every failure by its index, and the status is 400 only when
								the array is empty or nothing imported. Batch large exports: the request body
								is capped at 50&nbsp;MB, and base64 grows files by a third. Add{' '}
								<code>?progress=stream</code> and the response arrives as NDJSON instead:{' '}
								<code>{'{"done":50,"total":1200}'}</code> lines while rows land, closed by
								this same result object on a 200. That stream is what the upload card
								above uses for its bar.
							</span>
					</CardBody>
				</Card>
			</div>
		</Page>
	)
}
