import { Icon, Mark, MarkRemove, Spinner } from 'spendly-react';

const row = { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' } as const;
const cell = { display: 'grid', justifyItems: 'center', gap: 6 } as const;

export const Sizes = () => (
	<div style={row}>
		<Mark size="small" fill="solid">Indbo Møbler</Mark>
		<Mark size="medium" fill="solid">Indbo Møbler</Mark>
		<Mark size="large" fill="solid">Indbo Møbler</Mark>
		<Mark size="xlarge" fill="solid">Indbo Møbler</Mark>
	</div>
);

export const Fills = () => (
	<div style={row}>
		<div style={cell}><Mark size="medium">Bilka</Mark><span className="sp-meta">default</span></div>
		<div style={cell}><Mark size="medium" fill="solid">Bilka</Mark><span className="sp-meta">solid</span></div>
		<div style={cell}><Mark size="medium" fill="plain">Bilka</Mark><span className="sp-meta">plain</span></div>
		<div style={cell}><Mark size="medium" fill="photo" aria-label="A photo of the item" /><span className="sp-meta">photo</span></div>
		<div style={cell}><Mark size="medium" fill="empty" aria-label="No photo yet" /><span className="sp-meta">empty</span></div>
		<div style={cell}><Mark size="medium" fill="none" aria-label="No vendor yet">?</Mark><span className="sp-meta">none</span></div>
		<div style={cell}><Mark size="medium" fill="add" aria-label="Add a vendor">+</Mark><span className="sp-meta">add</span></div>
	</div>
);

export const Kinds = () => (
	<div style={row}>
		<Mark size="medium" fill="solid" round>Mikkel Munk</Mark>
		<Mark size="medium" fill="solid">IKEA</Mark>
		<Mark size="medium" fill="solid">Ferm Living</Mark>
		<Mark size="medium" fill="solid" swatch="amber-ink" aria-label="Lighting"><Icon name="lamp" /></Mark>
		<Mark size="medium" fill="solid" swatch="green-3" aria-label="Kitchen"><Icon name="shopping-bag" /></Mark>
		<Mark size="medium" fill="none" aria-label="Receipt from Bilka"><Icon name="file-text" /></Mark>
	</div>
);

export const Swatches = () => (
	<div style={{ ...row, gap: 8 }}>
		{(['green', 'green-2', 'green-3', 'green-4', 'green-5', 'amber-ink', 'amber-2', 'red-ink', 'ink-6'] as const).map(swatch => (
			<Mark key={swatch} size="small" fill="solid" swatch={swatch} aria-label={swatch}><Icon name="tag" /></Mark>
		))}
	</div>
);

export const Slots = () => (
	<div style={row}>
		<Mark size="large" fill="photo" count={3} aria-label="Open the photos of SPENDLY-447" onClick={() => {}} />
		<Mark size="large" fill="photo" text="Receipt" aria-label="The receipt from Indbo Møbler" />
		<Mark size="large" fill="photo" danger="Too large" aria-label="An upload that was too large" />
	</div>
);

export const Attachments = () => (
	<div style={row}>
		<Mark size="xlarge" fill="photo" aria-label="Open the receipt" onClick={() => {}} remove={<MarkRemove aria-label="Remove the receipt" onClick={() => {}}><Icon name="x" /></MarkRemove>} />
		<Mark size="xlarge" fill="none" text="PDF" aria-label="Open the invoice" onClick={() => {}} remove={<MarkRemove aria-label="Remove the invoice" onClick={() => {}}><Icon name="x" /></MarkRemove>}><Icon name="file" /></Mark>
		<Mark size="xlarge" fill="photo" aria-label="Uploading a photo" remove={<MarkRemove aria-label="Stop the upload" onClick={() => {}}><Icon name="x" /></MarkRemove>}><Spinner /></Mark>
		<Mark size="xlarge" fill="add" aria-label="Add a file" onClick={() => {}}><Icon name="plus" /></Mark>
	</div>
);
