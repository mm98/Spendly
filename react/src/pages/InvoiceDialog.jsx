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

const CVR_HELP = 'For a company. Fills in its name and address from the CVR register.'
// the help line under CVR after a lookup that found nothing to show (24c)
const said = (status, cvr) => ({
	none: `No company has CVR ${cvr} in the register. Check the number.`,
	limit: 'Company lookup is not available until tomorrow. Type the address instead.',
	failed: 'The company could not be looked up. Try again, or type the address.'
})[status]
// the preview redraws once typing pauses, not at every key
const PREVIEW_PAUSE_MS = 300

const cvrOf = text => text.replace(/\s+/g, '')
const isCvr = text => /^\d{8}$/.test(cvrOf(text))

/** Make invoice (Invoice 24c, 24d): who the invoice is for, beside the page as it will download. */
export function InvoiceDialog({ order, onClose }) {
	const remembered = useApi(getInvoiceRecipient, [])
	// Add them saves the vendor on its own page, so the next dialog reads both again
	useEffect(() => () => { invalidate(getInvoiceRecipient); invalidate(getInvoiceSender) }, [])
	if (remembered.loading && !remembered.data && !remembered.error) return null
	return <InvoiceForm order={order} remembered={remembered.data ?? null} onClose={onClose} />
}

function InvoiceForm({ order, remembered, onClose }) {
	const toast = useToast()
	const sender = useApi(getInvoiceSender, [order.id]).data
	// the vendor's own fields, in its order (5m); the remembered recipient is edited in place
	const [name, setName] = useState(remembered?.name ?? '')
	const [country, setCountry] = useState(remembered?.country ?? 'DK')
	const [cvr, setCvr] = useState(remembered?.cvr ?? '')
	const [vatNumber, setVatNumber] = useState(remembered?.vatNumber ?? '')
	const [address, setAddress] = useState(remembered?.address.join('\n') ?? '')
	const [att, setAtt] = useState(remembered?.att ?? '')
	// the lookup: the company the CVR number found, or what the last lookup said
	const [found, setFound] = useState(null)
	const [status, setStatus] = useState(null)
	const [problem, setProblem] = useState(null)
	const [making, setMaking] = useState(false)
	const asked = useRef(null)
	const denmark = country === 'DK'

	const lookUp = number => {
		asked.current = number
		setStatus('looking')
		findInvoiceCompany(number)
			.then(answer => {
				if (asked.current !== number) return
				if (answer.status !== 'found') return setStatus(answer.status)
				setStatus(null)
				setFound(answer.company)
				// clearing the number turns Address back into a field, holding what the register gave
				setAddress(answer.company.address.join('\n'))
				setName(was => was.trim() ? was : answer.company.name)
			})
			.catch(() => { if (asked.current === number) setStatus('failed') })
	}

	// a remembered company is shown from what the register already gave, which costs no new lookup
	useEffect(() => { if (denmark && isCvr(cvr)) lookUp(cvrOf(cvr)) }, [])

	const changeCvr = text => {
		setCvr(text)
		setProblem(null)
		const number = cvrOf(text)
		if (found?.cvr === number) return
		setFound(null)
		setStatus(null)
		asked.current = null
		// eight digits look the company up at once
		if (isCvr(number)) lookUp(number)
	}

	const recipient = {
		name: name.trim(), country, cvr: denmark ? cvrOf(cvr) : '', vatNumber: denmark ? '' : vatNumber.trim(),
		address: address.split('\n'), att: att.trim()
	}

	// the preview follows the fields once they rest
	const wanted = invoicePreviewUrl(order.id, recipient, NUMBER_LOCALE)
	const [preview, setPreview] = useState(wanted)
	useEffect(() => {
		const timer = setTimeout(() => setPreview(wanted), PREVIEW_PAUSE_MS)
		return () => clearTimeout(timer)
	}, [wanted])

	const download = () => {
		if (recipient.cvr && !isCvr(recipient.cvr)) {
			setProblem('A CVR number has 8 digits.')
			return
		}
		setMaking(true)
		makeInvoice(order.id, { recipient, locale: NUMBER_LOCALE })
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
	const shown = denmark && found && found.cvr === cvrOf(cvr) ? found : null
	const cvrHelp = problem ?? (status === 'looking' ? 'Looking up…' : said(status, cvrOf(cvr)) ?? (shown ? undefined : CVR_HELP))

	return (
		<Dialog variant="preview" onCancel={onClose}>
			<DialogTitle>Make an invoice</DialogTitle>
			<DialogSplit>
				<DialogFields>
					<DialogBody>{[vendorName(order), longDate(order.date), currency(order.total)].filter(Boolean).join(', ')}</DialogBody>
					{missing.length ? <MissingAlert sender={sender} onLeave={onClose} /> : null}
					<Field id="invoice-name" label="Name">
						<TextField value={name} onChange={setName} />
					</Field>
					<Field id="invoice-country" label="Country">
						<CountryCombobox value={country} onChange={v => { setCountry(v); setProblem(null) }} />
					</Field>
					{denmark
						? (
							<Field id="invoice-cvr" label="CVR" message={cvrHelp} messageType={problem ? 'danger' : 'hint'}>
								<TextField value={cvr} inputMode="numeric" placeholder="8 digits" onChange={changeCvr}
									onKeyDown={ev => { if (ev.key === 'Enter' && status === 'failed' && isCvr(cvr)) { ev.preventDefault(); lookUp(cvrOf(cvr)) } }} />
							</Field>
						)
						: (
							<Field id="invoice-vat" label="VAT number">
								<TextField value={vatNumber} onChange={setVatNumber} />
							</Field>
						)}
					{shown
						? (
							<div className="sp-field">
								<span className="sp-field__label" id="invoice-address-label">Address</span>
								<Well variant="quiet" aria-labelledby="invoice-address-label">
									{[shown.name, ...shown.address].map((line, i) => <span key={i} className="sp-data">{line}</span>)}
								</Well>
								<span className="sp-field__help">From the CVR register.</span>
							</div>
						)
						: (
							<Field id="invoice-address" label="Address">
								<TextField multiline rows={2} value={address} onChange={setAddress} />
							</Field>
						)}
					<Field id="invoice-att" label="Att.">
						<TextField value={att} onChange={setAtt} />
					</Field>
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

/** What the vendor lacks for the From box (24d), with the way to add it on its page, in the same tab. A
    CVR number the register does not know is not printed, so it is named as a number to check. */
function MissingAlert({ sender, onLeave }) {
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
			The invoice shows {shows}. <a href={`#/vendors/${sender.vendorId}/edit`} onClick={onLeave}>{fix}</a>
		</Alert>
	)
}
