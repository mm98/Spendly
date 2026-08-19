import { useEffect, useRef } from 'react'
import { IconButton } from './Button.jsx'

/* Formatted JSON, coloured the same way everywhere it appears.

   `tokenizeJson` started as Settings > Import's own reference card -- three request/response
   examples nobody types by hand, coloured the same small way a syntax highlighter is: keys
   strong, strings green, numbers blue, punctuation muted, over JSON.stringify's own output
   rather than a hand-aligned block that drifts the moment a field is added. It lives here now
   so a second reader of formatted JSON (a scanned document's own parsed read) recognises the
   same colours instead of inventing a second scheme. */
export const tokenizeJson = (text, prefix) => {
	const pattern = /("(?:[^"\\]|\\.)*")(\s*:)?|-?\d+(?:\.\d+)?|[{}[\],]/g
	const out = []
	let last = 0, n = 0, m
	while ((m = pattern.exec(text))) {
		if (m.index > last) out.push(text.slice(last, m.index))
		const key = `${prefix}-${n++}`
		if (m[1] != null) out.push(<span key={key} className={m[2] ? 'tok-key' : 'tok-str'}>{m[1]}</span>, m[2] ?? '')
		else if (/^[{}[\],]$/.test(m[0])) out.push(<span key={key} className="tok-pun">{m[0]}</span>)
		else out.push(<span key={key} className="tok-num">{m[0]}</span>)
		last = m.index + m[0].length
	}
	out.push(text.slice(last))
	return out
}

/** A value, formatted and coloured -- `.import-schema` is Settings > Import's own block. */
export const JsonBlock = ({ value, label, className }) => (
	<pre className={['import-schema', className].filter(Boolean).join(' ')} aria-label={label}>
		{tokenizeJson(JSON.stringify(value, null, 2), label ?? 'json')}
	</pre>
)

/** The formatted JSON behind a "JSON" button -- what a scan actually read, in the same shape
    Settings > Import already teaches a reader to recognise, rather than a screen's worth of
    labelled fields standing in for it. Same modal mechanics as ImageLightbox (Viz.jsx):
    showModal() traps focus and wires Escape, a click on the backdrop closes it. */
export function JsonDialog({ value, title, onClose }) {
	const ref = useRef(null)
	useEffect(() => {
		const opener = document.activeElement
		ref.current?.showModal()
		return () => opener?.focus?.()
	}, [])
	return (
		<dialog className="json-dialog" ref={ref} aria-label={title}
			onCancel={onClose}
			onClick={e => { if (e.target === ref.current) onClose() }}>
			<div className="json-dialog-card">
				<div className="json-dialog-header">
					<strong>{title}</strong>
					<IconButton icon="close" label="Close" onClick={onClose} />
				</div>
				<JsonBlock value={value} label={title} className="json-dialog-body" />
			</div>
		</dialog>
	)
}
