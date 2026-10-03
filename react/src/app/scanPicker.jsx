import { useLocation, useNavigate } from 'react-router'
import { FILE_TYPES } from '../components/FileDrop.jsx'

// one input on the page itself, so a chosen file still arrives after the control that opened it is gone
let picker = null

/* The Scan receipt path (16a): the file picker at once, a chosen file straight to reading (3a step 2),
   carrying the page it started from for Discard (6e). Cancelling the picker changes nothing. */
export function useScanPicker() {
	const navigate = useNavigate()
	const { pathname, search } = useLocation()
	const open = () => {
		picker ??= Object.assign(document.createElement('input'), { type: 'file', accept: FILE_TYPES, hidden: true, tabIndex: -1 })
		if (!picker.isConnected) document.body.append(picker)
		const from = pathname + search
		picker.onchange = () => {
			const file = picker.files?.[0]
			picker.value = ''
			if (file) navigate('/orders/new?source=scan', { state: { file, from } })
		}
		picker.click()
	}
	return { open }
}
