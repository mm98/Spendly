import { ConfirmDialog } from 'spendly-react'

// A native <dialog> opened with showModal(): it paints in the top layer, over the whole
// viewport, so each cell is the modal itself and its backdrop. The wording below is the
// app's own -- `useDelete` (FormPage.jsx) builds the title as "Delete this <what>?" and
// appends "This cannot be undone." to the caller's detail sentence.

export const DeleteAnOrder = () => (
	<ConfirmDialog
		title="Delete this order?"
		detail="Bilka, 18 April 2024, 1.284,00 kr. This cannot be undone."
		confirmLabel="DELETE"
		onConfirm={() => {}} onCancel={() => {}} />
)

export const DeleteACategory = () => (
	<ConfirmDialog
		title="Delete this category?"
		detail="Groceries, 4.120 kr. this month. This cannot be undone."
		confirmLabel="DELETE"
		onConfirm={() => {}} onCancel={() => {}} />
)

export const ReloadForANewVersion = () => (
	<ConfirmDialog
		title="An update is available"
		detail="Reload now to use the new version. Anything typed and not saved will be lost."
		confirmLabel="RELOAD" cancelLabel="NOT NOW"
		onConfirm={() => {}} onCancel={() => {}} />
)
