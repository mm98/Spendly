import { reject } from './variants.js'

const lines = tone => (
	<>
		<span className="st-theme__rail" />
		<span className="st-theme__body">
			<span className={`st-theme__line st-theme__line--${tone}`} />
			<span className={`st-theme__line st-theme__line--${tone}`} />
		</span>
	</>
)

const LOOK = {
	light: <span className="st-theme__preview st-theme__preview--light">{lines('light')}</span>,
	dark: <span className="st-theme__preview st-theme__preview--dark" data-theme="dark">{lines('dark')}</span>,
	system: (
		<span className="st-theme__preview st-theme__preview--split">
			<span className="st-theme__half st-theme__half--light">{lines('light')}</span>
			<span className="st-theme__half st-theme__half--dark" data-theme="dark">{lines('dark')}</span>
		</span>
	)
}

/** The theme to pick, one tile per theme, each drawn as the app looks in it (Settings 11a). */
export function ThemeTiles({ name, options = [], value, onChange, id, ...rest }) {
	reject(rest, 'ThemeTiles')
	return (
		<div className="st-trio" role="radiogroup" id={id} aria-labelledby={id ? `${id}-label` : undefined} {...rest}>
			{options.map(option => (
				<label className="sp-well st-theme" key={option.value}>
					<input type="radio" className="sp-radio" name={name} value={option.value}
						checked={value === option.value} onChange={() => onChange?.(option.value)} />
					{LOOK[option.value]}
					<span className="sp-subtitle sp-center st-theme__name">{option.label}</span>
				</label>
			))}
		</div>
	)
}
