import { useEffect, useRef, useState } from 'react'
import { Alert, Dialog, DialogActions, DialogBody, DialogFields, DialogPreview, DialogSplit, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Button } from '../components/Button.jsx'
import { Field } from '../components/Field.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Well } from '../components/Well.jsx'
import { failureMessage, findInvoiceCompany, getInvoiceRecipient, getInvoiceSender, invoicePreviewUrl, makeInvoice } from '../api/client.js'
import { invalidate, useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, currency, longDate } from '../api/format.js'
import { CountryCombobox } from '../app/countries.jsx'
import { vendorName } from '../app/orderRow.jsx'

const HELP = 'A CVR number or a company name.'
// what the help line under Recipient says after a lookup (24c)
const SAID = {
	none: 'No Danish company found. Type the address instead.',
	limit: 'Company lookup is not available until tomorrow. Type the address instead.',
	failed: 'The company could not be looked up. Try again, or type the address instead.'
}
// the preview redraws once typing pauses, not at every key
const PREVIEW_PAUSE_MS = 300

const cvrOf = text => text.replace(/\s+/g, '')
const isCvr = text => /^\d{8}$/.test(cvrOf(text))

/** Make invoice (Invoice 24c, 24d): who the invoice is for, beside the page as it will download. */
export function InvoiceDialog({ order, onClose }) {
	const remembered = useApi(getInvoiceRecipient, [])
	// the vendor can be changed in another tab meanwhile (Add them), so the next dialog reads both again
	useEffect(() => () => { invalidate(getInvoiceRecipient); invalidate(getInvoiceSender) }, [])
	if (remembered.loading && !remembered.data && !remembered.error) return null
	return <InvoiceForm order={order} remembered={remembered.data ?? null} onClose={onClose} />
}

function InvoiceForm({ order, remembered, onClose }) {
	const toast = useToast()
	const sender = useApi(getInvoiceSender, [order.id]).data
	const [typed, setTyped] = useState(Boolean(remembered?.typed))
	// the lookup: what is typed, the company it found, and what the last lookup said
	const [query, setQuery] = useState(remembered && !remembered.typed ? remembered.lookup ?? '' : '')
	const [found, setFound] = useState(remembered && !remembered.typed
		? { cvr: remembered.cvr, name: remembered.name, address: remembered.address } : null)
	const [said, setSaid] = useState(null)
	const [looking, setLooking] = useState(false)
	// the typed recipient (24d)
	const [company, setCompany] = useState(remembered?.typed ? remembered.name : '')
	const [address, setAddress] = useState(remembered?.typed ? remembered.address.join('\n') : '')
	const [country, setCountry] = useState(remembered?.typed ? remembered.country : 'DK')
	const [att, setAtt] = useState(remembered?.att ?? '')
	const [problem, setProblem] = useState(null)
	const [making, setMaking] = useState(false)
	const asked = useRef(null)

	const lookUp = text => {
		const q = isCvr(text) ? cvrOf(text) : text.trim()
		if (!q) return
		asked.current = q
		setLooking(true)
		setSaid(null)
		findInvoiceCompany(q)
			.then(answer => {
				if (asked.current !== q) return
				setLooking(false)
				if (answer.status === 'found') return setFound(answer.company)
				setFound(null)
				setSaid(answer.status)
				// with no lookups left today the typed fields open at once
				if (answer.status === 'limit') setTyped(true)
			})
			.catch(() => {
				if (asked.current !== q) return
				setLooking(false)
				setSaid('failed')
			})
	}

	const changeQuery = text => {
		setQuery(text)
		setProblem(null)
		setSaid(null)
		if (found && cvrOf(text) !== found.cvr && text.trim() !== query.trim()) setFound(null)
		// eight digits are a CVR number, looked up at once; a name waits for Enter
		if (isCvr(text) && cvrOf(text) !== found?.cvr) lookUp(text)
	}

	const recipient = typed
		? (company.trim() ? { name: company.trim(), address: address.split('\n'), country, att: att.trim() } : null)
		: (found ? { name: found.name, address: found.address, cvr: found.cvr, country: 'DK', att: att.trim() } : null)

	// the preview follows the fields once they rest
	const wanted = invoicePreviewUrl(order.id, recipient, NUMBER_LOCALE)
	const [preview, setPreview] = useState(wanted)
	useEffect(() => {
		const timer = setTimeout(() => setPreview(wanted), PREVIEW_PAUSE_MS)
		return () => clearTimeout(timer)
	}, [wanted])

	const download = () => {
		if (!recipient) {
			setProblem(typed ? 'Type the company the invoice is for.' : 'Find the company first, or type the address instead.')
			return
		}
		setMaking(true)
		makeInvoice(order.id, { recipient, typed, lookup: typed ? undefined : query, locale: NUMBER_LOCALE })
			.then(({ blob, fileName }) => {
				const href = URL.createObjectURL(blob)
				const link = document.createElement('a')
				link.href = href
				link.download = fileName
				document.body.append(link)
				link.click()
				link.remove()
				setTimeout(() => URL.revokeObjectURL(href), 1000)
				onClose()
			})
			.catch(e => {
				setMaking(false)
				const message = failureMessage(e, 'The invoice was not made. Try again.')
				if (message) toast({ message, color: 'danger' })
			})
	}

	const missing = sender?.missing ?? []
	const lookupHelp = looking ? 'Looking up…' : SAID[said] ?? HELP

	return (
		<Dialog variant="preview" onCancel={onClose}>
			<DialogTitle>Make an invoice</DialogTitle>
			<DialogSplit>
				<DialogFields>
					<DialogBody>{[vendorName(order), longDate(order.date), currency(order.total)].filter(Boolean).join(', ')}</DialogBody>
					{missing.length ? <MissingAlert sender={sender} /> : null}
					{typed
						? (
							<>
								<Field id="invoice-company" label="Company"
									message={problem ?? (said === 'limit' ? SAID.limit : undefined)} messageType={problem ? 'danger' : 'hint'}>
									<TextField value={company} autoFocus onChange={v => { setCompany(v); setProblem(null) }} />
								</Field>
								<Field id="invoice-address" label="Address">
									<TextField multiline rows={2} value={address} onChange={setAddress} />
								</Field>
								<Field id="invoice-country" label="Country">
									<CountryCombobox value={country} onChange={setCountry} />
								</Field>
							</>
						)
						: (
							<>
								<Field id="invoice-recipient" label="Recipient" message={problem ?? lookupHelp} messageType={problem ? 'danger' : 'hint'}>
									<TextField value={query} autoFocus onChange={changeQuery}
										onKeyDown={ev => { if (ev.key === 'Enter' && !isCvr(query)) { ev.preventDefault(); lookUp(query) } }} />
								</Field>
								{found
									? (
										<Well variant="quiet">
											<span className="sp-data">{found.name}</span>
											{found.address.length ? <span className="sp-data">{found.address.join(', ')}</span> : null}
											<span className="sp-data sp-ink-2">CVR {found.cvr}</span>
										</Well>
									)
									: null}
							</>
						)}
					<Field id="invoice-att" label="Att.">
						<TextField value={att} onChange={setAtt} />
					</Field>
					<div>
						<Button variant="text" size="small" onClick={() => { setTyped(!typed); setProblem(null) }}>
							{typed ? 'Look up instead' : 'Type the address instead'}
						</Button>
					</div>
				</DialogFields>
				<DialogPreview>
					<img src={preview} alt="" width="318" height="450" />
				</DialogPreview>
			</DialogSplit>
			<DialogActions>
				<Button variant="outline" onClick={onClose}>Cancel</Button>
				<Button onClick={download} disabled={making}>Download PDF</Button>
			</DialogActions>
		</Dialog>
	)
}

/** What the vendor lacks for the From box (24d), with the way to add it on its page in a new tab. A CVR
    number the register does not know is not printed, so it is named as a number to check. */
function MissingAlert({ sender }) {
	const abroad = sender.country !== 'DK'
	const number = abroad ? 'VAT number' : 'CVR number'
	const noAddress = sender.missing.includes('address')
	const noNumber = sender.missing.includes(abroad ? 'vat' : 'cvr')
	const unknown = noNumber && sender.unknownNumber
	const shows = noAddress && noNumber ? 'its name only' : noAddress ? `its name and ${number} only` : 'its name and address only'
	const title = unknown
		? (noAddress ? `${sender.name} has no address, and its CVR number is not in the register` : `The CVR number of ${sender.name} is not in the register`)
		: `${sender.name} has no ${[noAddress && 'address', noNumber && number].filter(Boolean).join(' or ')}`
	const fix = unknown
		? (noAddress ? 'Add the address and check the number' : 'Check the number')
		: noAddress && noNumber ? 'Add them' : 'Add it'
	return (
		<Alert mark="!" title={title}>
			The invoice shows {shows}. <a href={`#/vendors/${sender.vendorId}/edit`} target="_blank" rel="noopener">{fix}</a>
		</Alert>
	)
}
