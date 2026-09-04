import { RouteError } from 'spendly-react'

// The route's own errorElement. It takes no props and renders the same card whatever was
// thrown -- the error itself only reaches the browser console in development.

export const ThePageDidNotLoad = () => (
	<div style={{ width: 420 }}>
		<RouteError />
	</div>
)
