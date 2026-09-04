import { Button, ButtonLink, Card, CardBody, CardDivider, CardHeader, IconButton, InsetPanel, ItemRow } from 'spendly-react'

/* A line on an order, a line read off a receipt, or an attached file.

   Two containers hold it in the app: a tight CardBody (the Items card on an order) and an
   InsetPanel (the recessed list a form or the scan step edits in). Both are below. */

export const OrderItems = () => (
	<Card aria-label="Items">
		<CardHeader title="Items • 5">
			<span className="field-help tabular-figures">1.284,50 kr.</span>
		</CardHeader>
		<CardDivider />
		<CardBody variant="card-body-tight">
			<ItemRow className="item-row-group" icon="cube" title="Kaffe, 500 g"
				meta="2 × 64,95 kr. • retail 74,95 kr." amount="129,90 kr." />
			<ItemRow className="item-row-group" icon="cube" title="Rugbrød"
				meta="1 × 24,95 kr." amount="24,95 kr." />
			<ItemRow className="item-row-group" icon="cube" title="Kylling, hel"
				meta="1 × 74,50 kr. • økologisk" amount="74,50 kr." />
			<ItemRow className="item-row-group" icon="cube" title="Opvasketabs, 60 stk."
				meta="1 × 89,95 kr. • retail 109,95 kr." amount="89,95 kr." />
			<ItemRow icon="dots" iconTone={{ background: 'var(--bg-tile)', color: 'var(--text-muted)' }}
				title="12 more lines" meta="On the receipt, and in the total below." />
			<Button variant="block" icon="pencil" to="/orders/o-1/edit">EDIT ORDER</Button>
		</CardBody>
	</Card>
)

/* What the scan step shows: a read line carries a check, a line Spendly is unsure about
   carries `alert` on the warning tint, and the tail it did not read one by one is a `dots`
   row with an action instead of a figure. */
export const ReceiptLines = () => (
	<Card aria-label="Lines read">
		<CardHeader title="Lines read • 18" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<InsetPanel>
				<ItemRow icon="check" title="Mælk, 1 l" meta="2 × 12,50 kr." amount="25,00 kr.">
					<span className="row-inline row-actions">
						<IconButton icon="pencil" label="Edit Mælk, 1 l" />
						<IconButton icon="trash" label="Delete Mælk, 1 l" />
					</span>
				</ItemRow>
				<ItemRow icon="alert" iconTone={{ background: 'var(--bg-warn)', color: 'var(--text-warn)' }}
					title="Ost, 400 g" meta="1 × 48,95 kr. • check the price" amount="48,95 kr.">
					<span className="row-inline row-actions">
						<IconButton icon="pencil" label="Edit Ost, 400 g" />
						<IconButton icon="trash" label="Delete Ost, 400 g" />
					</span>
				</ItemRow>
				<ItemRow icon="check" title="Æg, 10 stk." meta="1 × 32,95 kr." amount="32,95 kr.">
					<span className="row-inline row-actions">
						<IconButton icon="pencil" label="Edit Æg, 10 stk." />
						<IconButton icon="trash" label="Delete Æg, 10 stk." />
					</span>
				</ItemRow>
				<ItemRow icon="dots" iconTone={{ background: 'var(--bg-tile)', color: 'var(--text-muted)' }}
					title="15 more lines" meta="612,40 kr. together">
					<ButtonLink className="push-end">SHOW ALL</ButtonLink>
				</ItemRow>
			</InsetPanel>
		</CardBody>
	</Card>
)

/* An attached receipt: `thumb` names the glyph for the file's kind, `thumbHref` makes the
   thumbnail itself the link to the file, and the row's own actions ride in `children`. */
export const Attachments = () => (
	<Card aria-label="Attachments">
		<CardHeader title="Attachments • 3" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<ItemRow className="item-row-group" thumb="document" thumbHref="/files/kvittering-bilka.pdf"
				thumbLabel="Open kvittering-bilka.pdf in a new tab"
				title="kvittering-bilka.pdf" meta="PDF • 240 kB • added 2 Sep">
				<span className="row-inline row-inline-nowrap row-actions push-end">
					<IconButton icon="download" label="Download kvittering-bilka.pdf" />
					<IconButton icon="trash" label="Delete kvittering-bilka.pdf" />
				</span>
			</ItemRow>
			<ItemRow className="item-row-group" thumb="photo" thumbHref="/files/bon-netto.jpg"
				thumbLabel="Open bon-netto.jpg in a new tab"
				title="bon-netto.jpg" meta="Photo • 1,2 MB • added 27 Aug">
				<span className="row-inline row-inline-nowrap row-actions push-end">
					<IconButton icon="download" label="Download bon-netto.jpg" />
					<IconButton icon="trash" label="Delete bon-netto.jpg" />
				</span>
			</ItemRow>
			<ItemRow className="item-row-group" thumb="photo" thumbHref="/files/garanti-elgiganten.jpg"
				thumbLabel="Open garanti-elgiganten.jpg in a new tab"
				title="garanti-elgiganten.jpg" meta="Photo • 860 kB • added 29 Aug">
				<span className="row-inline row-inline-nowrap row-actions push-end">
					<IconButton icon="download" label="Download garanti-elgiganten.jpg" />
					<IconButton icon="trash" label="Delete garanti-elgiganten.jpg" />
				</span>
			</ItemRow>
		</CardBody>
	</Card>
)

/* With `to` the whole row is the link into the record, and it draws the chevron every
   navigational row in the app draws. */
export const RowsThatGoSomewhere = () => (
	<Card aria-label="Recent scans">
		<CardHeader title="Recent scans" />
		<CardDivider />
		<CardBody variant="card-body-tight">
			<InsetPanel>
				<ItemRow className="item-row-group" icon="check" title="Bilka"
					meta="Read 2 Sep • 18 lines" amount="742,45 kr." to="/orders/o-1" />
				<ItemRow className="item-row-group" icon="check" title="Føtex"
					meta="Read 31 Aug • 9 lines" amount="284,10 kr." to="/orders/o-5" />
				<ItemRow className="item-row-group" icon="check" title="Elgiganten"
					meta="Read 29 Aug • 2 lines" amount="2.499,00 kr." to="/orders/o-2" />
			</InsetPanel>
			<Button variant="block" to="/orders/all">SEE ALL ORDERS</Button>
		</CardBody>
	</Card>
)
