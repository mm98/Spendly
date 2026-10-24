import { TabBar, TabBarItem, Sheet, SaveBar, Fab } from '../../react/src/components/Touch.jsx'
import { Shell, TopBar, ShellContent, Scrim } from '../../react/src/components/Shell.jsx'
import { Card } from '../../react/src/components/Card.jsx'
import { Button, IconButton } from '../../react/src/components/Button.jsx'
import { Choice, Radio, FieldGroup } from '../../react/src/components/Choice.jsx'
import { Stacked } from '../../react/src/components/Utilities.jsx'
import { Leaving } from '../../react/src/components/Overlays.jsx'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { OverThePage, iconControl, useHeld } from './controls.js'

const TAB_NAMES = ['Home', 'Orders', 'Statistics', 'More']

export default {
	title: 'Shell/Phone',
	component: TabBar,
	subcomponents: { TabBarItem, Sheet, SaveBar, Fab, Shell, TopBar, ShellContent, Scrim },
	parameters: { layout: 'fullscreen' },
	globals: { viewport: { value: 'phone', isRotated: false } },
	args: { current: 'Orders' },
	argTypes: { current: { control: 'inline-radio', options: TAB_NAMES, description: 'The tab that is TabBarItem\'s `current`' } }
}

const tabs = current => (
	<TabBar>
		{[['home', '/'], ['receipt', '/orders'], ['chart-bar', '/statistics'], ['user', '/more']].map(([icon, to], i) => (
			<TabBarItem key={to} icon={icon} to={to} current={TAB_NAMES[i] === current}>{TAB_NAMES[i]}</TabBarItem>
		))}
	</TabBar>
)

export const WithTabsAndButton = {
		args: { fabIcon: 'plus', fabLabel: 'New order' },
	argTypes: { fabIcon: { ...iconControl, description: 'Fab\'s `icon`' }, fabLabel: { control: 'text', description: 'Fab\'s name' } },
	render: ({ current, fabIcon, fabLabel }) => (
		<Shell touch>
			<TopBar touch><span className="sp-title sp-grow">{current}</span></TopBar>
			<ShellContent>
				<Card><span className="sp-title">Indbo Møbler</span><span className="sp-subtitle">SPENDLY-441</span></Card>
				<Card><span className="sp-title">HAY</span><span className="sp-subtitle">SPENDLY-438</span></Card>
			</ShellContent>
			<Fab icon={fabIcon} to="/orders/new" aria-label={fabLabel} />
			{tabs(current)}
		</Shell>
	)
}

export const EditingWithSaveBar = {
	args: { note: 'Unsaved changes', onSave: fn(), onDiscard: fn(), onBack: fn() },
	argTypes: { note: { control: 'text', description: 'What the save bar says' }, current: { control: false } },
	render: ({ note, onSave, onDiscard, onBack }) => (
		<Shell touch>
			<TopBar touch>
				<IconButton icon="chevron-left" aria-label="Back to the orders" onClick={onBack} />
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
					<span className="sp-subtitle sp-grow">{note}</span>
					<Button variant="outline" onClick={onDiscard}>Discard</Button>
					<Button onClick={onSave}>Save</Button>
				</SaveBar>
			</ShellContent>
		</Shell>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
		await expect(args.onSave).toHaveBeenCalledOnce()
	}
}

export const SheetFromTheBottom = {
	args: { handle: true, onDismiss: fn(), onApply: fn() },
	parameters: { variantsOf: Sheet },
	render: ({ current, handle, onDismiss, onApply }) => (
		<>
			<Shell touch>
				<TopBar touch><span className="sp-title sp-grow">Orders</span></TopBar>
				<ShellContent>
					<Card><span className="sp-title">The screen underneath</span><span className="sp-subtitle">Still there, dimmed.</span></Card>
				</ShellContent>
				{tabs(current)}
			</Shell>
			<OverThePage>
				<Scrim dialog>
					<Sheet role="dialog" aria-modal="true" aria-label="Set a status" handle={handle} onDismiss={onDismiss}>
						<span className="sp-heading">Set a status</span>
						<FieldGroup legend="Status">
							<Choice variant="row" control={<Radio name="status" defaultChecked />}>Approved</Choice>
							<Choice variant="row" control={<Radio name="status" />}>In progress</Choice>
							<Choice variant="row" control={<Radio name="status" />}>Returned</Choice>
						</FieldGroup>
						<Button fullWidth onClick={onApply}>Apply</Button>
					</Sheet>
				</Scrim>
			</OverThePage>
		</>
	)
}

export const SheetClosingWithTheFade = {
	args: { open: true, onApply: fn(), onClosed: fn() },
	parameters: { variantsOf: Leaving },
	// the Docs page draws it closed, behind its button
	render: ({ onApply, onClosed, ...args }, { viewMode }) => {
		const [open, setOpen] = useHeld(viewMode === 'docs' ? { ...args, open: false } : args, 'open')
		const apply = () => { setOpen(false); onApply() }
		return (
			<>
				<Shell touch>
					<TopBar touch><span className="sp-title sp-grow">Orders</span></TopBar>
					<ShellContent>
						<Button variant="outline" onClick={() => setOpen(true)}>Set a status</Button>
					</ShellContent>
					{tabs()}
				</Shell>
				<OverThePage>
					<Leaving onClosed={onClosed}>
						{open
							? (
								<Scrim dialog>
									<Sheet role="dialog" aria-modal="true" aria-label="Set a status" onDismiss={() => setOpen(false)}>
										<span className="sp-heading">Set a status</span>
										<FieldGroup legend="Status">
											<Choice variant="row" control={<Radio name="closing-status" defaultChecked />}>Approved</Choice>
											<Choice variant="row" control={<Radio name="closing-status" />}>In progress</Choice>
										</FieldGroup>
										<Button fullWidth onClick={apply}>Apply</Button>
									</Sheet>
								</Scrim>
							)
							: null}
					</Leaving>
				</OverThePage>
			</>
		)
	},
	play: async ({ args, canvasElement }) => {
		const page = canvasElement.ownerDocument.body
		await userEvent.click([...page.querySelectorAll('.sp-sheet button')].find(b => b.textContent === 'Apply'))
		await expect(args.onApply).toHaveBeenCalledOnce()
		await waitFor(() => expect(page.querySelector('.sp-sheet[data-leaving="true"]')).not.toBeNull())
		await waitFor(() => expect(page.querySelector('.sp-sheet')).toBeNull())
		await expect(args.onClosed).toHaveBeenCalledOnce()
	}
}
