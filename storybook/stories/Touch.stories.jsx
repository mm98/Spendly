import { createPortal } from 'react-dom'
import { TabBar, TabBarItem, Sheet, SaveBar, Fab } from '../../react/src/components/Touch.jsx'
import { Shell, TopBar, ShellContent, Scrim } from '../../react/src/components/Shell.jsx'
import { Card } from '../../react/src/components/Card.jsx'
import { Button, IconButton } from '../../react/src/components/Button.jsx'
import { Choice, Radio, FieldGroup } from '../../react/src/components/Choice.jsx'
import { Stacked } from '../../react/src/components/Utilities.jsx'

export default {
	title: 'Shell/Phone',
	parameters: { layout: 'fullscreen' },
	globals: { viewport: { value: 'phone', isRotated: false } }
}

const TABS = (
	<TabBar>
		<TabBarItem icon="home" to="/">Home</TabBarItem>
		<TabBarItem icon="receipt" to="/orders" current>Orders</TabBarItem>
		<TabBarItem icon="chart-bar" to="/statistics">Statistics</TabBarItem>
		<TabBarItem icon="user" to="/more">More</TabBarItem>
	</TabBar>
)

export const WithTabsAndButton = {
	render: () => (
		<Shell touch>
			<TopBar touch><span className="sp-title sp-grow">Orders</span></TopBar>
			<ShellContent>
				<Card><span className="sp-title">Indbo Møbler</span><span className="sp-subtitle">SPENDLY-441</span></Card>
				<Card><span className="sp-title">HAY</span><span className="sp-subtitle">SPENDLY-438</span></Card>
			</ShellContent>
			<Fab to="/orders/new" aria-label="New order" />
			{TABS}
		</Shell>
	)
}

export const EditingWithSaveBar = {
	render: () => (
		<Shell touch>
			<TopBar touch>
				<IconButton icon="chevron-left" aria-label="Back to the orders" />
				<Stacked><span className="sp-title">Indbo Møbler</span><span className="sp-subtitle">SPENDLY-441</span></Stacked>
				<IconButton icon="dots-vertical" aria-label="This order" />
			</TopBar>
			<ShellContent>
				<Card>
					<span className="sp-section-label">Total</span>
					<span className="sp-stat__figure">3.980,00 kr.</span>
					<span className="sp-amount-secondary" data-color="success">Saved 1.320,00 kr.</span>
				</Card>
				<SaveBar>
					<span className="sp-subtitle sp-grow">Unsaved changes</span>
					<Button variant="outline">Discard</Button>
					<Button>Save</Button>
				</SaveBar>
			</ShellContent>
		</Shell>
	)
}

export const SheetFromTheBottom = {
	render: () => (
		<>
			<Shell touch>
				<TopBar touch><span className="sp-title sp-grow">Orders</span></TopBar>
				<ShellContent>
					<Card><span className="sp-title">The screen underneath</span><span className="sp-subtitle">Still there, dimmed.</span></Card>
				</ShellContent>
				{TABS}
			</Shell>
			{createPortal(
				<Scrim dialog>
					<Sheet role="dialog" aria-modal="true" aria-label="Set a status" onDismiss={() => {}}>
						<span className="sp-heading">Set a status</span>
						<FieldGroup legend="Status">
							<Choice variant="row" control={<Radio name="status" defaultChecked />}>Approved</Choice>
							<Choice variant="row" control={<Radio name="status" />}>In progress</Choice>
							<Choice variant="row" control={<Radio name="status" />}>Returned</Choice>
						</FieldGroup>
						<Button fullWidth>Apply</Button>
					</Sheet>
				</Scrim>,
				document.body
			)}
		</>
	)
}
