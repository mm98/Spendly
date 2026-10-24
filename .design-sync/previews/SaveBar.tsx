import { Button, Card, SaveBar, TopBar, IconButton, Stacked } from 'spendly-react';

export const InAPhone = () => (
	<div className="sp-phone sp-touch">
		<TopBar touch>
			<IconButton icon="chevron-left" aria-label="Back to the orders" />
			<Stacked>
				<span className="sp-title">Indbo Møbler</span>
				<span className="sp-subtitle">SPENDLY-441</span>
			</Stacked>
		</TopBar>
		<Card>
			<span className="sp-section-label">Total</span>
			<span className="sp-stat__figure">3.980,00 kr.</span>
		</Card>
		<SaveBar>
			<span className="sp-subtitle sp-grow">Unsaved changes</span>
			<Button variant="outline">Discard</Button>
			<Button>Save</Button>
		</SaveBar>
	</div>
);

export const NothingToSave = () => (
	<div className="sp-touch" style={{ width: 390, border: '1px solid var(--line-3)', borderRadius: 'var(--r-card)', overflow: 'hidden', background: 'var(--bg)', paddingTop: 48 }}>
		<SaveBar>
			<span className="sp-subtitle sp-grow sp-ink-5">Saved</span>
			<Button variant="outline" disabled>Discard</Button>
			<Button disabled>Save</Button>
		</SaveBar>
	</div>
);
