import { EmailLine } from '../../react/src/components/EmailLine.jsx'

export default {
	title: 'Layout/Email line',
	component: EmailLine,
	argTypes: { tone: { control: 'inline-radio', options: ['plain', 'meta', 'nav'] } },
	decorators: [Story => <div style={{ width: 180 }}><Story /></div>]
}

export const Short = { args: { email: 'anna@example.dk' } }
export const Long = { args: { email: 'anna.christina.kristensen@example.dk' } }
