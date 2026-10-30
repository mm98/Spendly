import { useRef, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast, Leaving } from '../components/Overlays.jsx'
import { budgetFromFile } from '../api/budgetImport.js'
import { failureMessage, getBudgetYears, importBudget } from '../api/client.js'
import { plural } from '../api/format.js'
import { names } from './orderSave.js'
import { phrase, usePhrase } from '../language/phrases.js'

const listed = items => names(items.map(String))

/** Import from Excel (21f): reads the workbook in the browser and asks before anything is written.
    Budget and Settings' Import tab both offer it; `onImported(years)` hears the years brought in. */
export function ImportButton({ onImported }) {
	const phrase = usePhrase()
	const picker = useRef(null)
	const toast = useToast()
	const [found, setFound] = useState(null)
	const [busy, setBusy] = useState(false)
	const read = async file => {
		if (!file) return
		try {
			const result = await budgetFromFile(file)
			// null when the years already here could not be read, so the dialog claims none
			const have = result.years.length ? await getBudgetYears().then(r => r.years, () => null) : null
			if (result.years.length) setFound({ file: file.name, have, ...result })
			else toast({ message: phrase('budgetImport.noYears', { file: file.name }), color: 'danger' })
		} catch (e) {
			toast({ message: e.message, color: 'danger' })
		}
	}
	const write = async () => {
		setBusy(true)
		try {
			await importBudget(found.years, found.accounts)
			toast({ message: phrase('budgetImport.done', { years: plural(found.years.length, 'year') }) })
			const years = found.years.map(y => y.year)
			setFound(null)
			onImported?.(years)
		} catch (e) {
			const message = failureMessage(e, phrase('budgetImport.failed'))
			if (message) toast({ message, color: 'danger' })
		} finally {
			setBusy(false)
		}
	}
	const years = found?.years.map(y => y.year) ?? []
	const rows = found?.years.map(y => y.groups.reduce((n, g) => n + g.lines.length, 0)) ?? []
	const replaced = found?.have ? years.filter(y => found.have.includes(y)) : []
	return (
		<>
			<Button size="small" onClick={() => picker.current?.click()}>{phrase('budgetImport.button')}</Button>
			<input ref={picker} type="file" name="budget" hidden accept=".xlsx" aria-label={phrase('budgetImport.choose')}
				onChange={ev => { read(ev.target.files?.[0]); ev.target.value = '' }} />
			<Leaving>{found ? (
				<Dialog onCancel={() => setFound(null)}>
					<DialogTitle>{phrase('budgetImport.title', { years: plural(years.length, 'year') })}</DialogTitle>
					<DialogBody>{phrase('budgetImport.holds', { file: found.file, years: listed(years.map((y, i) => `${y} (${plural(rows[i], 'row')})`)) })}</DialogBody>
					{found.have === null ? (
						<DialogBody>{phrase('budgetImport.replacedAny')}</DialogBody>
					) : replaced.length ? (
						<DialogBody>{phrase('budgetImport.replaced', { years: listed(replaced), count: replaced.length })}</DialogBody>
					) : null}
					{found.left.length ? (
						<DialogBody>{phrase('budgetImport.left', { sheets: listed(found.left), count: found.left.length })}</DialogBody>
					) : null}
					{found.skipped ? (
						<DialogBody>{phrase('budgetImport.skipped', { cells: plural(found.skipped, 'cell'), count: found.skipped })}</DialogBody>
					) : null}
					<DialogActions>
						<Button variant="outline" onClick={() => setFound(null)}>{phrase('action.cancel')}</Button>
						<span className="sp-grow" />
						<Button disabled={busy} onClick={write}>{phrase('budgetImport.import', { years: plural(years.length, 'year') })}</Button>
					</DialogActions>
				</Dialog>
			) : null}</Leaving>
		</>
	)
}
