import { Stepper } from 'spendly-react'

/* The banner over the two screens that build a record in steps: Scan (three) and New
   order (two). A step behind you draws a check instead of its own glyph, the step you
   are on has a green bar, and the ones ahead are grey. */

const column: React.CSSProperties = { width: 380 }

const scanSteps = (at: number) => [
	{ label: 'Upload', icon: 'upload', done: at > 0, on: at === 0 },
	{ label: 'Reading', icon: 'scan', done: at > 1, on: at === 1 },
	{ label: 'Review', icon: 'document', on: at === 2 }
]

const orderSteps = (at: number) => [
	{ label: 'Order details', icon: 'receipt', done: at > 0, on: at === 0 },
	{ label: 'Add the items', icon: 'document', on: at === 1 }
]

export const ScanAtUpload = () => (
	<div style={column}><Stepper steps={scanSteps(0)} /></div>
)

export const ScanAtReading = () => (
	<div style={column}><Stepper steps={scanSteps(1)} /></div>
)

export const ScanAtReview = () => (
	<div style={column}><Stepper steps={scanSteps(2)} /></div>
)

export const NewOrderAtDetails = () => (
	<div style={column}><Stepper steps={orderSteps(0)} /></div>
)

export const NewOrderAtItems = () => (
	<div style={column}><Stepper steps={orderSteps(1)} /></div>
)
