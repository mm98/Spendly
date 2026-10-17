import { useRef, useState } from 'react'
import { findCompany } from '../api/client.js'

/* A CVR number looked up in the register as it is typed (Invoice 24c, 24d; Vendors 5m). */

export const cvrOf = text => String(text ?? '').replace(/\s+/g, '')
export const isCvr = text => /^\d{8}$/.test(cvrOf(text))

/** `type(text)` with every change of a CVR field: eight digits ask the register at once. `found` is the company
    for the number typed last; `status` is 'looking', 'none', 'limit', 'failed' or null. `onFound(company)` runs per find. */
export function useCompanyLookup(onFound) {
	const [found, setFound] = useState(null)
	const [status, setStatus] = useState(null)
	// the number asked last; an answer for an earlier one is dropped
	const asked = useRef(null)
	const said = useRef(onFound)
	said.current = onFound

	const lookUp = number => {
		asked.current = number
		setStatus('looking')
		findCompany(number)
			.then(answer => {
				if (asked.current !== number) return
				if (answer.status !== 'found') return setStatus(answer.status)
				setStatus(null)
				setFound(answer.company)
				said.current?.(answer.company)
			})
			.catch(() => { if (asked.current === number) setStatus('failed') })
	}

	const type = text => {
		const number = cvrOf(text)
		if (number === asked.current) return
		setFound(null)
		setStatus(null)
		asked.current = null
		if (isCvr(number)) lookUp(number)
	}

	return { found, status, type, lookUp }
}
