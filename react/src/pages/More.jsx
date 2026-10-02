import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { getCurrentUser } from '../api/client.js'
import { useApi } from '../api/useApi.js'

const ROWS = [
	{ to: '/budget', label: 'Budget' },
	{ to: '/vendors', label: 'Vendors' },
	{ to: '/categories', label: 'Categories' },
	{ to: '/bookmarks', label: 'Bookmarks' },
	{ to: '/settings', label: 'Settings' }
]

/** Below 640, what the sidebar holds beyond the four tabs, in sidebar order (9h). */
export default function More() {
	const user = useApi(getCurrentUser)
	const email = user.data?.email
	const chevron = <Icon name="chevron-right" />
	return (
		<>
			{email
				? (
					<ListItem variant="card" chevron={chevron} to="/settings"
						mark={<Mark size="large" fill="solid" round>{email.split('@')[0]}</Mark>}>
						<span className="sp-stack sp-gap-6 sp-grow"><span className="sp-meta sp-truncate">{email}</span></span>
					</ListItem>
				)
				: null}
			{ROWS.map(row => (
				<ListItem key={row.to} variant="card" chevron={chevron} to={row.to}>
					<span className="sp-data sp-grow">{row.label}</span>
				</ListItem>
			))}
		</>
	)
}
