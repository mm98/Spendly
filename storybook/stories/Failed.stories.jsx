import { expect, fn, userEvent } from 'storybook/test'
import { Failed } from '../../react/src/components/Failed.jsx'

export default {
	title: 'States/Did not load',
	component: Failed,
	args: { what: 'Orders', onRetry: fn(), error: { status: 0 } }
}

export const NoConnection = {
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button'))
		await expect(args.onRetry).toHaveBeenCalledOnce()
	}
}
export const ServerProblem = { args: { error: { status: 500 } } }
export const InACard = { args: { variant: 'card', label: 'Top vendors', what: 'Top vendors' } }
export const Gone = { args: { what: 'This order', error: { status: 404 }, back: { to: '/orders', label: 'All orders' } } }
