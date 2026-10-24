import { Palette, PaletteAll, PaletteGroup, PaletteRow, PaletteRule } from 'spendly-react';

const foot = ['↑↓ move', '↵ open', '⌘↵ new tab', 'esc close'];

export const Results = () => (
	<Palette value="bil" onChange={() => {}} count="5 results" label="Search or run a command" placeholder="Search orders, vendors, items - or type a command" foot={foot} aria-label="Search everything">
		<PaletteGroup>Vendors</PaletteGroup>
		<PaletteRow icon="building-store" match="bil" meta="14 orders" selected note="Open">Bilka</PaletteRow>
		<PaletteRow icon="building-store" match="bil" meta="2 orders">Bilka ToGo</PaletteRow>
		<PaletteRule />
		<PaletteGroup>Orders</PaletteGroup>
		<PaletteRow thumb match="bil" meta="19/08" value="3.980,00 kr.">Bilka · SPENDLY-441</PaletteRow>
		<PaletteRow thumb match="bil" meta="02/08" value="1.249,95 kr.">Bilka · SPENDLY-433</PaletteRow>
		<PaletteAll>All 9 orders from Bilka</PaletteAll>
	</Palette>
);

export const Commands = () => (
	<Palette value="" onChange={() => {}} label="Search or run a command" placeholder="Search orders, vendors, items - or type a command" foot={foot} aria-label="Search everything">
		<PaletteGroup>Actions</PaletteGroup>
		<PaletteRow icon="plus" action kbd="N" selected>New order</PaletteRow>
		<PaletteRow icon="camera" action kbd="S">Scan a receipt</PaletteRow>
		<PaletteRule />
		<PaletteGroup>Go to</PaletteGroup>
		<PaletteRow icon="receipt" plain kbd="G O">All orders</PaletteRow>
		<PaletteRow icon="building-store" plain kbd="G V">Vendors</PaletteRow>
		<PaletteRow icon="settings" plain>Settings</PaletteRow>
	</Palette>
);

export const PhoneScreen = () => (
	<div style={{ width: 390, border: '1px solid var(--line-3)', borderRadius: 'var(--r-card)', overflow: 'hidden', background: 'var(--bg)' }}>
		<Palette screen value="ikea" onChange={() => {}} onCancel={() => {}} label="Search or run a command" placeholder="Search" aria-label="Search everything">
			<PaletteGroup>Vendors</PaletteGroup>
			<PaletteRow icon="building-store" match="ikea" meta="8 orders" selected>IKEA</PaletteRow>
			<PaletteRule />
			<PaletteGroup>Orders</PaletteGroup>
			<PaletteRow thumb match="ikea" meta="12/08" value="24.310,00 kr.">IKEA · SPENDLY-447</PaletteRow>
			<PaletteRow thumb match="ikea" meta="28/07" value="899,00 kr.">IKEA · SPENDLY-420</PaletteRow>
		</Palette>
	</div>
);
