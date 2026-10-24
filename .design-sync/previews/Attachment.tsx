import { Attachment, Mark, MarkRemove, Icon, Spinner } from 'spendly-react';

const svg = (body: string) => 'data:image/svg+xml,' + encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' + body + '</svg>'
);
// a paper receipt, drawn inline so the card needs no network
const receipt = svg('<rect width="200" height="200" fill="#d9d4ca"/><rect x="50" y="20" width="100" height="160" fill="#fbfaf6"/>'
	+ '<rect x="62" y="38" width="60" height="8" fill="#555"/><rect x="62" y="60" width="76" height="5" fill="#aaa"/>'
	+ '<rect x="62" y="74" width="76" height="5" fill="#aaa"/><rect x="62" y="140" width="76" height="8" fill="#333"/>');
const noop = () => {};
const row = { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' } as const;

export const Default = () => (
	<div style={row}>
		<Attachment name="Receipt Bilka.jpg">
			<Mark size="xlarge" fill="photo" aria-label="Open Receipt Bilka.jpg" onClick={noop}><img src={receipt} alt="" /></Mark>
		</Attachment>
		<Attachment name="Invoice IKEA.pdf">
			<Mark size="xlarge" fill="photo" text="PDF" aria-label="Open Invoice IKEA.pdf" onClick={noop}><img src={receipt} alt="" /></Mark>
		</Attachment>
		<Attachment name="Order lines.xlsx">
			<Mark size="xlarge" fill="none" aria-label="Open Order lines.xlsx" onClick={noop}><span>XLSX</span></Mark>
		</Attachment>
	</div>
);

export const Removable = () => (
	<div style={row}>
		<Attachment name="Receipt Indbo Møbler.jpg">
			<Mark size="xlarge" fill="photo" aria-label="Open Receipt Indbo Møbler.jpg" onClick={noop}
				remove={<MarkRemove aria-label="Remove Receipt Indbo Møbler.jpg" onClick={noop}><Icon name="x" size={11} /></MarkRemove>}>
				<img src={receipt} alt="" />
			</Mark>
		</Attachment>
		<Attachment name="Receipt Bilka.jpg">
			<Mark size="xlarge" fill="photo" text="Added twice" aria-label="Open Receipt Bilka.jpg. This file is already on the order" onClick={noop}
				remove={<MarkRemove aria-label="Remove Receipt Bilka.jpg" onClick={noop}><Icon name="x" size={11} /></MarkRemove>}>
				<img src={receipt} alt="" />
			</Mark>
		</Attachment>
	</div>
);

export const Problems = () => (
	<div style={row}>
		<Attachment name="Scan 40 MB.png">
			<Mark size="xlarge" fill="photo" danger="Too large" aria-label="Scan 40 MB.png: too large"><img src={receipt} alt="" /></Mark>
		</Attachment>
		<Attachment name="Invoice.pdf">
			<Mark size="xlarge" fill="photo" danger="Retry" aria-label="Invoice.pdf was not sent. Send it again" onClick={noop}><img src={receipt} alt="" /></Mark>
		</Attachment>
		<Attachment name="64%">
			<Mark size="xlarge" fill="photo" aria-label="Receipt.jpg, 64% sent"><img src={receipt} alt="" /><Spinner /></Mark>
		</Attachment>
	</div>
);
