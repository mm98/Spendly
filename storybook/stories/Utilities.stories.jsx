import { expect, fn, userEvent } from 'storybook/test'
import { Kbd, Empty, EmptyTitle, EmptyBody, Skeleton, Spinner, Redacted, AddRow, Hold } from '../../react/src/components/Utilities.jsx'
import { Card, Cards } from '../../react/src/components/Card.jsx'
import { Button } from '../../react/src/components/Button.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { iconControl } from './controls.js'

const text = description => ({ control: 'text', description })

export default {
	title: 'States/Empty, loading and keys',
	component: Empty,
	subcomponents: { EmptyTitle, EmptyBody, Kbd, Skeleton, Spinner, Redacted, AddRow, Hold }
}

export const EmptyStates = {
		args: { icon: 'receipt', title: 'No orders in August', body: 'Every order you scan or enter will appear here.', dashed: false, onNew: fn(), onClear: fn() },
	argTypes: { icon: iconControl, title: text('EmptyTitle\'s words'), body: text('EmptyBody\'s words') },
	render: ({ icon, title, body, dashed, onNew, onClear }) => (
		<Cards>
			<Card>
				<Empty dashed={dashed}>
					<Mark size="large" fill="none" aria-label={title}><Icon name={icon} /></Mark>
					<EmptyTitle>{title}</EmptyTitle>
					<EmptyBody>{body}</EmptyBody>
					<Button iconStart="plus" onClick={onNew}>New order</Button>
				</Empty>
			</Card>
			<Card>
				<Empty dashed>
					<EmptyTitle>Nothing matches those filters</EmptyTitle>
					<EmptyBody>Three filters are on: August, Decor, over 1.000 kr.</EmptyBody>
					<Button variant="outline" onClick={onClear}>Clear the filters</Button>
				</Empty>
			</Card>
		</Cards>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Clear the filters' }))
		await expect(args.onClear).toHaveBeenCalledOnce()
	}
}

export const OneSkeleton = {
	args: { shape: 'line' },
	parameters: { variantsOf: Skeleton },
	render: args => <div style={{ maxWidth: 320 }}><Skeleton {...args} /></div>
}

export const Loading = {
	args: { words: 'Reading the receipt' },
	argTypes: { words: text('What the spinner says it is doing') },
	render: ({ words }) => (
		<div className="sp-stack sp-gap-12" style={{ maxWidth: 560 }}>
			<div className="sp-row-flex sp-gap-12">
				<Skeleton shape="mark" />
				<div className="sp-stack sp-gap-6 sp-grow">
					<Skeleton shape="title" />
					<Skeleton shape="line" />
				</div>
				<Skeleton shape="pill" />
				<Skeleton shape="end" />
			</div>
			<div className="sp-row-flex sp-gap-8">
				<Spinner />
				<span className="sp-subtitle">{words}</span>
			</div>
		</div>
	)
}

export const HeldInPlace = {
	args: { shape: 'Save order', words: 'Saving' },
	argTypes: { shape: text('The button whose room Hold keeps'), words: text('What shows in its place') },
	render: ({ shape, words }) => (
		<Hold shape={<Button>{shape}</Button>}>
			<span className="sp-row-flex sp-gap-8"><Spinner /><span className="sp-subtitle">{words}</span></span>
		</Hold>
	)
}

export const Keys = {
	args: { children: '?', accent: true },
	parameters: { variantsOf: Kbd },
	render: args => (
		<div className="sp-stack sp-gap-8">
			<span className="sp-row-flex sp-gap-8"><Kbd>S</Kbd><span className="sp-subtitle">focuses the search</span></span>
			<span className="sp-row-flex sp-gap-8"><Kbd>N</Kbd><span className="sp-subtitle">starts an order</span></span>
			<span className="sp-row-flex sp-gap-8"><Kbd {...args} /><span className="sp-subtitle">lists every shortcut</span></span>
		</div>
	)
}

export const HiddenAmount = {
	args: { label: 'Spent this month' },
	argTypes: { label: text('The words before the hidden amount') },
	render: ({ label }) => <span className="sp-row-flex sp-gap-8"><span className="sp-subtitle">{label}</span><Redacted /></span>
}

export const AddARow = {
	parameters: { variantsOf: AddRow },
	args: { children: 'Add a line', onClick: fn() },
	argTypes: { children: text('What the row adds') },
	render: args => <div style={{ maxWidth: 360 }}><AddRow {...args} /></div>,
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: /Add a line/ }))
		await expect(args.onClick).toHaveBeenCalledOnce()
	}
}
