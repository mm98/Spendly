import { FileDrop, Mark, Icon } from 'spendly-react';

const noop = () => {};

export const Default = () => (
	<div style={{ maxWidth: 420 }}>
		<FileDrop accept="application/pdf,image/jpeg,image/png,image/webp,image/gif" onFiles={noop} action="Select a receipt">
			<Mark size="large" aria-label="Receipt" aria-hidden="true"><Icon name="upload" size={24} /></Mark>
			<span className="sp-title">Drop receipt here</span>
			<span className="sp-meta">PDF, JPG, PNG, WebP or GIF · up to 25 MB per file</span>
		</FileDrop>
	</div>
);

export const WithIcon = () => (
	<div style={{ maxWidth: 420 }}>
		<FileDrop icon="upload" accept="image/*,application/pdf" multiple onFiles={noop}>
			<span>Drop a receipt here, or choose a file</span>
			<span className="sp-meta">Images and PDF</span>
		</FileDrop>
	</div>
);

export const Row = () => (
	<FileDrop row onFiles={noop}>
		<Mark size="medium" fill="solid" aria-hidden="true" aria-label="Receipt"><Icon name="camera" size={19} /></Mark>
		<span className="sp-title">Drop a receipt here</span>
		<span className="sp-subtitle">Image or PDF. The vendor, date and lines are read for you.</span>
	</FileDrop>
);

export const Disabled = () => (
	<div style={{ display: 'grid', gap: 12 }}>
		<FileDrop disabled row>
			<Mark size="medium" fill="solid" aria-hidden="true" aria-label="Receipt"><Icon name="camera" size={19} /></Mark>
			<span className="sp-title sp-ink-2">Capture a receipt</span>
			<span className="sp-meta">Available once your email is confirmed</span>
		</FileDrop>
		<FileDrop disabled icon="camera">
			<span className="sp-title sp-ink-2">Capture a receipt</span>
			<span className="sp-meta">Available once your email is confirmed</span>
		</FileDrop>
	</div>
);
