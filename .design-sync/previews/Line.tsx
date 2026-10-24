import { Line, ListItem, Mark, Pill, Stacked } from 'spendly-react';

export const TwoLines = () => (
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

export const LongTitle = () => (
	<div style={{ width: 320 }}>
		<ListItem variant="card" mark={<Mark size="medium" fill="solid">Ferm Living</Mark>} onClick={() => {}}>
			<Stacked>
				<Line>
					<span className="sp-title sp-truncate">Ferm Living, the summer order for the terrace</span>
					<span className="sp-grow" />
					<span className="sp-amount">24.310,00</span>
				</Line>
				<Line>
					<span className="sp-meta">SPENDLY-460</span>
					<span className="sp-grow" />
					<Pill state="progress">Scanning</Pill>
				</Line>
			</Stacked>
		</ListItem>
	</div>
);
