import { Mark, MarkRemove } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'
import { expect, fn, userEvent } from 'storybook/test'

export default {
	title: 'Controls/Mark',
	component: Mark,
	subcomponents: { MarkRemove },
	args: { children: 'Indbo Møbler', size: 'medium', fill: 'solid' },
	argTypes: { remove: { control: false } }
}

export const FromAName = {}
export const Round = { args: { round: true } }

export const Sizes = {
	render: ({ size, ...args }) => (
		<div className="sp-row-flex sp-gap-8">
			{['small', 'medium', 'large', 'xlarge'].map(each => <Mark {...args} key={each} size={each} />)}
		</div>
	)
}

export const Names = {
	render: ({ children, ...args }) => (
		<div className="sp-row-flex sp-gap-8">
			{['Indbo Møbler', 'HAY', 'Muuto', 'Bilka', 'IKEA', 'Normann Copenhagen', 'Bolia'].map(name => <Mark {...args} key={name}>{name}</Mark>)}
		</div>
	)
}

export const Fills = {
		render: ({ size }) => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size={size} aria-label="Default"><Icon name="receipt" /></Mark>
			<Mark size={size} fill="plain" aria-label="Plain"><Icon name="receipt" /></Mark>
			<Mark size={size} fill="empty" aria-label="Empty"><Icon name="photo" /></Mark>
			<Mark size={size} fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
			<Mark size={size} fill="add" aria-label="Add"><Icon name="plus" /></Mark>
		</div>
	)
}

export const WithCountAndRemove = {
	args: { size: 'large', count: 3, danger: 'Too big', onOpen: fn(), onRemove: fn() },
	render: ({ size, count, danger, onOpen, onRemove }) => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size={size} fill="plain" count={count} aria-label="Three files"><Icon name="file" /></Mark>
			<Mark size={size} fill="plain" aria-label="Receipt" onClick={onOpen}
				remove={<MarkRemove aria-label="Remove the receipt" onClick={onRemove}><Icon name="x" size={12} /></MarkRemove>}>
				<Icon name="receipt" />
			</Mark>
			<Mark size={size} fill="plain" danger={danger} aria-label="A file that failed"><Icon name="file" /></Mark>
		</div>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Remove the receipt' }))
		await expect(args.onRemove).toHaveBeenCalledOnce()
		await expect(args.onOpen).not.toHaveBeenCalled()
	}
}

// a shop's logo is a picture from another site; the story draws one of its own
const LOGO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="40"><rect width="96" height="40" rx="6" fill="#ffd500"/><text x="48" y="27" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="#1b1a17">Netto</text></svg>')}`

export const ShopOnAnOffer = {
	args: { logo: true, size: 'medium', shop: 'Netto', vendor: 'Mine Indkøb', swatch: 'primary-3' },
	argTypes: { shop: { control: 'text', description: 'The shop the offer is in' }, vendor: { control: 'text', description: 'The reader\'s own vendor that is that shop' }, swatch: { control: 'text', description: 'The vendor\'s colour' } },
	render: ({ logo, size, shop, vendor, swatch }) => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size={size} logo={logo} aria-label={`${shop}, its logo`}><img src={LOGO} alt="" /></Mark>
			<Mark size={size} logo={logo} fill="solid" swatch={swatch} aria-label={`${vendor}, the vendor`}><span>{vendor.split(' ').map(w => w[0]).join('').slice(0, 2)}</span></Mark>
			<Mark size={size} logo={logo} fill="none" aria-label={`${shop}, no logo`}>{shop}</Mark>
		</div>
	),
	play: async ({ canvas }) => {
		// every place is the same box, so the names beside them line up
		const widths = ['its logo', 'the vendor', 'no logo'].map(end => canvas.getByLabelText(new RegExp(end)).getBoundingClientRect().width)
		await expect(new Set(widths).size).toBe(1)
	}
}
