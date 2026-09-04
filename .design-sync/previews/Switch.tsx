import { Field, FieldShell, FieldUnit, FilterSection, FilterSectionBody, Switch, TextInput } from 'spendly-react'

const noop = () => {}
const row: React.CSSProperties = {
	display: 'flex', alignItems: 'center', gap: 12, maxWidth: 420
}
const text: React.CSSProperties = { fontSize: 13, fontWeight: 600 }

export const On = () => (
	<div style={row}>
		<Switch id="switch-on" checked onChange={noop} label="Monthly budget" />
		<label htmlFor="switch-on" style={text}>Monthly budget</label>
	</div>
)

export const Off = () => (
	<div style={row}>
		<Switch id="switch-off" checked={false} onChange={noop} label="Monthly budget" />
		<label htmlFor="switch-off" style={text}>Monthly budget</label>
	</div>
)

export const OwningASection = () => (
	<div style={{ maxWidth: 420 }}>
		<FilterSection>
			<div style={row}>
				<Switch id="switch-budget" checked onChange={noop} label="Monthly budget"
					controls="switch-budget-panel" />
				<label htmlFor="switch-budget" style={text}>Monthly budget</label>
			</div>
			<FilterSectionBody id="switch-budget-panel">
				<Field label="Budget" htmlFor="switch-budget-amount"
					help="Spendly warns you when the month passes this.">
					<FieldShell>
						<TextInput id="switch-budget-amount" inputMode="decimal" value="4.500"
							aria-label="Budget" onChange={noop} />
						<FieldUnit>kr.</FieldUnit>
					</FieldShell>
				</Field>
			</FilterSectionBody>
		</FilterSection>
	</div>
)
