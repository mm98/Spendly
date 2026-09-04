import { Field, TextArea } from 'spendly-react'

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 460 }

export const ANote = () => (
	<div style={box}>
		<Field label="Note" optional htmlFor="area-note">
			<TextArea id="area-note" aria-label="Note"
				value="Weekly shop at Bilka. The coffee was on offer, two bags for one."
				onChange={noop} />
		</Field>
	</div>
)

export const Empty = () => (
	<div style={box}>
		<Field label="Note" optional htmlFor="area-empty">
			<TextArea id="area-empty" aria-label="Note" value=""
				placeholder="Add a note about this purchase..." onChange={noop} />
		</Field>
	</div>
)

export const WithHelp = () => (
	<div style={box}>
		<Field label="Note" optional htmlFor="area-help"
			help="Anything worth remembering about this line.">
			<TextArea id="area-help" aria-label="Note"
				value="Returned the second pack to Netto on the 22nd, receipt in the folder."
				onChange={noop} />
		</Field>
	</div>
)
