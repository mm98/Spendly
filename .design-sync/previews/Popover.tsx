import { Button, Choice, Icon, Menu, MenuItem, MenuLabel, MenuSeparator, Popover, Radio, SearchInput, Switch } from 'spendly-react';

export const MoveToCategory = () => (
	<Popover
		position="static"
		head={<div className="sp-stack sp-gap-6"><span className="sp-title">Move to a category</span><span className="sp-subtitle">Applies to the 4 orders you picked.</span></div>}
		summary={<span className="sp-subtitle">4 orders move to Havemøbler</span>}
		actions={<>
			<Button variant="outline" fullWidth>Cancel</Button>
			<Button fullWidth>Apply</Button>
		</>}
	>
		<Choice variant="row" control={<Radio name="pop-move" checked onChange={() => {}} />}>Havemøbler</Choice>
		<Choice variant="row" control={<Radio name="pop-move" checked={false} onChange={() => {}} />}>Boligtilbehør</Choice>
		<Choice variant="row" control={<Radio name="pop-move" checked={false} onChange={() => {}} />}>Belysning</Choice>
	</Popover>
);

export const WithNote = () => (
	<Popover
		position="static"
		head={<><span className="sp-title">Set status</span><span className="sp-subtitle">Replaces the status on 3 orders.</span></>}
		note={<label className="sp-row-flex sp-gap-8"><Switch checked onChange={() => {}} /><span className="sp-subtitle">Also set delivery date to today</span></label>}
		actions={<>
			<Button variant="outline" fullWidth>Cancel</Button>
			<Button fullWidth>Apply</Button>
		</>}
	>
		<Choice variant="row" control={<Radio name="pop-status" checked={false} onChange={() => {}} />}>In progress</Choice>
		<Choice variant="row" control={<Radio name="pop-status" checked onChange={() => {}} />}>Delivered</Choice>
		<Choice variant="row" control={<Radio name="pop-status" checked={false} onChange={() => {}} />}>Returned</Choice>
	</Popover>
);

export const WithSearch = () => (
	<Popover
		position="static"
		role="dialog"
		aria-label="Merge Bilka Odense into"
		head={<><span className="sp-title sp-truncate">Merge Bilka Odense into</span><span className="sp-subtitle">Its name becomes an alias there, and this record is deleted.</span></>}
		search={<SearchInput value="bil" onChange={() => {}} placeholder="Search 48 vendors…" aria-label="Search vendors" />}
	>
		<Menu position="plain" aria-label="Vendor to merge into">
			<MenuLabel>Recent</MenuLabel>
			<MenuItem onClick={() => {}}><span className="sp-truncate">Bilka</span><span className="sp-grow" /><span className="sp-meta sp-nowrap">23 orders</span><Icon name="chevron-right" size={13} /></MenuItem>
			<MenuSeparator />
			<MenuLabel>Other vendors</MenuLabel>
			<MenuItem onClick={() => {}}><span className="sp-truncate">Bilka ToGo</span><span className="sp-grow" /><span className="sp-meta sp-nowrap">4 orders</span><Icon name="chevron-right" size={13} /></MenuItem>
		</Menu>
	</Popover>
);
