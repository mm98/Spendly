import { useCallback, useEffect, useRef, useState } from 'react'
import { askFilters, failureMessage, getAsk } from '../api/client.js'
import { invalidate, useApi } from '../api/useApi.js'
import { useToast } from '../components/Overlays.jsx'

/* Ask in a list's search (Order list 2b): a sentence sent with Enter comes back as `list`'s filters
   (lib/ask.js FILTER_LISTS), named as the assistant's tools name them. Leaving the page ends the mode. */
export function useAskSearch(list, onFilters) {
	const status = useApi(getAsk).data
	const toast = useToast()
	const [on, setOn] = useState(false)
	const [text, setTextNow] = useState('')
	const [working, setWorking] = useState(false)
	const [unread, setUnread] = useState(false)
	const running = useRef(null)
	const available = !!status?.ready
	const spent = available && status.left === 0

	// the day's questions come back at the reader's midnight, and the button with them
	useEffect(() => {
		if (!spent) return
		const now = new Date()
		const timer = setTimeout(() => invalidate(getAsk), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now + 1000)
		return () => clearTimeout(timer)
	}, [spent])
	useEffect(() => { if (spent) setOn(false) }, [spent])
	useEffect(() => () => running.current?.abort(), [])

	const setText = useCallback(next => { setUnread(false); setTextNow(next) }, [])
	const toggle = useCallback(() => { if (!spent) { setUnread(false); setOn(was => !was) } }, [spent])
	const stop = useCallback(() => running.current?.abort(), [])
	const send = useCallback(() => {
		const sentence = text.trim()
		if (!sentence || running.current) return
		const control = new AbortController()
		running.current = control
		setWorking(true)
		setUnread(false)
		askFilters(list, sentence, control.signal)
			.then(answer => onFilters(answer.filters))
			.catch(error => {
				if (control.signal.aborted) return
				if (error.status === 422) setUnread(true)
				else if (error.status !== 429) toast({ message: failureMessage(error, 'Spendly could not answer that just now.'), color: 'danger' })
			})
			.finally(() => { running.current = null; setWorking(false) })
	}, [text, list, onFilters, toast])

	return { available, spent, on: on && available && !spent, text, setText, working, unread, toggle, send, stop }
}
