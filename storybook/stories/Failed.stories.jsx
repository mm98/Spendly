import { expect, fn, userEvent } from 'storybook/test'
import { Failed } from '../../react/src/components/Failed.jsx'
import { knownAccessibilityFaults } from './controls.js'

export default {
	title: 'States/Did not load',
	component: Failed,
	args: { what: 'Orders', label: 'Orders', onRetry: fn(), error: { status: 0 } },
	// the card form names its card; the page form has no place for a name
	argTypes: { label: { if: { arg: 'variant', eq: 'card' } } }
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
export const Gone = { parameters: { a11y: knownAccessibilityFaults }, args: { what: 'This order', label: 'This order', error: { status: 404 }, back: { to: '/orders', label: 'All orders' } } }
