import { Card, CardBody, CardDivider, CardHeader, TagChip } from 'spendly-react'

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }

/* The whole tone vocabulary: pink is the default, blue is the other one. */
export const Tones = () => (
	<div style={row}>
		<TagChip icon="bolt">Quick wins</TagChip>
		<TagChip tone="blue" icon="sparkles">AI scan</TagChip>
	</div>
)

/* `icon` has no default and the chip always draws one, so every tag names a glyph. */
export const Icons = () => (
	<div style={row}>
		<TagChip icon="bolt">Quick wins</TagChip>
		<TagChip icon="discount">Half price</TagChip>
		<TagChip tone="blue" icon="sparkles">AI scan</TagChip>
		<TagChip tone="blue" icon="star">Favourites</TagChip>
	</div>
)

/* What the tag is for: labelling one suggestion in a stack of them, above its own heading. */
export const OnSuggestions = () => (
	<Card>
		<CardHeader title="For you" />
		<CardDivider />
		<CardBody>
			<div style={{ display: 'grid', gap: 12 }}>
				<div style={{ display: 'grid', gap: 6 }}>
					<TagChip icon="bolt">Quick wins</TagChip>
					<span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '-.01em' }}>Name that vendor</span>
					<p className="field-help" style={{ margin: 0 }}>
						3 orders have a shop name Spendly could not match. Confirm them to keep your totals right.</p>
				</div>
				<div style={{ display: 'grid', gap: 6 }}>
					<TagChip tone="blue" icon="sparkles">AI scan</TagChip>
					<span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: '-.01em' }}>Photos of receipts work too</span>
					<p className="field-help" style={{ margin: 0 }}>
						A photo of a Netto receipt is read just as well as a PDF from Elgiganten.</p>
				</div>
			</div>
		</CardBody>
	</Card>
)
