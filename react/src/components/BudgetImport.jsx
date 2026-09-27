import { useRef, useState } from 'react'
import { Button } from './Button.jsx'
import { ConfirmDialog } from './ConfirmDialog.jsx'
import { HiddenFileInput } from './FileInput.jsx'
import { BUDGET_FILES } from './fileKinds.js'
import { useToast } from './Toast.jsx'
import { budgetFromFile } from '../api/budgetImport.js'
import { useApi } from '../api/useApi.js'
import { failureMessage, getBudgetYears, importBudget } from '../api/client.js'
import { plural } from '../api/format.js'

/* Brings an Excel budget in, once: pick the file, see what it holds, then write it. The
   budget's first screen and Settings' Import tab both draw this one button. */

const list = items => (items.length < 2 ? items.join('')
	: `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)

export function BudgetImport({ variant = 'caps', onImported }) {
	const picker = useRef(null)
	const toast = useToast()
	const held = useApi(getBudgetYears)
	const [found, setFound] = useState(null)
	const [busy, setBusy] = useState(false)

	const read = async ([file]) => {
		try {
			const result = await budgetFromFile(file)
			if (result.years.length) setFound({ file: file.name, ...result })
			else toast(`${file.name} has no sheet named after a year, like 2026.`, 'negative')
		} catch (e) {
			toast(e.message, 'negative')
		}
	}

	const write = async () => {
		setBusy(true)
		try {
			await importBudget(found.years)
			toast(`${plural(found.years.length, 'year')} brought in.`)
			const years = found.years.map(y => y.year)
			setFound(null)
			held.refresh()
			onImported?.(years)
		} catch (e) {
			toast(failureMessage(e, 'The budget was not brought in.'), 'negative')
		} finally {
			setBusy(false)
		}
	}

	const years = found?.years.map(y => y.year) ?? []
	const replaced = years.filter(y => held.data?.years.includes(y))
	const rows = found?.years.map(y => y.groups.reduce((n, g) => n + g.lines.length, 0)) ?? []

	return (
		<>
			<Button variant={variant} icon="upload" aria-haspopup="dialog" onClick={() => picker.current?.click()}>
				IMPORT FROM EXCEL</Button>
			<HiddenFileInput ref={picker} kind={BUDGET_FILES} onFiles={read} label="Choose the Excel budget" />
			{found ? (
				<ConfirmDialog title={`Bring in ${plural(years.length, 'year')}?`}
					detail={`${found.file} holds ${list(years.map((y, i) => `${y} (${plural(rows[i], 'row')})`))}.`}
					confirmLabel={busy ? 'IMPORTING...' : `IMPORT ${plural(years.length, 'YEAR', 'YEARS')}`}
					onConfirm={busy ? () => {} : write} onCancel={() => setFound(null)}>
					<ul className="budget-import-notes">
						<li>Amounts in light grey text come in as expected amounts. The others come in as real amounts.</li>
						{replaced.length ? (
							<li>{list(replaced.map(String))} {replaced.length === 1 ? 'is' : 'are'} already here. Importing replaces {replaced.length === 1 ? 'it' : 'them'}.</li>
						) : null}
						{found.left.length ? (
							<li>{list(found.left)} {found.left.length === 1 ? 'is not a year, so it is' : 'are not years, so they are'} left out.</li>
						) : null}
						{found.skipped ? (
							<li>{plural(found.skipped, 'cell')} held something other than an amount, so {found.skipped === 1 ? 'it is' : 'they are'} left empty.</li>
						) : null}
					</ul>
				</ConfirmDialog>
			) : null}
		</>
	)
}
