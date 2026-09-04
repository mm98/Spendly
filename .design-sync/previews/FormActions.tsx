import { Button, Form, FormActions } from 'spendly-react'

/* The row a form ends on. `split` pushes the pair apart -- leave on the left, save on the
   right; without it the buttons sit together at the left in reading order. */

const noop = () => {}

/* Every full-page form closes this way: CANCEL leaves, the caps button saves, and both stand
   48px tall because they are one pair. FormPage draws this row for you. */
export const AcrossTheFoot = () => (
	<Form>
		<FormActions split>
			<Button variant="ghost" to="/orders">CANCEL</Button>
			<Button variant="caps" onClick={noop}>SAVE CHANGES</Button>
		</FormActions>
	</Form>
)

/* Inside a card, where the two buttons act on the card and not on a page: both compact, both
   at the left, the verb first. Settings' import card draws this. */
export const SideBySide = () => (
	<FormActions>
		<Button variant="caps compact" onClick={noop}>IMPORT</Button>
		<Button variant="ghost compact" onClick={noop}>CANCEL</Button>
	</FormActions>
)

/* The line card's footer: the pair, a muted note that says what the keyboard does, and the
   delete pushed to the far end with `push-end`. */
export const WithANoteAndADelete = () => (
	<FormActions>
		<Button variant="caps compact" icon="check" onClick={noop}>SAVE LINE</Button>
		<Button variant="ghost compact" onClick={noop}>CANCEL</Button>
		<span className="field-help form-actions-note">Unsaved changes</span>
		<span className="push-end">
			<Button variant="ghost compact" icon="trash" onClick={noop}>DELETE LINE</Button>
		</span>
	</FormActions>
)
