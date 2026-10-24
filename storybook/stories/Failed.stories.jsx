import { expect, fn, userEvent } from 'storybook/test'
import { Failed } from '../../react/src/components/Failed.jsx'
import { knownAccessibilityFaults } from './controls.js'

export default {
	title: 'States/Did not load',
	component: Failed,
	args: { what: 'Orders', onRetry: fn(), error: { status: 0 } }
}

export const NoConnection = {
	parameters: { a11y: knownAccessibilityFaults },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button'))
		await expect(args.onRetry).toHaveBeenCalledOnce()
	}
}
export const ServerProblem = { parameters: { a11y: knownAccessibilityFaults }, args: { error: { status: 500 } } }
export const InACard = { args: { variant: 'card', label: 'Top vendors', what: 'Top vendors' } }
export const Gone = { parameters: { a11y: knownAccessibilityFaults }, args: { what: 'This order', error: { status: 404 }, back: { to: '/orders', label: 'All orders' } } }
