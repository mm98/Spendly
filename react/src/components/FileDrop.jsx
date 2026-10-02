import { reject } from './variants.js'
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

/** The file slot (c17): the frame is the control, empty or filled, and choosing or dropping
    a file replaces what is there. */
export function Slot({ src, size = 'medium', accept = 'image/*', onFile, onRemove, ...rest }) {
	reject(rest, 'Slot')
	const take = files => { const file = files?.[0]; if (file) onFile?.(file) }
	const what = src ? 'Replace the image' : 'Add an image'
	return (
		<span className="sp-slot" {...rest}>
			<Mark
				as="label"
				size={size}
				fill={src ? 'photo' : 'empty'}
				text={src ? 'Photo' : undefined}
				aria-label={what}
				data-tip={what}
				onDragOver={ev => ev.preventDefault()}
				onDrop={ev => { ev.preventDefault(); take(ev.dataTransfer?.files) }}
			>
				{src ? <img src={src} alt="" /> : <Icon name="camera" size={26} />}
				<input type="file" accept={accept} capture="environment" aria-label={what}
					onChange={ev => { take(ev.target.files); ev.target.value = '' }} />
			</Mark>
			{src ? <button type="button" className="sp-slot__remove" onClick={onRemove}>Remove</button> : <span className="sp-meta">Add</span>}
		</span>
	)
}
