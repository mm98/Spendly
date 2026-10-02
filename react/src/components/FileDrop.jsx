import { join, reject } from './variants.js'
import { Icon } from './Icon.jsx'
import { Mark } from './Mark.jsx'

export function FileDrop({ icon, children, accept, multiple = false, onFiles, id, ...rest }) {
	reject(rest, 'FileDrop')
	return (
		<label className="sp-filedrop" {...rest}>
			{icon ? <Icon name={icon} /> : null}
			{children}
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

/** The file slot (c17): the frame is the control, the camera and `word` while empty, `src` with
    `kind` on its foot and Remove under it once filled. `start` is a slot that is a field of its own. */
export function Slot({ id, src, kind = 'Photo', word = 'Add', name = 'the image', start = false, accept = 'image/*', onFile, onRemove, lead, trail, unit, 'aria-describedby': describedBy, ...rest }) {
	reject(rest, 'Slot')
	const take = file => { if (file) onFile?.(file) }
	const input = (
		<input id={id} type="file" accept={accept} aria-describedby={describedBy}
			onChange={ev => { take(ev.target.files?.[0]); ev.target.value = '' }} />
	)
	return (
		<span
			className={join('sp-slot', start && 'sp-slot--start')}
			onPaste={ev => {
				const file = [...(ev.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'))
				if (file) { ev.preventDefault(); take(file) }
			}}
			{...rest}
		>
			{src
				? <Mark as="label" size="large" fill="photo" text={kind} htmlFor={id} data-tip={`Replace ${name}`} aria-label={`Replace ${name}`}><img src={src} alt="" />{input}</Mark>
				: <Mark as="label" size="large" fill="empty" htmlFor={id} data-tip={`Add ${name}`} aria-label={`Add ${name}`}><Icon name="camera" size={26} />{input}</Mark>}
			{src
				? <button type="button" className="sp-slot__remove" onClick={onRemove}>Remove</button>
				: <span className="sp-meta">{word}</span>}
		</span>
	)
}
