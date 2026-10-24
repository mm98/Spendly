import { Line, ListItem, Mark, Pill, Stacked } from 'spendly-react';

export const InARow = () => (
	<div style={{ width: 420 }}>
		<ListItem variant="card" mark={<Mark size="medium" fill="solid">Indbo Møbler</Mark>} onClick={() => {}}>
			<Stacked>
				<span className="sp-title sp-truncate">Indbo Møbler</span>
				<span className="sp-subtitle">SPENDLY-447 · 08/08/2026</span>
			</Stacked>
		</ListItem>
	</div>
);

export const WithLines = () => (
	<div style={{ width: 420 }}>
		<ListItem variant="card" mark={<Mark size="medium" fill="solid">Bilka</Mark>} onClick={() => {}}>
			<Stacked>
				<Line>
					<span className="sp-title sp-truncate">Bilka</span>
					<span className="sp-grow" />
					<span className="sp-amount">4.310,00</span>
				</Line>
				<Line>
					<span className="sp-meta">SPENDLY-452 · 19/08/2026</span>
					<span className="sp-grow" />
					<Pill color="success">Approved</Pill>
				</Line>
			</Stacked>
		</ListItem>
	</div>
);
