import { ListItemHead, ListItem } from 'spendly-react';

export const OverRows = () => (
	<div className="sp-stack sp-gap-8" style={{ maxWidth: 420 }}>
		<ListItemHead label="Items · 3" amount="12.749,00 kr." />
		<ListItem>
			<span className="sp-data">Lounge chair, oak</span>
			<span className="sp-grow" />
			<span className="sp-amount">8.620,00</span>
		</ListItem>
		<ListItem>
			<span className="sp-data">Side table</span>
			<span className="sp-grow" />
			<span className="sp-amount">2.130,00</span>
		</ListItem>
		<ListItem>
			<span className="sp-data">Floor lamp, brass</span>
			<span className="sp-grow" />
			<span className="sp-amount">1.999,00</span>
		</ListItem>
	</div>
);

export const Alone = () => (
	<div style={{ maxWidth: 420 }}>
		<ListItemHead label="August" amount="61.480,00 kr." />
	</div>
);
