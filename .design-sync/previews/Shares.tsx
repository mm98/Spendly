import { Shares, ShareRow } from 'spendly-react';

const box = { maxWidth: 360 } as const;

export const WithAmounts = () => (
	<div style={box}>
		<Shares>
			<ShareRow series={1} amount="24.310 kr." value="46%">Indbo Møbler</ShareRow>
			<ShareRow series={2} amount="14.120 kr." value="27%">IKEA</ShareRow>
			<ShareRow series={3} amount="8.900 kr." value="17%">Bilka</ShareRow>
			<ShareRow series={4} amount="5.230 kr." value="10%">Other</ShareRow>
		</Shares>
	</div>
);

export const AsFilters = () => (
	<div style={box}>
		<Shares>
			<ShareRow series={1} value="52%" onClick={() => {}}>Havemøbler</ShareRow>
			<ShareRow series={2} value="31%" onClick={() => {}}>Boligtilbehør</ShareRow>
			<ShareRow series={3} value="17%" onClick={() => {}}>Belysning and lamps for the garden terrace</ShareRow>
		</Shares>
	</div>
);

export const AsLinks = () => (
	<div style={box}>
		<Shares>
			<ShareRow series={1} amount="9.840 kr." value="61%" href="#/orders?vendor=1">Bilka</ShareRow>
			<ShareRow series={2} amount="6.240 kr." value="39%" href="#/orders?vendor=2">IKEA</ShareRow>
		</Shares>
	</div>
);
