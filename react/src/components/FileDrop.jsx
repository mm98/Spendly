import { reject } from './variants.js'
import { Icon } from './Icon.jsx'

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
