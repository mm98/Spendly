import { Calendar, Chip, Sheet } from 'spendly-react';

const noop = () => {};
// the dropdown panel shows only under an open parent, as DateField's wrapper is; it hangs below it
const opened = { position: 'relative', height: 0 } as const;

export const Dropdown = () => (
	<div style={{ minHeight: 140 }}>
		<div style={opened} data-open="true">
			<Calendar>
				<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
					<Chip onClick={noop}>Today</Chip>
					<Chip onClick={noop}>Yesterday</Chip>
				</div>
				<span className="sp-meta">Deliveries run Monday to Friday.</span>
			</Calendar>
		</div>
	</div>
);

export const InASheet = () => (
	<div style={{ maxWidth: 360 }}>
		<Sheet>
			<span className="sp-heading">Custom range</span>
			<Calendar sheet>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<Chip variant="pill" onClick={noop}>This week</Chip>
					<Chip variant="pill" onClick={noop}>This month</Chip>
					<Chip variant="pill" onClick={noop}>This year</Chip>
				</div>
			</Calendar>
		</Sheet>
	</div>
);
