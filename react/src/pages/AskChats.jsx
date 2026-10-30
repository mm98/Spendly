import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChatFile, ChatFiles, ChatStart } from '../components/Chat.jsx'
import { Failed } from '../components/Failed.jsx'
import { Icon } from '../components/Icon.jsx'
import { SearchInput } from '../components/Inputs.jsx'
import { Controls, ListMore } from '../components/List.jsx'
import { Mark } from '../components/Mark.jsx'
import { useToast } from '../components/Overlays.jsx'
import { Empty, EmptyBody, EmptyTitle, Skeleton } from '../components/Utilities.jsx'
import { deleteChat, failureMessage, getChats, restoreChat } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { forgetChat } from '../app/ask.js'
import { AskListFrame } from '../app/askListFrame.jsx'
import { ScreenBar } from '../app/screenBar.jsx'
import { useShellShape } from '../app/useMedia.js'
import { usePhrase } from '../language/phrases.js'

const STEP = 25

/** Chats (24f): every chat kept, latest asked first, to open again, search or delete with the files
    its answers made. */
export default function AskChats() {
	const phrase = usePhrase()
	const touch = useShellShape() === 'touch'
	const navigate = useNavigate()
	const toast = useToast()
	const [query, setQuery] = useState('')
	const [pages, setPages] = useState(1)
	const list = useApi(getChats, [{ q: query.trim(), pageSize: STEP * pages }])

	const problem = (e, fallback) => toast({ message: failureMessage(e, fallback), color: 'danger' })
	const remove = chat => {
		deleteChat(chat.id).then(
			out => {
				forgetChat(chat.id)
				toast({
					message: out.files ? phrase('chats.deletedWithFiles', { files: plural(out.files, 'file') }) : phrase('chats.deleted'),
					undo: { label: phrase('action.undo'), onClick: () => restoreChat(chat.id).catch(e => problem(e, phrase('chats.notBack'))) }
				})
			},
			e => problem(e, phrase('chats.notDeleted'))
		)
	}

	const data = list.data
	const searching = !!query.trim()
	const mark = <Mark size="large" fill="none" aria-hidden="true" aria-label={phrase('page.chats')}><Icon name="message-circle" /></Mark>
	let empty = null
	let body = null
	if (list.error && !data) empty = <Failed what={phrase('chats.yours')} error={list.error} onRetry={list.refresh} />
	else if (!data) body = <ChatFiles aria-busy="true"><Skeleton shape="line" /></ChatFiles>
	else if (!data.chats.length) {
		empty = (
			<ChatStart>
				<Empty>
					{mark}
					{searching
						? <><EmptyTitle>{phrase('chats.noneFound')}</EmptyTitle><EmptyBody>{phrase('ask.tryAnotherWord')}</EmptyBody></>
						: <><EmptyTitle>{phrase('chats.none')}</EmptyTitle><EmptyBody>{phrase('chats.noneBody', { days: data.keptDays })}</EmptyBody></>}
				</Empty>
			</ChatStart>
		)
	}
	else {
		body = (
			<>
				<ChatFiles>
					{data.chats.map(c => (
						<ChatFile key={c.id} icon="message-circle" title={c.heading} to={`/ask/${c.id}`}
							meta={[plural(c.questions, 'question'), c.files ? plural(c.files, 'file') : null].filter(Boolean).join(' · ')}
							keptUntil={c.keptUntil} onDelete={() => remove(c)} />
					))}
				</ChatFiles>
				<ListMore loose shown={data.chats.length} total={data.matched} pageSize={STEP} onMore={() => setPages(pages + 1)} />
			</>
		)
	}

	const search = data?.total ? <SearchInput value={query} onChange={q => { setQuery(q); setPages(1) }} placeholder={phrase('chats.search')} aria-label={phrase('chats.search')} /> : null
	if (touch) return <><ScreenBar title={phrase('page.chats')} onBack={() => navigate('/ask')} />{search}{empty ?? body}</>
	let count = null
	if (data?.total) count = searching ? phrase('ask.matchedOf', { matched: data.matched, total: plural(data.total, 'chat') }) : plural(data.total, 'chat')
	const controls = search ? <Controls>{search}<span className="sp-meta">{count}</span></Controls> : null
	return <AskListFrame controls={controls} empty={empty}>{body}</AskListFrame>
}
