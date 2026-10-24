import { reject } from './variants.js'

/* FileDrop: the dashed area a file is dropped on or picked through.

   It is a label around a real file input, so the click, the keyboard and the
   platform's own picker all work without a script, and on a phone that picker
   offers the camera - which is why there is no separate Take a photo control.

   The input is clipped rather than hidden, so it stays focusable. */

/**
 * @param {object} props
 * @param {import('./Icon.jsx').IconName} [props.icon] An Icon name, above the text.
 * @param {import('react').ReactNode} props.children What may be dropped here.
 * @param {string} [props.accept] Passed to the input.
 * @param {boolean} [props.multiple]
 * @param {(files: File[], problems: (string | null)[]) => void} [props.onFiles] Takes no `className` and no `style`.
 * @param {string} [props.id]
 */
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
