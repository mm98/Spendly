import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardBody, CardDivider, CardHeader, SectionHeader, SectionLabel } from './Card.jsx'
import { IconButton } from './Button.jsx'
import { useReorder } from './Reorder.jsx'
import { Icon } from './Icon.jsx'
import { useToast } from './Toast.jsx'
import { failureMessage, getDashboardCards, saveDashboardCards } from '../api/client.js'
import { invalidate } from '../api/useApi.js'

/* Which cards sit on the dashboard, and in what order, is the user's choice, so it persists.

   Reordering is the grip, dragged or driven from the keyboard -- the same control the item
   list uses, because there is one way to reorder things in this app and not two. A drag
   handle that only answers a pointer would shut a keyboard out, and a pair of arrow buttons
   beside a grip that does nothing is three controls for one job. See Reorder.jsx.

   Every move announces where the card landed, and focus is put back deliberately after each
   one -- the DOM moves out from under the control that was pressed, and one that vanishes
   mid-interaction drops focus to the body.

   Cancel restores the snapshot taken when editing began, so the discard is real rather than
   a word on a button. README: Honest Affordances. */

function ReorderBar({ name, index, count, handle, onRemove }) {
	return (
		<div className="card-reorder-bar">
			<span className="card-reorder-position">{index + 1} of {count}</span>
			{count > 1 ? handle : null}
			<IconButton variant="reorder icon-button-reorder-remove" icon="close" label={`Remove ${name}`}
				onClick={onRemove} data-act="rm" />
		</div>
	)
}

export function DashboardCards({ all, initial, render }) {
	const toast = useToast()
	const [on, setOn] = useState(initial)
	const [editing, setEditing] = useState(false)
	const snapshot = useRef(initial)
	const editButton = useRef(null)
	const doneButton = useRef(null)
	const container = useRef(null)

	const meta = key => all.find(c => c.key === key)

	/* Focus goes back onto the card that just changed, or to DONE. Never nowhere: the DOM
	   moves out from under the button that was pressed, and a control that vanishes
	   mid-interaction drops focus to the body. */
	const refocus = useCallback(key => {
		queueMicrotask(() => {
			const card = container.current?.querySelector(`[data-card="${key}"]`)
			;(card?.querySelector('[data-act]:not(:disabled)') || doneButton.current)?.focus()
		})
	}, [])

	/* Reordering is the grip, the same as every other list in the app -- dragged with a
	   pointer, moved with the arrow keys, announced either way. The chevron pair this replaces
	   was the app's other place where a direction control stood in for a drag. See
	   Reorder.jsx. */
	const reorder = useReorder({
		items: on.map(key => ({ id: key, name: meta(key).name })),
		describe: card => card.name,
		onAnnounce: toast,
		onReorder: (from, to) => setOn(prev => {
			const next = [...prev]
			const [moved] = next.splice(from, 1)
			next.splice(to, 0, moved)
			return next
		})
	})

	const drop = key => {
		setOn(prev => prev.filter(k => k !== key))
		toast(`${meta(key).name} removed. You can add it again below.`)
		queueMicrotask(() =>
			(container.current?.parentElement?.querySelector(`[data-add="${key}"]`) || doneButton.current)?.focus())
	}

	const add = key => {
		setOn(prev => [...prev, key])
		toast(`${meta(key).name} added at position ${on.length + 1}.`)
		refocus(key)
	}

	const start = () => {
		snapshot.current = on
		setEditing(true)
		toast('Editing your cards. Drag a card to reorder it, or select it and use the arrow keys.')
		queueMicrotask(() => doneButton.current?.focus())
	}

	const done = () => {
		/* The cached card list is the save's own read -- without dropping it, leaving Home and
		   coming back would draw the arrangement from before the edit. */
		/* "Saved" waits for the save. This used to toast it before the request settled and
		   swallow the failure under a comment about localStorage -- a relic of the phantom
		   store, over what is a real API write now. README: Feedback. */
		saveDashboardCards(on)
			.then(() => { invalidate(getDashboardCards); toast('Your cards were saved.') })
			.catch(e => toast(failureMessage(e, 'Your cards were not saved.'), 'negative'))
		setEditing(false)
		queueMicrotask(() => editButton.current?.focus())
	}

	const cancel = useCallback(() => {
		setOn(snapshot.current)
		setEditing(false)
		toast('Changes discarded.')
		queueMicrotask(() => editButton.current?.focus())
	}, [])

	useEffect(() => {
		if (!editing) return
		const onKey = e => { if (e.key === 'Escape') cancel() }
		document.addEventListener('keydown', onKey)
		return () => document.removeEventListener('keydown', onKey)
	}, [editing, cancel])

	const off = all.filter(c => !on.includes(c.key))

	return (
		<>
			<SectionHeader>
				<SectionLabel>Your cards</SectionLabel>
				<span className="row-inline">
					{editing ? (
						<>
							<button type="button" className="button button-caps button-compact"
								ref={doneButton} onClick={done}><Icon name="check" />DONE</button>
							<button type="button" className="button button-pill" onClick={cancel}>CANCEL</button>
						</>
					) : (
						<button type="button" className="button button-pill" ref={editButton} onClick={start}>
							<Icon name="pencil" />EDIT
						</button>
					)}
				</span>
			</SectionHeader>

			<div className={['dashboard-cards', editing && 'is-editing'].filter(Boolean).join(' ')}
				ref={node => { container.current = node; reorder.listProps.ref.current = node }}>
				{on.map((key, i) => (
					<Fragment key={key}>
					{editing ? reorder.placeholder({ id: key }) : null}
					<section className="card" data-card={key} aria-label={meta(key).name}
						{...(editing ? reorder.rowProps({ id: key }) : {})}>
						{editing ? (
							<ReorderBar name={meta(key).name} index={i} count={on.length}
								handle={reorder.handle({ id: key, name: meta(key).name }, i)}
								onRemove={() => drop(key)} />
						) : null}
						{render(key)}
					</section>
					</Fragment>
				))}
			</div>
			{on.length === 0
				? <p className="dashboard-cards-empty">No cards on your dashboard yet. Press EDIT to add some.</p>
				: null}

			{editing ? (
				<Card variant="card-tray" aria-label="Cards you can add">
					<CardHeader title="Cards you can add" />
					<CardDivider />
					<CardBody>
						{off.length ? off.map(c => (
							<div className="data-row card-tray-row" key={c.key}>
								<div>
									<div className="card-tray-row-title">{c.name}</div>
									<div className="card-tray-row-meta">{c.desc}</div>
								</div>
								<button type="button" className="button button-pill" data-add={c.key}
									onClick={() => add(c.key)}>ADD</button>
							</div>
						)) : <p className="card-tray-empty">Every card is already on your dashboard.</p>}
					</CardBody>
				</Card>
			) : null}
		</>
	)
}
