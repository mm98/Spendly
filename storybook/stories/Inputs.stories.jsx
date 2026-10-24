import { expect, fn, userEvent } from 'storybook/test'
import { TextField, PasswordField, NumberField, SearchInput, AskTrail, RangeSlider, TokensField } from '../../react/src/components/Inputs.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Kbd } from '../../react/src/components/Utilities.jsx'
import { knownAccessibilityFaults, useHeld } from './controls.js'

const label = { control: 'text', description: 'The Field\'s label' }

// Every input here is a controlled one: the story holds its value, starting from the `value` arg.
const held = (Input, { field = {}, ...props } = {}) => ({ label: name, onChange, ...args }) => {
	const [value, setValue] = useHeld(args, 'value')
	return (
		<Field label={name} {...field}>
			<Input {...props} {...args} value={value} onChange={next => { setValue(next); onChange(next) }} />
		</Field>
	)
}

export default {
	title: 'Fields/Inputs',
	component: TextField,
	subcomponents: { PasswordField, NumberField, SearchInput, AskTrail, RangeSlider, TokensField },
	decorators: [Story => <div style={{ maxWidth: 420 }}><Story /></div>],
	args: { onChange: fn() },
	argTypes: { label, action: { control: false } }
}

export const Text = {
	args: { label: 'Text', value: '', placeholder: 'What was bought', maxLength: 64, disabled: false, readOnly: false },
	render: held(TextField, { field: { message: 'A hint that is always true.' } }),
	play: async ({ args, canvas }) => {
		await userEvent.type(canvas.getByRole('textbox', { name: 'Text' }), 'Sofa')
		await expect(args.onChange).toHaveBeenLastCalledWith('Sofa')
		await expect(canvas.getByRole('textbox')).toHaveValue('Sofa')
	}
}

export const Email = { args: { label: 'Email', type: 'email', value: '', placeholder: 'name@example.net' }, render: held(TextField) }

export const Password = {
	args: { label: 'Password', value: 'a secret', autoComplete: 'current-password' },
	parameters: { variantsOf: PasswordField },
	render: held(PasswordField),
	play: async ({ canvas, canvasElement }) => {
		const box = canvasElement.querySelector('input')
		await expect(box).toHaveAttribute('type', 'password')
		await userEvent.click(canvas.getByRole('button', { name: 'Show password' }))
		await expect(box).toHaveAttribute('type', 'text')
	}
}

export const Amount = {
	args: { label: 'Amount', value: 1320, locale: 'da-DK', decimals: 2, expected: false },
	parameters: { a11y: knownAccessibilityFaults, variantsOf: NumberField },
	render: held(NumberField, { field: { unit: 'kr.' } })
}

const search = ({ onChange, ends, ...args }) => {
	const [value, setValue] = useHeld(args, 'value')
	return <SearchInput {...args} value={value} onChange={next => { setValue(next); onChange(next) }} ends={ends} />
}

export const Search = {
	args: { value: '', placeholder: 'Search orders', 'aria-label': 'Search orders', icon: 'search', clear: true },
	parameters: { variantsOf: SearchInput },
	render: args => search({ ...args, kbd: <Kbd>S</Kbd> }),
	play: async ({ args, canvas }) => {
		await userEvent.type(canvas.getByRole('searchbox'), 'HAY')
		await userEvent.click(canvas.getByRole('button', { name: 'Clear the search' }))
		await expect(args.onChange).toHaveBeenLastCalledWith('')
		await expect(canvas.getByRole('searchbox')).toHaveValue('')
	}
}

export const SearchWithAsk = {
	args: { value: 'chairs from HAY', placeholder: 'Search orders', 'aria-label': 'Search orders', on: false, onToggle: fn() },
	argTypes: { on: { description: 'AskTrail\'s `on`' } },
	render: ({ on: start, onToggle, ...args }) => {
		const [on, setOn] = useHeld({ on: start }, 'on')
		return search({ ...args, ends: <AskTrail on={on} onToggle={() => { setOn(!on); onToggle() }} /> })
	},
	play: async ({ args, canvas }) => {
		const ask = canvas.getByRole('button', { name: 'Ask' })
		await userEvent.click(ask)
		await expect(args.onToggle).toHaveBeenCalledOnce()
		await expect(ask).toHaveAttribute('aria-pressed', 'true')
	}
}

export const AskStates = {
	args: { onToggle: fn(), onStop: fn() },
	render: ({ onToggle, onStop }) => (
		<div className="sp-stack sp-gap-8">
			<SearchInput value="" onChange={() => {}} aria-label="Off" ends={<AskTrail onToggle={onToggle} />} />
			<SearchInput value="" onChange={() => {}} aria-label="On" ends={<AskTrail on onToggle={onToggle} />} />
			<SearchInput value="" onChange={() => {}} aria-label="Working" ends={<AskTrail on busy onStop={onStop} />} />
			<SearchInput value="" onChange={() => {}} aria-label="No questions left" ends={<AskTrail spent />} />
		</div>
	),
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
		await expect(args.onStop).toHaveBeenCalledOnce()
	}
}

export const AmountBetween = {
	args: { label: 'Amount between', value: [500, 4000], min: 0, max: 6000, step: 100 },
	render: ({ label: name, onChange, ...args }) => {
		const [bounds, setBounds] = useHeld(args, 'value')
		return (
			<Field label={name}>
				<RangeSlider {...args} label="Amount" value={bounds} onChange={next => { setBounds(next); onChange(next) }} />
			</Field>
		)
	}
}

export const Tokens = {
	args: { label: 'Vendors this rule covers', value: ['Indbo Møbler', 'HAY'], placeholder: 'Add a vendor', danger: false },
	render: ({ label: name, onChange, ...args }) => {
		const [tokens, setTokens] = useHeld(args, 'value')
		return (
			<Field label={name}>
				<TokensField {...args} aria-label={name} value={tokens} onChange={next => { setTokens(next); onChange(next) }} />
			</Field>
		)
	}
}
