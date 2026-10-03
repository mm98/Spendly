import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { FILE_TYPES } from '../components/FileDrop.jsx'

/* The Scan receipt path (16a): the file picker at once, a chosen file straight to reading (3a step 2),
   carrying the page it started from for Discard (6e). Cancelling the picker changes nothing. */
export function useScanPicker() {
	const navigate = useNavigate()
	const { pathname, search } = useLocation()
	const input = useRef(null)
	const take = ev => {
		const file = ev.target.files?.[0]
		ev.target.value = ''
		if (file) navigate('/orders/new?source=scan', { state: { file, from: pathname + search } })
	}
	return {
		open: () => input.current?.click(),
		input: <input ref={input} type="file" accept={FILE_TYPES} hidden tabIndex={-1} onChange={take} />
	}
}
