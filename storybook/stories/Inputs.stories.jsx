import { useState } from 'react'
import { TextField, PasswordField, NumberField, SearchInput, AskTrail, RangeSlider, TokensField } from '../../react/src/components/Inputs.jsx'
import { Field } from '../../react/src/components/Field.jsx'
import { Kbd } from '../../react/src/components/Utilities.jsx'

export default {
	title: 'Fields/Inputs',
	component: TextField,
	decorators: [Story => <div style={{ maxWidth: 420 }}><Story /></div>]
}

export const Text = {
	render: () => {
		const [value, setValue] = useState('')
		return <Field label="Text" message="A hint that is always true."><TextField value={value} onChange={setValue} maxLength={64} placeholder="What was bought" /></Field>
	}
}

export const Email = {
	render: () => {
		const [value, setValue] = useState('')
		return <Field label="Email"><TextField type="email" value={value} onChange={setValue} placeholder="name@example.net" /></Field>
	}
}

export const Password = {
	render: () => {
		const [value, setValue] = useState('a secret')
		return <Field label="Password"><PasswordField value={value} onChange={setValue} autoComplete="current-password" /></Field>
	}
}

export const Amount = {
	render: () => {
		const [value, setValue] = useState(1320)
		return <Field label="Amount" unit="kr."><NumberField value={value} onChange={setValue} locale="da-DK" /></Field>
	}
}

export const Search = {
	render: () => {
		const [value, setValue] = useState('')
		return <SearchInput value={value} onChange={setValue} kbd={<Kbd>S</Kbd>} placeholder="Search orders" aria-label="Search orders" />
	}
}

export const SearchWithAsk = {
	render: () => {
		const [value, setValue] = useState('chairs from HAY')
		const [on, setOn] = useState(false)
		return <SearchInput value={value} onChange={setValue} placeholder="Search orders" aria-label="Search orders" ends={<AskTrail on={on} onToggle={() => setOn(!on)} />} />
	}
}

export const AskStates = {
	render: () => (
		<div className="sp-stack sp-gap-8">
			<SearchInput value="" onChange={() => {}} aria-label="Off" ends={<AskTrail onToggle={() => {}} />} />
			<SearchInput value="" onChange={() => {}} aria-label="On" ends={<AskTrail on onToggle={() => {}} />} />
			<SearchInput value="" onChange={() => {}} aria-label="Working" ends={<AskTrail on busy onStop={() => {}} />} />
			<SearchInput value="" onChange={() => {}} aria-label="No questions left" ends={<AskTrail spent />} />
		</div>
	)
}

export const AmountBetween = {
	render: () => {
		const [bounds, setBounds] = useState([500, 4000])
		return <Field label="Amount between"><RangeSlider value={bounds} onChange={setBounds} min={0} max={6000} step={100} label="Amount" /></Field>
	}
}

export const Tokens = {
	render: () => {
		const [tokens, setTokens] = useState(['Indbo Møbler', 'HAY'])
		return <Field label="Vendors this rule covers"><TokensField value={tokens} onChange={setTokens} aria-label="Vendors this rule covers" placeholder="Add a vendor" /></Field>
	}
}
