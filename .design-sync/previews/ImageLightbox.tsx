import { ImageLightbox } from 'spendly-react'

// Opened with showModal(), so it paints in the top layer over the whole viewport: each cell
// is the lightbox itself, its backdrop and its close button. Order details opens it from an
// item's photo thumbnail. Both pictures are drawn inline (data URIs) so the cell renders
// with no network.

const receipt = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="520" viewBox="0 0 380 520">
<rect width="380" height="520" fill="#3f4b43"/>
<g transform="rotate(-1.4 190 260)">
<rect x="56" y="16" width="268" height="488" rx="3" fill="#f8f5ee"/>
<g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" fill="#2f3630">
<text x="190" y="58" text-anchor="middle" font-size="18" font-weight="700">NETTO</text>
<text x="190" y="78" text-anchor="middle" font-size="11" fill="#6c7570">Frederiksborgvej 4, Roskilde</text>
<text x="190" y="96" text-anchor="middle" font-size="11" fill="#6c7570">02-05-2024   17:08</text>
<text x="80" y="126" fill="#9aa39d">- - - - - - - - - - - - - -</text>
<text x="80" y="158">SKUMMETMÆLK 2x</text><text x="300" y="158" text-anchor="end">19,90</text>
<text x="80" y="186">RUGBRØD</text><text x="300" y="186" text-anchor="end">24,95</text>
<text x="80" y="214">KAFFE 400G</text><text x="300" y="214" text-anchor="end">49,95</text>
<text x="80" y="242">ÆG 10 STK</text><text x="300" y="242" text-anchor="end">32,00</text>
<text x="80" y="270">SMØR 200G</text><text x="300" y="270" text-anchor="end">27,50</text>
<text x="80" y="298">TOMATER 500G</text><text x="300" y="298" text-anchor="end">18,75</text>
<text x="80" y="326">HAVREGRYN 1KG</text><text x="300" y="326" text-anchor="end">18,50</text>
<text x="80" y="354" fill="#9aa39d">- - - - - - - - - - - - - -</text>
<text x="80" y="386" font-weight="700">I ALT</text><text x="300" y="386" text-anchor="end" font-weight="700">268,45</text>
<text x="80" y="410" font-size="11" fill="#6c7570">HERAF MOMS</text><text x="300" y="410" text-anchor="end" font-size="11" fill="#6c7570">53,69</text>
<text x="190" y="452" text-anchor="middle" font-size="11" fill="#6c7570">TAK FOR BESØGET</text>
<rect x="106" y="466" width="168" height="20" fill="#2f3630"/>
</g></g></svg>`

const email = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="430" viewBox="0 0 680 430">
<rect width="680" height="430" fill="#e7e4dc"/>
<rect x="24" y="20" width="632" height="390" rx="6" fill="#ffffff"/>
<rect x="24" y="20" width="632" height="58" rx="6" fill="#1f4d3a"/>
<rect x="24" y="62" width="632" height="16" fill="#1f4d3a"/>
<g font-family="Poppins, system-ui, sans-serif" fill="#ffffff">
<text x="48" y="56" font-size="20" font-weight="600">Elgiganten</text>
<text x="632" y="56" text-anchor="end" font-size="13">Ordrebekræftelse</text>
</g>
<g font-family="Poppins, system-ui, sans-serif" fill="#2f3630">
<text x="48" y="118" font-size="16" font-weight="600">Tak for din ordre, Camilla</text>
<text x="48" y="144" font-size="12.5" fill="#6c7570">Ordrenummer 9241-70318 • 6. maj 2024</text>
<rect x="48" y="164" width="584" height="1" fill="#e2e0d9"/>
<text x="48" y="196" font-size="13">Sonos Era 100 højttaler</text>
<text x="632" y="196" text-anchor="end" font-size="13">1.799,00 kr.</text>
<text x="48" y="226" font-size="13">Anker USB-C kabel 2 m</text>
<text x="632" y="226" text-anchor="end" font-size="13">149,00 kr.</text>
<text x="48" y="256" font-size="13">Fragt</text>
<text x="632" y="256" text-anchor="end" font-size="13">0,00 kr.</text>
<rect x="48" y="276" width="584" height="1" fill="#e2e0d9"/>
<text x="48" y="306" font-size="14" font-weight="600">I alt</text>
<text x="632" y="306" text-anchor="end" font-size="14" font-weight="600">1.948,00 kr.</text>
<text x="48" y="344" font-size="12.5" fill="#6c7570">Leveres til Nørrebrogade 42, 2200 København N</text>
<rect x="48" y="362" width="176" height="34" rx="17" fill="#1f4d3a"/>
<text x="136" y="384" text-anchor="middle" font-size="12.5" font-weight="600" fill="#ffffff">FØLG DIN PAKKE</text>
</g></svg>`

const src = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

export const ReceiptPhoto = () => (
	<ImageLightbox src={src(receipt)} alt="Netto receipt photo" onClose={() => {}} />
)

export const OrderEmailScreenshot = () => (
	<ImageLightbox src={src(email)} alt="Elgiganten order email screenshot" onClose={() => {}} />
)
