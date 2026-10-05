-- The product links of an earlier export, put on lines that already exist. A line is found by its
-- order's reference, date and vendor, then by its name (the nth of that name). A line that already
-- has a link, or that is not found, is left as it is.

UPDATE order_items SET url = 'https://www.weber.com/DK/da/grill/gasgrill/q-serien/57012369.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-5' AND date(o.date, 'unixepoch') = '2014-07-22' AND v.name = 'XL-Byg' AND oi.title = 'Weber Q3200, Gasgrill'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.qnap.com/en/product/ts-453%20pro' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-6' AND date(o.date, 'unixepoch') = '2014-11-19' AND v.name = 'Dustin' AND oi.title = 'QNAP TS-453 Pro'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.dustinhome.dk/product/5011119848/red-soho-nas' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-7' AND date(o.date, 'unixepoch') = '2014-11-19' AND v.name = 'Dustin' AND oi.title = 'WD Red 6TB SOHO NAS'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://andersen-furniture.com/da/product/t1-bord/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-310' AND date(o.date, 'unixepoch') = '2015-09-30' AND v.name = 'Ingvard Christensen' AND oi.title = 'Andersen Furniture, ByKato T1 spisebord'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.vitra.com/en-dk/product/details/eames-fiberglass-armchair-dar' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-311' AND date(o.date, 'unixepoch') = '2015-09-30' AND v.name = 'Ingvard Christensen' AND oi.title = 'Eames DAR'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.vitra.com/en-dk/product/details/eames-plastic-side-chair-re-dsr' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-311' AND date(o.date, 'unixepoch') = '2015-09-30' AND v.name = 'Ingvard Christensen' AND oi.title = 'VITRA Eames DSR'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.apple.com/newsroom/2016/03/21Apple-Introduces-9-7-inch-iPad-Pro/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-15' AND date(o.date, 'unixepoch') = '2016-04-29' AND v.name = 'Wupti' AND oi.title = 'Apple iPad Pro 9,7" Wi-Fi 32GB Space Grey'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://shopping.coop.dk/vare/sofia-xl-plus-havemoebelsaet-inkl-hynder-sort-udtraeksbord-i-nonwood-og-6-stabelbare-stole-i-polyrattan/5700381208440' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-17' AND date(o.date, 'unixepoch') = '2016-05-11' AND v.name = 'Coop' AND oi.title = 'Havemøbelsæt med 6 stole og udtræksbord - Sofia XL'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://shopping.coop.dk/vare/solseng-inkl-hynde-william-sort-polyrattan/5701390414105' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-19' AND date(o.date, 'unixepoch') = '2016-05-11' AND v.name = 'Coop' AND oi.title = 'Solseng inkl. hynde - William'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/dk/tv/lg-55UH750V' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-20' AND date(o.date, 'unixepoch') = '2016-06-10' AND v.name = 'Elgiganten' AND oi.title = 'LG TV 55UH750V, 55" 4K UHD'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.sonos.com/en/shop/playbar.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-21' AND date(o.date, 'unixepoch') = '2016-06-10' AND v.name = 'Elgiganten' AND oi.title = 'Sonos PLAYBAR'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.sonos.com/en-nz/shop/play1.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-23' AND date(o.date, 'unixepoch') = '2016-07-03' AND v.name = 'Proshop' AND oi.title = 'Sonos PLAY:1'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.sonos.com/en-nz/shop/sub.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-24' AND date(o.date, 'unixepoch') = '2016-07-29' AND v.name = 'Elgiganten' AND oi.title = 'Sonos SUB'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://vipp.com/da/products/d%C3%A6kkeserviet' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-25' AND date(o.date, 'unixepoch') = '2016-11-25' AND v.name = 'Completliving' AND oi.title = 'VIPP dækkeservietter, 4 Stk.'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.coolshop.dk/produkt/kaehler-hammershoei-bestik-saet-16-dele/AF68Q3/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-31' AND date(o.date, 'unixepoch') = '2016-11-25' AND v.name = 'Salling' AND oi.title = 'Kähler - Hammershøi Bestiksæt - 16 dele'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://amplifi.com/amplifi-hd' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-32' AND date(o.date, 'unixepoch') = '2017-07-15' AND v.name = 'CS Megastore' AND oi.title = 'Ubiquiti AmpliFi Home Wi-Fi System AFi-HD'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.seagate.com/gb/en/internal-hard-drives/hdd/ironwolf/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-34' AND date(o.date, 'unixepoch') = '2018-02-26' AND v.name = 'Komplett' AND oi.title = 'Seagate IronWolf 12TB 3.5" NAS HDD'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.dell.com/en-us/shop/cty/pdp/spd/xps-8930-desktop' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-35' AND date(o.date, 'unixepoch') = '2019-01-16' AND v.name = 'CS Megastore' AND oi.title = 'Dell XPS DT VMAX CFL 8930'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.rigtigkaffe.dk/fuldautomatiske-espressomaskiner/12927-jura-e80-gen2-piano-black.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-36' AND date(o.date, 'unixepoch') = '2019-10-08' AND v.name = 'Rigtigkaffe' AND oi.title = 'Jura E80 Gen.2 Piano Black'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.qnap.com/en/product/ts-453be' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-37' AND date(o.date, 'unixepoch') = '2019-10-30' AND v.name = 'Proshop' AND oi.title = 'QNAP TS-453Be-2G'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.apple.com/dk/shop/product/MR2A2ZM/A/usb-c-str%C3%B8mforsyning-30-w' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-38' AND date(o.date, 'unixepoch') = '2020-07-06' AND v.name = 'Apple' AND oi.title = 'USB-C-strømforsyning (30 W) og Lightning-kabel'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.computersalg.dk/i/4132676/brother-hl-l2350dw-printer-monokrom' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-39' AND date(o.date, 'unixepoch') = '2020-07-12' AND v.name = 'CS Megastore' AND oi.title = 'Brother HL-L2350DW, 2 x Toner og 2 x Papir'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Eltandboerste/Oral-B-Eltandboerste-Pro-2-2900-Duo-CrossAction/2641328' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-40' AND date(o.date, 'unixepoch') = '2020-07-22' AND v.name = 'Proshop' AND oi.title = 'Oral-B Eltandbørste Pro 2 2900 Duo CrossAction'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://shopping.coop.dk/vare/obh-nordica-foodprocessor-double-force-kompakt-og-kraftig-koekkenmaskine-med-mange-tilbehoersdele/3016661150395' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-41' AND date(o.date, 'unixepoch') = '2020-07-22' AND v.name = 'Coop' AND oi.title = 'OBH Nordica foodprocessor - Double Force'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gastrotools.dk/collections/knivsaet/products/the-ultimate-collection' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-44' AND date(o.date, 'unixepoch') = '2020-09-19' AND v.name = 'Gastrotools' AND oi.title = 'The Ultimate Collection + Stegegaffel'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.multikoeb.dk/diverse-koekken-artikler-4897/leifheit-vinduesvasker-m-4-dele-dry-clean-p340942' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-47' AND date(o.date, 'unixepoch') = '2020-11-01' AND v.name = 'Multikøb.dk' AND oi.title = 'Leifheit Vinduesvasker m/4 dele Dry & Clean'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lomax.dk/elektronik/telefoner-og-gps/mobiltelefoner/apple-iphones/apple-iphone-12-pro-128gb-stillehavsblaa-70098030/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-48' AND date(o.date, 'unixepoch') = '2020-11-19' AND v.name = 'Lomax' AND oi.title = 'Apple iPhone 12 Pro 128GB Pacific Blue'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gastrotools.dk/collections/kokkenknive/products/udbenerkniv' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-49' AND date(o.date, 'unixepoch') = '2020-11-26' AND v.name = 'Gastrotools' AND oi.title = 'Udbenerkniv'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.kitchenone.dk/produkt/kaehler-hammershoei-bestik-16-dele/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-50' AND date(o.date, 'unixepoch') = '2020-11-26' AND v.name = 'KitchenOne' AND oi.title = 'Hammershøi bestik 16 dele + Stål dejskraber'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://sengetid.dk/products/norland-eksklusiv-el-180x200-cm' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-52' AND date(o.date, 'unixepoch') = '2020-11-27' AND v.name = 'Sengetid' AND oi.title = 'Norland Eksklusiv Elevationssenge 180x200 (Mørkgrå)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.coolshop.dk/produkt/sackit-wakeit-s-clock-radio-black/2367VK/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-53' AND date(o.date, 'unixepoch') = '2020-11-27' AND v.name = 'Coolshop' AND oi.title = 'SACKit - WAKEit S - Clock Radio - Black'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://kreafunk.com/da/products/accessories/witable/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-54' AND date(o.date, 'unixepoch') = '2020-11-29' AND v.name = 'Kreafunk' AND oi.title = 'KREAFUNK - wiTABLE'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.apple.com/airpods-pro/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-56' AND date(o.date, 'unixepoch') = '2020-12-28' AND v.name = 'Lomax' AND oi.title = 'Apple AirPods Pro'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.wilfa.dk/product/koekken/isterningmaskine/frostbitt-2/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-57' AND date(o.date, 'unixepoch') = '2020-12-31' AND v.name = 'EL-salg' AND oi.title = 'Wilfa ICE-12S (isterning-maskine)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando.dk/pier-one-7-pack-boksershorts-pi982o054-q11.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-59' AND date(o.date, 'unixepoch') = '2021-01-17' AND v.name = 'Zalando' AND oi.title = 'Tøj (K og underbukser)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://sportmaster.dk/peak-performance-pyon-liner-jakker-black-2188882' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-60' AND date(o.date, 'unixepoch') = '2021-01-30' AND v.name = 'Sportmaster' AND oi.title = 'Peak Performance (vinterjakke og hue)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://sportmaster.dk/helly-hansen-the-forester-black-1328599' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-61' AND date(o.date, 'unixepoch') = '2021-02-08' AND v.name = 'Sportmaster' AND oi.title = 'Helly Hansen, The Forester (vinterstøvler)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.punkt1.dk/skoenhed-og-velvaere/haarfjerning-og-trimning-til-maend/haartrimmere/philips-hc945015-haarklipper/p-246536/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-62' AND date(o.date, 'unixepoch') = '2021-02-13' AND v.name = 'Punkt1' AND oi.title = 'PHILIPS HC9450/15 Hårklipper'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Smartwatch-Sportsur-Aktivitetstracker/Apple-Watch-Series-6-GPS-44mm-Space-Gray-Aluminium-Case-with-Black-Sport-Band/2879614' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-65' AND date(o.date, 'unixepoch') = '2021-03-19' AND v.name = 'Proshop' AND oi.title = 'Watch Series 6 Aluminium GPS, 44 mm, Space Gray, MagSafe charger'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.eventyrsport.dk/catalog/product/view/id/279648/s/helium-hybrid-jacket-men-1902101016/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-68' AND date(o.date, 'unixepoch') = '2021-05-03' AND v.name = 'EventyrSport' AND oi.title = 'Peak Performance Helium Hybrid Jacket'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://dealicious.dk/barbermaskiner/1686-philips-oneblade-qp2630-ansigt-og-krop-8710103832690.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-69' AND date(o.date, 'unixepoch') = '2021-05-06' AND v.name = 'Dealicious' AND oi.title = 'Philips OneBlade QP2630'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.dampsvamp.dk/produkt/2200mah-unimax-22-starter-kit/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-70' AND date(o.date, 'unixepoch') = '2021-05-17' AND v.name = 'Dampsvamp' AND oi.title = 'Joyetech UNIMAX 22 Starter Kit (2200mAh)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.dpj-workspace.com/dk/ergonomisk-kontorstol/4684-herman-miller-mirra-2-sort-kontorstol.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-71' AND date(o.date, 'unixepoch') = '2021-06-03' AND v.name = 'DPJ Workspace' AND oi.title = 'Herman Miller Mirra 2, TriFlex (Graphite)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.logitech.com/en-us/mx/master-series.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-72' AND date(o.date, 'unixepoch') = '2021-06-07' AND v.name = 'WebFinance' AND oi.title = 'The Master Series by Logitech (Graphite)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.frishop.dk/pi/Jumbo-hobby-stillads-pakke-1-Grundmodul-GUL-PAKKE_426905_22036.aspx' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-73' AND date(o.date, 'unixepoch') = '2021-06-10' AND v.name = 'Frishop' AND oi.title = 'Jumbo hobby stillads (2m)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Robotstoevsuger/Roborock-Robotstoevsuger-S7-White/2958888' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-75' AND date(o.date, 'unixepoch') = '2021-07-01' AND v.name = 'Proshop' AND oi.title = 'Xiaomi Roborock S7, Hvid'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.xn--vigrrent-74a.dk/fliserens' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-76' AND date(o.date, 'unixepoch') = '2021-07-13' AND v.name = 'Vi gør rent' AND oi.title = 'Flise rensning'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.ribecykellager.dk/herrecykler/mountainbike/2021-centurion-crazy-point-7-gear/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-77' AND date(o.date, 'unixepoch') = '2021-07-26' AND v.name = 'Ribe Cykellager' AND oi.title = '2021 Centurion Crazy Point 7 gear'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gastrotools.dk/products/kokkekniv-15-cm' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-78' AND date(o.date, 'unixepoch') = '2021-08-20' AND v.name = 'Gastrotools' AND oi.title = 'Kokkekniv (15cm)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.humac.dk/produkter/accessories/apple-tv-4k-32gb' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-79' AND date(o.date, 'unixepoch') = '2021-11-03' AND v.name = 'Humac' AND oi.title = 'Apple TV 4K 32GB (2. gen, 2021)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.elgiganten.dk/product/tv-lyd-smart-home/tv-tilbehor/tv/lg-65-c1-4k-oled-tv-2021/300098' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-396' AND date(o.date, 'unixepoch') = '2021-12-03' AND v.name = 'Elgiganten' AND oi.title = 'LG 65" C1 4K OLED TV (2021)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.sonos.com/da-dk/shop/2-room-music-system-one.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-82' AND date(o.date, 'unixepoch') = '2021-12-08' AND v.name = 'Sonos' AND oi.title = '2 x Sonon One (Sæt til to rum)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.audi.dk/dk/web/da/modeller/a5/a5-sportback.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-83' AND date(o.date, 'unixepoch') = '2022-01-17' AND v.name = 'Audi' AND oi.title = 'Audi A5 Sportback Prestige Plus 40 TFSI S tronic'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.skousen.dk/koekkenudstyr/madlavning-grill/bordgrill/product/fritel-grill-panini-bbq-gr2275/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-84' AND date(o.date, 'unixepoch') = '2022-04-24' AND v.name = 'Skousen' AND oi.title = 'Fritel Grill-Panini-BBQ GR2275'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.profiloptik.dk/ray-ban-rb4181-601-9a-57' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-86' AND date(o.date, 'unixepoch') = '2022-06-04' AND v.name = 'Profil Optik' AND oi.title = 'Ray Ban RB4181 601/9A 57'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.sport24.dk/peak-performance-helium-down-dunvest-herre.html?c=1686463' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-87' AND date(o.date, 'unixepoch') = '2022-07-31' AND v.name = 'Sport24' AND oi.title = 'Peak Performance Helium Down Dunvest'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B09NRG4GK3/ref=pe_27091401_487027711_TE_SCE_dp_1' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-90' AND date(o.date, 'unixepoch') = '2022-09-03' AND v.name = 'Amazon' AND oi.title = 'Anker 633 Magnetic Battery & Anker 623 MagGo Magnetic Wireless Charger'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://hindsgavl.dk/pleasure/ophold/weekendophold/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-93' AND date(o.date, 'unixepoch') = '2022-10-18' AND v.name = 'Hindsgavl' AND oi.title = 'Weekendophold (11 personer)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.komplett.dk/product/1217499/tv-hifi/tv-tilbehoer-afspillere/medieafspillere/google-chromecast-med-google-tv-hd-hvid' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-94' AND date(o.date, 'unixepoch') = '2022-12-14' AND v.name = 'Komplett' AND oi.title = 'Google ChromeCast med Google TV (HD)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.kjell.com/se/varumarken/frient/smarta-hem/smarta-sensorer/smarta-energimatare/frient-smart-energimatare-for-elcentral-p52023' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-95' AND date(o.date, 'unixepoch') = '2023-01-12' AND v.name = 'Kjell & Company' AND oi.title = 'Frient Electricity Meter Interface'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://mackabler.dk/sonoff-zigbee-bridge-3686.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-96' AND date(o.date, 'unixepoch') = '2023-01-16' AND v.name = 'MacKabler.dk' AND oi.title = 'Sonoff ZigBee Bridge 3.0'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.dustinhome.dk/product/5011232905/dresden-elektronik-conbee-ii-usb-zigbee-controller' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-97' AND date(o.date, 'unixepoch') = '2023-01-17' AND v.name = 'Dustin' AND oi.title = 'Dresden Elektronik ConBee II USB ZigBee Controller'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://raspberrypi.dk/produkt/home-assistant-skyconnect/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-98' AND date(o.date, 'unixepoch') = '2023-02-05' AND v.name = 'RaspberryPi.dk' AND oi.title = 'Home Assistant SkyConnect'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://hindsgavl.dk/pleasure/ophold/weekendophold/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-99' AND date(o.date, 'unixepoch') = '2023-02-13' AND v.name = 'Hindsgavl' AND oi.title = 'Weekendophold (+2 personer)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://morsoe.com/da/produkter/kitchen/gryder-og-pander/p79nord-stegepandesaet' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-100' AND date(o.date, 'unixepoch') = '2023-04-27' AND v.name = 'Gavefabrikken' AND oi.title = 'Morsø 79NORD pander (rustfri)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://hindsgavl.dk/pleasure/ophold/weekendophold/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-101' AND date(o.date, 'unixepoch') = '2023-04-28' AND v.name = 'Hindsgavl' AND oi.title = 'Kaffe/te og kage'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://hindsgavl.dk/pleasure/ophold/weekendophold/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-102' AND date(o.date, 'unixepoch') = '2023-04-30' AND v.name = 'Hindsgavl' AND oi.title = 'Vin og drinks'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://onyxcookware.dk/products/onyx-cookware-woksaet-2-dele' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-103' AND date(o.date, 'unixepoch') = '2023-05-08' AND v.name = 'Onyx Cookware' AND oi.title = 'Woksæt, 2 dele (keramisk)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://pandasia.dk/vare/tristar-rk-6126-riskoger-1l/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-104' AND date(o.date, 'unixepoch') = '2023-06-06' AND v.name = 'Pandasia' AND oi.title = 'Riskoger, skimmerske og diverse krydderier'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.ryanair.com/dk/da' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-105' AND date(o.date, 'unixepoch') = '2023-06-19' AND v.name = 'RyanAir' AND oi.title = 'Rejse, Billund (BLL) til Málaga (AGP), tur/retur'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.compumail.dk/da/p/braun-series-5-51-w1600s-shaver-1000717495' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-106' AND date(o.date, 'unixepoch') = '2023-07-02' AND v.name = 'CompuMail' AND oi.title = 'Braun Series 5 51-W1600s Shaver'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.compumail.dk/da/p/xiaomi-mi-smart-standing-fan-2-koleventilator-bord-gulvstaende-hvid-999032330' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-107' AND date(o.date, 'unixepoch') = '2023-08-02' AND v.name = 'CompuMail' AND oi.title = 'Xiaomi MI Smart Standing Fan 2, BT USB Dongle and USB cord'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Eltandboerste/Oral-B-Tandboerstehoveder-Cross-Action-Sort-Boerstehoveder-5-stk/2927387' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-110' AND date(o.date, 'unixepoch') = '2023-10-11' AND v.name = 'Proshop' AND oi.title = 'Oral-B Tandbørstehoveder Cross Action Sort, 15 stk.'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://nordiccoffeehouse.dk/shop/10-jura-plejeprodukter/24-jura-claris-smart-3-stk/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-111' AND date(o.date, 'unixepoch') = '2023-10-12' AND v.name = 'Nordic Coffee House ApS' AND oi.title = 'JURA Plejeprodukter (3 filtre, tabletter)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.compumail.dk/da/p/roborock-s8-pro-ultra-stovsuger-robotstyret-0-35liter-sort-1001120402' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-112' AND date(o.date, 'unixepoch') = '2023-10-12' AND v.name = 'CompuMail' AND oi.title = 'Xiaomi Roborock S8 Pro Ultra, Sort'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.komplett.dk/product/1213815/tp-link-deco-xe75-3-pack-wifi-6e-mesh' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-113' AND date(o.date, 'unixepoch') = '2023-10-17' AND v.name = 'Komplett' AND oi.title = 'TP-Link Deco XE75 Tri-Band Mesh Wi-Fi 6E (3-pack)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://raspberrypi.dk/produkt/home-assistant-green/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-114' AND date(o.date, 'unixepoch') = '2023-11-23' AND v.name = 'RaspberryPi.dk' AND oi.title = 'Home Assistant Green'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.kop-kande.dk/produkt/ninja-foodi-airfryer-max-dual-zone-inkl-termometer-9-5-liter/0622356258388' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-115' AND date(o.date, 'unixepoch') = '2023-11-23' AND v.name = 'Kop og Kande' AND oi.title = 'Ninja Airfryer AF451EU'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.johannesfog.dk/bolig-design/personlig-pleje/termometre-og-maaleapparater/withings-bpm-connect-9135278' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-413' AND date(o.date, 'unixepoch') = '2023-12-06' AND v.name = 'Fog' AND oi.title = 'Withings BPM Connect Blodtryksmåler'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.compumail.dk/da/p/tp-link-av1000-bro-1gbps-kabling-995829243' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-118' AND date(o.date, 'unixepoch') = '2023-12-18' AND v.name = 'CompuMail' AND oi.title = 'TP-Link AV1000'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando.dk/nike-performance-academy-23-track-suit-branded-traningssat-blackwhite-n1242k083-q11.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-120' AND date(o.date, 'unixepoch') = '2024-01-12' AND v.name = 'Zalando' AND oi.title = 'Tøj (nike træningssæt)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando.dk/nike-performance-m-legend-essential-3-nn-traningssko-smoke-greywhite-dk-smoke-grey-n1242a2gx-c11.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-122' AND date(o.date, 'unixepoch') = '2024-01-16' AND v.name = 'Zalando' AND oi.title = 'Nike Performance, LEGEND ESSENTIAL 3 - Træningssko'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Mobil/Apple-iPhone-15-Pro-128GB-Natural-Titanium/3198700' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-123' AND date(o.date, 'unixepoch') = '2024-02-22' AND v.name = 'Proshop' AND oi.title = 'Apple iPhone 15 Pro 128GB Natural titanium'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.apple.com/dk/shop/product/MT1E3ZM/A/silikone-etui-med-magsafe-til-iphone-15-pro-ler' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-124' AND date(o.date, 'unixepoch') = '2024-02-29' AND v.name = 'Apple' AND oi.title = 'Apple Silikone-etui med MagSafe til iPhone 15 Pro – ler'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.magasin.dk/hugo-round-10194355/S06287007.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-125' AND date(o.date, 'unixepoch') = '2024-03-01' AND v.name = 'Magasin' AND oi.title = 'Hugo Boss, Round T-shirt'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando.dk/nike-sportswear-p-6000-unisex-sneakers-earthlight-bonesailphantomkhaki-ni115o064-b11.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-126' AND date(o.date, 'unixepoch') = '2024-03-12' AND v.name = 'Zalando' AND oi.title = 'Nike Sportswear, P-6000 (sko)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://onyxcookware.dk/collections/saute-gryder-pander/products/onyx-cookware-saute-gryde-saet-2-dele' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-128' AND date(o.date, 'unixepoch') = '2024-03-16' AND v.name = 'Onyx Cookware' AND oi.title = 'Sautégrydesæt 2-dele samt grydelåg (24 og 32cm)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.compumail.dk/da/p/dyson-v8-stovsuger-pind-handholdt-115w-0-54liter-1001624458' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-130' AND date(o.date, 'unixepoch') = '2024-03-19' AND v.name = 'CompuMail' AND oi.title = 'Dyson V8'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando-lounge.dk/campaigns/ZZO2L7H/categories/7005998/articles/NE222S02D-Q11' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-132' AND date(o.date, 'unixepoch') = '2024-04-03' AND v.name = 'Zalando' AND oi.title = 'New Balance, Essentials Stacked Full Zip Hoodie'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.pricerunner.dk/pl/337-3205173676/Sko/Salomon-x-braze-mid-gore-tex-herrestoevle-Sammenlign-Priser' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-133' AND date(o.date, 'unixepoch') = '2024-04-03' AND v.name = 'Outdoornu.dk' AND oi.title = 'Salomon X Braze Mid GTX, Men, black/phantom'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/dk/vaskemaskine-torretumblere/frontlaessede-vaskemaskiner/fv94ens2qn/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-400' AND date(o.date, 'unixepoch') = '2024-04-10' AND v.name = 'Elgiganten' AND oi.title = 'LG vaskemaskine FV94ENS2QN'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/dk/vaskemaskiner/lg-fv94ens2qn' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-400' AND date(o.date, 'unixepoch') = '2024-04-10' AND v.name = 'Elgiganten' AND oi.title = 'LG tørretumbler RV9DN903P'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando.dk/g-star-rovic-zip-3d-straight-tapered-cargobukser-dark-bronze-green-gs122e03d-n11.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-137' AND date(o.date, 'unixepoch') = '2024-04-26' AND v.name = 'Zalando' AND oi.title = 'G-Star cargo bukser (dark bronze green & fawn)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.ryanair.com/dk/da' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-140' AND date(o.date, 'unixepoch') = '2024-05-16' AND v.name = 'RyanAir' AND oi.title = 'Rejse, Billund (BLL) til Málaga (AGP), tur/retur'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gastrotools.dk/products/traeske-og-palet' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-141' AND date(o.date, 'unixepoch') = '2024-05-17' AND v.name = 'Gastrotools' AND oi.title = 'Grydeske + Palet i Oliventræ'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B071HY1HC5/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-142' AND date(o.date, 'unixepoch') = '2024-05-17' AND v.name = 'Amazon' AND oi.title = 'Samsonite, tasker (kabine, toilet og ryg)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando-lounge.dk/campaigns/ZZO2SHU/categories/204816657/articles/NE254H00F-Q11' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-148' AND date(o.date, 'unixepoch') = '2024-06-26' AND v.name = 'Zalando Lounge' AND oi.title = 'New Balance, Skuldertasker (sort)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.peakperformance.com/dk/product/m-meadow-wind-vest-g77170.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-149' AND date(o.date, 'unixepoch') = '2024-06-28' AND v.name = 'Zalando' AND oi.title = 'Peak Performance Meadow Wind Vest (sort)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.tradeinn.com/dressinn/da/superdry-core-cargo-shorts/140587957/p?queryID=57bc6b665e0ca022b4b432d2128b901e' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-151' AND date(o.date, 'unixepoch') = '2024-07-07' AND v.name = 'Dressinn' AND oi.title = 'SUPERDRY Core cargo shorts'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.magasin.dk/falconwood/S08339670.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-152' AND date(o.date, 'unixepoch') = '2024-07-11' AND v.name = 'Magasin' AND oi.title = 'Falconwood kreditkort holder, pung'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.eventyrsport.dk/produkt/tight-pro-medium-rygsaek-1142305447/true-black-2c5-652' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-156' AND date(o.date, 'unixepoch') = '2024-07-27' AND v.name = 'EventyrSport' AND oi.title = 'Haglöfs Tight Pro Medium'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.eventyrsport.dk/produkt/accessory-carabiner-set-3-stk-karabiner-0322101092/grey-blue-orange-300' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-156' AND date(o.date, 'unixepoch') = '2024-07-27' AND v.name = 'EventyrSport' AND oi.title = 'Accessory Carabiner Set 3 stk. karabiner'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.coolshop.dk/produkt/nintendo-switch-sports/23A8W6/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-158' AND date(o.date, 'unixepoch') = '2024-08-12' AND v.name = 'Coolshop' AND oi.title = 'Nintendo Switch Sports'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/uk/tvs-soundbars/4k-uhd-tvs/43ut73006la/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-401' AND date(o.date, 'unixepoch') = '2024-08-14' AND v.name = 'Elgiganten' AND oi.title = 'LG 43" UT 7300 4K LED TV (2024)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/us/tv-audio-video-accessories/lg-mr23gn-accessories' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-161' AND date(o.date, 'unixepoch') = '2024-08-21' AND v.name = 'CompuMail' AND oi.title = 'LG Magic Remote, MR23GN'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/dk/opvaskemaskiner/lg-du355fw' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-402' AND date(o.date, 'unixepoch') = '2024-08-27' AND v.name = 'Elgiganten' AND oi.title = 'LG opvaskemaskine DU355FW'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.siemens-home.bsh-group.com/dk/da/product/ovne-kogeplader-emhaetter/ovne/indbygningsovne/HB774G2B3S' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-164' AND date(o.date, 'unixepoch') = '2024-09-02' AND v.name = 'Whiteaway' AND oi.title = 'Siemens HB774G2B3S, ovn'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://eu.store.ui.com/eu/en/products/ucg-ultra' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-165' AND date(o.date, 'unixepoch') = '2024-09-03' AND v.name = 'CS Megastore' AND oi.title = 'Ubiquiti Gateway Ultra, UniFi Switch Lite (POE+)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/dk/kol-frys/lg-gbb92mcbap' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-166' AND date(o.date, 'unixepoch') = '2024-09-03' AND v.name = 'Elgiganten' AND oi.title = 'LG GBB92MCBAP, køle/fryseskab'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://haxan.dk/products/haxan-bathroom-cleaning-kit?variant=48557985431886' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-434' AND date(o.date, 'unixepoch') = '2024-09-05' AND v.name = 'Häxan' AND oi.title = 'Häxan Badeværelset'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://haxan.dk/products/haxan-anti-limescale?variant=47787314151758' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-434' AND date(o.date, 'unixepoch') = '2024-09-05' AND v.name = 'Häxan' AND oi.title = 'Häxan Antikalk'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://eu.store.ui.com/eu/en/products/u6-lr' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-167' AND date(o.date, 'unixepoch') = '2024-09-06' AND v.name = 'CompuMail' AND oi.title = 'Ubiquiti UniFi WIFI6 U6-LR'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.columbiasportswear.dk/en_DK/1940591.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-168' AND date(o.date, 'unixepoch') = '2024-09-13' AND v.name = 'Zalando' AND oi.title = 'Colombia Redmond™ III Waterproof (vandresko) og CERGY kabelskjuler (boks)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B0CQFY2FP4/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-170' AND date(o.date, 'unixepoch') = '2024-09-24' AND v.name = 'Amazon' AND oi.title = 'ILEEDear GX53 9W LED, Warm white 3000K (4 pak)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.beslagsboden.dk/produkt/villa-husnumre-3/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-171' AND date(o.date, 'unixepoch') = '2024-09-30' AND v.name = 'Beslagsboden' AND oi.title = 'VILLA Husnumre "3" og "6"'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B0BS1CX1LR' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-174' AND date(o.date, 'unixepoch') = '2024-11-24' AND v.name = 'Amazon' AND oi.title = 'Joseph Joseph (vasketøjskurv og  opbevaring), Toiletbørste og ris vaskeskål'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.elgiganten.dk/product/tv-lyd-smart-home/horetelefoner-tilbehor/horetelefoner/apple-airpods-pro-2nd-gen-2023-true-wireless-horetelefoner-usb-c/673048' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-175' AND date(o.date, 'unixepoch') = '2024-11-29' AND v.name = 'Elgiganten' AND oi.title = 'Apple AirPods Pro 2nd gen (2023) true wireless høretelefoner (USB-C)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.elgiganten.dk/product/sport-fritid-hobby/bil-motorcykel/parkeringsskive/park-solar-elektronisk-parkeringsskive-fs38-sort/840472' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-178' AND date(o.date, 'unixepoch') = '2024-11-30' AND v.name = 'Elgiganten' AND oi.title = 'Park Solar FS38 (sort)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://kologkomfur.dk/collections/tilbud-kol-og-komfur/products/horl%C2%AE3-eg' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-179' AND date(o.date, 'unixepoch') = '2024-12-04' AND v.name = 'Køl & Komfur' AND oi.title = 'HORL®3 Eg (-700kr KE)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B09QGV15NS' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-180' AND date(o.date, 'unixepoch') = '2024-12-11' AND v.name = 'Amazon' AND oi.title = 'OSRAM LED Glass Spotlight with GX53 Socket (12 stk.)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://ostenvedkultorvet.dk/webshop/boska-ostehoevl/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-183' AND date(o.date, 'unixepoch') = '2025-01-13' AND v.name = 'Osten ved Kultorvet' AND oi.title = 'BOSKA ostehøvl'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando-lounge.dk/campaigns/ZZO36DU/categories/220357428/articles/ZZO2LTG18-K00' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-185' AND date(o.date, 'unixepoch') = '2025-01-22' AND v.name = 'Zalando Lounge' AND oi.title = 'Lacoste Blazere, Sort'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.philips.dk/c-p/STH3010_70/3000-series-handholdt-damper' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-358' AND date(o.date, 'unixepoch') = '2025-01-28' AND v.name = 'CompuMail' AND oi.title = 'Philips 3000 series STH3010 Håndholdt damper (STH3010/70)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/-/en/dp/B09S151KNJ' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-187' AND date(o.date, 'unixepoch') = '2025-02-02' AND v.name = 'Amazon' AND oi.title = 'Hans Grohe bruserhoved og slange, 12 skokasser'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/-/da/gp/product/B0BR1TTLHT' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-188' AND date(o.date, 'unixepoch') = '2025-02-10' AND v.name = 'Amazon' AND oi.title = 'ESP32 BLE, 2 x USB-C wall-plug og USB-C / A kabel'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://compumail.dk/da/p/canon-canoscan-lide-400-flatbed-scanner-desktopmodel-993477654' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-189' AND date(o.date, 'unixepoch') = '2025-02-10' AND v.name = 'CompuMail' AND oi.title = 'Canon CanoScan LiDE 400 Flatbed-scanner'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://blomstenogkrukken.dk/shop/43-ltstronggtbinderiartikler-oasis-og-traadltstronggt/4273--hanataba-champagne-gold/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-191' AND date(o.date, 'unixepoch') = '2025-02-18' AND v.name = 'Blomsten & Krukken' AND oi.title = 'Hanataba Champagne Gold'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://blomstenogkrukken.dk/shop/43-ltstronggtbinderiartikler-oasis-og-traadltstronggt/4482-hanataba-crystal-clear/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-191' AND date(o.date, 'unixepoch') = '2025-02-18' AND v.name = 'Blomsten & Krukken' AND oi.title = 'Hanataba Crystal Clear'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://el-grossisten.dk/shop/h43360-opbevaringsstativ-til-bildk-inkl-overtrk-20785' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-202' AND date(o.date, 'unixepoch') = '2025-05-08' AND v.name = 'EL-Grossisten' AND oi.title = 'Opbevaringsstativ til bildæk, inkl. overtræk'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.bergfreunde.dk/endurance-benal-2-in-1-cycling-mtb-shorts-cykelbukser/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-203' AND date(o.date, 'unixepoch') = '2025-05-14' AND v.name = 'Bergfreunde' AND oi.title = 'ENDURANCE, Benal 2-in-1 Cycling/MTB Shorts, cykelbukser'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.sport24.dk/produkt/haglofs-haagna-20-rygsaek/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-205' AND date(o.date, 'unixepoch') = '2025-05-20' AND v.name = 'Sport24' AND oi.title = 'Haglöfs Hågna 20 Rygsæk, 2 x 3stk Endurance sports strømper'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.ryanair.com/dk/da' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-206' AND date(o.date, 'unixepoch') = '2025-05-22' AND v.name = 'RyanAir' AND oi.title = 'Rejse, Kastrup (CPH) til Málaga (AGP), tur/retur'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://aeotec.com/products/aeotec-range-extender-zi/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-208' AND date(o.date, 'unixepoch') = '2025-07-04' AND v.name = 'Proshop' AND oi.title = 'Aeotec Range Extender Zi (Zigbee)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Smart-Home/frient-Luftkvalitetssensor/2989429' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-209' AND date(o.date, 'unixepoch') = '2025-07-09' AND v.name = 'Proshop' AND oi.title = 'Frient Air Quality Sensor'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.boozt.com/dk/da/adidas-originals/powerphase_32723624/228662808' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-210' AND date(o.date, 'unixepoch') = '2025-07-12' AND v.name = 'Boozt' AND oi.title = 'Adidas Originals sneaker, Matinique t-shirts'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.boozt.com/dk/da/asics/gel-venture-6_32631411/228525883' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-211' AND date(o.date, 'unixepoch') = '2025-07-24' AND v.name = 'Boozt' AND oi.title = 'Asics sko, boss og superdry t-shirts'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.bildeleshop.dk/daek/goodyear-4038526074881-581534' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-214' AND date(o.date, 'unixepoch') = '2025-08-13' AND v.name = 'Bildeleshop' AND oi.title = 'Goodyear Eagle F1 Asymmetric 6 (245/40 R18 93Y)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lg.com/my/cooking-appliances/microwave-ovens/mh6535gis/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-215' AND date(o.date, 'unixepoch') = '2025-08-21' AND v.name = 'CompuMail' AND oi.title = 'LG NeoChef MH6535GIS'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.zalando-lounge.dk/myaccount/orders/14612000829874' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-219' AND date(o.date, 'unixepoch') = '2025-09-28' AND v.name = 'Zalando Lounge' AND oi.title = 'Joseph Joseph køkken udstyr (salt & peber, 2 x KitchenAid alu pander m.m.)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gastrotools.dk/products/knivsaet-den-essentielle' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-221' AND date(o.date, 'unixepoch') = '2025-10-06' AND v.name = 'Gastrotools' AND oi.title = 'Essential Collection (Gyuto kokkekniv, Utilitykniv og Santoku kokkekniv)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gastrotools.dk/products/komplet-5-ply-saet-1' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-225' AND date(o.date, 'unixepoch') = '2025-11-21' AND v.name = 'Gastrotools' AND oi.title = 'Komplet 5-ply sæt (12 dele), oliekande og pandebeskytter (6 stk)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.footstore.dk/vare/12102-glerups-glerups-a-02' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-226' AND date(o.date, 'unixepoch') = '2025-11-28' AND v.name = 'Footstore' AND oi.title = 'Glerups A-02, Charcoal'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://raspberrypi.dk/en/product/home-assistant-connect-zbt-2/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-228' AND date(o.date, 'unixepoch') = '2025-11-28' AND v.name = 'RaspberryPi.dk' AND oi.title = 'Home Assistant ZBT-2'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/-/en/dp/B0BGY16BMH' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-229' AND date(o.date, 'unixepoch') = '2025-11-29' AND v.name = 'Amazon' AND oi.title = 'Maxxi Clean 6 x 750 ml Floor Cleaner with Fresh Fragrance'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gastrotools.dk/products/oliekande' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-231' AND date(o.date, 'unixepoch') = '2025-12-03' AND v.name = 'Gastrotools' AND oi.title = 'Oliekande'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B0DZX7WFZY' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-234' AND date(o.date, 'unixepoch') = '2026-01-11' AND v.name = 'Amazon' AND oi.title = 'Braun Series 5/6 53B Replacement Shaving Head'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B00RCTYZNK' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-234' AND date(o.date, 'unixepoch') = '2026-01-11' AND v.name = 'Amazon' AND oi.title = 'Andis Carbon Stainless Steel Deep Tooth Replacement'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://greenmate.dk/shop/oekologisk-lille-kasse-3-kg/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-235' AND date(o.date, 'unixepoch') = '2026-01-18' AND v.name = 'Greenmate' AND oi.title = 'Økologisk lille kasse 3 kg'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.imerco.dk/joseph-joseph-fridgestore-opbevaringskasse-h-8-5-x-b-17-4-x-l-30-8-cm-polystyren-turkis?id=100426302' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-236' AND date(o.date, 'unixepoch') = '2026-01-18' AND v.name = 'Imerco' AND oi.title = 'Joseph Joseph FridgeStore Opbevaringskasse (17,4cm)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.imerco.dk/joseph-joseph-fridgestore-opbevaringskasse-h-8-5-x-b-10-4-x-l-30-8-cm-polystyren-turkis?id=100426301' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-236' AND date(o.date, 'unixepoch') = '2026-01-18' AND v.name = 'Imerco' AND oi.title = 'Joseph Joseph FridgeStore Opbevaringskasse (10,4cm)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.imerco.dk/oxo-good-grips-skuffeindsats-h-6-3-x-b-25-1-45-8-x-l-41-6-cm-plastik-hvid-graa?id=100410747' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-236' AND date(o.date, 'unixepoch') = '2026-01-18' AND v.name = 'Imerco' AND oi.title = 'OXO Good Grips Skuffeindsats'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.imerco.dk/joseph-joseph-sinktech-opvaskeboerste-abs-plastik?id=100452919' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-236' AND date(o.date, 'unixepoch') = '2026-01-18' AND v.name = 'Imerco' AND oi.title = 'Joseph Joseph SinkTech Opvaskebørste'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.imerco.dk/joseph-joseph-sinktech-boerstehoveder-2-stk-pp-plastik?id=100452911' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-236' AND date(o.date, 'unixepoch') = '2026-01-18' AND v.name = 'Imerco' AND oi.title = 'Joseph Joseph SinkTech Børstehoveder - 2 stk.'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.g-star.com/en_dk/shop/men/pants/d25831-d846-1260' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-237' AND date(o.date, 'unixepoch') = '2026-01-24' AND v.name = 'Zalando' AND oi.title = 'G-Star cargo bukser (grå)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Smart-Home/SwitchBot-Set-Smart-remote-control-Hub-3x-Thermo-Hygrometer-Hub-Mini/3244587' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-251' AND date(o.date, 'unixepoch') = '2026-02-02' AND v.name = 'Proshop' AND oi.title = 'SwitchBot Set Smart remote control Hub + 3x Thermo-Hygrometer Hub Mini'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.proshop.dk/Makulator/Nedis-PASH112BKA4-paper-shredder/3292998' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-251' AND date(o.date, 'unixepoch') = '2026-02-02' AND v.name = 'Proshop' AND oi.title = 'Nedis PASH112BKA4 paper shredder'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.computersalg.dk/i/10366842/oral-b-io-series-6-elektrisk-tandb%C3%B8rste-sort-lava' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-254' AND date(o.date, 'unixepoch') = '2026-02-05' AND v.name = 'CS Megastore' AND oi.title = 'Oral-B iO Series 6 Elektrisk Tandbørste - Sort Lava'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.computersalg.dk/i/24143085/oral-b-io-series-ultimate-clean-tandb%C3%B8rstehoveder-sort-4-pak' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-254' AND date(o.date, 'unixepoch') = '2026-02-05' AND v.name = 'CS Megastore' AND oi.title = 'Oral-B iO Series Ultimate Clean Tandbørstehoveder - Sort - 4-pak'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.siemens-home.bsh-group.com/dk/da/product/tilbehoer/tilbehoer-til-ovne-kogeplader-komfurer-emhaetter/teleskopiske-ovnskinner/1-fold/HZ638070' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-256' AND date(o.date, 'unixepoch') = '2026-02-14' AND v.name = 'POWER' AND oi.title = 'Siemens HZ638070 (Clip skinne, Pyrosikker)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.louispoulsen.com/da-dk/catalog/privat/pendler-loftlamper/vl-45-radiohus-pendant-v3?v=91820-5741100167-01' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-257' AND date(o.date, 'unixepoch') = '2026-02-14' AND v.name = 'Indbo Møbler' AND oi.title = 'Louis Poulsen VL 45 Radiohuspendel (2 stk. Ø250)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.louispoulsen.com/en/catalog/professional/decorative-lighting/pendants/ph-5?v=90293-5741113060-01' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-257' AND date(o.date, 'unixepoch') = '2026-02-14' AND v.name = 'Indbo Møbler' AND oi.title = 'PH5 Pendel. Pastel Oyster Blue Rose'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.siemens-home.bsh-group.com/dk/da/product/ED811HQ26E' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-259' AND date(o.date, 'unixepoch') = '2026-02-18' AND v.name = 'CS Megastore' AND oi.title = 'Siemens iQ500 ED811HQ26E'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.siemens-home.bsh-group.com/dk/da/product/SX97T801CE' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-260' AND date(o.date, 'unixepoch') = '2026-02-21' AND v.name = 'Design Billigt ApS' AND oi.title = 'Siemens IQ700 SX97T801CE'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.boozt.com/dk/en/jack-jones/20021781_20021781/20021784' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-262' AND date(o.date, 'unixepoch') = '2026-02-26' AND v.name = 'Boozt' AND oi.title = 'Jack & Jones JJESHERIDAN SHIRT L/S NOOS (denim)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.boozt.com/dk/da/matinique/30586794_30586794/224714298' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-262' AND date(o.date, 'unixepoch') = '2026-02-26' AND v.name = 'Boozt' AND oi.title = 'Matinique JERMANE 3-PACK, T-shirts basic (white)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.boozt.com/dk/da/matinique/30586794_30586794/224714314' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-262' AND date(o.date, 'unixepoch') = '2026-02-26' AND v.name = 'Boozt' AND oi.title = 'Matinique JERMANE 3-PACK, T-shirts basic (black)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.siemens-home.bsh-group.com/dk/da/product/tilbehoer/tilbehoer-til-ovne-kogeplader-komfurer-emhaetter/accessoriescookinghobsventing/HZ9VRCR1' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-264' AND date(o.date, 'unixepoch') = '2026-03-01' AND v.name = 'Korsør Hvidevarecenter' AND oi.title = 'Siemens HZ9VRCR1'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.siemens-home.bsh-group.com/dk/da/product/tilbehoer/tilbehoer-til-ovne-kogeplader-komfurer-emhaetter/accessoriescookinghobsventing/HZ9VDKR1' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-264' AND date(o.date, 'unixepoch') = '2026-03-01' AND v.name = 'Korsør Hvidevarecenter' AND oi.title = 'Siemens HZ9VDKR1'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B0823TQR9K' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-268' AND date(o.date, 'unixepoch') = '2026-03-21' AND v.name = 'Amazon' AND oi.title = 'U Shape Shower Door Seal Shower Seal Water (200cm)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B07PKBVNRZ' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-268' AND date(o.date, 'unixepoch') = '2026-03-21' AND v.name = 'Amazon' AND oi.title = 'Kleos Extra Virgin Olive Oil (5L)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.grohe.com/da-DK/produkt/minta-k-kkenarmatur-high-guld-32321GN2' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-269' AND date(o.date, 'unixepoch') = '2026-03-24' AND v.name = 'BadQuadrat' AND oi.title = 'Grohe Minta (32321GN2) Cool Sunrise'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://gavefabrikken.dk/gjd-essence-sengetoj-walnut-laengde-200-bci.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-270' AND date(o.date, 'unixepoch') = '2026-03-26' AND v.name = 'Gavefabrikken' AND oi.title = 'George Jensen Damask, Sengetøj, Essence walnut'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://gavefabrikken.dk/gjd-handklaeder-2-2-2-ocean-grey-1.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-270' AND date(o.date, 'unixepoch') = '2026-03-26' AND v.name = 'Gavefabrikken' AND oi.title = 'Georg Jensen Damask, Terry håndklæder, 6 stk'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://audocph.com/products/kubus-4' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-270' AND date(o.date, 'unixepoch') = '2026-03-26' AND v.name = 'Gavefabrikken' AND oi.title = 'KUBUS 4, Candle holder, Olive'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.tradeinn.com/bikeinn/en/northwave-vortex-2-jacket/139633016/p' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-271' AND date(o.date, 'unixepoch') = '2026-03-28' AND v.name = 'Dressinn' AND oi.title = 'Northwave Vortex 2 jacket'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.tradeinn.com/bikeinn/en/bbb-baseshield-jacket/141677698/p?_kx=WaXy-ORnb9IyMD9MsDCaqzPYCfaqye71BfqXfZuRTlAJy9pLWRdmTXtyfB4uVryZ.XikJSd' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-271' AND date(o.date, 'unixepoch') = '2026-03-28' AND v.name = 'Dressinn' AND oi.title = 'BBB BaseShield jacket'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://eu.store.ui.com/eu/en/products/u7-lite' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-273' AND date(o.date, 'unixepoch') = '2026-03-30' AND v.name = 'CS Megastore' AND oi.title = 'Ubiquiti Wireless AP WIFI7  BE5000  2x2  Indoor  25 GbE  UniFi  U7Lite'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://ui.com/cloud-gateways/compact' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-273' AND date(o.date, 'unixepoch') = '2026-03-30' AND v.name = 'CS Megastore' AND oi.title = 'Ubiquiti Ultra, Gateway, 1GbE, 2.5GbE (UCG-ULTRA-EU)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://eu.store.ui.com/eu/en/products/usw-flex-mini' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-273' AND date(o.date, 'unixepoch') = '2026-03-30' AND v.name = 'CS Megastore' AND oi.title = 'Ubiquiti UniFi Switch USW Flex Mini, Switch'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://leakbot.io/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-272' AND date(o.date, 'unixepoch') = '2026-04-02' AND v.name = 'PrivatSikring' AND oi.title = 'LeakBot Smart Water Leak Detector'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.davidsen.dk/savsmuldstapet-classico-20-m-c-id525448-p-47702046793' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-274' AND date(o.date, 'unixepoch') = '2026-04-11' AND v.name = 'Davidsen' AND oi.title = 'Savsmuldstapet Classico 20 m'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.davidsen.dk/afdaekningsplast-20-my-2x50-m-c-id1243016-p-48605804593' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-274' AND date(o.date, 'unixepoch') = '2026-04-11' AND v.name = 'Davidsen' AND oi.title = 'Afdækningsplast 20 My 2x50 m'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.davidsen.dk/afdaekningspap-120-130-g-1x30-m-c-id1243016-p-46105692975' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-274' AND date(o.date, 'unixepoch') = '2026-04-11' AND v.name = 'Davidsen' AND oi.title = 'Afdækningspap 120-130 g 1x30 m'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B0FCQZRWVB' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-277' AND date(o.date, 'unixepoch') = '2026-04-13' AND v.name = 'Amazon' AND oi.title = 'YAMOSO AD100, Metal Electric Air Duster'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B0BN1RKVXF' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-277' AND date(o.date, 'unixepoch') = '2026-04-13' AND v.name = 'Amazon' AND oi.title = 'KEWPIE, Mayonnaise (500ml)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/dp/B07JDYRM6F' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-277' AND date(o.date, 'unixepoch') = '2026-04-13' AND v.name = 'Amazon' AND oi.title = 'Honeybite Hot Honey'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.louispoulsen.com/da-dk/catalog/privat/vaeglamper/aj-wall' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-281' AND date(o.date, 'unixepoch') = '2026-04-24' AND v.name = 'EL-salg' AND oi.title = 'Louis Poulsen AJ væglampe, Sort u/ledning og u/afbryder'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lampeguru.dk/philips-hue-white-e27-standardpaere-2700k-9w-4-pak-36367' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-283' AND date(o.date, 'unixepoch') = '2026-04-26' AND v.name = 'LampeGuru' AND oi.title = 'Philips Hue White E27 standardpære, 2700K, 9W, 4-pak'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lampeguru.dk/philips-hue-white-ambiance-e14-kertepaere-2200k-6500k-4w-2-pak-36953' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-283' AND date(o.date, 'unixepoch') = '2026-04-26' AND v.name = 'LampeGuru' AND oi.title = 'Philips Hue White Ambiance E14 kertepære, 2200K-6500K, 4W, 2-pak'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.lampeguru.dk/nordlux-vic-plafond-4000k-oe22-cm-252497' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-283' AND date(o.date, 'unixepoch') = '2026-04-26' AND v.name = 'LampeGuru' AND oi.title = 'Nordlux Vic plafond, 4000K, Ø22 cm'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://byhorn.com/nuovocorso/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-298' AND date(o.date, 'unixepoch') = '2026-04-27' AND v.name = 'HTH Køkken' AND oi.title = 'HTH, Bordplande, Negev Natural Nuovocorso'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.hcfarver.dk/guardian-laederplejesaet-komplet-100045' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-284' AND date(o.date, 'unixepoch') = '2026-04-30' AND v.name = 'HC Farver' AND oi.title = 'Guardian Læderplejesæt Komplet'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://gfunder.dk/affaldssortering-med-udtraek.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-286' AND date(o.date, 'unixepoch') = '2026-05-03' AND v.name = 'Harald Nyborg' AND oi.title = 'G. Funder, Affaldssortering med udtræk'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://jysk.dk/opbevaring/opbevaringskasser-og-kurve/plastkasser/opbevaringsboks-smartstore-classic-15-14l-m-laag' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-294' AND date(o.date, 'unixepoch') = '2026-05-16' AND v.name = 'Jysk' AND oi.title = 'Opbevaringsboks SMARTSTORE CLASSIC 15 14L m/låg'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://beslagsmanden.dk/glaslagehaengsler/3031-haengsel-til-glas-brusedor-poleret-krom-midt.html' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-290' AND date(o.date, 'unixepoch') = '2026-05-18' AND v.name = 'Beslagsmanden' AND oi.title = 'Hængsel til glas brusedør. Poleret krom'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://kuxiu.co/products/kuxiu-x40-turbo-stand' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-293' AND date(o.date, 'unixepoch') = '2026-05-29' AND v.name = 'KUXIU' AND oi.title = 'KUXIU X40 Turbo Qi2.2 Certified 25W 3-in-1 MagSafe Foldable Wireless Charging Stand - Gray'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://kuxiu.co/products/kuxiu-240w-magnetic-auto-coiling-cable' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-293' AND date(o.date, 'unixepoch') = '2026-05-29' AND v.name = 'KUXIU' AND oi.title = 'KUXIU Magnetic Auto-Coiling Cable (USB-C to USB-C)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://rikkitikkishop.dk/MOUD-Home-DOT-messing-knage-OE2-5-cm/MOU210800' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-291' AND date(o.date, 'unixepoch') = '2026-05-30' AND v.name = 'Rikki Tikki Shop' AND oi.title = 'MOUD Home DOT messing knage - Ø2,5 cm'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://rikkitikkishop.dk/MOUD-Home-DOT-messing-knage-OE3-2-cm/MOU210801' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-291' AND date(o.date, 'unixepoch') = '2026-05-30' AND v.name = 'Rikki Tikki Shop' AND oi.title = 'MOUD Home DOT messing knage - Ø3,2 cm'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.teknikdele.dk/produkt/dudao-3in1-tradlos-oplader-15w-med-usb-c-kabel-hvid' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-292' AND date(o.date, 'unixepoch') = '2026-05-30' AND v.name = 'Teknikdele' AND oi.title = 'Dudao 3i1 foldbar trådløs oplader, 15W - Hvid'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.teknikdele.dk/produkt/sign-usb-c-til-lightning-kabel-24a-025m-hvid' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-292' AND date(o.date, 'unixepoch') = '2026-05-30' AND v.name = 'Teknikdele' AND oi.title = 'SiGN USB-C til Lightning-kabel 2,4A, 0,25m - Hvid'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.amazon.de/-/en/dp/B08H8RW766' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-295' AND date(o.date, 'unixepoch') = '2026-06-21' AND v.name = 'Amazon' AND oi.title = 'Siebenschläfer Summer Duvet 140 x 200 cm (Light Summer Duvet)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://cykelgear.dk/tilbehor/flaskeholdere-tilbehor/flaskeholdere/topeak-shuttle-cage-al-flaskeholder-aluminium-sort' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-300' AND date(o.date, 'unixepoch') = '2026-07-08' AND v.name = 'Cykelgear A/S' AND oi.title = 'Topeak Shuttle Cage AL Flaskeholder Aluminium Sort'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://cykelgear.dk/tilbehor/topeak-drikkedunk-800-ml-sort' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-300' AND date(o.date, 'unixepoch') = '2026-07-08' AND v.name = 'Cykelgear A/S' AND oi.title = 'Topeak drikkedunk sort 800 ml'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/orbea-orca-m30-diamond-carbon-view-53' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-302' AND date(o.date, 'unixepoch') = '2026-07-14' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Orbea ORCA M30 Diamond Carbon View'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/Shimano%20SPD-SL%20PD-RS500%20Pedal' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-302' AND date(o.date, 'unixepoch') = '2026-07-14' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Shimano SPD-SL PD-RS500 Pedal'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/polisport-flaskeholder-sort/640258' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-302' AND date(o.date, 'unixepoch') = '2026-07-14' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Polisport Flaskeholder sort'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/coating-ny-cykel' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-302' AND date(o.date, 'unixepoch') = '2026-07-14' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Keramisk Coating'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/rensning-og-silca-voks-til-kaeder' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-302' AND date(o.date, 'unixepoch') = '2026-07-14' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Silca Secret Chain Blend'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gaiasport.dk/products/high5-energy-drink-powder-berry-22-kg' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-304' AND date(o.date, 'unixepoch') = '2026-07-15' AND v.name = 'Gaiasport' AND oi.title = 'High5 Energidrik Berry (2.2 kg)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.gaiasport.dk/products/high5-energy-gel-mixed-flavors-20x40-g' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-304' AND date(o.date, 'unixepoch') = '2026-07-15' AND v.name = 'Gaiasport' AND oi.title = 'High5 Energigel Mixed Flavors box (20x40g)'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/bicycle-shoes-sh-rc903-46' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Shimano SH-RC903'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/lightweight-sl-summer-socks-3-pack-white-l' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'GripGrab Lightweight SL Summer Socks'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/assos-mille-gt-bib-shorts-s11-moss-green-l' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Assos MILLE GT Bib Shorts S11'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/gripgrab-ride-kortaermet-cykeltroeje-hvid-m/1391327' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'GripGrab Ride'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/gripgrab-ride-kortaermet-cykeltroje-olive-green-l' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'GripGrab Ride'
	ORDER BY oi.position LIMIT 1 OFFSET 1);
UPDATE order_items SET url = 'https://boerkopcykler.dk/oakley-sutro-lite-sweep-prizm-road-jade-matte-white/1206768' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Oakley Sutro Lite Sweep Prizm Road'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/lizard-skins-bag-m/1125496' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Lizard Skins'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/lezyne-v-pro-multi-tools-11' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Lezyne V Pro 11 Multitool'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/elite-bottle-fly-mtb-tex/1324751' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Elite Flaske FLY TEX MTB'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/chaoyang-slange-700x2328c-60mm-racer-ventil' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'Chaoyang Slange 700x23/28C 60mm Racer ventil'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://boerkopcykler.dk/ceramicspeed-ufo-drip-all-conditions-100-ml/1336825' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-303' AND date(o.date, 'unixepoch') = '2026-07-16' AND v.name = 'Børkop Cykelforretning A/S' AND oi.title = 'CeramicSpeed UFO Drip'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.coolshop.dk/produkt/strikesphere-soccer-dash/23R67U/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-445' AND date(o.date, 'unixepoch') = '2026-08-02' AND v.name = 'Coolshop' AND oi.title = 'Strikesphere - Soccer Dash'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://sonax.dk/vare/indvendig/interioer-og-kunststof/sonax-interior-cleaning-wipes/' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-446' AND date(o.date, 'unixepoch') = '2026-08-05' AND v.name = 'Mutti''s Garage' AND oi.title = 'SONAX Interiør Rengørings Wipes - 25 stk.'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
UPDATE order_items SET url = 'https://www.knog.com/products/oi-classic-bike-bell' WHERE url IS NULL AND id = (
	SELECT oi.id FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN vendors v ON v.id = o.vendor_id
	WHERE o.reference = 'SPENDLY-448' AND date(o.date, 'unixepoch') = '2026-08-08' AND v.name = 'Fri BikeShop' AND oi.title = 'Oi! Classic Bike Bell'
	ORDER BY oi.position LIMIT 1 OFFSET 0);
