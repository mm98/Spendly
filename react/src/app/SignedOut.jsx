import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { logout } from '../api/client.js'
import { Toaster, useToast } from '../components/Overlays.jsx'
import { phrase } from '../language/phrases.js'

/** The sign-in page as Sign out (9c) and Delete account (11g) reach it. Sign out ends the session here,
    once the shell's readers are gone; a deleted account's is already gone, and a toast says so. */
export function SignedOut({ children }) {
	const { state, pathname, search } = useLocation()
	const navigate = useNavigate()
	const ending = state?.signOut === true
	// kept once read, since the step forgets why it came
	const [deleted] = useState(state?.accountDeleted === true)
	const [settled, setSettled] = useState(!ending)
	const started = useRef(false)
	useEffect(() => {
		if (deleted) navigate({ pathname, search }, { replace: true, state: null })
		if (!ending || started.current) return
		started.current = true
		// the step forgets why it came, so Back to it later does not sign out a new session
		logout().catch(() => {}).finally(() => {
			setSettled(true)
			navigate({ pathname, search }, { replace: true, state: null })
		})
	}, [deleted, ending, navigate, pathname, search])
	if (!settled) return null
	return deleted ? <Toaster><AccountDeleted />{children}</Toaster> : children
}

function AccountDeleted() {
	const toast = useToast()
	useEffect(() => { toast({ message: phrase('signedOut.deleted') }) }, [toast])
	return null
}
