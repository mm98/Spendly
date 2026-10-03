import { Fragment, useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '../components/Button.jsx'
import { Card } from '../components/Card.jsx'
import { Icon } from '../components/Icon.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Announce, Insertion, ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Pill } from '../components/Pill.jsx'
import { useReorder } from '../components/Reorder.js'
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

/** Statuses (11a), each saved as made: a row moves by drag or keys (on a phone by up and down buttons,
    18b), the pencil renames and recolours, a status no order carries can be deleted; Draft is built in. */
export function StatusesCard({ touch = false }) {
	const loaded = useApi(getStatuses)
	const toast = useToast()
	const [list, setList] = useState(null)
	useEffect(() => { if (loaded.data) setList(loaded.data) }, [loaded.data])
	const [editing, setEditing] = useState(null)
	const [said, setSaid] = useState('')
	// a phone moves a status with its up and down buttons, so the handle is the desktop's (18b)
	const reorder = useReorder({
		items: list ?? [],
		keyOf: status => status.key,
		nameOf: status => status.name,
		onMove: next => write(() => orderStatusesAs(next.map(s => s.key)), next)
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
	const step = (status, way) => {
		const at = list.findIndex(s => s.key === status.key)
		moved.current = { key: status.key, way }
		moveTo(status, at + (way === 'up' ? -1 : 1))
		setSaid(`${status.name}, position ${at + (way === 'up' ? 0 : 2)} of ${list.length}`)
	}

	const remove = status => write(() => deleteStatus(status.key), list.filter(s => s.key !== status.key))
		.then(ok => { if (ok) toast({ message: `${status.name} was deleted.` }) })

	return (
		<Card footer={editing === 'new' ? null : <Button variant="outline" onClick={() => setEditing('new')}>Add a status</Button>}
			footerLayout="stack" footerCommits>
			<div className="sp-row-flex">
				<Heading section="statuses">Statuses</Heading>
				<span className="sp-grow" />
				{touch ? null : <span className="sp-meta">Drag to reorder</span>}
			</div>
			<div className="sp-stack sp-gap-6" {...reorder.list}>
				<Announce>{touch ? said : reorder.said}</Announce>
				{reorder.items.map((status, i) => (
					<Fragment key={status.key}>
						{reorder.lands(status) ? <Insertion /> : null}
						{editing === status.key
							? <StatusEditor status={status} onCancel={() => setEditing(null)}
								onSave={next => write(() => changeStatus(status.key, next)).then(ok => { if (ok) setEditing(null) })} />
							: (
								<ListItem variant={reorder.variant(status)}
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
