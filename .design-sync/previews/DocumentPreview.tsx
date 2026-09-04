import { Card, CardBody, CardDivider, CardHeader, DocumentPreview } from 'spendly-react'

// Scan's "Source document" card is the app's only caller: the preview, then the file's own
// name and size under it. The thumbnail is drawn inline here (a data URI) so the card
// renders with no network.
const side: React.CSSProperties = { width: 400 }

const receipt = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">
<rect width="420" height="560" fill="#3f4b43"/>
<g transform="rotate(-1.6 210 280)">
<rect x="66" y="18" width="288" height="524" rx="3" fill="#f8f5ee"/>
<g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" fill="#2f3630">
<text x="210" y="64" text-anchor="middle" font-size="19" font-weight="700">BILKA</text>
<text x="210" y="86" text-anchor="middle" font-size="12" fill="#6c7570">Slotsarkaderne 12, Hillerød</text>
<text x="210" y="106" text-anchor="middle" font-size="12" fill="#6c7570">18-04-2024   14:32</text>
<text x="92" y="140" fill="#9aa39d">- - - - - - - - - - - - - - - -</text>
<text x="92" y="176">RUGBRØD</text><text x="328" y="176" text-anchor="end">24,95</text>
<text x="92" y="206">SKUMMETMÆLK 6x</text><text x="328" y="206" text-anchor="end">59,70</text>
<text x="92" y="236">KAFFE 400G 2x</text><text x="328" y="236" text-anchor="end">99,90</text>
<text x="92" y="266">VASKEPULVER</text><text x="328" y="266" text-anchor="end">89,00</text>
<text x="92" y="296">HAVREGRYN 1KG</text><text x="328" y="296" text-anchor="end">18,50</text>
<text x="92" y="326">BANANER 1,2KG</text><text x="328" y="326" text-anchor="end">21,60</text>
<text x="92" y="356">RABAT</text><text x="328" y="356" text-anchor="end">-10,00</text>
<text x="92" y="386" fill="#9aa39d">- - - - - - - - - - - - - - - -</text>
<text x="92" y="418" font-weight="700">I ALT</text><text x="328" y="418" text-anchor="end" font-weight="700">1.284,00</text>
<text x="92" y="444" font-size="12" fill="#6c7570">HERAF MOMS</text><text x="328" y="444" text-anchor="end" font-size="12" fill="#6c7570">256,80</text>
<text x="210" y="492" text-anchor="middle" font-size="12" fill="#6c7570">TAK FOR BESØGET</text>
<rect x="120" y="506" width="180" height="22" fill="#2f3630"/>
</g></g></svg>`

const thumbnail = `data:image/svg+xml;utf8,${encodeURIComponent(receipt)}`

export const PhotoOfAReceipt = () => (
	<div style={side}>
		<Card aria-label="Source document">
			<CardHeader title="Source document" />
			<CardDivider />
			<CardBody>
				<DocumentPreview kind="image" src={thumbnail} />
				<div className="space-between document-name-row">
					<span className="document-name">bilka-18-04-2024.jpg</span>
					<span className="field-help">Image • 1,4 MB</span>
				</div>
				<span className="field-help">Saved as an attachment on the order when you save.</span>
			</CardBody>
		</Card>
	</div>
)

export const PdfWithNoThumbnail = () => (
	<div style={side}>
		<Card aria-label="Source document">
			<CardHeader title="Source document" />
			<CardDivider />
			<CardBody>
				<DocumentPreview kind="pdf" />
				<div className="space-between document-name-row">
					<span className="document-name">faktura-elgiganten-9241.pdf</span>
					<span className="field-help">PDF • 412 kB</span>
				</div>
			</CardBody>
		</Card>
	</div>
)

export const ImageWithNoThumbnail = () => (
	<div style={side}>
		<Card aria-label="Source document">
			<CardHeader title="Source document" />
			<CardDivider />
			<CardBody>
				<DocumentPreview kind="image" />
				<div className="space-between document-name-row">
					<span className="document-name">netto-kvittering.heic</span>
					<span className="field-help">Image • 3,1 MB</span>
				</div>
			</CardBody>
		</Card>
	</div>
)

export const OpenedFullSize = () => (
	<div style={side}>
		<Card aria-label="Source document">
			<CardHeader title="Source document" />
			<CardDivider />
			<CardBody>
				<DocumentPreview kind="image" src={thumbnail} className="scan-source-open" />
				<div className="space-between document-name-row">
					<span className="document-name">bilka-18-04-2024.jpg</span>
					<span className="field-help">Image • 1,4 MB</span>
				</div>
			</CardBody>
		</Card>
	</div>
)

export const WhileTheFileIsBeingRead = () => (
	<div style={side}>
		<Card aria-label="Reading the document" aria-busy="true">
			<CardBody variant="card-body-centered">
				<DocumentPreview kind="image" src={thumbnail} className="scan-reading-preview" />
				<div>
					<div className="card-headline">Reading bilka-18-04-2024.jpg</div>
					<span className="field-help">
						This usually takes a few seconds. Nothing is stored until you approve the review.</span>
				</div>
			</CardBody>
		</Card>
	</div>
)
