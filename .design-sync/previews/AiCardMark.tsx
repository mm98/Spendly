import { AiCard, AiCardMark, Button } from 'spendly-react'

// The mark is the brand glyph in the dark card's action row -- pale green on the dark
// surface, pushed to the right end by its own margin. It has no look of its own on a light
// background, so it is only ever drawn inside AiCard.
const side: React.CSSProperties = { width: 340 }

export const InTheActionRow = () => (
	<div style={side}>
		<AiCard
			headline="Have the receipt? Skip the form."
			body="A photo or PDF fills every field for you; you only review it.">
			<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
			<AiCardMark />
		</AiCard>
	</div>
)

export const Smaller = () => (
	<div style={side}>
		<AiCard
			headline="Have the receipt? Attach it instead."
			body="A photo or PDF attaches to the order. You still fill in the fields yourself.">
			<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
			<AiCardMark size={34} />
		</AiCard>
	</div>
)
