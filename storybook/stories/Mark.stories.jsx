import { Mark, MarkRemove } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { expect, fn, userEvent } from 'storybook/test'

export default {
	title: 'Controls/Mark',
	component: Mark,
	subcomponents: { MarkRemove },
	args: { children: 'Indbo Møbler', size: 'medium', fill: 'solid' },
	argTypes: { remove: { control: false } }
}

export const FromAName = {}
export const Round = { args: { round: true } }

export const Sizes = {
	render: ({ size, ...args }) => (
		<div className="sp-row-flex sp-gap-8">
			{['small', 'medium', 'large', 'xlarge'].map(each => <Mark {...args} key={each} size={each} />)}
		</div>
	)
}

export const Names = {
	render: ({ children, ...args }) => (
		<div className="sp-row-flex sp-gap-8">
			{['Indbo Møbler', 'HAY', 'Muuto', 'Bilka', 'IKEA', 'Normann Copenhagen', 'Bolia'].map(name => <Mark {...args} key={name}>{name}</Mark>)}
		</div>
	)
}

export const Fills = {
		render: ({ size }) => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size={size} aria-label="Default"><Icon name="receipt" /></Mark>
			<Mark size={size} fill="plain" aria-label="Plain"><Icon name="receipt" /></Mark>
			<Mark size={size} fill="empty" aria-label="Empty"><Icon name="photo" /></Mark>
			<Mark size={size} fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
			<Mark size={size} fill="add" aria-label="Add"><Icon name="plus" /></Mark>
		</div>
	)
}

export const WithCountAndRemove = {
	args: { size: 'large', count: 3, danger: 'Too big', onOpen: fn(), onRemove: fn() },
	render: ({ size, count, danger, onOpen, onRemove }) => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size={size} fill="plain" count={count} aria-label="Three files"><Icon name="file" /></Mark>
			<Mark size={size} fill="plain" aria-label="Receipt" onClick={onOpen}
				remove={<MarkRemove aria-label="Remove the receipt" onClick={onRemove}><Icon name="x" size={12} /></MarkRemove>}>
				<Icon name="receipt" />
			</Mark>
			<Mark size={size} fill="plain" danger={danger} aria-label="A file that failed"><Icon name="file" /></Mark>
		</div>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Remove the receipt' }))
		await expect(args.onRemove).toHaveBeenCalledOnce()
		await expect(args.onOpen).not.toHaveBeenCalled()
	}
}
