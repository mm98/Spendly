import { Card, CardBody, CardHeader, Cards, Toolbar, ListFooter } from '../../react/src/components/Card.jsx'
import { Well, Halves } from '../../react/src/components/Well.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { Pill } from '../../react/src/components/Pill.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Segmented } from '../../react/src/components/Segmented.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { knownAccessibilityFaults, useHeld } from './controls.js'

// The card's words are plain text controls; the story lays them out as the app does.
const words = { title: { control: 'text', description: 'The first line the story puts inside' }, subtitle: { control: 'text', description: 'The second line' } }

export default {
	title: 'Layout/Card',
	component: Card,
	subcomponents: { CardHeader, CardBody, Cards, Toolbar, ListFooter, Well, Halves },
	args: { title: 'A card', subtitle: 'Its second line.' },
	argTypes: { ...words, children: { control: false }, footer: { control: false }, after: { control: false } },
	render: ({ title, subtitle, ...args }) => (
		<Card {...args}>
			<span className="sp-title">{title}</span>
			<span className="sp-subtitle">{subtitle}</span>
		</Card>
	)
}

export const Plain = {}
export const Warning = { args: { color: 'warning', title: 'Warning', subtitle: 'Something to deal with.' } }
export const Danger = { args: { color: 'danger', title: 'Danger', subtitle: 'Something that failed.' } }
export const WithFooter = {
	args: { title: 'A pair', subtitle: 'Equal halves, both at the committing size.', footerLayout: 'split', footerCommits: true, onSave: fn(), onCancel: fn() },
	render: ({ title, subtitle, onSave, onCancel, ...args }) => (
		<Card {...args} footer={[<Button key="a" variant="text" onClick={onCancel}>Cancel</Button>, <Button key="b" onClick={onSave}>Save</Button>]}>
			<span className="sp-title">{title}</span>
			<span className="sp-subtitle">{subtitle}</span>
		</Card>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
		await expect(args.onSave).toHaveBeenCalledOnce()
	}
}

export const Head = {
	args: { name: 'Drafts', meta: 'newest 3', aside: '', asideTone: 'default', dismissLabel: 'Hide the drafts', onDismiss: fn() },
	parameters: { variantsOf: CardHeader },
	render: ({ name, meta, aside, asideTone, dismissLabel, onDismiss }) => (
		<Card>
			<CardHeader name={name} meta={meta} aside={aside} asideTone={asideTone} onDismiss={onDismiss} dismissLabel={dismissLabel} />
			<span className="sp-data">Indbo Møbler · 19/08</span>
		</Card>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Hide the drafts' }))
		await expect(args.onDismiss).toHaveBeenCalledOnce()
	}
}

export const Heads = {
		render: () => (
		<Cards>
			<Card><CardHeader name="Needs a look" /><span className="sp-data">2 categories over their limit</span></Card>
			<Card><CardHeader name="Drafts" meta="newest 3" actions={[{ label: 'All 5', to: '/orders' }]} /><span className="sp-data">Indbo Møbler · 19/08</span></Card>
			<Card><CardHeader name="Top vendors" aside="August · top 8 of 10" /><span className="sp-data">Indbo Møbler · 24.310 kr.</span></Card>
			<Card><CardHeader name="Items · 2" aside="1 line needs attention" asideTone="danger" /><span className="sp-data">Lounge chair · 2 × 4.129,00</span></Card>
			<Card><CardHeader name="Spend by month" control={<Segmented name="head" options={[{ value: 's', label: 'Stacked' }, { value: 't', label: 'Total' }]} defaultValue="s" />} /><span className="sp-data">Jan to Aug</span></Card>
			<Card><CardHeader name="Spend, August" status={<Pill color="danger">2.100 over</Pill>} /><span className="sp-stat__figure">24.100 kr.</span></Card>
			<Card><CardHeader name="August 2026" onDismiss={() => {}} dismissLabel="Hide the August summary" /><span className="sp-data">61.480 kr. across 18 orders</span></Card>
		</Cards>
	)
}

export const Footers = {
	render: () => (
		<Cards>
			<Card footer={<Button>Save</Button>}>
				<span className="sp-title">One action</span>
				<span className="sp-subtitle">It fills the footer.</span>
			</Card>
			<Card footerLayout="split" footerCommits footer={[<Button key="a" variant="text">Cancel</Button>, <Button key="b">Save</Button>]}>
				<span className="sp-title">A pair</span>
				<span className="sp-subtitle">Equal halves, both at the committing size.</span>
			</Card>
			<Card variant="flush">
				<CardBody>
					<span className="sp-title">Flush</span>
					<span className="sp-subtitle">No gap and no padding of its own.</span>
				</CardBody>
			</Card>
		</Cards>
	)
}

export const ShellAndLink = {
	render: () => (
		<Cards>
			<Card variant="shell">
				<span className="sp-section-label">August</span>
				<span className="sp-stat__figure">61.480,00 kr.</span>
				<span className="sp-meta">Across 18 orders</span>
			</Card>
			<Card chevron={<Icon name="chevron-right" />} to="/orders">
				<span className="sp-title">A card that opens</span>
				<span className="sp-subtitle">The whole card is the link.</span>
			</Card>
			<Card variant="row">
				<Mark size="medium" fill="solid">Indbo Møbler</Mark>
				<div className="sp-stack">
					<span className="sp-title">Row</span>
					<span className="sp-subtitle">The card lays its children in a line.</span>
				</div>
			</Card>
		</Cards>
	)
}

export const InAWell = {
	args: { variant: 'default', color: 'default', title: 'Default', subtitle: 'Its own thing inside the card.' },
	parameters: { variantsOf: Well },
	render: ({ variant, color, title, subtitle }) => (
		<Card><Well variant={variant} color={color}><span className="sp-title">{title}</span><span className="sp-subtitle">{subtitle}</span></Well></Card>
	)
}

export const Wells = {
	parameters: { a11y: knownAccessibilityFaults },
	render: () => (
		<Cards>
			<Card><Well><span className="sp-title">Default</span><span className="sp-subtitle">Its own thing inside the card.</span></Well></Card>
			<Card><Well variant="quiet"><span className="sp-data">18 records</span><span className="sp-subtitle">Tighter, for a pair of lines.</span></Well></Card>
			<Card><Well color="danger"><span className="sp-title">Danger</span><span className="sp-subtitle">What went wrong.</span></Well></Card>
			<Card>
				<Halves>
					<Well variant="quiet"><span className="sp-meta">Budget</span><span className="sp-data">40.000 kr.</span></Well>
					<Well variant="quiet"><span className="sp-meta">Spent</span><span className="sp-data">31.250 kr.</span></Well>
				</Halves>
			</Card>
		</Cards>
	)
}

export const ToolbarAndFooter = {
	args: { variant: 'default', label: 'Recent orders' },
	argTypes: { label: { control: 'text', description: 'The toolbar\'s words' } },
	parameters: { variantsOf: Toolbar },
	render: ({ variant, label }) => (
		<Card variant="flush">
			<Toolbar variant={variant}><span className="sp-section-label">{label}</span></Toolbar>
			<CardBody><span className="sp-data">Indbo Møbler · 4.129,00 kr.</span></CardBody>
			<ListFooter><span className="sp-meta">Showing 1 of 18</span></ListFooter>
		</Card>
	)
}

export const Folding = {
	args: { open: true, onToggle: fn() },
	argTypes: { open: { control: 'boolean', description: 'Toolbar\'s `expanded` and CardBody\'s `open`: the body unfolded' }, onToggle: { description: 'The toolbar pressed' } },
	render: ({ onToggle, ...args }) => {
		const [open, setOpen] = useHeld(args, 'open')
		return (
			<Card variant="flush">
				<Toolbar variant="toggle" expanded={open} onClick={() => { setOpen(!open); onToggle() }} chevron={<Icon name="chevron-down" />}>
					<span className="sp-title">Order details</span>
				</Toolbar>
				<CardBody open={open}><span className="sp-data">Indbo Møbler · 4.129,00 kr.</span></CardBody>
			</Card>
		)
	},
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Order details' }))
		await expect(args.onToggle).toHaveBeenCalled()
		await waitFor(() => expect(canvas.queryByText('Indbo Møbler · 4.129,00 kr.')).toBeNull())
		await userEvent.click(canvas.getByRole('button', { name: 'Order details' }))
		await canvas.findByText('Indbo Møbler · 4.129,00 kr.')
	}
}
