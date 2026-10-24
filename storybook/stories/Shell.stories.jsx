import { useState } from 'react'
import { Shell, TopBar, ShellContent, Sidebar, SidebarBrand, SidebarGroup, SidebarGrip, SidebarDivider, SidebarAccount, NavItem, Palette, PaletteGroup, PaletteRule, PaletteRow, PaletteAll } from '../../react/src/components/Shell.jsx'
import { SearchInput } from '../../react/src/components/Inputs.jsx'
import { Card, Cards } from '../../react/src/components/Card.jsx'
import { Mark } from '../../react/src/components/Mark.jsx'
import { Menu, MenuItem, MenuSeparator } from '../../react/src/components/Overlays.jsx'
import { Kbd } from '../../react/src/components/Utilities.jsx'
import { expect, fn, userEvent } from 'storybook/test'
import { iconControl, knownAccessibilityFaults, useHeld } from './controls.js'

export default {
	title: 'Shell/Desktop',
	component: Shell,
	subcomponents: { TopBar, ShellContent, Sidebar, SidebarBrand, SidebarGroup, SidebarGrip, SidebarDivider, SidebarAccount, NavItem, Palette, PaletteGroup, PaletteRule, PaletteRow, PaletteAll },
	parameters: { layout: 'fullscreen' },
	globals: { viewport: { value: 'desktop', isRotated: false } }
}

export const SidebarAndTopBar = {
	parameters: { a11y: knownAccessibilityFaults },
	args: { collapsed: false, accountOpen: false, noReceipt: 4, onSignOut: fn() },
	argTypes: {
		collapsed: { description: 'Shell\'s `collapsed`: the sidebar drawn as a rail' },
		accountOpen: { description: 'The account menu open' },
		noReceipt: { control: { type: 'number', min: 0 }, description: 'The count on No receipt' }
	},
	render: ({ noReceipt, onSignOut, ...args }) => {
		const [railed, setRailed] = useHeld(args, 'collapsed')
		const [search, setSearch] = useState('')
		const [account, setAccount] = useHeld(args, 'accountOpen')
		return (
			<Shell viewport collapsed={railed}>
				<Sidebar variant={railed ? 'rail' : 'default'}>
					<SidebarBrand><Mark size="small" fill="solid">S</Mark><span className="sp-strong">Spendly</span></SidebarBrand>
					<NavItem icon="home" current tip="Home">Home</NavItem>
					<SidebarGroup>Orders</SidebarGroup>
					<NavItem icon="receipt" count={18} tip="All orders">All orders</NavItem>
					<NavItem icon="building-store" count={24} tip="Vendors">Vendors</NavItem>
					<NavItem icon="category" count={6} tip="Categories">Categories</NavItem>
					<SidebarDivider />
					<SidebarGroup>Needs attention</SidebarGroup>
					<NavItem icon="bookmark" count={noReceipt} countColor="warning" tip="No receipt">No receipt</NavItem>
					<NavItem icon="settings" tip="Settings">Settings</NavItem>
					<span className="sp-grow" />
					<SidebarDivider />
					<SidebarAccount name="Anna Kristensen" email="anna.kristensen@example.dk" expanded={account} tip={railed ? 'Anna Kristensen' : undefined}
						aria-label="Anna Kristensen, anna.kristensen@example.dk" onClick={() => setAccount(!account)} onDismiss={() => setAccount(false)}
						menu={<Menu aria-label="Account"><MenuItem icon="settings" onClick={() => setAccount(false)}>Settings</MenuItem><MenuSeparator /><MenuItem icon="power" onClick={() => { setAccount(false); onSignOut() }}>Sign out</MenuItem></Menu>} />
					<SidebarGrip expanded={!railed} onClick={() => setRailed(!railed)} />
				</Sidebar>
				<TopBar>
					<SearchInput value={search} onChange={setSearch} placeholder="Search orders, vendors, items…" aria-label="Search" kbd={<Kbd>Ctrl K</Kbd>} />
				</TopBar>
				<ShellContent>
					<Cards>
						<Card><span className="sp-section-label">August</span><span className="sp-stat__figure">61.480,00 kr.</span></Card>
						<Card><span className="sp-section-label">July</span><span className="sp-stat__figure">54.120,00 kr.</span></Card>
					</Cards>
				</ShellContent>
			</Shell>
		)
	},
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Collapse the menu' }))
		const grip = await canvas.findByRole('button', { name: 'Expand the menu' })
		await expect(grip).toHaveAttribute('aria-expanded', 'false')
		await userEvent.click(grip)
		await canvas.findByRole('button', { name: 'Collapse the menu' })
	}
}

export const OneNavItem = {
	args: { children: 'All orders', icon: 'receipt', count: 18, current: false, variant: 'default', tip: 'All orders', onClick: fn() },
	argTypes: { icon: iconControl },
	parameters: { a11y: knownAccessibilityFaults, variantsOf: NavItem, layout: 'padded' },
	render: args => <div style={{ width: 240 }}><NavItem {...args} /></div>
}

export const SearchPalette = {
	parameters: { a11y: knownAccessibilityFaults, layout: 'centered', variantsOf: Palette },
	args: { value: 'bil', count: 4, label: 'Search', placeholder: 'Search orders, vendors, items…', onChange: fn(), onCancel: fn() },
	render: ({ onChange, ...args }) => {
		const [query, setQuery] = useHeld(args, 'value')
		return (
			<Palette {...args} value={query} onChange={q => { setQuery(q); onChange(q) }}>
				<PaletteGroup>Vendors</PaletteGroup>
				<PaletteRow icon="building-store" match="Bil" meta="12 orders" selected>Bilka</PaletteRow>
				<PaletteRule />
				<PaletteGroup>Orders</PaletteGroup>
				<PaletteRow icon="receipt" match="Bil" meta="SPENDLY-433 · 14 Aug" value="1.240,00">Bilka delivery</PaletteRow>
				<PaletteRow icon="receipt" match="Bil" meta="SPENDLY-401 · 2 Aug" value="890,00">Bilka delivery</PaletteRow>
				<PaletteAll>All 12 orders at Bilka</PaletteAll>
			</Palette>
		)
	},
	play: async ({ args, canvasElement }) => {
		await userEvent.type(canvasElement.ownerDocument.querySelector('.sp-palette__term'), 'ka')
		await expect(args.onChange).toHaveBeenLastCalledWith('bilka')
	}
}
