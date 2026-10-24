import { Viewer } from 'spendly-react';

const svg = (w: number, h: number, body: string) => 'data:image/svg+xml,' + encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` + body + '</svg>'
);
// a paper receipt and a sofa photo, drawn inline so the card needs no network
const receipt = svg(240, 360, '<rect width="240" height="360" fill="#fbfaf6"/><rect x="24" y="28" width="120" height="14" fill="#333"/>'
	+ '<rect x="24" y="70" width="190" height="8" fill="#999"/><rect x="24" y="92" width="170" height="8" fill="#999"/>'
	+ '<rect x="24" y="114" width="180" height="8" fill="#999"/><rect x="24" y="136" width="120" height="8" fill="#999"/>'
	+ '<rect x="24" y="300" width="190" height="14" fill="#222"/>');
const sofa = svg(360, 240, '<rect width="360" height="240" fill="#e6ddd0"/><rect y="170" width="360" height="70" fill="#c4ad8f"/>'
	+ '<rect x="70" y="90" width="220" height="70" rx="20" fill="#7d8f9e"/><rect x="58" y="130" width="244" height="44" rx="14" fill="#6c7f8f"/>');
const noop = () => {};

const files = [
	{ name: 'Receipt Indbo Møbler.jpg', src: receipt, download: receipt, kind: 'image' },
	{ name: 'Sofa in the living room.png', src: sofa, download: sofa, kind: 'image' },
	{ name: 'Invoice SPENDLY-447.pdf', kind: 'pdf' }
];

export const Photo = () => <Viewer items={files} at={0} onMove={noop} onClose={noop} />;

export const NoPicture = () => <Viewer items={files} at={2} onMove={noop} onClose={noop} />;

export const Compare = () => <Viewer items={[files[0]]} at={0} beside={files[1]} onMove={noop} onClose={noop} />;
