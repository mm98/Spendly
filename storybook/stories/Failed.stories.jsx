import { Failed } from '../../react/src/components/Failed.jsx'

export default {
	title: 'States/Did not load',
	component: Failed,
	args: { what: 'Orders', onRetry: () => {}, error: { status: 0 } },
	argTypes: { variant: { control: 'inline-radio', options: ['page', 'card'] } }
}

export const NoConnection = {}
export const ServerProblem = { args: { error: { status: 500 } } }
export const InACard = { args: { variant: 'card', label: 'Top vendors', what: 'Top vendors' } }
export const Gone = { args: { what: 'This order', error: { status: 404 }, back: { to: '/orders', label: 'All orders' } } }
