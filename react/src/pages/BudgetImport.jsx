import { useRef, useState } from 'react'
import { Button } from '../components/Button.jsx'
import { Dialog, DialogActions, DialogBody, DialogTitle, useToast } from '../components/Overlays.jsx'
import { budgetFromFile } from '../api/budgetImport.js'
import { failureMessage, importBudget } from '../api/client.js'
import { plural } from '../api/format.js'

const listed = items => (items.length < 2 ? items.join('')
	: `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

/** Import from Excel (21f): reads the workbook in the browser and asks before anything is written.
    Budget and Settings' Import tab both offer it; `onImported(years)` hears the years brought in. */
export function ImportButton({ onImported }) {
	const picker = useRef(null)
	const toast = useToast()
	const [found, setFound] = useState(null)
	const [busy, setBusy] = useState(false)
	const read = async file => {
		if (!file) return
		try {
			const result = await budgetFromFile(file)
			if (result.years.length) setFound({ file: file.name, ...result })
			else toast({ message: `${file.name} has no sheet named after a year, like 2026.`, color: 'danger' })
		} catch (e) {
			toast({ message: e.message, color: 'danger' })
		}
	}
	const write = async () => {
		setBusy(true)
		try {
			await importBudget(found.years, found.accounts)
			toast({ message: `${plural(found.years.length, 'year')} brought in.` })
			const years = found.years.map(y => y.year)
			setFound(null)
			onImported?.(years)
		} catch (e) {
			const message = failureMessage(e, 'The budget was not brought in.')
			if (message) toast({ message, color: 'danger' })
		} finally {
			setBusy(false)
		}
	}
	const years = found?.years.map(y => y.year) ?? []
	const rows = found?.years.map(y => y.groups.reduce((n, g) => n + g.lines.length, 0)) ?? []
	return (
		<>
			<Button size="small" onClick={() => picker.current?.click()}>Import from Excel</Button>
			<input ref={picker} type="file" hidden accept=".xlsx" aria-label="Choose the Excel budget"
				onChange={ev => { read(ev.target.files?.[0]); ev.target.value = '' }} />
			{found ? (
				<Dialog onCancel={() => setFound(null)}>
					<DialogTitle>Bring in {plural(years.length, 'year')}?</DialogTitle>
					<DialogBody>{found.file} holds {listed(years.map((y, i) => `${y} (${plural(rows[i], 'row')})`))}.</DialogBody>
					{found.left.length ? (
						<DialogBody>{listed(found.left)} {found.left.length === 1 ? 'is not a year, so it is' : 'are not years, so they are'} left out.</DialogBody>
					) : null}
					{found.skipped ? (
						<DialogBody>{plural(found.skipped, 'cell')} held something other than an amount, so {found.skipped === 1 ? 'it is' : 'they are'} left empty.</DialogBody>
					) : null}
					<DialogActions>
						<Button variant="outline" onClick={() => setFound(null)}>Cancel</Button>
						<span className="sp-grow" />
						<Button disabled={busy} onClick={write}>Import {plural(years.length, 'year')}</Button>
					</DialogActions>
				</Dialog>
			) : null}
		</>
	)
}
