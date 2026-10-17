import { useCallback, useRef, useState } from 'react'
import { EmailLine } from '../components/EmailLine.jsx'
import { Navigate } from 'react-router'
import { ListItem } from '../components/ListItem.jsx'
import { Mark, initialsOf } from '../components/Mark.jsx'
import { Icon } from '../components/Icon.jsx'
import { Anchor } from '../components/Overlays.jsx'
import { Stacked, useDismiss } from '../components/Utilities.jsx'
import { getCurrentUser } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { useShellShape } from '../app/useMedia.js'
import { AccountMenu } from '../app/AppShell.jsx'

const ROWS = [
	{ to: '/budget', label: 'Budget' },
	{ to: '/vendors', label: 'Vendors' },
	{ to: '/categories', label: 'Categories' },
	{ to: '/bookmarks', label: 'Bookmarks' },
	{ to: '/more/views', label: 'Saved views' },
	{ to: '/settings', label: 'Settings' }
]

/** Below 640, what the sidebar holds beyond the four tabs, in sidebar order (9h). Wider, the
    sidebar holds them itself, so the page gives way to Settings. */
export default function More() {
	const user = useApi(getCurrentUser)
	const touch = useShellShape() === 'touch'
	const email = user.data?.email
	const name = user.data?.name || null
	const picture = user.data?.picture || null
	const chevron = <Icon name="chevron-right" size={14} />
	if (!touch) return <Navigate to="/settings" replace />
	return (
		<>
			{email ? <Account name={name} picture={picture} email={email} chevron={chevron} /> : null}
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
function Account({ name, picture, email, chevron }) {
	const [open, setOpen] = useState(false)
	const box = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useDismiss(box, open, close)
	return (
		<Anchor ref={box} open={open}>
			<ListItem variant="card" chevron={chevron} onClick={() => setOpen(!open)}
				aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} aria-label={name ? `${name}, ${email}` : email}
				mark={picture
					? <Mark size="large" fill="photo" round aria-hidden="true" aria-label={name || email}><img src={picture} alt="" /></Mark>
					: <Mark size="large" fill="solid" swatch="green-3" round role="img" aria-label={name || email}><>{initialsOf(name || email.split('@')[0])}</></Mark>}>
				<Stacked>
					{name ? <span className="sp-heading sp-truncate">{name}</span> : null}
					<EmailLine email={email} tone="meta" />
				</Stacked>
			</ListItem>
			<AccountMenu name={name} email={email} position="floating" onClose={close} />
		</Anchor>
	)
}
