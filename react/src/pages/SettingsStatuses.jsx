import { Fragment, useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Announce, Insertion, ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { Skeleton } from '../components/Utilities.jsx'
import { addStatus, changeStatus, deleteStatus, failureMessage, getStatuses, invalidateOrderData, orderStatusesAs } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { TONES } from '../app/statuses.js'
import { Heading } from './SettingsParts.jsx'

const TONE_NAMES = [['success', 'Positive'], ['progress', 'In progress'], ['danger', 'Problem'], ['neutral', 'Neutral']]

const StatusLook = ({ tone, children }) => {
	const look = TONES[tone] ?? {}
	return <Pill color={look.color} state={look.state}>{children}</Pill>
}

/** Statuses (Settings 11a), each saved as it is made: drag or key a row to move it, the pencil
    renames and recolours, and a status no order carries can be deleted; Draft is built in. */
export function StatusesCard() {
	const loaded = useApi(getStatuses)
	const toast = useToast()
	const [list, setList] = useState(null)
	useEffect(() => { if (loaded.data) setList(loaded.data) }, [loaded.data])
	const [editing, setEditing] = useState(null)
	const [drag, setDrag] = useState(null)
	const [held, setHeld] = useState(null)
	const [said, setSaid] = useState('')
	const rows = useRef(null)

	const write = async (send, optimistic) => {
		if (optimistic) setList(optimistic)
		try {
			const fresh = await send()
			setList(fresh)
			invalidateOrderData()
			return true
		} catch (e) {
			toast({ message: failureMessage(e, 'That was not saved. Try again.'), color: 'danger' })
			loaded.refresh()
			return false
		}
	}

	if (!list)
		return (
			<Card>
				<Heading section="statuses">Statuses</Heading>
				<div className="sp-stack sp-gap-6" aria-busy="true" aria-label="Loading your statuses">
					<Skeleton shape="line" /><Skeleton shape="line" /><Skeleton shape="line" />
				</div>
			</Card>
		)

	const moveTo = (status, to) => {
		const from = list.findIndex(s => s.key === status.key)
		if (to === from || to < 0 || to >= list.length) return
		const next = [...list]
		next.splice(to, 0, next.splice(from, 1)[0])
		write(() => orderStatusesAs(next.map(s => s.key)), next)
	}
	const dropAt = y => {
		const all = [...(rows.current?.querySelectorAll('[data-status]') ?? [])]
		const at = all.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2 })
		return at < 0 ? all.length : at
	}
	const handleEvents = status => ({
		onPointerDown: ev => {
			if (!ev.target.closest('.sp-list-item__handle')) return
			ev.preventDefault()
			ev.currentTarget.setPointerCapture(ev.pointerId)
			setDrag({ key: status.key, at: dropAt(ev.clientY) })
		},
		onPointerMove: ev => { if (drag?.key === status.key) setDrag({ key: status.key, at: dropAt(ev.clientY) }) },
		onPointerUp: () => {
			if (drag?.key !== status.key) return
			const from = list.findIndex(s => s.key === status.key)
			setDrag(null)
			moveTo(status, drag.at > from ? drag.at - 1 : drag.at)
		},
		// Space or Enter picks the row up and drops it, the arrows move it, Escape puts it back (c1)
		onKeyDown: ev => {
			if (!ev.target.closest('.sp-list-item__handle')) return
			const at = list.findIndex(s => s.key === status.key)
			const tell = (n, word) => setSaid(`${status.name}${word ? `, ${word}` : ''}, position ${n + 1} of ${list.length}`)
			if (ev.key === ' ' || ev.key === 'Enter') {
				ev.preventDefault()
				const holding = held?.key === status.key
				setHeld(holding ? null : { key: status.key, from: at })
				tell(at, holding ? 'dropped' : 'picked up')
				return
			}
			if (ev.key === 'Escape' && held?.key === status.key) {
				ev.preventDefault()
				ev.stopPropagation()
				moveTo(status, held.from)
				setHeld(null)
				tell(held.from, 'put back')
				return
			}
			const step = ev.key === 'ArrowUp' ? -1 : ev.key === 'ArrowDown' ? 1 : 0
			if (!step || held?.key !== status.key) return
			ev.preventDefault()
			if (at + step < 0 || at + step >= list.length) return
			moveTo(status, at + step)
			tell(at + step)
		}
	})

	const remove = status => write(() => deleteStatus(status.key), list.filter(s => s.key !== status.key))
		.then(ok => { if (ok) toast({ message: `${status.name} was deleted.` }) })

	return (
		<Card footer={editing === 'new' ? null : <Button variant="outline" onClick={() => setEditing('new')}>Add a status</Button>}
			footerLayout="stack" footerCommits>
			<div className="sp-row-flex">
				<Heading section="statuses">Statuses</Heading>
				<span className="sp-grow" />
				<span className="sp-meta">Drag to reorder</span>
			</div>
			<div className="sp-stack sp-gap-6" ref={rows}>
				<Announce>{said}</Announce>
				{list.map((status, i) => (
					<Fragment key={status.key}>
						{drag && drag.at === i && drag.key !== status.key ? <Insertion /> : null}
						{editing === status.key
							? <StatusEditor status={status} onCancel={() => setEditing(null)}
								onSave={next => write(() => changeStatus(status.key, next)).then(ok => { if (ok) setEditing(null) })} />
							: (
								<ListItem variant={drag?.key === status.key || held?.key === status.key ? 'carried' : 'default'}
									handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${status.name}`}
									data-status={status.key} {...handleEvents(status)}>
									<StatusLook tone={status.tone}>{status.name}</StatusLook>
									<span className="sp-grow" />
									<span className="sp-meta">{plural(status.orders ?? 0, 'order')}</span>
									{status.builtIn
										? <Pill>built in</Pill>
										: (
											<>
												{status.orders ? null : <IconButton icon="trash" aria-label={`Delete ${status.name}`} onClick={() => remove(status)} />}
												<Mark size="small" aria-label={`Rename or recolour ${status.name}`} onClick={() => setEditing(status.key)}>
													<Icon name="pencil" size={14} />
												</Mark>
											</>
										)}
								</ListItem>
							)}
					</Fragment>
				))}
				{drag && drag.at === list.length ? <Insertion /> : null}
				{editing === 'new'
					? <StatusEditor onCancel={() => setEditing(null)}
						onSave={next => write(() => addStatus(next)).then(ok => { if (ok) setEditing(null) })} />
					: null}
			</div>
		</Card>
	)
}

/* One status open for its name and tone (11a): the four looks the list can draw, as pills. */
function StatusEditor({ status, onCancel, onSave }) {
	const [name, setName] = useState(status?.name ?? '')
	const [tone, setTone] = useState(status?.tone ?? 'neutral')
	const [busy, setBusy] = useState(false)
	const field = useRef(null)
	useEffect(() => { field.current?.focus() }, [])
	const empty = !name.trim()
	const save = () => {
		if (empty) return
		setBusy(true)
		Promise.resolve(onSave({ name: name.trim(), tone })).finally(() => setBusy(false))
	}
	return (
		<ListItem variant="outline" selected>
			<TextField inputRef={field} value={name} maxLength={40} aria-label="Status name" onChange={setName}
				onKeyDown={ev => { if (ev.key === 'Enter') save(); if (ev.key === 'Escape') onCancel() }} />
			<span className="sp-grow" />
			<div className="sp-row-flex sp-gap-6 sp-flex-none" role="radiogroup" aria-label="Tone">
				{TONE_NAMES.map(([key, label]) => (
					<label key={key} className="st-tone">
						<input type="radio" name={`tone-${status?.key ?? 'new'}`} checked={tone === key} aria-label={label} onChange={() => setTone(key)} />
						<StatusLook tone={key}>Aa</StatusLook>
					</label>
				))}
			</div>
			<div className="sp-row-flex sp-gap-8 sp-flex-none">
				<Button variant="outline" size="small" disabled={busy} onClick={onCancel}>Cancel</Button>
				<Button size="small" disabled={busy || empty} onClick={save}>Save</Button>
			</div>
		</ListItem>
	)
}
