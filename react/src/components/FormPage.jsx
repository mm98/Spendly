import { useState } from 'react'
import { Page } from './Shell.jsx'
import { Async } from './Async.jsx'
import { Card, CardBody, CardDivider, CardHeader, Note } from './Card.jsx'
import { Stepper } from './Stepper.jsx'
import { Button, IconButton } from './Button.jsx'
import { Form, FormActions, FormStatus } from './Form.jsx'
import { useApi } from '../api/useApi.js'
import { getSettings } from '../api/client.js'

/* One page, one form -- and only one of these in the app.

   Five screens create or edit a record: order details, order items, scan review, category and
   vendor. They were five arrangements of the same parts, and they had already drifted: two put
   the form inside a bordered section inside a card body inside a card, which at 390px leaves
   the fields about as wide as their own labels; one paired a 32px CANCEL with a 48px save; two
   invented their own rail. A design system is what stops that, so the arrangement is written
   once here and every screen passes its fields in.

   The shape is the one README 9 specifies and the order form already drew: card headline, lead
   sentence, the form's own verdict line, the fields, and the actions split left/right at the
   foot. The rail beside it carries the live summary that mirrors the form.

   `status` is the form's verdict on its own fields and stays on the page -- it names what the
   user has to go back and fix, so it may not be a toast that leaves after five seconds. What
   *happened* -- saved, added, removed -- is a toast. README 9, and Toast.jsx. */

export function FormPage({
	title, lead, label, steps, notice, status, rail, cancel, submit, children
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
								<FormStatus message={status?.message ?? ''} good={status?.good !== false} />
								{children}
								{/* Both buttons at the same height, because they are one pair: the
								    stylesheet gives `.button-caps` 48px and `.button-compact` 32, and a
								    call site that mixes them draws a footer that looks broken. README 6. */}
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
		<Async state={state} label={label}>{() => null}</Async>
	</Page>
)

/* ---- deleting a record ----

   Three screens delete something and they did it three ways: an order asked first in a warm
   note, a category and a vendor went the moment the trash was clicked, and only the order
   read the setting that says whether to ask. A destructive action that asks on one screen and
   not on another is not a setting, it is a coin toss.

   It is a hook rather than a component because the button and the question do not always sit
   together: on an order the trash is up in the header band beside the pencil (README 11) and
   the note belongs under it, in the body. `useReorder` splits the same way for the same
   reason. */

export function useDelete({ what, detail, onDelete, icon = 'trash', variant = 'block', label }) {
	const settings = useApi(getSettings)
	const [confirming, setConfirming] = useState(false)

	const ask = () => {
		/* The setting is read live rather than baked in at mount: it is two clicks away on
		   Settings and the answer here has to be the one that is stored now. */
		if (settings.data?.confirmDelete === false) onDelete()
		else setConfirming(true)
	}

	const asks = {
		onClick: ask,
		'aria-expanded': confirming,
		'aria-controls': confirming ? 'delete-confirm' : undefined
	}

	return {
		confirming,
		button: (
			<Button variant={variant} icon={icon} {...asks}>
				{label ?? `DELETE ${what.toUpperCase()}`}</Button>
		),
		/* The same control as a glyph, for the order header band, where README 11 puts edit and
		   delete side by side. Same handler, same setting, same question underneath. */
		iconButton: <IconButton icon={icon} label={label ?? `Delete ${what}`} {...asks} />,
		note: confirming ? (
			<Note tone="warning" id="delete-confirm" style={{ marginTop: 12 }}
				title={`Delete this ${what}?`}>
				{detail} This cannot be undone.
				<div className="form-actions" style={{ marginTop: 10 }}>
					<Button variant="caps compact" onClick={onDelete}>DELETE</Button>
					<Button variant="ghost compact" onClick={() => setConfirming(false)}>CANCEL</Button>
				</div>
			</Note>
		) : null
	}
}

/** The delete control in the rail of an edit form, where a record has no page of its own to
    put it on. One card, so the two forms cannot each invent a place for it. */
export function DeleteCard({ what, children, del }) {
	return (
		<Card aria-label={`Delete ${what}`}>
			<CardHeader title={`Delete ${what}`} />
			<CardDivider />
			<CardBody>
				<p className="card-lead" style={{ marginTop: 0 }}>{children}</p>
				{del.button}
				{del.note}
			</CardBody>
		</Card>
	)
}
