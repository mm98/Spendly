import { Card, CardBody, CardDivider, CardHeader, DocumentPreview, ProgressBar } from 'spendly-react'

/* A 6px track with a green fill, in two modes.

   Indeterminate is the default, and it is the default on purpose: a step that cannot say how
   far through it is should not claim a percentage. The fill is a short segment that slides
   across the track for as long as the step runs.

   Determinate is opt-in -- `indeterminate={false}` plus `value`, a number 0-100 -- and the app
   only switches to it once there is a real measurement to state. Whenever the bar shows a
   percentage, the same figure is printed beside it in words. */

/* The scan step, where the wait has no measurable end. Nothing is stored yet, so the card says
   so rather than counting anything. */
export const ReadingReceipt = () => (
	<Card aria-label="Reading the document" aria-busy="true">
		<CardBody variant="card-body-centered">
			<DocumentPreview kind="pdf" className="scan-reading-preview" />
			<div>
				<div className="card-headline">Reading Bilka-kvittering-2024-05-14.pdf</div>
				<span className="field-help">
					This usually takes a few seconds. Nothing is stored until you approve the review.</span>
			</div>
			<ProgressBar className="scan-reading-progress" label="Reading progress" />
		</CardBody>
	</Card>
)

/* The import, once the bytes on the wire can be counted. `import-progress` puts the bar and
   its percentage on one line, the bar taking the leftover width. */
export const ImportProgress = () => (
	<Card aria-label="Import">
		<CardHeader title="Import orders" />
		<CardDivider />
		<CardBody>
			<p className="field-help">spendly-orders-2024.csv</p>
			<div className="import-progress">
				<ProgressBar label="Import progress" indeterminate={false} value={64} />
				<span className="field-help tabular-figures">64%</span>
			</div>
		</CardBody>
	</Card>
)

/* One import from start to finish. `value` is a percentage of the track, so the caller does
   the division; the bar states no figure of its own. */
const row: React.CSSProperties = { display: 'grid', gap: 8, marginBottom: 18 }

export const FillLevels = () => (
	<Card aria-label="Import progress readings">
		<CardHeader title="Import orders • start to finish" />
		<CardDivider />
		<CardBody>
			<div style={row}>
				<span className="field-help">Just started</span>
				<ProgressBar label="Import progress" indeterminate={false} value={0} />
			</div>
			<div style={row}>
				<span className="field-help">Part way through the file</span>
				<ProgressBar label="Import progress" indeterminate={false} value={45} />
			</div>
			<div style={{ ...row, marginBottom: 0 }}>
				<span className="field-help">Finished</span>
				<ProgressBar label="Import progress" indeterminate={false} value={100} />
			</div>
		</CardBody>
	</Card>
)
