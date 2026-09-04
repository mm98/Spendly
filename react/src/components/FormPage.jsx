import { useState } from 'react'
import { Page } from './Shell.jsx'
import { Async } from './Async.jsx'
import { SkeletonCard } from './Skeleton.jsx'
import { Card, CardBody, CardDivider, CardHeader } from './Card.jsx'
import { Stepper } from './Stepper.jsx'
import { Button, IconButton } from './Button.jsx'
import { Field, Form, FormActions } from './Form.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'
import { Combobox } from './Combobox.jsx'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { getSettings } from '../api/client.js'

/* One page, one form -- and only one of these in the app.

   Five screens create or edit a record: order details, order items, scan review, category and
   vendor. They were five arrangements of the same parts, and they had already drifted: two put
   the form inside a bordered section inside a card body inside a card, which at 390px leaves
   the fields about as wide as their own labels; one paired a 32px CANCEL with a 48px save; two
   invented their own rail. A design system is what stops that, so the arrangement is written
   once here and every screen passes its fields in.

   The shape is the one README: Fields and Forms specifies and the order form already drew: card headline, lead
   sentence, the fields, and the actions split left/right at the foot. The rail beside it
   carries the live summary that mirrors the form.

   A rejected field is drawn under itself -- Form.jsx's `Field` and `useFieldErrors` -- and
   nowhere else on the page: no summary line repeats it and no toast announces it. What
   *happened* -- saved, added, removed -- is a toast. README: Fields and Forms, and Toast.jsx. */

export function FormPage({
	title, lead, label, steps, notice, rail, cancel, submit, children
}) {
	return (
		<Page>
			{steps ? <Stepper steps={steps} /> : null}
			<div className="order-list-grid">
				<div className="order-list-column">
					<Card aria-label={label ?? title}>
						<CardBody variant="card-body-page">
							<div className="card-headline">{title}</div>
							{lead ? <p className="card-lead">{lead}</p> : null}
							{notice}
							<Form>
								{children}
								{/* Both buttons at the same height, because they are one pair: the
								    stylesheet gives `.button-caps` 48px and `.button-compact` 32, and a
								    call site that mixes them draws a footer that looks broken. README: Buttons. */}
								<FormActions split>
									<Button variant="ghost" icon={cancel?.icon} to={cancel?.to} onClick={cancel?.onClick}>
										{cancel?.label ?? 'CANCEL'}</Button>
									<Button variant="caps" onClick={submit.onClick} disabled={submit.disabled}>
										{submit.label}</Button>
								</FormActions>
							</Form>
						</CardBody>
					</Card>
				</div>

				<div className="order-list-column">{rail}</div>
			</div>
		</Page>
	)
}

/** What an edit form shows before its record has arrived, or when it will not.

    A form's fields are hooks -- validation state, the draft, the pickers -- so the fields
    component may only mount once the record is here, and the wait needs a page of its own.
    Rendering it inside FormPage instead would put a `.page` inside a `.page`: both carry
    `.is-on`, so nothing hides and the layout quietly gains a grid. */
export const RecordWait = ({ state, label, steps }) => (
	<Page>
		{steps ? <Stepper steps={steps} /> : null}
		<Async state={state} label={label} skeleton={<SkeletonCard lines={6} />}>{() => null}</Async>
	</Page>
)

/* ---- deleting ----

   Every delete asks the same way: a modal dialog with the question, DELETE and CANCEL, and
   nothing else -- README: Deletion. Inline confirmation, a note unfolding under the trash,
   is a form in the flow and this design system does not do inline forms. The native
   <dialog> is the no-dependency modal: showModal() traps focus, Escape cancels, and closing
   hands focus back to the trash that opened it. */

/* The delete-shaped wording of the shared dialog (ConfirmDialog.jsx), which holds the modal
   mechanics and the rule about where focus lands. Only the sentence and the verb are this
   file's; a second copy of the machinery is how the two dialogs would drift apart. */
const DeleteDialog = ({ what, detail, onConfirm, onCancel }) => (
	<ConfirmDialog title={`Delete this ${what}?`} detail={detail} confirmLabel="DELETE"
		onConfirm={onConfirm} onCancel={onCancel} />
)

/* `useDelete` is that question asked of a record. A hook rather than a component because the
   trigger renders apart from the rest of its page: on an order the trash is up in the header
   band beside the pencil (README: Create and Edit). One hook, one setting, so a destructive
   action cannot ask on one screen and not on another -- that is not a setting, it is a coin
   toss. */

export function useDelete({ what, detail, onDelete, icon = 'trash', variant = 'block', label }) {
	const settings = useApi(getSettings)
	const [confirming, setConfirming] = useState(false)

	const ask = () => {
		/* The setting is read live rather than baked in at mount: it is two clicks away on
		   Settings and the answer here has to be the one that is stored now. */
		if (settings.data?.confirmDelete === false) onDelete()
		else setConfirming(true)
	}

	const asks = { onClick: ask, 'aria-haspopup': 'dialog' }

	return {
		confirming,
		button: (
			<Button variant={variant} icon={icon} {...asks}>
				{label ?? `DELETE ${what.toUpperCase()}`}</Button>
		),
		/* The same control as a glyph, for the order header band, where README: Create and Edit puts edit and
		   delete side by side. Same handler, same setting, same question underneath. */
		iconButton: <IconButton icon={icon} label={label ?? `Delete ${what}`} {...asks} />,
		dialog: confirming ? (
			<DeleteDialog what={what} detail={`${detail} This cannot be undone.`}
				onConfirm={() => { setConfirming(false); onDelete() }}
				onCancel={() => setConfirming(false)} />
		) : null
	}
}

/** The same question, asked of a row -- a line item, an attachment. Hooks cannot sit in a
    loop, so one call serves the whole list and the state is which row is asking; only one
    dialog can be open, so the hook returns one, built from that row. Reads the same setting
    as the record deletes -- README: Deletion says every delete, and a trash on a row is one. */
export function useRowDelete({ what, label, detail, onDelete, icon = 'trash' }) {
	const settings = useApi(getSettings)
	const [confirming, setConfirming] = useState(null)

	const ask = item => {
		/* Read live, not baked in at mount -- same reason as useDelete above. */
		if (settings.data?.confirmDelete === false) onDelete(item)
		else setConfirming(item)
	}

	return {
		iconButton: item => (
			<IconButton icon={icon} label={label(item)} onClick={() => ask(item)}
				aria-haspopup="dialog" />
		),
		/* The same control with its name on it, for a row that has been opened into a card and
		   has room to say what the button does. Same handler, same setting, same question
		   underneath -- the pair `useDelete` above already offers, for the same reason.

		   `ariaLabel` is for a caller that hides the words at some width: the accessible name
		   then has to carry them, and it has to *contain* the visible text or the button reads
		   as one thing and announces another -- which axe flags as label-content-name-mismatch
		   and a speech-recognition user experiences as a control they cannot say the name of. */
		button: (item, text, ariaLabel) => (
			<Button variant="ghost compact" icon={icon} onClick={() => ask(item)}
				aria-haspopup="dialog" aria-label={ariaLabel}>
				{text ?? `DELETE ${what.toUpperCase()}`}</Button>
		),
		dialog: confirming ? (
			<DeleteDialog what={what} detail={detail(confirming)}
				onConfirm={() => { const it = confirming; setConfirming(null); onDelete(it) }}
				onCancel={() => setConfirming(null)} />
		) : null
	}
}

/** One card for both edit forms, in the rail beside DeleteCard. Confirmed rather than undone:
    nothing records which orders moved, so there is nothing to put back. */
export function MoveOrdersCard({ what, from, count, groups, onMove, children }) {
	const [query, setQuery] = useState('')
	const [target, setTarget] = useState(null)
	const [error, setError] = useState('')
	const [confirming, setConfirming] = useState(false)
	const [moving, setMoving] = useState(false)
	const id = `move-orders-${what}`
	const orders = plural(count, 'order')

	/* Not a disabled button: the reader is told what is missing where they would fix it, the same
	   way every other form in the app rejects. README: Buttons. */
	const ask = () => {
		if (!target) {
			setError(`Which ${what} should they move to?`)
			document.getElementById(id)?.focus()
			return
		}
		setConfirming(true)
	}

	const move = () => {
		setConfirming(false)
		setMoving(true)
		Promise.resolve(onMove(target)).finally(() => {
			setMoving(false)
			setTarget(null)
			setQuery('')
		})
	}

	return (
		<Card aria-label={`Move orders to another ${what}`}>
			<CardHeader title="Move orders" />
			<CardDivider />
			<CardBody>
				<p className="card-lead card-lead-flush">{children}</p>
				{count ? (
					<>
						<Field label="Move them to" htmlFor={id} error={error} errorId={`${id}-error`}>
							<Combobox id={id} label="Move them to" placeholder={`Choose a ${what}...`}
								value={query} groups={groups}
								invalid={Boolean(error)} describedBy={`${id}-error`}
								onChange={v => { setQuery(v); setTarget(null) }}
								onSelect={o => { setQuery(o.label); setTarget(o); setError('') }} />
						</Field>
						<Button variant="block" icon="chevronRight" disabled={moving}
							aria-haspopup="dialog" onClick={ask}>
							{moving ? 'MOVING...' : `MOVE ${orders.toUpperCase()}`}</Button>
					</>
				) : null}
				{confirming && target ? (
					<ConfirmDialog
						title={`Move ${orders} to ${target.label}?`}
						detail={`The orders move from ${from} to ${target.label}. This cannot be undone.`}
						confirmLabel={`MOVE ${orders.toUpperCase()}`}
						onConfirm={move} onCancel={() => setConfirming(false)} />
				) : null}
			</CardBody>
		</Card>
	)
}

/** The delete control in the rail of an edit form, where a record has no page of its own to
    put it on. One card, so the two forms cannot each invent a place for it. */
export function DeleteCard({ what, children, del }) {
	return (
		<Card aria-label={`Delete ${what}`}>
			<CardHeader title={`Delete ${what}`} />
			<CardDivider />
			<CardBody>
				<p className="card-lead card-lead-flush">{children}</p>
				{del.button}
				{del.dialog}
			</CardBody>
		</Card>
	)
}
