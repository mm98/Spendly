import { join, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'

/** `action` is the button-shaped words inside the zone (3a): a span, since the zone itself is
    the label that opens the picker. `onDrop` takes files dropped anywhere on it. */
export function FileDrop({ icon, children, accept, multiple = false, onFiles, action, id, ...rest }) {
	reject(rest, 'FileDrop')
	const dropping = onFiles
		? {
			onDragOver: ev => ev.preventDefault(),
			onDrop: ev => { ev.preventDefault(); if (ev.dataTransfer?.files?.length) onFiles(ev.dataTransfer.files) }
		}
		: {}
	return (
		<label className="sp-filedrop" {...dropping} {...rest}>
			{icon ? <Icon name={icon} /> : null}
			{children}
			{action ? <span className="sp-btn sp-btn--small">{action}</span> : null}
			<input
				id={id}
				type="file"
				accept={accept}
				multiple={multiple}
				onChange={ev => onFiles?.(ev.target.files)}
			/>
		</label>
	)
}

/** The file slot (c17): the frame is the control, empty or filled; choosing, dropping or pasting
    a picture replaces what is there. `start` is a slot that is a field of its own. */
export function Slot({ id, src, size = 'large', kind = 'Photo', word = 'Add', name = 'the image', start = false, accept = 'image/*', onFile, onRemove, lead, trail, unit, 'aria-describedby': describedBy, ...rest }) {
	reject(rest, 'Slot')
	const take = file => { if (file) onFile?.(file) }
	const what = src ? `Replace ${name}` : `Add ${name}`
	return (
		<span
			className={join('sp-slot', start && 'sp-slot--start')}
			onPaste={ev => {
				const file = [...(ev.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'))
				if (file) { ev.preventDefault(); take(file) }
			}}
			{...rest}
		>
			<Mark
				as="label"
				size={size}
				fill={src ? 'photo' : 'empty'}
				text={src ? kind : undefined}
				htmlFor={id}
				aria-label={what}
				data-tip={what}
				onDragOver={ev => ev.preventDefault()}
				onDrop={ev => { ev.preventDefault(); take(ev.dataTransfer?.files?.[0]) }}
			>
				{src ? <img src={src} alt="" /> : <Icon name="camera" size={26} />}
				<input id={id} type="file" accept={accept} aria-describedby={describedBy}
					onChange={ev => { take(ev.target.files?.[0]); ev.target.value = '' }} />
			</Mark>
			{src ? <button type="button" className="sp-slot__remove" onClick={onRemove}>Remove</button> : <span className="sp-meta">{word}</span>}
		</span>
	)
}
