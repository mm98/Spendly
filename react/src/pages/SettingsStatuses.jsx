import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../components/Button.jsx'
import { Card, CardHeader } from '../components/Card.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Announce, Insertion, ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Anchor, Menu, MenuItem } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { useReorder } from '../components/Reorder.js'
import { Skeleton, useDismiss } from '../components/Utilities.jsx'
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
	const made = useRef(0)
	const edit = next => change('statuses', saved && sameAs(next, saved) ? saved : next)
	const reorder = useReorder({
		items: list ?? [],
		keyOf: status => status.key,
		nameOf: status => status.name,
		onMove: edit
	})

	if (!list)
		return (
			<Card>
				<CardHeader name="Statuses" {...landing('statuses')} />
				<div className="sp-stack sp-gap-6" aria-busy="true" aria-label="Loading your statuses">
					<Skeleton shape="line" /><Skeleton shape="line" /><Skeleton shape="line" />
				</div>
			</Card>
		)

	const remove = status => edit(list.filter(s => s.key !== status.key))
	const keep = (status, next) => {
		edit(status ? list.map(s => (s.key === status.key ? { ...s, ...next } : s))
			: [...list, { key: `new-${++made.current}`, ...next, orders: 0, fresh: true }])
		setEditing(null)
	}

	return (
		<Card footer={editing === 'new' ? null : <Button variant="outline" onClick={() => setEditing('new')}>Add a status</Button>}
			footerLayout="stack" footerCommits>
			<CardHeader name="Statuses" {...landing('statuses')} aside="Drag to reorder" />
			<div className="sp-stack sp-gap-6" {...reorder.list}>
				<Announce>{reorder.said}</Announce>
				{reorder.items.map(status => (
					<Fragment key={status.key}>
						{reorder.lands(status) ? <Insertion /> : null}
						{editing === status.key
							? <StatusEditor status={status} touch={touch} onCancel={() => setEditing(null)} onSave={next => keep(status, next)} />
							: (
								<ListItem variant={reorder.variant(status)} editable
									handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${status.name}`}
									data-status={status.key} {...reorder.row(status)}>
									<StatusLook tone={status.tone}>{status.name}</StatusLook>
									<span className="sp-grow" />
									{/* on a phone the count is left out, so the name sits level with the rest of the row (11a) */}
									{touch ? null : <span className="sp-meta sp-nowrap">{plural(status.orders ?? 0, 'order')}</span>}
									{status.builtIn ? <Pill>built in</Pill> : null}
									{touch
										? <StatusMenu status={status} onRename={() => setEditing(status.key)} onDelete={() => remove(status)} />
										: (
											<>
												<Mark size="small" aria-label={`Rename or recolour ${status.name}`} onClick={() => setEditing(status.key)}>
													<Icon name="pencil" size={14} />
												</Mark>
												{deletable(status)
													? (
														<Mark size="small" aria-label={`Delete ${status.name}`} onClick={() => remove(status)}>
															<Icon name="trash" size={14} />
														</Mark>
													)
													: null}
											</>
										)}
								</ListItem>
							)}
					</Fragment>
				))}
				{editing === 'new'
					? <StatusEditor touch={touch} onCancel={() => setEditing(null)} onSave={next => keep(null, next)} />
					: null}
			</div>
		</Card>
	)
}

// an added status no order carries can go; a built-in one stays
const deletable = status => !status.builtIn && !status.orders

/** A status's actions on a phone (11a): Rename, and Delete where it may go. Draft has neither,
    so it has no menu: the pencil and the bin sit too close together for two 44px targets. */
function StatusMenu({ status, onRename, onDelete }) {
	const [open, setOpen] = useState(false)
	const anchor = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(anchor, open, close)
	if (status.type === 'draft') return null
	return (
		<Anchor ref={anchor} open={open}>
			<IconButton icon="dots-vertical" aria-label={`Actions for ${status.name}`}
				aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
			{open
				? (
					<Menu position="floating" aria-label={status.name}>
						<MenuItem onClick={() => { close(); onRename() }}>Rename</MenuItem>
						{deletable(status) ? <MenuItem onClick={() => { close(); onDelete() }}>Delete</MenuItem> : null}
					</Menu>
				)
				: null}
		</Anchor>
	)
}

/* One status open for its name and tone (11a): the four looks the list can draw, as pills. */
function StatusEditor({ status, touch = false, onCancel, onSave }) {
	const [name, setName] = useState(status?.name ?? '')
	const [tone, setTone] = useState(status?.tone ?? 'neutral')
	const field = useRef(null)
	useEffect(() => { field.current?.focus() }, [])
	const empty = !name.trim()
	const save = () => {
		if (!empty) onSave({ name: name.trim(), tone })
	}
	return (
		<ListItem variant="outline" selected editable>
			<TextField inputRef={field} value={name} maxLength={40} aria-label="Status name" onChange={setName}
				onKeyDown={ev => { if (ev.key === 'Enter') save(); if (ev.key === 'Escape') onCancel() }} />
			{/* on a phone the row wraps and the field takes the first line, so it has no spacer to share it with */}
			{touch ? null : <span className="sp-grow" />}
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
