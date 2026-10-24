import { Strip, Attachment, AttachmentAdd, Mark } from 'spendly-react';

const svg = (body: string) => 'data:image/svg+xml,' + encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' + body + '</svg>'
);
// a paper receipt, and a sofa in a room, drawn inline so the card needs no network
const receipt = svg('<rect width="200" height="200" fill="#d9d4ca"/><rect x="50" y="20" width="100" height="160" fill="#fbfaf6"/>'
	+ '<rect x="62" y="38" width="60" height="8" fill="#555"/><rect x="62" y="60" width="76" height="5" fill="#aaa"/>'
	+ '<rect x="62" y="74" width="76" height="5" fill="#aaa"/><rect x="62" y="88" width="50" height="5" fill="#aaa"/>'
	+ '<rect x="62" y="140" width="76" height="8" fill="#333"/>');
const sofa = svg('<rect width="200" height="200" fill="#e6ddd0"/><rect y="140" width="200" height="60" fill="#c4ad8f"/>'
	+ '<rect x="30" y="80" width="140" height="50" rx="14" fill="#7d8f9e"/><rect x="22" y="110" width="156" height="34" rx="10" fill="#6c7f8f"/>');
const noop = () => {};

const tiles = [
	{ name: 'Receipt Indbo Møbler.jpg', src: receipt },
	{ name: 'Invoice SPENDLY-447.pdf', src: receipt, text: 'PDF' },
	{ name: 'Sofa in the living room.png', src: sofa },
	{ name: 'Delivery note.xlsx', label: 'XLSX' }
];

export const Default = () => (
	<div style={{ maxWidth: 560 }}>
		<Strip>
			{tiles.slice(1).map(t => (
				<Attachment key={t.name} name={t.name}>
					{t.src
						? <Mark size="xlarge" fill="photo" text={t.text} aria-label={`Open ${t.name}`} onClick={noop}><img src={t.src} alt="" /></Mark>
						: <Mark size="xlarge" fill="none" aria-label={`Open ${t.name}`} onClick={noop}><span>{t.label}</span></Mark>}
				</Attachment>
			))}
			<AttachmentAdd onFiles={noop} />
		</Strip>
	</div>
);

export const Overflowing = () => (
	<div style={{ maxWidth: 320 }}>
		<Strip>
			{[...tiles, ...tiles].map((t, i) => (
				<Attachment key={i} name={t.name}>
					{t.src
						? <Mark size="xlarge" fill="photo" text={t.text} aria-label={`Open ${t.name}`} onClick={noop}><img src={t.src} alt="" /></Mark>
						: <Mark size="xlarge" fill="none" aria-label={`Open ${t.name}`} onClick={noop}><span>{t.label}</span></Mark>}
				</Attachment>
			))}
		</Strip>
	</div>
);

export const OnlyAdd = () => (
	<Strip>
		<AttachmentAdd onFiles={noop} />
	</Strip>
);
