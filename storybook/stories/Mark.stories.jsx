import { Mark, MarkRemove } from '../../react/src/components/Mark.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'

export default {
	title: 'Controls/Mark',
	component: Mark,
	args: { children: 'Indbo Møbler', size: 'medium', fill: 'solid' },
	argTypes: {
		size: { control: 'inline-radio', options: ['small', 'medium', 'large', 'xlarge'] },
		fill: { control: 'inline-radio', options: ['default', 'solid', 'plain', 'empty', 'none'] }
	}
}

export const FromAName = {}
export const Round = { args: { round: true } }

export const Sizes = {
	render: () => (
		<div className="sp-row-flex sp-gap-8">
			{['small', 'medium', 'large', 'xlarge'].map(size => <Mark key={size} size={size} fill="solid">Indbo Møbler</Mark>)}
		</div>
	)
}

export const Names = {
	render: () => (
		<div className="sp-row-flex sp-gap-8">
			{['Indbo Møbler', 'HAY', 'Muuto', 'Bilka', 'IKEA', 'Normann Copenhagen', 'Bolia'].map(name => <Mark key={name} size="medium" fill="solid">{name}</Mark>)}
		</div>
	)
}

export const Fills = {
	render: () => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size="medium" aria-label="Default"><Icon name="receipt" /></Mark>
			<Mark size="medium" fill="plain" aria-label="Plain"><Icon name="receipt" /></Mark>
			<Mark size="medium" fill="empty" aria-label="Empty"><Icon name="photo" /></Mark>
			<Mark size="medium" fill="none" aria-label="Problem"><Icon name="alert-circle" /></Mark>
			<Mark size="medium" fill="add" aria-label="Add"><Icon name="plus" /></Mark>
		</div>
	)
}

export const WithCountAndRemove = {
	render: () => (
		<div className="sp-row-flex sp-gap-8">
			<Mark size="large" fill="plain" count={3} aria-label="Three files"><Icon name="file" /></Mark>
			<Mark size="large" fill="plain" aria-label="Receipt" onClick={() => {}}
				remove={<MarkRemove aria-label="Remove the receipt" onClick={() => {}}><Icon name="x" size={12} /></MarkRemove>}>
				<Icon name="receipt" />
			</Mark>
			<Mark size="large" fill="plain" danger="Too big" aria-label="A file that failed"><Icon name="file" /></Mark>
		</div>
	)
}
