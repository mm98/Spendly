import { EmailLine } from '../../react/src/components/EmailLine.jsx'

export default {
	title: 'Layout/Email line',
	component: EmailLine,
	args: { width: 180 },
	argTypes: { width: { control: { type: 'range', min: 80, max: 400, step: 10 }, description: 'The room the story gives the line, so the cut can be tried' } },
	render: ({ width, ...args }) => <div style={{ width }}><EmailLine {...args} /></div>
}

export const Short = { args: { email: 'anna@example.dk' } }
export const Long = { args: { email: 'anna.christina.kristensen@example.dk' } }
