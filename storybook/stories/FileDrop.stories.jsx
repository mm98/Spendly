import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { FileDrop, Slot } from '../../react/src/components/FileDrop.jsx'
import { Strip, Attachment, AttachmentAdd, Viewer } from '../../react/src/components/Attachments.jsx'
import { Mark, MarkRemove } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { Spinner } from '../../react/src/components/Utilities.jsx'
import { iconControl, knownAccessibilityFaults, useHeld } from './controls.js'

const words = { title: { control: 'text', description: 'The zone\'s first line' }, meta: { control: 'text', description: 'Its second line' } }

export default {
	title: 'Fields/Files',
	component: FileDrop,
	subcomponents: { Slot, Strip, Attachment, AttachmentAdd, Viewer },
	decorators: [Story => <div style={{ maxWidth: 560 }}><Story /></div>],
	args: { icon: 'upload', title: 'Drop a receipt here, or choose a file', meta: 'Images and PDF', onFiles: fn() },
	argTypes: { ...words, icon: iconControl, action: { control: false }, children: { control: false } },
	render: ({ title, meta, ...args }) => (
		<FileDrop {...args}>
			<span>{title}</span>
			<span className="sp-meta">{meta}</span>
		</FileDrop>
	)
}

const PDF = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' })

export const DropZone = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { accept: 'image/*,application/pdf', multiple: true },
	play: async ({ args, canvasElement }) => {
		await userEvent.upload(canvasElement.querySelector('input[type="file"]'), PDF)
		await waitFor(() => expect(args.onFiles).toHaveBeenCalledOnce())
	}
}

export const DropZoneOnItsSide = { parameters: { a11y: knownAccessibilityFaults }, args: { row: true } }

export const DropZoneTurnedOff = {
	args: { disabled: true, title: 'Scanning is off', meta: 'No questions left today. You can scan again tomorrow.', onFiles: undefined }
}

export const PictureSlot = {
	parameters: { a11y: knownAccessibilityFaults, variantsOf: Slot },
	args: { size: 'large', kind: 'Photo', word: 'Add', busy: false, problem: '', onFile: fn(), onRemove: fn() },
	argTypes: Object.fromEntries(['title', 'meta', 'icon', 'action', 'children'].map(prop => [prop, { control: false, table: { disable: true } }])),
	render: ({ onFile, onRemove, problem, title, meta, icon, onFiles, ...args }) => (
		<div className="sp-row-flex sp-gap-16">
			<Field label="Photo"><Slot {...args} problem={problem || undefined} onFile={onFile} onRemove={problem ? onRemove : undefined} /></Field>
			<Field label="Busy"><Slot busy onFile={onFile} /></Field>
			<Field label="Refused"><Slot problem="Too large" onFile={onFile} onRemove={onRemove} /></Field>
		</div>
	)
}

export const AttachmentStrip = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { onOpen: fn(), onRemove: fn() },
	argTypes: { title: { control: false }, meta: { control: false }, icon: { control: false } },
	render: ({ onOpen, onRemove, onFiles }) => (
		<Strip>
			<Attachment name="receipt.pdf"><Mark size="xlarge" fill="plain" aria-label="receipt.pdf" onClick={onOpen} remove={<MarkRemove aria-label="Remove receipt.pdf" onClick={onRemove}><Icon name="x" /></MarkRemove>}><Icon name="file" /></Mark></Attachment>
			<Attachment name="invoice-447.pdf"><Mark size="xlarge" fill="plain" aria-label="invoice-447.pdf" onClick={() => {}}><Icon name="file-text" /></Mark></Attachment>
			<Attachment name="uploading.jpg"><Mark size="xlarge" fill="plain" aria-label="uploading.jpg"><Spinner /></Mark></Attachment>
			<Attachment name="huge-scan.tiff"><Mark size="xlarge" fill="none" danger="Too large" aria-label="huge-scan.tiff"><Icon name="file" /></Mark></Attachment>
			<AttachmentAdd onFiles={onFiles} />
		</Strip>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Remove receipt.pdf' }))
		await expect(args.onRemove).toHaveBeenCalledOnce()
	}
}

// a drawn stand-in for a photo of a receipt, so the viewer has a picture without a file
const RECEIPT = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#f7f6f2"/><g fill="#c3c1b8"><rect x="60" y="80" width="300" height="28"/><rect x="60" y="160" width="480" height="14"/><rect x="60" y="200" width="420" height="14"/><rect x="60" y="240" width="460" height="14"/><rect x="340" y="760" width="200" height="28"/></g></svg>')

export const Viewing = {
	args: { at: 0, onMove: fn(), onClose: fn() },
	argTypes: { at: { control: 'inline-radio', options: [0, 1, null], description: 'The picture shown, or none' }, title: { control: false }, meta: { control: false }, icon: { control: false } },
	render: ({ onMove, onClose, ...args }) => {
		const [at, setAt] = useHeld(args, 'at')
		const items = [{ name: 'receipt.jpg', src: RECEIPT, download: RECEIPT, kind: 'Photo' }, { name: 'second-page.jpg', src: RECEIPT, download: RECEIPT, kind: 'Photo' }]
		return at === null
			? <Button variant="outline" onClick={() => setAt(0)}>Open the receipt</Button>
			: <Viewer items={items} at={at} onMove={next => { setAt(next); onMove(next) }} onClose={() => { setAt(null); onClose() }} />
	}
}
