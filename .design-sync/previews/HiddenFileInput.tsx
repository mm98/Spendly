import { Button, Card, CardBody, CardDivider, CardHeader, HiddenFileInput } from 'spendly-react'

/* The file input itself draws nothing: it is clipped to one pixel wherever it is put, and it
   is opened by another control calling `ref.current.click()`. Both cells below show the
   control that opens it -- the input is in the markup of each, and contributes no pixels.
   A ref in a page is a `useRef`; a preview passes the same plain object. */

const picker = { current: null }
const noop = () => {}

/* Settings' import card: a block button is the whole affordance, and the input rides under it. */
export const BehindAButton = () => (
	<Card aria-label="Import">
		<CardHeader title="Import orders" />
		<CardDivider />
		<CardBody>
			<p className="card-lead card-lead-flush">
				Choose a Spendly export and every order in it is added to this account.</p>
			<Button variant="block" icon="upload" onClick={noop}>CHOOSE A JSON FILE</Button>
			<HiddenFileInput ref={picker} kind={{ description: 'Spendly export',
				accept: { 'application/json': ['.json'] } }}
				label="Choose a JSON file of orders" onFiles={noop} />
		</CardBody>
	</Card>
)

/* Order details' attachments card: the input takes several files at once, and the pill in the
   header band is what opens it. */
export const BehindAHeaderPill = () => (
	<Card aria-label="Attachments">
		<CardHeader title="Attachments">
			<Button variant="pill" icon="plus" onClick={noop}>ADD</Button>
		</CardHeader>
		<CardDivider />
		<CardBody>
			<p className="card-lead card-lead-flush">
				Receipts and photos, as many as the order needs.</p>
			<HiddenFileInput ref={picker} multiple label="Add attachments"
				kind={{ description: 'Receipts and photos', accept: {
					'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'application/pdf': ['.pdf']
				} }} onFiles={noop} />
		</CardBody>
	</Card>
)
