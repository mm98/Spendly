import { useCallback, useRef, useState } from 'react'
import { Navigate } from 'react-router'
import { ListItem } from '../components/ListItem.jsx'
import { Mark } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Anchor } from '../components/Overlays.jsx'
import { useDismiss } from '../components/Utilities.jsx'
import { getCurrentUser } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { useShellShape } from '../app/useMedia.js'
import { AccountMenu } from '../app/AppShell.jsx'

const ROWS = [
	{ to: '/budget', label: 'Budget' },
	{ to: '/vendors', label: 'Vendors' },
	{ to: '/categories', label: 'Categories' },
	{ to: '/bookmarks', label: 'Bookmarks' },
	{ to: '/settings', label: 'Settings' }
]

/** Below 640, what the sidebar holds beyond the four tabs, in sidebar order (9h). Wider, the
    sidebar holds them itself, so the page gives way to Settings. */
export default function More() {
	const user = useApi(getCurrentUser)
	const touch = useShellShape() === 'touch'
	const email = user.data?.email
	const chevron = <Icon name="chevron-right" size={14} />
	if (!touch) return <Navigate to="/settings" replace />
	return (
		<>
			{email ? <Account email={email} chevron={chevron} /> : null}
			{ROWS.map(row => (
				<ListItem key={row.to} variant="card" chevron={chevron} to={row.to}>
					<span className="sp-data sp-grow">{row.label}</span>
				</ListItem>
			))}
		</>
	)
}

/* The account card opens the sidebar's account menu, a sheet on a phone (9c, c9): Sign out has
   nowhere else to be. */
function Account({ email, chevron }) {
	const [open, setOpen] = useState(false)
	const box = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(box, open, close)
	return (
		<Anchor ref={box} open={open}>
			<ListItem variant="card" chevron={chevron} onClick={() => setOpen(!open)}
				aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} aria-label={email}
				mark={<Mark size="large" fill="solid" round>{email.split('@')[0]}</Mark>}>
				<span className="sp-stack sp-gap-6 sp-grow"><span className="sp-meta sp-truncate">{email}</span></span>
			</ListItem>
			<AccountMenu email={email} position="floating" onClose={close} />
		</Anchor>
	)
}
