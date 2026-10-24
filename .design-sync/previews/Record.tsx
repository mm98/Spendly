import { Record, Pill, Chip, Check } from 'spendly-react';

const photo = (ground: string, shape: string) =>
	`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="${ground}"/>${shape}</svg>`)}`;
const SOFA = photo('#e7ece4', '<rect x="30" y="52" width="100" height="34" rx="8" fill="#5f7d5a"/><rect x="38" y="38" width="84" height="22" rx="6" fill="#7b9a74"/><rect x="40" y="86" width="6" height="12" fill="#3e4a3a"/><rect x="114" y="86" width="6" height="12" fill="#3e4a3a"/>');
const LAMP = photo('#f1ebe0', '<path d="M62 30h36l12 34H50z" fill="#c9a46a"/><rect x="78" y="64" width="4" height="34" fill="#4a4237"/><rect x="62" y="96" width="36" height="6" rx="3" fill="#4a4237"/>');
const TABLE = photo('#e9e6ef', '<rect x="28" y="48" width="104" height="10" rx="3" fill="#8a6e52"/><rect x="40" y="58" width="6" height="40" fill="#6b5440"/><rect x="114" y="58" width="6" height="40" fill="#6b5440"/>');
const img = (src: string) => <img src={src} alt="" />;

const cell = { maxWidth: 360 } as const;

export const Order = () => (
	<div style={cell}>
		<Record
			photos={[img(SOFA), img(LAMP)]}
			more="+2"
			pick={<Check checked={false} onChange={() => {}} aria-label="Select SPENDLY-447" />}
			menu={{ open: false, label: 'Order menu, SPENDLY-447', onToggle: () => {} }}
			title="Indbo Møbler"
			subtitle="SPENDLY-447"
			status={<Pill color="success">Approved</Pill>}
			meta={[<span key="d" className="sp-subtitle">08/08/2026 · 4 items</span>, <span key="s" className="sp-amount-secondary" data-color="success">Saved 1.240,00</span>]}
			amount="24.310,00"
			onClick={() => {}}
		/>
	</div>
);

export const BookmarkWithChips = () => (
	<div style={cell}>
		<Record
			photos={[img(LAMP)]}
			href="https://example.com/lamp"
			hrefLabel="Open Floor lamp, brass at example.com"
			title="Floor lamp, brass"
			subtitle="illumsbolighus.dk"
			headChips
			chips={[<Chip key="c" onClick={() => {}}>Lamps</Chip>, <Chip key="m" aria-label="Also Living room">+1</Chip>]}
			meta={<span className="sp-subtitle">Added 19/08</span>}
			amount="2.499 kr."
			onClick={() => {}}
		/>
	</div>
);

export const NoPicture = () => (
	<div style={cell}>
		<Record
			empty="No picture"
			title="Garden bench, teak"
			subtitle="bilka.dk"
			chips={[<Chip key="c">Garden</Chip>]}
			meta={<span className="sp-subtitle">Added 02/08</span>}
		/>
	</div>
);

export const FadedAndVoid = () => (
	<div style={cell}>
		<Record
			photos={[img(TABLE)]}
			faded
			void
			title="IKEA"
			subtitle="SPENDLY-449"
			status={<Pill>Cancelled</Pill>}
			meta={<span className="sp-amount-secondary">not counted</span>}
			amount="4.129,00"
		/>
	</div>
);
