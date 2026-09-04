import {
	Button, Card, CardBody, CardDivider, CardHeader, CategoryPreview, CategoryRow,
	EmptyState, EntryRow, Icon, ICONS, IconButton, SavingChip, ButtonLink
} from 'spendly-react'

const noop = () => {}

/* A real Tabler outline path (their "coffee"), the kind a category stores on itself once
   the picker has been used. It is not in ICONS and never will be. */
const COFFEE = 'M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67-.358 3.5-1c.83-.642 2.077-1.017 3.5-1'
	+ 'c1.423-.017 2.67 .358 3.5 1 M8 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2 M12 3a2.4 2.4 0 0 0-1 2'
	+ 'a2.4 2.4 0 0 0 1 2 M3 10h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-5 M16.746 16.726a3 3 0 1 0 .252-5.555'

const grid: React.CSSProperties = {
	display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
	columnGap: 4, rowGap: 14
}
const cellStyle: React.CSSProperties = { display: 'grid', justifyItems: 'center', gap: 7, minWidth: 0 }
const nameStyle: React.CSSProperties = {
	fontSize: 10.5, lineHeight: 1.2, color: 'var(--text-muted)', textAlign: 'center',
	maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis'
}
const glyph: React.CSSProperties = { width: 22, height: 22 }

/* Every name the registry holds, drawn from ICONS itself so this sheet cannot fall behind
   the set. A name not on this sheet does not exist, and asking for one throws. */
export const AllIcons = () => (
	<div style={grid}>
		{Object.keys(ICONS).map(name => (
			<span key={name} style={cellStyle}>
				<Icon name={name} style={glyph} />
				<span style={nameStyle}>{name}</span>
			</span>
		))}
	</div>
)

/* The same glyphs at the sizes their surroundings give them: the stylesheet sizes an icon
   by where it sits, so nothing here passes a width. */
export const InControls = () => (
	<div style={{ display: 'grid', gap: 14 }}>
		<div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
			<Button variant="primary" icon="plus">NEW ORDER</Button>
			<Button variant="ghost" iconAfter="chevronRight">See all orders</Button>
			<IconButton icon="pencil" label="Edit order" />
			<IconButton icon="settings" label="Settings" />
			<SavingChip>13,6% under retail</SavingChip>
		</div>
		<Card>
			<CardHeader title="Latest orders" to="/orders/all" label="Latest orders, open All orders" />
			<CardDivider />
			<CardBody variant="entry-list card-body-tight">
				<EntryRow to="/orders/1" glyph="receipt" name="Bilka" meta="4 September • 12 items"
					amount="1.284,50 kr." />
				<EntryRow to="/orders/2" glyph="cart" name="Netto" meta="2 September • 7 items"
					amount="342,95 kr." />
			</CardBody>
		</Card>
	</div>
)

/* The largest one the app draws: the glyph an empty card leads with, sized by the frame
   around it rather than by anything passed here. */
export const InAnEmptyState = () => (
	<Card>
		<CardHeader title="Returns this month" />
		<CardDivider />
		<CardBody>
			<EmptyState icon="undo">
				<p>No returns this month. Anything you send back shows up here.</p>
				<ButtonLink onClick={noop}>SEE LAST MONTH</ButtonLink>
			</EmptyState>
		</CardBody>
	</Card>
)

/* `path` draws a glyph the registry has never heard of, and wins over `name`. This is how a
   category the reader picked from Tabler's 5,129 icons is drawn without loading any of them. */
export const ACustomPath = () => (
	<div style={{ display: 'grid', gap: 14 }}>
		<div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
			<Icon path={COFFEE} style={glyph} />
			<span className="field-help">path, drawn straight from the record</span>
		</div>
		<CategoryPreview icon="tag" iconPath={COFFEE} colour="var(--donut-orange)" name="Eating out" />
		<Card>
			<CardBody variant="card-body-tight">
				<CategoryRow category={{ name: 'Eating out', icon: 'tag', iconPath: COFFEE,
					colour: 'var(--donut-orange)', spend: 1240, share: 9.4 }} to="/categories/1" />
				<CategoryRow category={{ name: 'Groceries', icon: 'cart',
					colour: 'var(--donut-blue)', spend: 4820, share: 38.6 }} to="/categories/2" />
			</CardBody>
		</Card>
	</div>
)
