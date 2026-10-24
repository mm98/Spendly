import { Button, IconButton } from '../../react/src/components/Button.jsx'

export default {
	title: 'Controls/Button',
	component: Button,
	args: { children: 'Save order' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['solid', 'outline', 'text'] },
		color: { control: 'inline-radio', options: ['primary', 'warning', 'danger'] },
		size: { control: 'inline-radio', options: ['standard', 'small', 'xsmall'] },
		border: { control: 'inline-radio', options: ['line', 'inherit'] }
	}
}

export const Solid = {}
export const Outline = { args: { variant: 'outline' } }
export const Text = { args: { variant: 'text' } }
export const Danger = { args: { color: 'danger', children: 'Delete order' } }
export const WithIcon = { args: { variant: 'outline', iconStart: 'plus', children: 'New order' } }
export const Small = { args: { variant: 'outline', size: 'small', children: 'All 5' } }
export const FullWidth = { args: { fullWidth: true } }

export const Disabled = {
	render: () => (
		<div className="sp-row-flex sp-gap-8">
			<Button disabled>Solid</Button>
			<Button variant="outline" disabled>Outline</Button>
			<Button variant="text" disabled>Text</Button>
			<Button color="danger" disabled>Danger</Button>
			<IconButton icon="dots-vertical" aria-label="More" disabled />
		</div>
	)
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
