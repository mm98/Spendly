import { expect, fn, userEvent } from 'storybook/test'
import { Button, IconButton } from '../../react/src/components/Button.jsx'
import { iconControl } from './controls.js'

export default {
	title: 'Controls/Button',
	component: Button,
	subcomponents: { IconButton },
	args: { children: 'Save order', disabled: false, onClick: fn() },
	argTypes: { iconStart: iconControl, iconEnd: iconControl }
}

export const Solid = {
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Save order' }))
		await expect(args.onClick).toHaveBeenCalledOnce()
	}
}
export const Outline = { args: { variant: 'outline' } }
export const Text = { args: { variant: 'text' } }
export const Danger = { args: { color: 'danger', children: 'Delete order' } }
export const WithIcon = { args: { variant: 'outline', iconStart: 'plus', children: 'New order' } }
export const Small = { args: { variant: 'outline', size: 'small', children: 'All 5' } }
export const FullWidth = { args: { fullWidth: true } }
export const Disabled = {
	args: { disabled: true },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button'), { pointerEventsCheck: 0 })
		await expect(args.onClick).not.toHaveBeenCalled()
	}
}

export const AllDisabled = {
	args: { size: 'standard' },
	render: ({ size }) => (
		<div className="sp-row-flex sp-gap-8">
			<Button size={size} disabled>Solid</Button>
			<Button size={size} variant="outline" disabled>Outline</Button>
			<Button size={size} variant="text" disabled>Text</Button>
			<Button size={size} color="danger" disabled>Danger</Button>
			<IconButton icon="dots-vertical" aria-label="More" disabled />
		</div>
	)
}

export const Icon = {
	args: { icon: 'dots-vertical', 'aria-label': 'More', variant: 'bare', size: 'row', danger: false, disabled: false, onClick: fn() },
	argTypes: { icon: iconControl },
	parameters: { variantsOf: IconButton },
	render: ({ children, iconStart, iconEnd, fullWidth, color, border, ...args }) => <IconButton {...args} />,
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'More' }))
		await expect(args.onClick).toHaveBeenCalledOnce()
	}
}

export const IconButtons = {
	render: () => (
		<div className="sp-row-flex sp-gap-8">
			<IconButton icon="dots-vertical" aria-label="More" />
			<IconButton icon="pencil" variant="outline" aria-label="Edit" />
			<IconButton icon="x" variant="quiet" aria-label="Close" />
			<IconButton icon="trash" danger aria-label="Delete" />
			<IconButton icon="x" size="small" aria-label="Remove" />
		</div>
	)
}
