import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardBody, CardDivider, CardHeader, SectionHeader, SectionLabel } from './Card.jsx'
import { IconButton } from './Button.jsx'
import { Icon } from './Icon.jsx'
import { saveDashboardCards } from '../api/client.js'

/* Which cards sit on the dashboard, and in what order, is the user's choice, so it persists.

   Reordering is button-driven rather than drag-only: a keyboard has to be able to do it, and
   a drag handle alone would shut one out. Every move announces where the card landed, and
   focus is put back deliberately after each one -- the DOM moves out from under the button
   that was focused, and a control that vanishes mid-interaction drops focus to the body.

   Cancel restores the snapshot taken when editing began, so the discard is real rather than
   a word on a button. README 13. */

const PLACE = { left: 'Move %s earlier', right: 'Move %s later', rm: 'Remove %s' }

function ReorderBar({ name, index, count, onAct }) {
	return (
		<div className="card-reorder-bar">
			<span className="card-reorder-position">{index + 1} of {count}</span>
			<IconButton variant="reorder" icon="chevronLeft" label={PLACE.left.replace('%s', name)}
				disabled={index === 0} onClick={() => onAct('left')} data-act="left" />
			<IconButton variant="reorder" icon="chevronRight" label={PLACE.right.replace('%s', name)}
				disabled={index === count - 1} onClick={() => onAct('right')} data-act="right" />
			<IconButton variant="reorder icon-button-reorder-remove" icon="close" label={PLACE.rm.replace('%s', name)}
				onClick={() => onAct('rm')} data-act="rm" />
		</div>
	)
}

export function DashboardCards({ all, initial, render }) {
	const [on, setOn] = useState(initial)
	const [editing, setEditing] = useState(false)
	const [message, setMessage] = useState('')
	const snapshot = useRef(initial)
	const editButton = useRef(null)
	const doneButton = useRef(null)
	const container = useRef(null)

	const meta = key => all.find(c => c.key === key)

	/* Focus goes to the same control on the card that just moved, or to the next best thing
	   on it, or to DONE. Never nowhere. */
	const refocus = useCallback((key, act) => {
		queueMicrotask(() => {
			const card = container.current?.querySelector(`[data-card="${key}"]`)
			const wanted = card?.querySelector(`[data-act="${act}"]:not(:disabled)`)
			const fallback = card?.querySelector('[data-act]:not(:disabled)')
			;(wanted || fallback || doneButton.current)?.focus()
		})
	}, [])

	const act = (key, action) => {
		setOn(prev => {
			const i = prev.indexOf(key)
			const next = [...prev]
			if (action === 'rm') {
				next.splice(i, 1)
				setMessage(`${meta(key).name} removed. You can add it back below.`)
				queueMicrotask(() =>
					(container.current?.parentElement?.querySelector(`[data-add="${key}"]`) || doneButton.current)?.focus())
				return next
			}
			const to = action === 'left' ? i - 1 : i + 1
			if (to < 0 || to >= next.length) return prev
			next.splice(i, 1)
			next.splice(to, 0, key)
			setMessage(`${meta(key).name} moved to position ${to + 1} of ${next.length}.`)
			refocus(key, action)
			return next
		})
	}

	const add = key => {
		setOn(prev => [...prev, key])
		setMessage(`${meta(key).name} added at position ${on.length + 1}.`)
		refocus(key, 'rm')
	}

	const start = () => {
		snapshot.current = on
		setEditing(true)
		setMessage('Editing your cards. Use the arrows to reorder.')
		queueMicrotask(() => doneButton.current?.focus())
	}

	const done = () => {
		saveDashboardCards(on).catch(() => { /* storage refused: the choice holds for this session */ })
		setEditing(false)
		setMessage('Your cards were saved.')
		queueMicrotask(() => editButton.current?.focus())
	}

	const cancel = useCallback(() => {
		setOn(snapshot.current)
		setEditing(false)
		setMessage('Changes discarded.')
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
			<p className="screenreader-only" role="status" aria-live="polite">{message}</p>

			<div className={['dashboard-cards', editing && 'is-editing'].filter(Boolean).join(' ')} ref={container}>
				{on.map((key, i) => (
					<section className="card" key={key} data-card={key} aria-label={meta(key).name}>
						{editing ? <ReorderBar name={meta(key).name} index={i} count={on.length}
							onAct={action => act(key, action)} /> : null}
						{render(key)}
					</section>
				))}
			</div>
			{on.length === 0
				? <p className="dashboard-cards-empty">No cards on your dashboard yet. Pick some with EDIT.</p>
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
