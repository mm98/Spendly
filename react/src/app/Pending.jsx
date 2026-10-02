import { Empty, EmptyBody, EmptyTitle } from '../components/Utilities.jsx'

/** Stands in for a screen while it is being rebuilt on the design system. */
export function Pending({ what }) {
	return (
		<Empty dashed>
			<EmptyTitle>{what}</EmptyTitle>
			<EmptyBody>This screen is being rebuilt.</EmptyBody>
		</Empty>
	)
}
