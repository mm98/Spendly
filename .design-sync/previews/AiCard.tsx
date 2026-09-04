import { AiCard, AiCardMark, Button, ButtonLink } from 'spendly-react'

// The card lives in Home's narrow side column and in New order's rail, so it is drawn here
// at that width rather than filling the cell.
const side: React.CSSProperties = { width: 340 }

export const ScanPrompt = () => (
	<div style={side}>
		<AiCard
			header={{
				to: '/scan',
				title: 'Get receipts read for you',
				meta: 'Finish setting up Spendly',
				destination: 'Scan receipt',
				progress: true
			}}
			headline="Scan receipts, skip typing"
			body="A PDF, photo or screenshot becomes a draft order. You review every value before it is saved.">
			<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
			<ButtonLink className="button-link-invert">LATER</ButtonLink>
			<AiCardMark />
		</AiCard>
	</div>
)

export const HeaderWithoutProgress = () => (
	<div style={side}>
		<AiCard
			header={{
				to: '/scan',
				title: 'Get receipts read for you',
				meta: 'A photo is enough',
				destination: 'Scan receipt'
			}}
			headline="Scan receipts, skip typing"
			body="A PDF, photo or screenshot becomes a draft order. You review every value before it is saved.">
			<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
			<ButtonLink className="button-link-invert">LATER</ButtonLink>
			<AiCardMark />
		</AiCard>
	</div>
)

export const WithoutHeader = () => (
	<div style={side}>
		<AiCard
			headline="Have the receipt? Skip the form."
			body="A photo or PDF fills every field for you; you only review it.">
			<Button variant="invert" to="/scan">SCAN A RECEIPT</Button>
			<AiCardMark size={34} />
		</AiCard>
	</div>
)
