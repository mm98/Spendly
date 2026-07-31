import { useCallback, useEffect, useRef, useState } from 'react'

const cache = new Map()

const keyOf = (fn, args) => (fn.name || 'anonymous') + ':' + JSON.stringify(args)

export function useApi(fn, args = [], { enabled = true } = {}) {
	const key = enabled ? keyOf(fn, args) : null
	const [state, setState] = useState(() => ({
		data: key !== null ? cache.get(key) : undefined,
		error: null,
		loading: enabled && !(key !== null && cache.has(key))
	}))
	const request = useRef({ fn, args })
	request.current = { fn, args }
	const [nonce, setNonce] = useState(0)

	useEffect(() => {
		if (key === null) return
		const controller = new AbortController()
		let live = true

		if (cache.has(key)) setState({ data: cache.get(key), error: null, loading: false })
		else setState(s => ({ data: s.data, error: null, loading: true }))

		const { fn: endpoint, args: params } = request.current
		Promise.resolve()
			.then(() => endpoint(...params, controller.signal))
			.then(data => {
				if (!live) return
				cache.set(key, data)
				setState({ data, error: null, loading: false })
			})
			.catch(error => {
				if (!live || error.name === 'AbortError') return
				setState(s => ({ data: s.data, error, loading: false }))
			})

		return () => { live = false; controller.abort() }
	}, [key, nonce])

	const refresh = useCallback(() => {
		if (key !== null) cache.delete(key)
		setNonce(n => n + 1)
	}, [key])

	return { ...state, refresh }
}

export function invalidate(fn) {
	if (!fn) { cache.clear(); return }
	const prefix = (fn.name || 'anonymous') + ':'
	for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k)
}
