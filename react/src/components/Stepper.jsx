import { Card, CardBody } from './Card.jsx'
import { Icon } from './Icon.jsx'

/* The two- and three-step banners over New order and Scan.

   A step that is behind you draws a check rather than its own glyph, so the row states what
   happened as well as where you are -- the icon is the state, and the label is the name.
   The column template is the step count, not a fixed pair: three steps in a two-column grid
   put the last one on a second row, which reads as a fourth step that is missing. */

export function Stepper({ steps }) {
	return (
		<Card variant="card-steps" aria-label="Steps">
			<CardBody>
				<div className="stepper" style={{ gridTemplateColumns: steps.map(() => '1fr').join(' ') }}>
					{steps.map(step => (
						<div key={step.label}
							className={['stepper-step', step.done && 'stepper-step-done', step.on && 'is-on']
								.filter(Boolean).join(' ')}>
							<span className="stepper-icon"><Icon name={step.done ? 'check' : step.icon} /></span>
							<span className="stepper-bar" />
							<span className="stepper-step-label">{step.label}</span>
						</div>
					))}
				</div>
			</CardBody>
		</Card>
	)
}
