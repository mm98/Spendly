import { Field, IconPicker } from 'spendly-react'

/* The searchable grid of Tabler outline icons a category's glyph is chosen from. Before
   anything is typed the grid shows the icons other categories already carry, each with the
   path the record stored beside it -- so the opening view draws without fetching anything. */

const noop = () => {}
const box: React.CSSProperties = { maxWidth: 460 }

/* One `{name, path}` per icon a category on this account already uses, deduplicated. */
const usedIcons = [
	{ name: 'shopping-cart', path: 'M4 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M15 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M17 17h-11v-14h-2 M6 5l14 1l-1 7h-13' },
	{ name: 'home', path: 'M5 12l-2 0l9-9l9 9l-2 0 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7 M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6' },
	{ name: 'device-tv', path: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-14a2 2 0 0 1-2-2l0-9 M16 3l-4 4l-4-4' },
	{ name: 'car', path: 'M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6-6h15m-6 0v-5' },
	{ name: 'coffee', path: 'M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67-.358 3.5-1c.83-.642 2.077-1.017 3.5-1c1.423-.017 2.67 .358 3.5 1 M8 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2 M12 3a2.4 2.4 0 0 0-1 2a2.4 2.4 0 0 0 1 2 M3 10h14v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-5 M16.746 16.726a3 3 0 1 0 .252-5.555' },
	{ name: 'pill', path: 'M4.5 12.5l8-8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1-7-7 M8.5 8.5l7 7' },
	{ name: 'shirt', path: 'M15 4l6 2v5h-3v8a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8h-3v-5l6-2a3 3 0 0 0 6 0' },
	{ name: 'building-store', path: 'M3 21l18 0 M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2-4h14l2 4 M5 21l0-10.15 M19 21l0-10.15 M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4' }
]

/* The chosen tile is filled dark. The line under the grid says how much of the catalogue is
   on screen. */
export const AChosenIcon = () => (
	<div style={box}>
		<Field label="Icon" group>
			<IconPicker value="shopping-cart" usedIcons={usedIcons} onChange={noop}
				label="Category icon" />
		</Field>
	</div>
)

/* A new category, before anything is picked: the same grid, nothing filled. */
export const NoneChosenYet = () => (
	<div style={box}>
		<Field label="Icon" group>
			<IconPicker value="" usedIcons={usedIcons} onChange={noop} label="Category icon" />
		</Field>
	</div>
)

/* A brand new account, where no category carries an icon yet, so there is nothing to suggest
   and the grid says what to do instead. */
export const NothingUsedYet = () => (
	<div style={box}>
		<Field label="Icon" group>
			<IconPicker value="" usedIcons={[]} onChange={noop} label="Category icon" />
		</Field>
	</div>
)
