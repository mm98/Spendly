import { Card, CardBody, CardDivider, CardHeader, DocumentPreview, ImageOrIcon, ItemRow } from 'spendly-react'

/* A stand-in for a thumbnail the server generated. Inline, so the cell never waits on a
   network the preview does not have. */
const RECEIPT = 'data:image/svg+xml;utf8,' + encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">'
	+ '<rect width="160" height="160" fill="#E4EDE6"/>'
	+ '<rect x="36" y="14" width="88" height="132" rx="6" fill="#FFFFFF"/>'
	+ '<g fill="#A6B2AB">'
	+ '<rect x="48" y="32" width="52" height="8" rx="3"/>'
	+ '<rect x="48" y="54" width="64" height="5" rx="2"/>'
	+ '<rect x="48" y="68" width="64" height="5" rx="2"/>'
	+ '<rect x="48" y="82" width="42" height="5" rx="2"/></g>'
	+ '<rect x="48" y="106" width="64" height="13" rx="3" fill="#2F6B4F"/></svg>')

/* Both branches in one list: the first line has a picture, the second never had one and
   draws the named glyph in the same frame at the same size. */
export const InAList = () => (
	<Card>
		<CardHeader title="Lines on this order" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<ItemRow thumb="photo" thumbSrc={RECEIPT} thumbLabel="View photo for Kaffe 500 g"
				onThumbClick={() => {}} title="Kaffe 500 g" meta="Bilka • 2 pcs" amount="89,00 kr." />
			<ItemRow thumb="photo" title="Havregryn 1 kg" meta="Bilka • 1 pc" amount="14,95 kr." />
			<ItemRow thumb="photo" title="Opvasketabs 60 stk." meta="Bilka • 1 pc" amount="119,00 kr." />
		</CardBody>
	</Card>
)

/* The same component at document size. The PDF has no preview image, so it draws the
   document glyph rather than a photo glyph over a file that is not a photo. */
export const AsADocumentPreview = () => (
	<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
		<div style={{ display: 'grid', gap: 8 }}>
			<DocumentPreview kind="image" src={RECEIPT} />
			<span className="field-help">bilka-kvittering.jpg</span>
		</div>
		<div style={{ display: 'grid', gap: 8 }}>
			<DocumentPreview kind="pdf" />
			<span className="field-help">elgiganten-faktura.pdf</span>
		</div>
	</div>
)

/* A thumbnail that never arrives. The src here cannot load, and the glyph takes over on
   its own: the row keeps its shape instead of showing a broken picture. */
export const WhenTheImageFails = () => (
	<div style={{ display: 'grid', gap: 18 }}>
		<div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
			<span className="document-thumb">
				<ImageOrIcon src="/thumbnails/not-generated-yet.jpg" icon="photo"
					imgClassName="document-thumb-img" />
			</span>
			<span className="field-help">the thumbnail has not been generated yet</span>
		</div>
		<DocumentPreview kind="image" src="/thumbnails/not-generated-yet.jpg" />
	</div>
)
