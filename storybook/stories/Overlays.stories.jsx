import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Menu, MenuItem, MenuLabel, MenuSeparator, Popover, Anchor, Dialog, DialogTitle, DialogBody, DialogActions, Toast, ToastUndo, Alert, Leaving } from '../../react/src/components/Overlays.jsx'
import { Button, IconButton } from '../../react/src/components/Button.jsx'
import { Choice, Radio } from '../../react/src/components/Choice.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { iconControl, useHeld } from './controls.js'

const STATUSES = ['draft', 'progress', 'done', 'returned', 'cancelled']
const text = description => ({ control: 'text', description })

export default {
	title: 'Overlays/Menus, dialogs and messages',
	component: Menu,
	subcomponents: { MenuItem, MenuLabel, MenuSeparator, Popover, Anchor, Dialog, DialogTitle, DialogBody, DialogActions, Toast, ToastUndo, Alert }
}

export const MenuInPlace = {
		args: { label: 'This order', onEdit: fn(), onExport: fn(), deleteDisabled: true },
	argTypes: { label: text('The menu\'s name and its first line'), deleteDisabled: { description: 'Delete\'s `disabled`' } },
	render: ({ label, onEdit, onExport, deleteDisabled }) => (
		<div style={{ maxWidth: 260 }}>
			<Menu aria-label={label}>
				<MenuLabel>{label}</MenuLabel>
				<MenuItem icon="pencil" onClick={onEdit}>Edit</MenuItem>
				<MenuItem icon="copy" onClick={() => {}}>Duplicate</MenuItem>
				<MenuSeparator />
				<MenuItem icon="download" onClick={onExport}>Export</MenuItem>
				<MenuItem icon="trash" disabled={deleteDisabled}>Delete</MenuItem>
			</Menu>
		</div>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('menuitem', { name: 'Edit' }))
		await expect(args.onEdit).toHaveBeenCalledOnce()
	}
}

export const MenuFromAButton = {
	args: { open: true, status: 'progress', onStatus: fn() },
	argTypes: { status: { control: 'inline-radio', options: STATUSES } },
	render: args => {
		const [open, setOpen] = useHeld(args, 'open')
		const [status, setStatus] = useHeld(args, 'status')
		return (
			<div style={{ paddingLeft: 200, minHeight: 320 }}>
				<Anchor open={open}>
					<IconButton icon="dots-vertical" aria-label="This order" aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
					<Menu position="floating" aria-label="This order">
						<MenuItem icon="pencil" onClick={() => setOpen(false)}>Edit</MenuItem>
						<MenuItem icon="tag">Set status
							<Menu position="sub" aria-label="Set the status">
								{STATUSES.map(dot => (
									<MenuItem key={dot} dot={dot} selected={dot === status} onClick={() => { setStatus(dot); args.onStatus(dot); setOpen(false) }}>{dot[0].toUpperCase() + dot.slice(1)}</MenuItem>
								))}
							</Menu>
						</MenuItem>
						<MenuItem icon="download" onClick={() => setOpen(false)}>Export</MenuItem>
						<MenuSeparator />
						<MenuItem icon="trash" danger onClick={() => setOpen(false)}>Delete order</MenuItem>
					</Menu>
				</Anchor>
			</div>
		)
	},
	play: async ({ canvas }) => {
		const button = canvas.getByRole('button', { name: 'This order' })
		await userEvent.click(button)
		await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'))
		await userEvent.click(button)
		await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'))
	}
}

export const OneMenuItem = {
	args: { children: 'Delete order', icon: 'trash', danger: true, disabled: false, onClick: fn() },
	argTypes: { icon: iconControl, dot: { control: 'select', options: [undefined, ...STATUSES] } },
	parameters: { variantsOf: MenuItem },
	render: args => <div style={{ maxWidth: 260 }}><Menu aria-label="This order"><MenuItem {...args} /></Menu></div>
}

export const PopoverWithActions = {
	args: { position: 'static', title: 'Move to a category', subtitle: 'Applies to the 4 orders you picked.', summary: '4 orders move to Havemøbler', onApply: fn(), onCancel: fn() },
	argTypes: { title: text('The head\'s first line'), subtitle: text('The head\'s second line'), summary: text('The line above the actions') },
	parameters: { variantsOf: Popover },
	render: ({ position, title, subtitle, summary, onApply, onCancel }) => (
		<Popover position={position}
			head={<div className="sp-stack sp-gap-6"><span className="sp-title">{title}</span><span className="sp-subtitle">{subtitle}</span></div>}
			summary={<span className="sp-subtitle">{summary}</span>}
			actions={[<Button key="c" variant="outline" onClick={onCancel}>Cancel</Button>, <Button key="a" onClick={onApply}>Apply</Button>]}>
			<Choice variant="row" control={<Radio name="move" defaultChecked />}>Havemøbler</Choice>
			<Choice variant="row" control={<Radio name="move" />}>Boligtilbehør</Choice>
			<Choice variant="row" control={<Radio name="move" />}>Belysning</Choice>
		</Popover>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Apply' }))
		await expect(args.onApply).toHaveBeenCalledOnce()
	}
}

const dialogText = { title: text('DialogTitle\'s words'), body: text('DialogBody\'s words') }

export const DialogInPlace = {
	args: { title: 'Delete this order?', body: 'SPENDLY-447 from Indbo Møbler, 3.980,00 kr. Its 4 lines and 3 attachments go with it, and the August total drops by 3.980,00 kr.', onKeep: fn(), onDelete: fn() },
	argTypes: dialogText,
	parameters: { variantsOf: Dialog },
	render: ({ title, body, onKeep, onDelete }) => (
		<Dialog scrim={false}>
			<DialogTitle>{title}</DialogTitle>
			<DialogBody>{body}</DialogBody>
			<DialogActions>
				<Button variant="outline" onClick={onKeep}>Keep it</Button>
				<span className="sp-grow" />
				<Button color="danger" iconStart="trash" onClick={onDelete}>Delete order</Button>
			</DialogActions>
		</Dialog>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Delete order' }))
		await expect(args.onDelete).toHaveBeenCalledOnce()
	}
}

export const DialogOverThePage = {
	args: { open: true, title: 'Delete this order?', body: 'SPENDLY-447 from Indbo Møbler, 3.980,00 kr.', onCancel: fn() },
	argTypes: dialogText,
	parameters: { variantsOf: Dialog },
	render: ({ title, body, onCancel, ...args }) => {
		const [open, setOpen] = useHeld(args, 'open')
		const close = () => { setOpen(false); onCancel() }
		return (
			<>
				<Button variant="outline" color="danger" onClick={() => setOpen(true)}>Delete order</Button>
				{open
					? (
						<Dialog onCancel={close}>
							<DialogTitle>{title}</DialogTitle>
							<DialogBody>{body}</DialogBody>
							<DialogActions>
								<Button variant="outline" onClick={close}>Keep it</Button>
								<span className="sp-grow" />
								<Button color="danger" iconStart="trash" onClick={() => setOpen(false)}>Delete order</Button>
							</DialogActions>
						</Dialog>
					)
					: null}
			</>
		)
	},
	play: async ({ args, canvasElement }) => {
		const page = canvasElement.ownerDocument.body
		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(args.onCancel).toHaveBeenCalled())
		await waitFor(() => expect(page.querySelector('[role="dialog"]')).toBeNull())
	}
}

export const DialogClosingWithTheFade = {
	args: { open: true, title: 'Delete this order?', body: 'SPENDLY-447 from Indbo Møbler, 3.980,00 kr.', onCancel: fn(), onClosed: fn() },
	argTypes: dialogText,
	parameters: { variantsOf: Leaving },
	// the Docs page draws it closed, behind its button
	render: ({ title, body, onCancel, onClosed, ...args }, { viewMode }) => {
		const [open, setOpen] = useHeld(viewMode === 'docs' ? { ...args, open: false } : args, 'open')
		const close = () => { setOpen(false); onCancel() }
		return (
			<>
				<Button variant="outline" color="danger" onClick={() => setOpen(true)}>Delete order</Button>
				<Leaving onClosed={onClosed}>
					{open
						? (
							<Dialog onCancel={close}>
								<DialogTitle>{title}</DialogTitle>
								<DialogBody>{body}</DialogBody>
								<DialogActions>
									<Button variant="outline" onClick={close}>Keep it</Button>
									<span className="sp-grow" />
									<Button color="danger" iconStart="trash" onClick={() => setOpen(false)}>Delete order</Button>
								</DialogActions>
							</Dialog>
						)
						: null}
				</Leaving>
			</>
		)
	},
	play: async ({ args, canvasElement }) => {
		const page = canvasElement.ownerDocument.body
		await userEvent.click(page.querySelector('[role="dialog"] button'))
		await expect(args.onCancel).toHaveBeenCalledOnce()
		await waitFor(() => expect(page.querySelector('[role="dialog"]')).toBeNull())
		await waitFor(() => expect(args.onClosed).toHaveBeenCalledOnce())
	}
}

export const OneToast = {
	args: { children: 'Line removed from SPENDLY-447', icon: 'check', color: 'default', compact: false, onUndo: fn() },
	argTypes: { icon: iconControl, children: text('What happened') },
	parameters: { variantsOf: Toast },
	render: ({ onUndo, children, ...args }) => (
		<div style={{ maxWidth: 480 }}><Toast {...args}>{children}<ToastUndo onClick={onUndo}>Undo</ToastUndo></Toast></div>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Undo' }))
		await expect(args.onUndo).toHaveBeenCalledOnce()
	}
}

export const Toasts = {
	render: () => (
		<div className="sp-stack sp-gap-8" style={{ maxWidth: 480 }}>
			<Toast icon="check">Line removed from SPENDLY-447<ToastUndo onClick={() => {}}>Undo</ToastUndo></Toast>
			<Toast icon="check" seconds={6}>Order deleted<ToastUndo onClick={() => {}}>Undo</ToastUndo></Toast>
			<Toast color="danger" icon="alert-circle">That file could not be read</Toast>
			<Toast compact>4 picked</Toast>
			<Toast asks mark="!" title="Spendly was updated" actions={<Button size="small">Reload</Button>}>Reload to get the newest version.</Toast>
		</div>
	)
}

export const OneAlert = {
	args: { color: 'warning', mark: '!', title: 'This order puts Decor over its limit', children: '24.100 of 22.000 kr. for August. Saving is fine, you will just see it flagged.', below: false },
	argTypes: { mark: text('The sign at its start'), children: text('What it says under the title'), action: { control: false } },
	parameters: { variantsOf: Alert },
	render: args => <div style={{ maxWidth: 560 }}><Alert {...args} /></div>
}

export const Alerts = {
	render: () => (
		<div className="sp-stack sp-gap-8" style={{ maxWidth: 560 }}>
			<Alert mark="!" title="This order puts Decor over its limit">24.100 of 22.000 kr. for August. Saving is fine, you will just see it flagged.</Alert>
			<Alert color="danger" mark="!" title="Two of the rows could not be imported">They have no price. The other 36 are ready.</Alert>
			<Alert color="success" mark={<Icon name="check" />} title="The order was created">SPENDLY-452, with its 3 lines and 2 attachments.</Alert>
			<Alert mark="!" title="This looks like an order you already have" action={<Button variant="outline" size="small">Open it</Button>}>Indbo Møbler, 3.980,00 kr., 8 August.</Alert>
		</div>
	)
}
