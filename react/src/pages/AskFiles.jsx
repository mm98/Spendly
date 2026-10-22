import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ChatFile, ChatFiles, ChatStart } from '../components/Chat.jsx'
import { Failed } from '../components/Failed.jsx'
import { Icon } from '../components/Icon.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Controls, ListMore } from '../components/List.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { deleteAskFile, failureMessage, getAskFiles, restoreAskFile } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { AskListFrame } from '../app/askListFrame.jsx'
import { ScreenBar } from '../app/screenBar.jsx'
import { useShellShape } from '../app/useMedia.js'

const STEP = 25

/** Files (24e): every file Ask made in the last 30 days, newest first, to search, open its chat at the
    answer that made it, download again or delete.
    `?download=ID` starts that file's download, as signing in from a download link comes back here. */
export default function AskFiles() {
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const [params, setParams] = useSearchParams()
	const [pages, setPages] = useState(1)
	const [query, setQuery] = useState('')
	const list = useApi(getAskFiles, [{ q: touch ? '' : query.trim(), pageSize: STEP * pages }])

	const asked = params.get('download')
	useEffect(() => {
		if (!asked) return
		setParams({}, { replace: true })
		window.location.assign(`/api/ask/files/${encodeURIComponent(asked)}/download`)
	}, [asked, setParams])

	const problem = (e, fallback) => toast({ message: failureMessage(e, fallback), color: 'danger' })
	const remove = file => {
		deleteAskFile(file.id).then(
			() => toast({ message: 'File deleted', undo: { label: 'Undo', onClick: () => restoreAskFile(file.id).catch(e => problem(e, 'The file could not be brought back.')) } }),
			e => problem(e, 'The file was not deleted. Try again.')
		)
	}

	const data = list.data
	const searching = !!query.trim()
	let empty = null
	let body = null
	if (list.error && !data) empty = <Failed what="Your files" error={list.error} onRetry={list.refresh} />
	else if (!data) body = <ChatFiles aria-busy="true"><div className="sp-chat__file"><Skeleton shape="line" /></div></ChatFiles>
	else if (!data.files.length) {
		empty = (
			<ChatStart>
				<Empty>
					<Mark size="large" fill="none" aria-hidden="true" aria-label="Files"><Icon name="paperclip" /></Mark>
					{searching
						? <><EmptyTitle>No files found</EmptyTitle><EmptyBody>Try another word, or clear the search.</EmptyBody></>
						: <><EmptyTitle>No files yet</EmptyTitle><EmptyBody>Ask Spendly for a spreadsheet or a document, and it is kept here for {data.keptDays} days.</EmptyBody></>}
				</Empty>
			</ChatStart>
		)
	}
	else {
		body = (
			<>
				<ChatFiles>
					{data.files.map(f => <ChatFile key={f.id} title={f.title} kind={f.kind} size={f.size} keptUntil={f.keptUntil} href={f.href} chatTo={f.chatId ? `/ask/${f.chatId}?file=${f.id}` : undefined} onDelete={() => remove(f)} />)}
				</ChatFiles>
				<ListMore loose shown={data.files.length} total={data.matched} pageSize={STEP} onMore={() => setPages(pages + 1)} />
			</>
		)
	}

	if (touch) return <><ScreenBar title="Files" onBack={() => navigate('/ask')} />{empty ?? body}</>
	let count = null
	if (data?.total) count = searching ? `${data.matched} of ${plural(data.total, 'file')}` : plural(data.total, 'file')
	const controls = data?.total
		? (
			<Controls>
				<SearchInput value={query} onChange={q => { setQuery(q); setPages(1) }} placeholder="Search files" aria-label="Search files" />
				<span className="sp-meta">{count}</span>
			</Controls>
		)
		: null
	return <AskListFrame controls={controls} empty={empty}>{body}</AskListFrame>
}
