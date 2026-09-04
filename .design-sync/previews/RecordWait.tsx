import { RecordWait } from 'spendly-react'

// RecordWait draws its own Page, so it is never wrapped in another one -- two `.page.is-on`
// elements nest a grid inside a grid. The `state` object is exactly what `useApi` returns.

const loading = { data: undefined, error: null, loading: true }

const scanSteps = [
	{ label: 'Upload', icon: 'upload', done: true },
	{ label: 'Reading', icon: 'scan', done: true },
	{ label: 'Review', icon: 'document', on: true }
]

export const WaitingForARecord = () => (
	<RecordWait state={loading} label="Loading the vendor" />
)

export const WaitingInsideAFlow = () => (
	<RecordWait state={loading} label="Loading the draft" steps={scanSteps} />
)

export const RecordNotFound = () => (
	<RecordWait
		state={{ data: undefined, error: { status: 404, message: 'No vendor v-3f9a1c7d02b45e68' }, loading: false }}
		label="Loading the vendor" />
)

export const RequestFailed = () => (
	<RecordWait
		state={{ data: undefined, error: { status: 500, message: 'The server did not answer.' }, loading: false }}
		label="Loading the category" />
)
