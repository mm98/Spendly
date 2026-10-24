import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { ReorderList } from '../../react/src/components/Reorder.jsx'
import { ListItem } from '../../react/src/components/ListItem.jsx'
import { Icon } from '../../react/src/components/Icon.jsx'

const ACCOUNTS = [
	{ id: 'a', name: 'Housing' },
	{ id: 'b', name: 'Food' },
	{ id: 'c', name: 'Transport' },
	{ id: 'd', name: 'Savings' }
]

export default {
	title: 'Lists/Reorder List',
	component: ReorderList,
	args: { items: ACCOUNTS, keyOf: item => item.id, nameOf: item => item.name, onMove: fn() },
	argTypes: { keyOf: { control: false }, nameOf: { control: false }, children: { control: false } },
	render: ({ items, onMove, ...args }) => {
		const [shown, setShown] = useState(items)
		return (
			<div className="sp-stack sp-gap-8" style={{ maxWidth: 420 }}>
				<ReorderList {...args} items={shown} onMove={(next, item, to) => { setShown(next); onMove(next, item, to) }}>
					{item => (
						<ListItem handle={<Icon name="grip-vertical" size={14} />} handleLabel={`Move ${item.name}`}>
							<span className="sp-title sp-grow">{item.name}</span>
						</ListItem>
					)}
				</ReorderList>
			</div>
		)
	}
}

export const ByHand = {
	play: async ({ args, canvas }) => {
		canvas.getByRole('button', { name: 'Move Housing' }).focus()
		await userEvent.keyboard(' ')
		await userEvent.keyboard('{ArrowDown}')
		await userEvent.keyboard(' ')
		await expect(args.onMove).toHaveBeenCalledTimes(1)
		const [next, item, to] = args.onMove.mock.calls[0]
		await expect(next.map(i => i.name)).toEqual(['Food', 'Housing', 'Transport', 'Savings'])
		await expect(item.name).toBe('Housing')
		await expect(to).toBe(1)
	}
}
