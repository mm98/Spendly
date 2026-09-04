import { Waiting } from 'spendly-react'

/* Waiting is the whole card, so it takes the width of the column it is dropped in.
   380px is a page column at the app's narrower widths. */
const column: React.CSSProperties = { width: 380 }

export const AtARouteBoundary = () => (
	<div style={column}>
		<Waiting label="Loading this page" />
	</div>
)

export const NamingWhatIsAwaited = () => (
	<div style={column}>
		<Waiting label="Loading the document" />
	</div>
)

export const WithoutALabel = () => (
	<div style={column}>
		<Waiting />
	</div>
)
