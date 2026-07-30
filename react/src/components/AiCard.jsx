import { Link } from 'react-router-dom'
import { Icon } from './Icon.jsx'
import { ProgressRing } from './Viz.jsx'

/* The dark card that offers the scan flow.

   Its header labels itself "<its own words>, open <destination>", the same as every other
   card header, so speech recognition can act on what is printed. The version that shipped
   named the sub-line and dropped the title the eye reads first, which left no spoken phrase
   that activates the link. README: Accessibility.

   The mark in the corner is decoration: it is the brand glyph at low contrast, and reading
   it out adds a "receipt" to the end of the card for no one's benefit. */

export function AiCard({ header, headline, body, children, ...rest }) {
	return (
		<section className="card card-ai" {...rest}>
			{header ? (
				<Link className="ai-card-header" to={header.to} data-go={header.to}>
					{header.progress ? <ProgressRing done={header.progress.done} total={header.progress.total} /> : null}
					<div className="ai-card-title">
						<div className="ai-card-title-text">{header.title}</div>
						<span className="ai-card-title-meta">{header.meta}</span>
					</div>
					{/* The destination is added to the name in the content rather than by an
					    aria-label over the top of it. A composed label cannot pass
					    label-content-name-mismatch here: the rule strips punctuation and joins the
					    three visible strings with nothing between them --
					    "1/3Get receipts read for youFinish setting up Spendly" -- so no readable
					    sentence contains it. Naming from the content makes the visible text part
					    of the name by construction, which is what the rule is asking for, and it
					    keeps the header speakable: every card header in the app announces
					    "<its own words>, open <destination>". README: Accessibility. */}
					<span className="screenreader-only">, open {header.destination}</span>
					<span className="chevron" aria-hidden="true"><Icon name="chevronRight" /></span>
				</Link>
			) : null}
			<div className="ai-card-headline">{headline}</div>
			<p className="ai-card-body">{body}</p>
			<div className="ai-card-actions">{children}</div>
		</section>
	)
}

export const AiCardMark = ({ size }) => (
	<span className="ai-card-mark" style={size ? { width: size, height: size } : undefined} aria-hidden="true">
		<Icon name="receipt" className="" />
	</span>
)
