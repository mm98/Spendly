import { join, pick, reject } from './variants.js'
import { Mark } from './Mark.jsx'
import { IconButton } from './Button.jsx'
import { Spinner } from './Utilities.jsx'
import { Icon } from './Icon.jsx'

/* What an answer in Ask holds besides its words (Ask 24d): the files it made, and a
   chart of the reader's own numbers. The rest of the conversation - the bubbles, the
   dock, the field - lives with the app's Chat; these are the parts drawn new.

   The chart itself is not here. An answer's chart is the library's Bars (Data.jsx),
   or the app's Donut with its Shares, at their own sizes: ChatChart is only the frame
   and the name above it. */

const TYPE = { xlsx: 'Excel', docx: 'Word', pdf: 'PDF', csv: 'CSV' }
const STATE = { ready: null, making: null, failed: null, gone: 'gone' }
const GONE = { deleted: 'Deleted', expired: 'Removed after 30 days' }

/** The frame one answer's files share, a row per file, a rule between rows. Also the
    list on Files (24e). */
export function ChatFiles({ children, ...rest }) {
	reject(rest, 'ChatFiles')
	return <div className="sp-chat__files" {...rest}>{children}</div>
}

/**
 * One file: the document mark, the title, its type and size, and what can be done
 * with it.
 *
 * @param {object} props
 * @param {string} props.title The question as it was sent, and nothing else. The
 *   time it was asked goes only into the downloaded file's name, which the server
 *   sets: "{question} (2026-10-22T14-05).xlsx".
 * @param {'xlsx'|'docx'|'pdf'|'csv'} props.type
 * @param {string} [props.size] Already formatted: "18 KB", "1.2 MB".
 * @param {'ready'|'making'|'failed'|'gone'} [props.state]
 * @param {string} [props.reason] Why it could not be made, one line. `failed` only.
 * @param {'deleted'|'expired'} [props.gone] Why it is gone. `gone` only.
 * @param {string} [props.keptUntil] The last day it is kept, ISO 8601. On Files only.
 * @param {string} [props.href] The download. `ready` only.
 * @param {() => void} [props.onDelete] Offers Delete after Download. On Files only.
 *
 * Takes no `className` and no `style`.
 */
export function ChatFile({ title, type, size, state = 'ready', reason, gone, keptUntil, href, onDelete, ...rest }) {
	reject(rest, 'ChatFile')
	pick(STATE, state, 'state', 'ChatFile')
	const kind = pick(TYPE, type, 'type', 'ChatFile')
	if (state === 'failed' && !reason) console.error('<ChatFile> a file that could not be made says why')
	if (state === 'gone' && !(gone in GONE)) console.error(`<ChatFile> gone="${gone}" is not one of: ${Object.keys(GONE).join(' | ')}`)
	if (state === 'ready' && !href) console.error('<ChatFile> a ready file needs its href')
	const meta =
		state === 'failed' ? `Could not be made: ${reason}`
		: state === 'making' ? `${kind} · Being made`
		: state === 'gone' ? `${kind} · ${GONE[gone]}`
		: join(kind, size && `· ${size}`, keptUntil && `· Kept until ${keptUntil}`)
	return (
		<div className="sp-chat__file" data-state={STATE[state] || undefined} {...rest}>
			<Mark size="medium" fill="none" aria-hidden="true"><Icon name="file-text" /></Mark>
			<span className="sp-stacked">
				<span className="sp-chat__file-name sp-truncate" title={title}>{title}</span>
				<span className={join('sp-meta', state === 'failed' && 'sp-chat__failed')}>{meta}</span>
			</span>
			{state === 'ready' ? <IconButton variant="outline" icon="download" href={href} aria-label={`Download ${title}`} data-tip="Download" /> : null}
			{state === 'ready' && onDelete ? <IconButton variant="outline" icon="trash" onClick={onDelete} aria-label={`Delete ${title}`} data-tip="Delete" /> : null}
			{state === 'making' ? <IconButton variant="outline" icon={<Spinner />} disabled aria-label="Being made" /> : null}
		</div>
	)
}

/**
 * A chart in an answer: the figure frame a table uses, the chart's name and its
 * period or total, then the chart. The frame does not scroll when it holds one.
 *
 * @param {object} props
 * @param {React.ReactNode} props.name "Spending per month".
 * @param {React.ReactNode} [props.meta] "Oct 2025 - Sep 2026".
 * @param {React.ReactNode} [props.failed] Why it could not be made, in place of the
 *   chart: the frame and the name stay.
 * @param {React.ReactNode} [props.children] Bars, or the Donut and its Shares inside
 *   ChatShares, then the Legend when there is more than one series.
 *
 * Takes no `className` and no `style`.
 */
export function ChatChart({ name, meta, failed, children, ...rest }) {
	reject(rest, 'ChatChart')
	if (failed && children) console.error('<ChatChart> a chart that could not be made draws nothing')
	return (
		<div className="sp-chat__figures" {...rest}>
			<div className="sp-chat__chart">
				<div className="sp-chat__chart-name">
					<span className="sp-section-label">{name}</span>
					{meta ? <span className="sp-meta">{meta}</span> : null}
				</div>
				{failed ? <p className="sp-chat__failed">{failed}</p> : children}
			</div>
		</div>
	)
}

/** The Donut beside its Shares where the bubble has room, above them where not. */
export function ChatShares({ children, ...rest }) {
	reject(rest, 'ChatShares')
	return <div className="sp-chat__shares" {...rest}>{children}</div>
}
