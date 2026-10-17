import { useEffect, useState } from 'react'
import { Alert, Dialog, DialogActions, DialogBody, DialogFields, DialogPreview, DialogSplit, DialogTitle, useToast } from '../components/Overlays.jsx'
import { Button } from '../components/Button.jsx'
import { FieldGroupMore } from '../components/Choice.jsx'
import { Field } from '../components/Field.jsx'
import { TextField } from '../components/Inputs.jsx'
import { Well } from '../components/Well.jsx'
import {
	failureMessage, getInvoiceRecipient, getInvoiceSender, invalidateVendorData, invoicePreviewUrl, makeInvoice, updateVendor
} from '../api/client.js'
import { invalidate, useApi } from '../api/useApi.js'
import { NUMBER_LOCALE, currency, longDate } from '../api/format.js'
import { CountryCombobox } from '../app/countries.jsx'
import { cvrOf, isCvr, useCompanyLookup } from '../app/companyLookup.js'
import { vendorName } from '../app/orderRow.jsx'

const CVR_HELP = 'For a company. Fills in its name and address from the CVR register.'
// the help line under a CVR field while it looks up, or after a lookup that found nothing to show (24c)
const said = (status, cvr) => ({
	looking: 'Looking up…',
	none: `No company has CVR ${cvr} in the register. Check the number.`,
	limit: 'Company lookup is not available until tomorrow. Type the address instead.',
	failed: 'The company could not be looked up. Try again, or type the address.'
})[status]
// the preview redraws once typing pauses, not at every key
const PREVIEW_PAUSE_MS = 300
const EIGHT_DIGITS = 'A CVR number has 8 digits.'

// a company recipient opens with its company details showing, so it is never hidden (24c)
const isCompany = recipient => Boolean(recipient && (recipient.cvr || recipient.vatNumber || recipient.att || recipient.country !== 'DK'))

/** Make invoice (Invoice 24c, 24d): who the invoice is for, beside the page as it will download. */
export function InvoiceDialog({ order, onClose }) {
	const remembered = useApi(getInvoiceRecipient, [])
	const sender = useApi(getInvoiceSender, [order.id])
	// Download PDF can save the vendor's details, so the next dialog reads both again
	useEffect(() => () => { invalidate(getInvoiceRecipient); invalidate(getInvoiceSender) }, [])
	const waiting = read => read.loading && !read.data && !read.error
	if (waiting(remembered) || waiting(sender)) return null
	return <InvoiceForm order={order} remembered={remembered.data ?? null} sender={sender.data ?? null} onClose={onClose} />
}

function InvoiceForm({ order, remembered, sender, onClose }) {
	const toast = useToast()
	// the vendor's own fields, in its order (5m); the remembered recipient is edited in place
	const [name, setName] = useState(remembered?.name ?? '')
	const [country, setCountry] = useState(remembered?.country ?? 'DK')
	const [cvr, setCvr] = useState(remembered?.cvr ?? '')
	const [vatNumber, setVatNumber] = useState(remembered?.vatNumber ?? '')
	const [address, setAddress] = useState(remembered?.address.join('\n') ?? '')
	const [att, setAtt] = useState(remembered?.att ?? '')
	const [details, setDetails] = useState(() => isCompany(remembered))
	const [problem, setProblem] = useState(null)
	const [making, setMaking] = useState(false)
	const denmark = country === 'DK'
	const lookup = useCompanyLookup(company => {
		// clearing the number turns Address back into a field, holding what the register gave
		setAddress(company.address.join('\n'))
		setName(was => was.trim() ? was : company.name)
	})

	// what the vendor lacks, typed in the alert and saved to the vendor on Download PDF (24d)
	const [vendorCvr, setVendorCvr] = useState(sender?.unknownNumber ? sender.cvr : '')
	const [vendorVat, setVendorVat] = useState('')
	const [vendorAddress, setVendorAddress] = useState('')
	const [vendorProblem, setVendorProblem] = useState(null)
	const vendorLookup = useCompanyLookup()
	const lacks = what => Boolean(sender?.missing.includes(what))
	const vendorAbroad = sender?.country !== 'DK'
	const asksNumber = lacks(vendorAbroad ? 'vat' : 'cvr')

	// a remembered company is shown from what the register already gave, which costs no new lookup
	useEffect(() => { if (denmark && isCvr(cvr)) lookup.type(cvr) }, [])

	const changeCvr = text => {
		setCvr(text)
		setProblem(null)
		lookup.type(text)
	}
	const changeVendorCvr = text => {
		setVendorCvr(text)
		setVendorProblem(null)
		vendorLookup.type(text)
	}

	const recipient = {
		name: name.trim(), country, cvr: denmark ? cvrOf(cvr) : '', vatNumber: denmark ? '' : vatNumber.trim(),
		address: address.split('\n'), att: att.trim()
	}
	// only what the alert asks for is sent; a number the vendor already has is not typed again
	const typed = !sender ? {} : {
		...(asksNumber && !vendorAbroad && cvrOf(vendorCvr) && cvrOf(vendorCvr) !== sender.cvr ? { cvr: cvrOf(vendorCvr) } : {}),
		...(asksNumber && vendorAbroad && vendorVat.trim() ? { vatNumber: vendorVat.trim() } : {}),
		...(lacks('address') && vendorAddress.trim() ? { address: vendorAddress.trim() } : {})
	}

	// the preview follows the fields once they rest
	const wanted = invoicePreviewUrl(order.id, recipient, NUMBER_LOCALE, typed)
	const [preview, setPreview] = useState(wanted)
	useEffect(() => {
		const timer = setTimeout(() => setPreview(wanted), PREVIEW_PAUSE_MS)
		return () => clearTimeout(timer)
	}, [wanted])

	const download = () => {
		if (recipient.cvr && !isCvr(recipient.cvr)) {
			setDetails(true)
			setProblem(EIGHT_DIGITS)
			return
		}
		if (typed.cvr && !isCvr(typed.cvr)) {
			setVendorProblem(EIGHT_DIGITS)
			return
		}
		setMaking(true)
		const saveVendor = Object.keys(typed).length
			? updateVendor(sender.vendorId, typed).then(invalidateVendorData, e => {
				throw Object.assign(e ?? {}, { fallback: `What you typed for ${sender.name} was not saved. Try again.` })
			})
			: Promise.resolve()
		saveVendor
			.then(() => makeInvoice(order.id, { recipient, locale: NUMBER_LOCALE }))
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
				const message = failureMessage(e, e?.fallback ?? 'The invoice was not made. Try again.')
				if (message) toast({ message, color: 'danger' })
			})
	}

	const shown = denmark && lookup.found?.cvr === cvrOf(cvr) ? lookup.found : null
	const cvrHelp = problem ?? said(lookup.status, cvrOf(cvr)) ?? (shown ? undefined : CVR_HELP)

	return (
		<Dialog variant="preview" onCancel={onClose}>
			<DialogTitle>Make an invoice</DialogTitle>
			<DialogSplit>
				<DialogFields>
					<DialogBody>{[vendorName(order), longDate(order.date), currency(order.total)].filter(Boolean).join(', ')}</DialogBody>
					{sender?.missing.length
						? (
							<VendorDetails sender={sender} lookup={vendorLookup} problem={vendorProblem}
								cvr={vendorCvr} onCvr={changeVendorCvr} vat={vendorVat} onVat={setVendorVat}
								address={vendorAddress} onAddress={setVendorAddress} />
						)
						: null}
					<Field id="invoice-name" label="Name">
						<TextField value={name} onChange={setName} />
					</Field>
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
					<FieldGroupMore aria-expanded={details} aria-controls={details ? 'invoice-company' : undefined}
						onClick={() => setDetails(open => !open)}>
						{details ? 'Hide company details' : 'Show company details'}
					</FieldGroupMore>
					{details
						? (
							<>
								<div className="sp-fields" id="invoice-company">
									<Field id="invoice-country" label="Country">
										<CountryCombobox value={country} onChange={v => { setCountry(v); setProblem(null) }} />
									</Field>
									{denmark
										? (
											<Field id="invoice-cvr" label="CVR" message={cvrHelp} messageType={problem ? 'danger' : 'hint'}>
												<TextField value={cvr} inputMode="numeric" placeholder="8 digits" onChange={changeCvr}
													onKeyDown={ev => { if (ev.key === 'Enter' && lookup.status === 'failed' && isCvr(cvr)) { ev.preventDefault(); lookup.lookUp(cvrOf(cvr)) } }} />
											</Field>
										)
										: (
											<Field id="invoice-vat" label="VAT number">
												<TextField value={vatNumber} onChange={setVatNumber} />
											</Field>
										)}
								</div>
								<Field id="invoice-att" label="Att.">
									<TextField value={att} onChange={setAtt} />
								</Field>
							</>
						)
						: null}
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

/** What the vendor lacks for the From box (24d), asked for in the alert. A Danish vendor's CVR number is
    looked up as it is typed; found, the alert goes and the number stays in a plain field. A CVR number
    the register does not know is not printed, so it is offered to correct. */
function VendorDetails({ sender, lookup, problem, cvr, onCvr, vat, onVat, address, onAddress }) {
	const { name } = sender
	const abroad = sender.country !== 'DK'
	const noAddress = sender.missing.includes('address')
	const noNumber = sender.missing.includes(abroad ? 'vat' : 'cvr')
	const unknown = noNumber && sender.unknownNumber
	const number = cvrOf(cvr)
	const found = !abroad && noNumber && lookup.found?.cvr === number ? lookup.found : null
	const cvrHelp = problem ?? said(lookup.status, number)

	if (found) return (
		<Field id="invoice-vendor-cvr" label={`${name}'s CVR`}
			message={`${[found.name, found.address.join(', ')].filter(Boolean).join(', ')}. Saved to ${name} when you download.`}>
			<TextField value={cvr} inputMode="numeric" placeholder="8 digits" onChange={onCvr} />
		</Field>
	)

	const numberWord = abroad ? 'VAT number' : 'CVR number'
	const title = unknown
		? `The CVR number of ${name} is not in the register`
		: `${name} has no ${[noAddress && 'address', noNumber && numberWord].filter(Boolean).join(' or ')}`
	const note = unknown ? (noAddress ? 'Check the number, or type the address.' : 'Check the number.')
		: abroad ? (noAddress && noNumber ? `Add them and they are saved to ${name}.` : `Add it and it is saved to ${name}.`)
			: noNumber ? (noAddress ? 'Type its CVR number and the address is filled in from the CVR register.' : `Type its CVR number and it is saved to ${name}.`)
				: `Type its address and it is saved to ${name}.`
	// a Danish vendor's address is asked for once its number cannot give one
	const asksAddress = noAddress && (abroad || !noNumber || unknown || ['none', 'limit', 'failed'].includes(lookup.status) || address.trim())

	return (
		<Alert mark="!" title={title} fields={(
			<>
				{noNumber && !abroad
					? (
						<Field id="invoice-vendor-cvr" label={`${name}'s CVR`} message={cvrHelp} messageType={problem ? 'danger' : 'hint'}>
							<TextField value={cvr} inputMode="numeric" placeholder="8 digits" onChange={onCvr}
								onKeyDown={ev => { if (ev.key === 'Enter' && lookup.status === 'failed' && isCvr(number)) { ev.preventDefault(); lookup.lookUp(number) } }} />
						</Field>
					)
					: null}
				{noNumber && abroad
					? (
						<Field id="invoice-vendor-vat" label={`${name}'s VAT number`}>
							<TextField value={vat} onChange={onVat} />
						</Field>
					)
					: null}
				{asksAddress
					? (
						<Field id="invoice-vendor-address" label={`${name}'s address`}>
							<TextField multiline rows={2} value={address} onChange={onAddress} />
						</Field>
					)
					: null}
			</>
		)}>
			{note}
		</Alert>
	)
}
