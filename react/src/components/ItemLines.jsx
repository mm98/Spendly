import { Fragment, useEffect, useRef, useState } from 'react'
import { Sep } from './Sep.jsx'
import { Button, IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'
import { LinePhoto, useDroppedPhoto } from './LinePhoto.jsx'
import { InsetPanel, ItemRow } from './Rows.jsx'
import { useReorder } from './Reorder.jsx'
import { useRowDelete } from './FormPage.jsx'
import {
	Field, FieldPair, FieldShell, FieldUnit, FormActions, TextInput,
	focusField, useFieldErrors
} from './Form.jsx'
import { ITEM_FIELDS } from '../api/rules.js'
import {
	amount, currency, currencySymbol, fullStop, parseAmount, percent, plural, sanitizeAmount,
	sanitizeWholeNumber, sep
} from '../api/format.js'

/* The lines on an order, edited where they sit.

   There used to be one form pinned above the list and a pencil on every row that loaded the
   row back into it. Two things were wrong with that, and only the second one is about looks.

   The first: the form is the same four fields whether it is adding or replacing, so the only
   thing saying which of the two is about to happen was the verb on a button below the fold and
   a toast that had already gone. Editing the eleventh line scrolled the list off screen, put
   the values in a box a page away from the row they came from, and left the row itself looking
   exactly as it had. "The form above holds it" is a sentence a UI has to say when the answer is
   not on screen.

   The second: a page whose first control is a form claims that adding is the main verb. On the
   edit page it is not -- an order being edited already has its lines, and the thing being done
   to them is correction.

   So a line is opened in place: the row becomes a card, at the row's own index, with its photo
   and its four fields. Adding is the same card, opened empty from the end of the list, which is
   why there is no second copy of these rules anywhere -- one card, one set of fields, one
   validation path. Nothing above the list moves when a card opens, so the phone and the desktop
   behave the same way, and the list keeps its scroll position.

   Deleting stays what it was: `useRowDelete`, which reads the one ask-before-deleting setting
   every other delete in the app reads. A line is a part of a record, and README: Deletion says
   the setting covers records and their parts alike -- so this card does not get to invent a
   quieter delete for itself just because it has room for a wider button. */

const join = (...parts) => parts.filter(Boolean).join(' ')

/* Quantity starts at 1 rather than empty. The rule in api/rules.js still requires it -- a
   blanked quantity is still a rejected quantity -- but nobody has to type the answer that is
   true of almost every line, so in practice the two fields a reader must fill are Description
   and Price paid. */
const BLANK = { 'item-description': '', 'item-quantity': '1', 'item-price': '', 'item-retail': '',
	'item-note': '' }

const formOf = item => ({
	'item-description': item.title,
	'item-quantity': String(item.quantity),
	'item-price': amount(item.price),
	'item-retail': item.retail != null ? amount(item.retail) : '',
	'item-note': item.note ?? ''
})

const same = (a, b) => ITEM_FIELDS.every(f => (a[f.name] ?? '') === (b[f.name] ?? ''))

/** The whole items block: the list, the card a line opens into, and the row that adds one.
 *
 *  `photoOf` combines whatever the host knows about a line's picture -- a file picked this
 *  session, an attachment already on the server -- into one answer, because this component has
 *  no opinion about which of those a page can have. New order can only ever have the first;
 *  Edit order has both. */
export function ItemLines({
	items, onItemsChange, onAnnounce, error,
	photoOf = () => ({}), onPhotoPick, onPhotoClear,
	label = 'Items', heading = true
}) {
	const [openId, setOpenId] = useState(null)      // an item id, 'new', or null
	const [form, setForm] = useState(BLANK)
	const [baseline, setBaseline] = useState(BLANK)
	const [picked, setPicked] = useState(null)      // { file, url } chosen in this card
	const [cleared, setCleared] = useState(false)   // the card's photo was removed
	const [leaving, setLeaving] = useState(null)    // where a discard question is headed
	const [savedId, setSavedId] = useState(null)
	const nextId = useRef(0)
	const cardRef = useRef(null)

	const errors = useFieldErrors(ITEM_FIELDS, form)
	const set = name => v => { setForm(f => ({ ...f, [name]: v })); errors.recheck(name, v) }

	const openItem = openId === 'new' ? null : items.find(i => i.id === openId)
	const openIndex = openItem ? items.indexOf(openItem) : -1
	const dirty = !same(form, baseline) || Boolean(picked) || cleared

	/* The card is brought into view only if part of it is outside it, and by the least that
	   fixes that -- `nearest` is a no-op when it already fits, so opening a line near the middle
	   of a long list does not move the page at all. */
	useEffect(() => {
		if (openId === null) return
		cardRef.current?.scrollIntoView({ block: 'nearest' })
	}, [openId])

	/* The preview belongs to the card and is revoked with it. The copy handed to the host at
	   commit time gets a URL of its own, so closing a card can never revoke the thumbnail the
	   row underneath is drawing. */
	useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url) }, [picked])

	useEffect(() => {
		if (savedId === null) return
		const t = setTimeout(() => setSavedId(null), 2000)
		return () => clearTimeout(t)
	}, [savedId])

	const seed = target => {
		setPicked(null)
		setCleared(false)
		errors.clear()
		if (target === null) { setOpenId(null); setForm(BLANK); setBaseline(BLANK); return }
		const next = target === 'new' ? BLANK : formOf(items.find(i => i.id === target))
		setForm(next)
		setBaseline(next)
		setOpenId(target)
		focusField('item-description')
	}

	/** Build the line the card is describing, or null when it does not describe one yet. The
	    existing record is spread through, so a note or an attachment list this card never shows
	    is not quietly dropped by an edit that only touched the price. */
	const build = () => {
		const failed = errors.check()
		if (failed.length) {
			focusField(failed[0].name)
			return null
		}
		const id = openId === 'new' ? 'new-' + (nextId.current++) : openId
		const retail = form['item-retail'].trim()
		const note = form['item-note'].trim()
		return {
			...(openItem ?? {}),
			id,
			title: form['item-description'].trim(),
			quantity: Number(form['item-quantity']),
			price: parseAmount(form['item-price']),
			retail: retail ? parseAmount(retail) : undefined,
			note: note || undefined
		}
	}

	const applyPhoto = id => {
		if (picked) onPhotoPick?.(id, picked.file)
		else if (cleared) onPhotoClear?.(id)
	}

	/** Save the open card. `then` is where to go afterwards: null closes it, 'new' keeps a fresh
	    one open for the next line, an id opens that line. Returns whether it saved. */
	const commit = (then = null) => {
		const line = build()
		if (!line) return false
		applyPhoto(line.id)
		const was = openId !== 'new'
		onItemsChange(was
			? items.map(i => (i.id === line.id ? line : i))
			: [...items, line])
		const count = was ? items.length : items.length + 1
		onAnnounce?.(`${line.title} ${was ? 'updated' : 'added'}. ${label}${sep}${count}`)
		setSavedId(line.id)
		seed(then)
		return true
	}

	/** Ask for the card the reader is heading to. A card with nothing typed into it just closes;
	    one that holds a valid line saves it on the way out, because losing four correct fields to
	    a click on the row below is not a thing a draft should do; one that holds an invalid line
	    is the only case worth a question. */
	const go = target => {
		if (openId === target) return
		if (openId === null || !dirty) { seed(target); return }
		if (errors.check().length) { setLeaving({ target }); return }
		commit(target)
	}

	const removeItem = item => {
		onItemsChange(items.filter(i => i.id !== item.id))
		onPhotoClear?.(item.id)
		if (openId === item.id) seed(null)
		onAnnounce?.(`${item.title} removed.`)
	}

	const itemDel = useRowDelete({
		what: 'item',
		label: item => `Delete ${item.title}`,
		detail: item => `${item.title}, ${item.quantity} × ${currency(item.price)}${fullStop()}`,
		onDelete: removeItem
	})

	const reorder = useReorder({
		items,
		describe: item => item.title,
		onAnnounce,
		onReorder: (from, to) => {
			const next = [...items]
			const [moved] = next.splice(from, 1)
			next.splice(to, 0, moved)
			onItemsChange(next)
		}
	})

	/* Whether the list has a grip column at all -- which is a question about how many lines
	   there are, not about whether one of them is open. A grip that is taken out of the row
	   while a line is being edited moves every tile and title in the list 27px sideways, so it
	   stays and goes inert instead. The rows and the add row's empty column read the same
	   value, so the column cannot be reserved on one and not the other. */
	const showGrips = items.length > 1

	const paid = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
	const retail = items.reduce((sum, i) => sum + (i.retail ?? i.price) * i.quantity, 0)
	const saved = retail - paid

	const card = (
		<LineCard ref={cardRef}
			isNew={openId === 'new'} index={openIndex} count={items.length}
			form={form} set={set} errors={errors} dirty={dirty}
			photo={picked ? { present: true, src: picked.url }
				: cleared ? {}
				: openItem ? photoOf(openItem) : {}}
			onPick={file => { setPicked({ file, url: URL.createObjectURL(file) }); setCleared(false) }}
			onClearPhoto={() => { setPicked(null); setCleared(true) }}
			onSave={() => commit(openId === 'new' ? 'new' : null)}
			onSaveAndNext={() => {
				const next = items[openIndex + 1]
				commit(openId === 'new' ? 'new' : (next ? next.id : null))
			}}
			onCancel={() => (dirty ? setLeaving({ target: null }) : seed(null))}
			onStep={step => { const to = items[openIndex + step]; if (to) go(to.id) }}
			/* The words go on a phone, where the footer has three controls and room for two --
			   see the stylesheet. The accessible name keeps them either way, and keeps them
			   first, so what the button is called does not change with the viewport. */
			deleteButton={openItem
				? itemDel.button(openItem,
					<span className="line-delete-label">DELETE LINE</span>,
					`Delete line, ${openItem.title}`)
				: null} />
	)

	return (
		<div className="item-lines">
			{/* The name, the count and the hint about how the list is worked, in one row -- or
			    in none of them, where the host already has a card band to carry the first two.
			    Edit order's items card names it the way Order details' does, and a section label
			    under a card header is the same list named twice; the hint would then be left on
			    its own line between the hairline and the panel, saying something the rail's own
			    "Good to know" card says beside it. Where the list is a section inside a larger
			    form -- the wizard's step 2, which has no card of its own -- this row is the only
			    place it is named, so it draws all three. */}
			{heading ? (
				<div className="space-between space-between-tight">
					<span className="section-label">{label}<Sep />{items.length}</span>
					<span className="field-help">
						{showGrips
							? 'drag a line to reorder it'
							: 'select the pencil to edit a line'}</span>
				</div>
			) : null}

			{/* No field of its own describes "the list has at least one line", so the rejection
			    is drawn the way a field's own is -- `.field > span.field-error` -- in a bare
			    `.field` div rather than a page-level summary. role="status" announces it the
			    moment it appears, since there is no input for aria-describedby to point at. */}
			{error ? (
				<div className="field">
					<span className="field-error" role="status">{error}</span>
				</div>
			) : null}

			<InsetPanel {...reorder.listProps}>
				{items.map((item, i) => {
					if (openId === item.id) return <Fragment key={item.id}>{card}</Fragment>
					const photo = photoOf(item)
					return (
						<Fragment key={item.id}>
							{reorder.placeholder(item)}
							{/* Grouped, so a phone reads the row as one line: title left, actions right,
							    and nothing dropping to a second line under a title using a fraction of
							    its own. Grouping is a claim the title can afford, and here it can only
							    afford it because the line total is hidden at that width -- the two are
							    one decision, and the stylesheet states the other half of it. */}
							<ItemRow className="item-row-group"
								icon={photo.present ? undefined : 'cube'}
								thumb={photo.present ? 'photo' : undefined} thumbSrc={photo.src}
								title={item.title}
								/* Disabled while a card is open rather than removed: the list the drag
								   measures is the list on screen, and one of its rows is currently a
								   card, so the index arithmetic would be off by one. A disabled button
								   never reaches that arithmetic, and the column keeps its width. */
								handle={showGrips ? reorder.handle(item, i, openId !== null) : null}
								meta={`${item.quantity} × ${currency(item.price)}`
									+ (item.retail ? `${sep}retail ${currency(item.retail)}` : '')}
								amount={currency(item.price * item.quantity)}
								{...reorder.rowProps(item)}>
								{savedId === item.id ? (
									<span className="line-saved"><Icon name="check" />Saved</span>
								) : null}
								<span className="row-inline row-actions">
									<IconButton icon="pencil" label={`Edit ${item.title}`}
										onClick={() => go(item.id)} />
									{itemDel.iconButton(item)}
								</span>
							</ItemRow>
						</Fragment>
					)
				})}

				{openId === 'new' ? card : (
					<button type="button" className="line-add-row" onClick={() => go('new')}>
						{/* The rows above only carry a grip when there is more than one line to move,
						    so this holds their grip column open on exactly the same condition -- and
						    holds it with a hidden copy of the grip itself, so the two cannot drift. */}
						{showGrips
							? <span className="line-add-grip-space" aria-hidden="true">
								<Icon name="grip" /></span>
							: null}
						<span className="line-add-glyph" aria-hidden="true"><Icon name="plus" /></span>
						<span className="line-add-text">
							{items.length ? 'Add item' : 'Add the first item'}
							{items.length ? null : (
								<span className="field-help">An order needs at least one.</span>
							)}
						</span>
					</button>
				)}
			</InsetPanel>

			{items.length ? (
				<div className="line-total-row">
					<span>{plural(items.length, 'item')}<Sep />{currency(paid)} paid</span>
					{saved > 0 ? (
						<span className="field-help">
							saved {currency(saved)} compared to retail ({percent(saved / retail * 100)})</span>
					) : null}
				</div>
			) : null}

			{itemDel.dialog}

			{leaving ? (
				<ConfirmDialog title="Discard changes to this line?"
					detail="This line still has something wrong with it, so it cannot be saved yet. Closing this leaves the line as it was."
					confirmLabel="DISCARD" cancelLabel="KEEP EDITING"
					onConfirm={() => { const { target } = leaving; setLeaving(null); seed(target) }}
					onCancel={() => setLeaving(null)} />
			) : null}
		</div>
	)
}

/* ---- the card a line opens into ----

   The photo comes first in the markup as well as on screen. Putting the fields first and
   ordering the photo back into place with CSS would give the tab order the design's own list
   -- Description, Quantity, Price paid, Retail -- at the cost of a focus ring that jumps
   backwards up the card on the fifth press. Reading order and focus order are the same order
   here, and the four fields still run in that sequence within it. */
function LineCard({
	ref, isNew, index, count, form, set, errors, dirty, photo,
	onPick, onClearPhoto, onSave, onSaveAndNext, onCancel, onStep, deleteButton
}) {
	const drop = useDroppedPhoto(onPick)

	const description = errors.propsFor('item-description')
	const quantity = errors.propsFor('item-quantity')
	const price = errors.propsFor('item-price')
	const retailField = errors.propsFor('item-retail')
	const noteField = errors.propsFor('item-note')

	/* Escape works from anywhere in the card; Enter only from a field. A button already treats
	   Enter as its own activation, so catching it here as well would either fire the save twice
	   or -- once this handler calls preventDefault -- swallow the press CANCEL was about to
	   receive and save instead. */
	const keys = e => {
		if (e.key === 'Escape') {
			e.preventDefault(); e.stopPropagation()
			onCancel()
			return
		}
		if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement)) return
		e.preventDefault()
		if (e.metaKey || e.ctrlKey) onSaveAndNext(); else onSave()
	}

	const heading = isNew
		? `New line${sep}${count + 1} of ${count + 1}`
		: `Editing line ${index + 1} of ${count}`

	/* The three figures the fields imply, recomputed as either number is typed. A quantity is a
	   multiplier and never a second price to keep in step by hand, so the line total is read
	   back rather than asked for. */
	const qty = Number(form['item-quantity'])
	const paid = parseAmount(form['item-price'])
	const retail = form['item-retail'].trim() ? parseAmount(form['item-retail']) : null
	const figures = Number.isFinite(qty) && qty > 0 && Number.isFinite(paid)
	const lineTotal = figures ? paid * qty : null
	const savedEach = retail != null && Number.isFinite(retail) ? retail - paid : null

	return (
		<div ref={ref} className={join('filter-section', 'line-card', drop.over && 'is-dragover')}
			onKeyDown={keys} {...drop.dropProps}>

			<div className="line-card-head">
				<span className="section-label line-card-title">{heading}</span>
				{isNew ? null : (
					<span className="row-inline row-actions">
						<IconButton icon="chevronLeft" label="Edit the line above"
							disabled={index <= 0} onClick={() => onStep(-1)} />
						<IconButton icon="chevronRight" label="Edit the line below"
							disabled={index >= count - 1} onClick={() => onStep(1)} />
					</span>
				)}
				{/* Two keys a phone does not have, so a phone does not print them. */}
				<span className="field-help push-end line-card-keys">Enter saves<Sep />Escape cancels</span>
			</div>

			<div className="line-card-body">
				<LinePhoto photo={photo} heading={heading} label="Product photo"
					name={form['item-description'].trim() || 'Untitled line'}
					onPick={onPick} onClear={onClearPhoto} />

				<div className="line-card-fields">
					<Field className="line-field-wide" label="Description" htmlFor="item-description"
						error={description.error} errorId={description.errorId}>
						<FieldShell>
							<TextInput id="item-description" aria-label="Description" aria-required="true"
								value={form['item-description']} onChange={set('item-description')}
								invalid={description.invalid} describedBy={description.describedBy} />
						</FieldShell>
					</Field>

					<Field className="line-field-qty" label="Quantity" htmlFor="item-quantity"
						error={quantity.error} errorId={quantity.errorId}>
						<FieldShell>
							<TextInput id="item-quantity" inputMode="numeric" aria-label="Quantity"
								aria-required="true" value={form['item-quantity']}
								onChange={v => set('item-quantity')(sanitizeWholeNumber(v))}
								invalid={quantity.invalid} describedBy={quantity.describedBy} />
							<FieldUnit>pcs</FieldUnit>
						</FieldShell>
					</Field>

					<Field label="Price paid" htmlFor="item-price"
						error={price.error} errorId={price.errorId}
						help={figures && qty > 1
							? `Per piece${sep}line total ${currency(lineTotal)}`
							: 'What one piece cost.'}>
						<FieldShell>
							<TextInput id="item-price" inputMode="decimal" aria-label="Price paid"
								aria-required="true" value={form['item-price']}
								onChange={v => set('item-price')(sanitizeAmount(v))}
								invalid={price.invalid} describedBy={price.describedBy} />
							<FieldUnit>{currencySymbol()}</FieldUnit>
						</FieldShell>
					</Field>

					<Field className="line-field-retail" label="Retail price" optional htmlFor="item-retail"
						error={retailField.error} errorId={retailField.errorId}
						help="Used to work out how much you saved compared to the retail price.">
						<FieldShell>
							<TextInput id="item-retail" inputMode="decimal"
								aria-label="Retail price" value={form['item-retail']}
								onChange={v => set('item-retail')(sanitizeAmount(v))}
								invalid={retailField.invalid} describedBy={retailField.describedBy} />
							<FieldUnit>{currencySymbol()}</FieldUnit>
						</FieldShell>
					</Field>

					<Field label="Note" optional htmlFor="item-note"
						error={noteField.error} errorId={noteField.errorId}
						help="Anything worth remembering about this line.">
						<FieldShell>
							<TextInput id="item-note" aria-label="Note" value={form['item-note']}
								onChange={set('item-note')}
								invalid={noteField.invalid} describedBy={noteField.describedBy} />
						</FieldShell>
					</Field>

					{/* A retail under the price paid is a fact, not a typo: it saves, and it records
					    no saving. Saying so under the fields is the difference between a form that
					    refuses a value and one that tells you what the value will mean. */}
					{figures && savedEach != null && Number.isFinite(savedEach) ? (
						<p className={join('line-verdict', savedEach <= 0 && 'line-verdict-flat')} role="status">
							{savedEach > 0
								? `Saved ${currency(savedEach * qty)}${sep}${percent(savedEach / retail * 100)} off retail`
								: savedEach === 0
									? 'Retail matches what was paid — no saving recorded.'
									: 'Retail is below what was paid — no saving recorded.'}
						</p>
					) : null}
				</div>
			</div>

			<FormActions>
				<Button variant="caps compact" icon="check" onClick={onSave}>
					{isNew ? 'ADD ITEM' : 'SAVE LINE'}</Button>
				<Button variant="ghost compact" onClick={onCancel}>CANCEL</Button>
				<span className="field-help form-actions-note">
					{dirty
						? 'Unsaved changes'
						: isNew
							? 'Enter adds it and keeps this open for the next one.'
							: 'Cmd/Ctrl+Enter saves and opens the line below.'}</span>
				{deleteButton ? <span className="push-end">{deleteButton}</span> : null}
			</FormActions>
		</div>
	)
}
