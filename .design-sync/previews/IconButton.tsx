import { Card, CardBody, CardDivider, CardHeader, Chip, IconButton, ItemRow } from 'spendly-react'

const noop = () => {}

const bench: React.CSSProperties = { display: 'grid', gridAutoFlow: 'column', justifyContent: 'start', gap: 28 }
const stack: React.CSSProperties = { display: 'grid', justifyItems: 'center', gap: 8 }
const slot: React.CSSProperties = { height: 44, display: 'grid', placeItems: 'center' }

/* The four sizes and shapes the app draws. `arrow` is the default and the one most calls
   get; `send` is the only filled one. */
export const Variants = () => (
	<div style={bench}>
		<span style={stack}>
			<span style={slot}><IconButton icon="pencil" label="Edit order" onClick={noop} /></span>
			<span className="field-help">arrow</span>
		</span>
		<span style={stack}>
			<span style={slot}><IconButton variant="clear" icon="close" label="Hide this notice" onClick={noop} /></span>
			<span className="field-help">clear</span>
		</span>
		<span style={stack}>
			<span style={slot}><IconButton variant="send" icon="upload" label="Choose a receipt to scan" onClick={noop} /></span>
			<span className="field-help">send</span>
		</span>
		<span style={stack}>
			<span style={slot}><IconButton variant="reorder" icon="grip" label="Move this card" onClick={noop} /></span>
			<span className="field-help">reorder</span>
		</span>
	</div>
)

/* Where the default lands: the pair of actions at the top of an order, opposite its name. */
export const OnACardHead = () => (
	<Card>
		<CardBody>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
				<div>
					<div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.01em' }}>Bilka</div>
					<div className="field-help">4 September 2026 • 12 items</div>
				</div>
				<div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
					<IconButton icon="pencil" label="Edit order" to="/orders/1/edit" />
					<IconButton icon="trash" label="Delete order" onClick={noop} />
				</div>
			</div>
			<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
				<Chip>Groceries</Chip>
				<Chip>Household</Chip>
			</div>
		</CardBody>
	</Card>
)

/* Inside a row, where the glyph is the whole control and the label is the only thing that
   says what it does. */
export const InARow = () => (
	<Card>
		<CardHeader title="Lines read" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<ItemRow icon="cart" title="Kaffe 500 g" meta="2 pcs" amount="89,00 kr.">
				<IconButton icon="pencil" label="Edit Kaffe 500 g" onClick={noop} />
				<IconButton icon="trash" label="Delete Kaffe 500 g" onClick={noop} />
			</ItemRow>
			<ItemRow icon="cart" title="Havregryn 1 kg" meta="1 pc" amount="14,95 kr.">
				<IconButton icon="pencil" label="Edit Havregryn 1 kg" onClick={noop} />
				<IconButton icon="trash" label="Delete Havregryn 1 kg" onClick={noop} />
			</ItemRow>
		</CardBody>
	</Card>
)

/* `variant` is a single word appended to `icon-button-`, so a second class has to be spelled
   in full. This is the remove control on a dashboard card, and `disabled` is one of the few
   places the app styles it. */
export const Reordering = () => (
	<div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 320 }}>
		<span className="field-help" style={{ marginRight: 'auto' }}>2 OF 6</span>
		<IconButton variant="reorder" icon="grip" label="Move Saved vs retail" onClick={noop} />
		<IconButton variant="reorder" icon="grip" label="Move Monthly pace" disabled />
		<IconButton variant="reorder icon-button-reorder-remove" icon="close"
			label="Remove Saved vs retail" onClick={noop} />
	</div>
)

/* `to` renders a router link, `href` a plain anchor, and only then does the label reach a
   reader — there is no text inside the control to fall back on. */
export const AsLinks = () => (
	<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
		<IconButton icon="settings" to="/settings" label="Settings" />
		<IconButton icon="chevronLeft" to="/" label="Home" />
		<IconButton icon="download" href="/api/orders/1/receipt.pdf"
			label="Download bilka-kvittering.pdf" download />
	</div>
)
