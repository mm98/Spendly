import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { logout } from '../api/client.js'

/** The sign-in page as Sign out reaches it (9c). The session ends here, once the shell and its
    readers are gone, so nothing still on screen asks the server again as it ends. */
export function SignedOut({ children }) {
	const { state, pathname, search } = useLocation()
	const navigate = useNavigate()
	const ending = state?.signOut === true
	const [settled, setSettled] = useState(!ending)
	const started = useRef(false)
	useEffect(() => {
		if (!ending || started.current) return
		started.current = true
		// the step forgets why it came, so Back to it later does not sign out a new session
		logout().catch(() => {}).finally(() => {
			setSettled(true)
			navigate({ pathname, search }, { replace: true, state: null })
		})
	}, [ending, navigate, pathname, search])
	return settled ? children : null
}
