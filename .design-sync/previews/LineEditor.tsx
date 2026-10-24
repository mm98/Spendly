import { Card, CardHeader, Field, LineEditor, NumberField, TextField, Totals } from 'spendly-react';

const noop = () => {};

export const EditRow = () => (
	<div style={{ maxWidth: 640 }}>
		<LineEditor title="Row 2 of 4 in Housing" what="row" commit="Save row"
			onMoveUp={noop} onMoveDown={noop} onDelete={noop} onCommit={noop} onCancel={noop}>
			<Field label="Name"><TextField value="Electricity" onChange={noop} /></Field>
			<Field label="Expected each month" unit="kr."><NumberField value={400} onChange={noop} locale="da-DK" /></Field>
			<Field label="Account"><TextField value="Budget" onChange={noop} /></Field>
			<Field label="Group"><TextField value="Housing" onChange={noop} /></Field>
		</LineEditor>
	</div>
);

export const NewOne = () => (
	<div style={{ maxWidth: 640 }}>
		<LineEditor title="New group in costs" commit="Add group" onCommit={noop} onCancel={noop}>
			<Field label="Name"><TextField value="" onChange={noop} placeholder="Insurance" /></Field>
		</LineEditor>
	</div>
);

export const Saving = () => (
	<div style={{ maxWidth: 640 }}>
		<LineEditor title="Row 1 of 3 in Living room" what="row" commit="Save row" saving first
			onMoveUp={noop} onMoveDown={noop} onDelete={noop} onCommit={noop} onCancel={noop}>
			<Field label="Name"><TextField value="Lounge chair" onChange={noop} /></Field>
			<Field label="Expected each month" unit="kr."><NumberField value={4129} onChange={noop} locale="da-DK" /></Field>
		</LineEditor>
	</div>
);

export const InSheet = () => (
	<div style={{ maxWidth: 390 }}>
		<LineEditor sheet title="Row 3 of 4 in Housing" what="row" commit="Save row" onDelete={noop} onCommit={noop} onCancel={noop}>
			<Field label="Name"><TextField value="Internet" onChange={noop} /></Field>
			<Field label="Expected each month" unit="kr."><NumberField value={299} onChange={noop} locale="da-DK" /></Field>
		</LineEditor>
	</div>
);

export const WithTotals = () => (
	<div style={{ maxWidth: 640 }}>
		<Card>
			<CardHeader name="Items · 3" />
			<span className="sp-data">Lounge chair · 2 × 4.129,00</span>
			<span className="sp-data">Floor lamp · 1 × 16.052,00</span>
			<Totals>
				<span className="sp-strong">3 items · 24.310,00 kr. paid</span>
				<span className="sp-grow" />
				<span className="sp-meta">Saved 1.450,00 kr.</span>
			</Totals>
		</Card>
	</div>
);
