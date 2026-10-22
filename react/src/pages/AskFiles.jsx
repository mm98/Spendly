import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ChatFile, ChatFiles, ChatStart } from '../components/Chat.jsx'
import { Button } from '../components/Button.jsx'
import { Failed } from '../components/Failed.jsx'
import { Icon } from '../components/Icon.jsx'
import { Controls, ListMore } from '../components/List.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { deleteAssistantFile, failureMessage, getAssistantFiles, restoreAssistantFile } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { ScreenBar } from '../app/screenBar.jsx'
import { useShellShape } from '../app/useMedia.js'

const STEP = 25

/** Files (24e): every file Ask made in the last 30 days, newest first, to download again or delete.
    `?download=ID` starts that file's download, as signing in from a download link comes back here. */
export default function AskFiles() {
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const [params, setParams] = useSearchParams()
	const [pages, setPages] = useState(1)
	const list = useApi(getAssistantFiles, [{ pageSize: STEP * pages }])

	const asked = params.get('download')
	useEffect(() => {
		if (!asked) return
		setParams({}, { replace: true })
		window.location.assign(`/api/assistant/files/${encodeURIComponent(asked)}/download`)
	}, [asked, setParams])

	const problem = (e, fallback) => toast({ message: failureMessage(e, fallback), color: 'danger' })
	const remove = file => {
		deleteAssistantFile(file.id).then(
			() => toast({ message: 'File deleted', undo: { label: 'Undo', onClick: () => restoreAssistantFile(file.id).catch(e => problem(e, 'The file could not be brought back.')) } }),
			e => problem(e, 'The file was not deleted. Try again.')
		)
	}

	const data = list.data
	let body
	if (list.error && !data) body = <Failed what="Your files" error={list.error} onRetry={list.refresh} />
	else if (!data) body = <ChatFiles aria-busy="true"><div className="sp-chat__file"><Skeleton shape="line" /></div></ChatFiles>
	else if (!data.files.length) {
		body = (
			<ChatStart>
				<Empty>
					<Mark size="large" fill="none" aria-hidden="true" aria-label="Files"><Icon name="paperclip" /></Mark>
					<EmptyTitle>No files yet</EmptyTitle>
					<EmptyBody>Ask Spendly for a spreadsheet or a document, and it is kept here for {data.keptDays} days.</EmptyBody>
				</Empty>
			</ChatStart>
		)
	}
	else {
		body = (
			<>
				<ChatFiles>
					{data.files.map(f => <ChatFile key={f.id} title={f.title} type={f.type} size={f.size} keptUntil={f.keptUntil} href={f.href} onDelete={() => remove(f)} />)}
				</ChatFiles>
				<ListMore loose shown={data.files.length} total={data.matched} pageSize={STEP} onMore={() => setPages(pages + 1)} />
			</>
		)
	}

	const count = data?.matched ? `${plural(data.matched, 'file')}, ${data.matched === 1 ? '' : 'each '}kept for ${data.keptDays} days` : null
	return (
		<>
			{touch
				? <ScreenBar title="Files" onBack={() => navigate('/ask')} />
				: (
					<Controls>
						<Button variant="outline" to="/ask">Back to Ask</Button>
						<span className="sp-grow" />
						{count ? <span className="sp-meta">{count}</span> : null}
					</Controls>
				)}
			{body}
		</>
	)
}
