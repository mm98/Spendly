import { FileDrop, Slot } from '../../react/src/components/FileDrop.jsx'
import { useState } from 'react'
import { Strip, Attachment, AttachmentAdd, Viewer } from '../../react/src/components/Attachments.jsx'
import { Mark, MarkRemove } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { Spinner } from '../../react/src/components/Utilities.jsx'

export default {
	title: 'Fields/Files',
	decorators: [Story => <div style={{ maxWidth: 560 }}><Story /></div>]
}

export const DropZone = {
	render: () => (
		<FileDrop icon="upload" accept="image/*,application/pdf" multiple onFiles={() => {}}>
			<span>Drop a receipt here, or choose a file</span>
			<span className="sp-meta">Images and PDF</span>
		</FileDrop>
	)
}

export const DropZoneOnItsSide = {
	render: () => (
		<FileDrop icon="upload" row onFiles={() => {}}>
			<span>Drop a receipt here, or choose a file</span>
			<span className="sp-meta">Images and PDF</span>
		</FileDrop>
	)
}

export const DropZoneTurnedOff = {
	render: () => (
		<FileDrop icon="upload" disabled>
			<span>Scanning is off</span>
			<span className="sp-meta">No questions left today. You can scan again tomorrow.</span>
		</FileDrop>
	)
}

export const PictureSlot = {
	render: () => (
		<div className="sp-row-flex sp-gap-16">
			<Field label="Photo"><Slot onFile={() => {}} /></Field>
			<Field label="Busy"><Slot busy onFile={() => {}} /></Field>
			<Field label="Refused"><Slot problem="Too large" onFile={() => {}} onRemove={() => {}} /></Field>
		</div>
	)
}

export const AttachmentStrip = {
	render: () => (
		<Strip>
			<Attachment name="receipt.pdf"><Mark size="xlarge" fill="plain" aria-label="receipt.pdf" onClick={() => {}} remove={<MarkRemove aria-label="Remove receipt.pdf" onClick={() => {}}><Icon name="x" /></MarkRemove>}><Icon name="file" /></Mark></Attachment>
			<Attachment name="invoice-447.pdf"><Mark size="xlarge" fill="plain" aria-label="invoice-447.pdf" onClick={() => {}}><Icon name="file-text" /></Mark></Attachment>
			<Attachment name="uploading.jpg"><Mark size="xlarge" fill="plain" aria-label="uploading.jpg"><Spinner /></Mark></Attachment>
			<Attachment name="huge-scan.tiff"><Mark size="xlarge" fill="none" danger="Too large" aria-label="huge-scan.tiff"><Icon name="file" /></Mark></Attachment>
			<AttachmentAdd onFiles={() => {}} />
		</Strip>
	)
}

// a drawn stand-in for a photo of a receipt, so the viewer has a picture without a file
const RECEIPT = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#f7f6f2"/><g fill="#c3c1b8"><rect x="60" y="80" width="300" height="28"/><rect x="60" y="160" width="480" height="14"/><rect x="60" y="200" width="420" height="14"/><rect x="60" y="240" width="460" height="14"/><rect x="340" y="760" width="200" height="28"/></g></svg>')

export const Viewing = {
	render: () => {
		const [at, setAt] = useState(0)
		const items = [{ name: 'receipt.jpg', src: RECEIPT, download: RECEIPT, kind: 'Photo' }, { name: 'second-page.jpg', src: RECEIPT, download: RECEIPT, kind: 'Photo' }]
		return at === null
			? <Button variant="outline" onClick={() => setAt(0)}>Open the receipt</Button>
			: <Viewer items={items} at={at} onMove={setAt} onClose={() => setAt(null)} />
	}
}
