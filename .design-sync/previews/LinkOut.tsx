import { LinkOut, ListItem, Mark } from 'spendly-react';

export const AsATitle = () => (
	<div style={{ display: 'grid', gap: 12 }}>
		<LinkOut href="https://netto.dk/tilbudsavis" label="Netto's offer paper" nameClass="sp-title">Arla skyr, 1 kg</LinkOut>
		<LinkOut href="https://tilbudsugen.dk/search?q=kaffe" label="Search on Tilbudsugen" nameClass="sp-data">Merrild Classic kaffe, 500 g</LinkOut>
	</div>
);

export const InAnOfferRow = () => (
	<div style={{ width: 360 }}>
		<ListItem mark={<Mark size="medium" logo fill="none">Bilka</Mark>}>
			<div className="sp-stack">
				<LinkOut href="https://bilka.dk/tilbudsavis" label="Bilka's offer paper" nameClass="sp-title">Kelsen butter cookies, 908 g</LinkOut>
				<span className="sp-meta">Until 2 November · 59 kr.</span>
			</div>
		</ListItem>
	</div>
);
