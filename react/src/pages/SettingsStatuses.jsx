import { Fragment, useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../components/Button.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Announce, Insertion, ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Pill } from '../components/Pill.jsx'
import { useReorder } from '../components/Reorder.js'
import { Skeleton } from '../components/Utilities.jsx'
import { addStatus, changeStatus, deleteStatus, getStatuses, invalidateOrderData, orderStatusesAs } from '../api/client.js'
import { plural } from '../api/format.js'
import { TONES } from '../app/statuses.js'
import { landing } from './SettingsParts.jsx'

const TONE_NAMES = [['success', 'Positive'], ['progress', 'In progress'], ['danger', 'Problem'], ['neutral', 'Neutral']]

// the one list where a long status name ends in an ellipsis, so its row keeps its height (11a)
const StatusLook = ({ tone, children }) => {
	const look = TONES[tone] ?? {}
	return <Pill color={look.color} state={look.state} truncate>{children}</Pill>
}

// a list equal to the stored one in these is no change, so the save bar goes again
const sameAs = (a, b) => JSON.stringify(a.map(s => [s.key, s.name, s.tone])) === JSON.stringify(b.map(s => [s.key, s.name, s.tone]))

/** Writes `after` over what is stored now, so a save that stopped partway can be sent again. A new
    status has a `new-` key and `fresh` until stored; names are unique, so it is found again by name. */
export async function saveStatuses(after) {
	let stored = await getStatuses()
	const named = a => stored.find(s => s.name.toLowerCase() === a.name.toLowerCase())
	for (const gone of stored.filter(s => !after.some(a => a.key === s.key)))
		stored = await deleteStatus(gone.key)
	for (const s of after.filter(a => stored.some(b => b.key === a.key && (b.name !== a.name || b.tone !== a.tone))))
		stored = await changeStatus(s.key, { name: s.name, tone: s.tone })
	for (const s of after.filter(a => a.fresh && !named(a)))
		stored = await addStatus({ name: s.name, tone: s.tone })
	const keys = after.map(a => (a.fresh ? named(a)?.key : a.key))
	if (keys.join('\n') !== stored.map(s => s.key).join('\n')) stored = await orderStatusesAs(keys)
	invalidateOrderData()
	return stored
}

/** Statuses (11a): every move, rename, delete and new status waits for the page's save bar.
    `value('statuses')` is the list as edited, `saved` as stored; Draft is built in. */
export function StatusesCard({ value, change, saved, touch = false }) {
	const list = value('statuses') ?? null
	const [editing, setEditing] = useState(null)
	const [said, setSaid] = useState('')
	const made = useRef(0)
	const edit = next => change('statuses', saved && sameAs(next, saved) ? saved : next)
	// a phone moves a status with its up and down buttons, so the handle is the desktop's (18b)
	const reorder = useReorder({
		items: list ?? [],
		keyOf: status => status.key,
		nameOf: status => status.name,
		onMove: edit
	})
	const rows = reorder.list.ref
	// the row and the way it was last moved by a button, so focus can follow it to its new place
	const moved = useRef(null)
	useEffect(() => {
		const last = moved.current
		if (!last || !list) return
		moved.current = null
		const at = list.findIndex(s => s.key === last.key)
		// the pressed button again, or the other one where the pressed one is now disabled at an end
		const way = at <= 0 ? 'down' : at >= list.length - 1 ? 'up' : last.way
		rows.current?.querySelector(`[data-status="${CSS.escape(last.key)}"] [data-move="${way}"]`)?.focus()
	}, [list])

	if (!list)
		return (
			<Card>
				<CardHeader name="Statuses" {...landing('statuses')} />
				<div className="sp-stack sp-gap-6" aria-busy="true" aria-label="Loading your statuses">
					<Skeleton shape="line" /><Skeleton shape="line" /><Skeleton shape="line" />
				</div>
			</Card>
		)

	const step = (status, way) => {
		const at = list.findIndex(s => s.key === status.key)
		const to = at + (way === 'up' ? -1 : 1)
		if (to < 0 || to >= list.length) return
		const next = [...list]
		next.splice(to, 0, next.splice(at, 1)[0])
		moved.current = { key: status.key, way }
		edit(next)
		setSaid(`${status.name}, position ${to + 1} of ${list.length}`)
	}
	const remove = status => edit(list.filter(s => s.key !== status.key))
	const keep = (status, next) => {
		edit(status ? list.map(s => (s.key === status.key ? { ...s, ...next } : s))
			: [...list, { key: `new-${++made.current}`, ...next, orders: 0, fresh: true }])
		setEditing(null)
	}

	return (
		<Card footer={editing === 'new' ? null : <Button variant="outline" onClick={() => setEditing('new')}>Add a status</Button>}
			footerLayout="stack" footerCommits>
			<CardHeader name="Statuses" {...landing('statuses')} aside={touch ? undefined : 'Drag to reorder'} />
			<div className="sp-stack sp-gap-6" {...reorder.list}>
				<Announce>{touch ? said : reorder.said}</Announce>
				{reorder.items.map((status, i) => (
					<Fragment key={status.key}>
						{reorder.lands(status) ? <Insertion /> : null}
						{editing === status.key
							? <StatusEditor status={status} onCancel={() => setEditing(null)} onSave={next => keep(status, next)} />
							: (
								<ListItem variant={reorder.variant(status)} editable
									handle={touch ? undefined : <Icon name="grip-vertical" size={14} />} handleLabel={`Move ${status.name}`}
									data-status={status.key} {...reorder.row(status)}>
									{touch
										? (
											// on a phone the count goes under the name, so the name keeps its room beside the buttons
											<span className="sp-stack sp-grow">
												<StatusLook tone={status.tone}>{status.name}</StatusLook>
												<span className="sp-meta">{plural(status.orders ?? 0, 'order')}</span>
											</span>
										)
										: (
											<>
												<StatusLook tone={status.tone}>{status.name}</StatusLook>
												<span className="sp-grow" />
												<span className="sp-meta sp-nowrap">{plural(status.orders ?? 0, 'order')}</span>
											</>
										)}
									{status.builtIn ? <Pill>built in</Pill> : null}
									<Mark size="small" aria-label={`Rename or recolour ${status.name}`} onClick={() => setEditing(status.key)}>
										<Icon name="pencil" size={14} />
									</Mark>
									{status.builtIn || status.orders
										? null
										: (
											<Mark size="small" aria-label={`Delete ${status.name}`} onClick={() => remove(status)}>
												<Icon name="trash" size={14} />
											</Mark>
										)}
									{touch
										? (
											<>
												<IconButton variant="outline" icon="chevron-up" aria-label={`Move ${status.name} up`} data-move="up"
													disabled={i === 0} onClick={() => step(status, 'up')} />
												<IconButton variant="outline" icon="chevron-down" aria-label={`Move ${status.name} down`} data-move="down"
													disabled={i === list.length - 1} onClick={() => step(status, 'down')} />
											</>
										)
										: null}
								</ListItem>
							)}
					</Fragment>
				))}
				{editing === 'new'
					? <StatusEditor onCancel={() => setEditing(null)} onSave={next => keep(null, next)} />
					: null}
			</div>
		</Card>
	)
}

/* One status open for its name and tone (11a): the four looks the list can draw, as pills. */
function StatusEditor({ status, onCancel, onSave }) {
	const [name, setName] = useState(status?.name ?? '')
	const [tone, setTone] = useState(status?.tone ?? 'neutral')
	const field = useRef(null)
	useEffect(() => { field.current?.focus() }, [])
	const empty = !name.trim()
	const save = () => {
		if (!empty) onSave({ name: name.trim(), tone })
	}
	return (
		<ListItem variant="outline" selected editable data-status-editor>
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
				<Button variant="outline" onClick={onCancel}>Cancel</Button>
				<Button disabled={empty} onClick={save}>Save</Button>
			</div>
		</ListItem>
	)
}
