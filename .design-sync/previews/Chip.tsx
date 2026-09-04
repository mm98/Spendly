import { Card, CardBody, CardDivider, CardHeader, Chip, ButtonLink, Field, FieldShell, TextInput } from 'spendly-react'

const noop = () => {}

const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }

/* The categories on a saved order: values the reader put there, with nothing to remove
   them here, so each one is a plain span. Ported from OrderDetail. */
export const OnAnOrder = () => (
	<Card>
		<CardHeader title="Bilka" />
		<CardDivider />
		<CardBody>
			<div style={wrap}>
				<Chip>Groceries</Chip>
				<Chip>Household</Chip>
				<Chip>Transport</Chip>
			</div>
		</CardBody>
	</Card>
)

/* The filters standing on a list. Each chip carries onRemove, so each one is a real
   button with a cross. Ported from ListToolbar's filter row. */
export const Removable = () => (
	<div style={{ ...wrap, gap: 6 }}>
		<Chip label="Remove filter Bilka" onRemove={noop}>Bilka</Chip>
		<Chip label="Remove filter Delivered" onRemove={noop}>Delivered</Chip>
		<Chip label="Remove filter From 1 August 2026" onRemove={noop}>From 1 August 2026</Chip>
		<span style={{ marginLeft: 6 }}><ButtonLink onClick={noop}>CLEAR ALL</ButtonLink></span>
	</div>
)

/* `icon` draws a glyph after the label and before the cross. */
export const WithIcon = () => (
	<div style={wrap}>
		<Chip icon="star">Favourite vendors</Chip>
		<Chip icon="discount">On offer</Chip>
		<Chip icon="calendar" label="Remove filter September 2026" onRemove={noop}>September 2026</Chip>
	</div>
)

/* The chips live inside the field they are being added to, not above it. The last chip
   is longer than the field, so its label ellipsises while the cross keeps its place. */
export const InsideAField = () => (
	<Field label="Aliases" optional htmlFor="vendor-aliases"
		help="Other names for this vendor. Type a name and press Enter.">
		<FieldShell className="field-shell-chips field-shell-no-chevron">
			<Chip label="Remove alias Bilka Hypermarked" onRemove={noop}>Bilka Hypermarked</Chip>
			<Chip label="Remove alias Bilka.dk" onRemove={noop}>Bilka.dk</Chip>
			<Chip label="Remove alias Salling Group Bilka Aarhus Nord" onRemove={noop}>
				Salling Group Bilka Aarhus Nord</Chip>
			<TextInput id="vendor-aliases" value="" onChange={noop}
				aria-label="Add alias" placeholder="Add alias..." />
		</FieldShell>
	</Field>
)
