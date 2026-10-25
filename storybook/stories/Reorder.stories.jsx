import { useState } from 'react'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
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

// a mouse that carries a row by its handle; Motion reads only real-shaped pointer events
const pointer = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, {
	bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'mouse', pointerId: 1, isPrimary: true,
	button: 0, buttons: type === 'pointerup' ? 0 : 1
}))

export const Carried = {
	play: async ({ args, canvas, canvasElement }) => {
		const handle = canvas.getByRole('button', { name: 'Move Housing' })
		const box = handle.getBoundingClientRect()
		const x = box.x + box.width / 2, y = box.y + box.height / 2
		pointer(handle, 'pointerdown', x, y)
		pointer(handle, 'pointermove', x, y + 3)
		await new Promise(done => setTimeout(done, 50))
		await expect(canvasElement.querySelector('.sp-list-item--carried')).toBeNull()
		// in steps, as a hand moves: the rows make room only for a pointer that is moving
		for (let dy = 8; dy <= 48; dy += 8) {
			pointer(handle, 'pointermove', x, y + dy)
			await new Promise(done => requestAnimationFrame(done))
		}
		await waitFor(() => expect(canvasElement.querySelector('.sp-list-item--carried')).not.toBeNull())
		await waitFor(() => expect(canvas.getAllByRole('button', { name: /^Move / }).map(b => b.getAttribute('aria-label'))[1]).toBe('Move Housing'))
		const line = canvasElement.querySelector('.sp-list-item__insertion')
		await expect(line).not.toBeNull()
		await expect(line.nextElementSibling).toBe(canvasElement.querySelector('.sp-list-item--carried'))
		pointer(window, 'pointerup', x, y + 48)
		await waitFor(() => expect(canvasElement.querySelector('.sp-list-item__insertion')).toBeNull())
		await waitFor(() => expect(args.onMove).toHaveBeenCalledTimes(1))
	}
}
