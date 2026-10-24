import { useState } from 'react'
import { Menu, MenuItem, MenuLabel, MenuSeparator, Popover, Anchor, Dialog, DialogTitle, DialogBody, DialogActions, Toast, ToastUndo, Alert } from '../../react/src/components/Overlays.jsx'
import { Button, IconButton } from '../../react/src/components/Button.jsx'
import { Choice, Radio } from '../../react/src/components/Choice.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'

export default { title: 'Overlays/Menus, dialogs and messages' }

export const MenuInPlace = {
	render: () => (
		<div style={{ maxWidth: 260 }}>
			<Menu aria-label="This order">
				<MenuLabel>This order</MenuLabel>
				<MenuItem icon="pencil" onClick={() => {}}>Edit</MenuItem>
				<MenuItem icon="copy" onClick={() => {}}>Duplicate</MenuItem>
				<MenuSeparator />
				<MenuItem icon="download" onClick={() => {}}>Export</MenuItem>
				<MenuItem icon="trash" disabled>Delete</MenuItem>
			</Menu>
		</div>
	)
}

export const MenuFromAButton = {
	render: () => {
		const [open, setOpen] = useState(true)
		const [status, setStatus] = useState('progress')
		return (
			<div style={{ paddingLeft: 200, minHeight: 320 }}>
				<Anchor open={open}>
					<IconButton icon="dots-vertical" aria-label="This order" aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} />
					<Menu position="floating" aria-label="This order">
						<MenuItem icon="pencil" onClick={() => setOpen(false)}>Edit</MenuItem>
						<MenuItem icon="tag">Set status
							<Menu position="sub" aria-label="Set the status">
								{['draft', 'progress', 'done', 'returned', 'cancelled'].map(dot => (
									<MenuItem key={dot} dot={dot} selected={dot === status} onClick={() => { setStatus(dot); setOpen(false) }}>{dot[0].toUpperCase() + dot.slice(1)}</MenuItem>
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
	}
}

export const PopoverWithActions = {
	render: () => (
		<Popover position="static"
			head={<div className="sp-stack sp-gap-6"><span className="sp-title">Move to a category</span><span className="sp-subtitle">Applies to the 4 orders you picked.</span></div>}
			summary={<span className="sp-subtitle">4 orders move to Havemøbler</span>}
			actions={[<Button key="c" variant="outline">Cancel</Button>, <Button key="a">Apply</Button>]}>
			<Choice variant="row" control={<Radio name="move" defaultChecked />}>Havemøbler</Choice>
			<Choice variant="row" control={<Radio name="move" />}>Boligtilbehør</Choice>
			<Choice variant="row" control={<Radio name="move" />}>Belysning</Choice>
		</Popover>
	)
}

export const DialogInPlace = {
	render: () => (
		<Dialog scrim={false}>
			<DialogTitle>Delete this order?</DialogTitle>
			<DialogBody>SPENDLY-447 from Indbo Møbler, 3.980,00 kr. Its 4 lines and 3 attachments go with it, and the August total drops by 3.980,00 kr.</DialogBody>
			<DialogActions>
				<Button variant="outline">Keep it</Button>
				<span className="sp-grow" />
				<Button color="danger" iconStart="trash">Delete order</Button>
			</DialogActions>
		</Dialog>
	)
}

export const DialogOverThePage = {
	render: () => {
		const [open, setOpen] = useState(true)
		return (
			<>
				<Button variant="outline" color="danger" onClick={() => setOpen(true)}>Delete order</Button>
				{open
					? (
						<Dialog onCancel={() => setOpen(false)}>
							<DialogTitle>Delete this order?</DialogTitle>
							<DialogBody>SPENDLY-447 from Indbo Møbler, 3.980,00 kr.</DialogBody>
							<DialogActions>
								<Button variant="outline" onClick={() => setOpen(false)}>Keep it</Button>
								<span className="sp-grow" />
								<Button color="danger" iconStart="trash" onClick={() => setOpen(false)}>Delete order</Button>
							</DialogActions>
						</Dialog>
					)
					: null}
			</>
		)
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
