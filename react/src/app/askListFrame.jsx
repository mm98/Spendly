import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Chat, ChatDock, ChatMore, ChatScroll } from '../components/Chat.jsx'
import { getAssistant } from '../api/client.js'
import { useApi } from '../api/useApi.js'
import { plural } from '../api/format.js'
import { askInLastChat, lastChat, stopAsking, useAsking } from './assistant.js'

/** Chats and Files on a desktop (24e, 24f): the controls bar 12 above the list that scrolls, or `empty` in
    its place, and Ask's chat bar under them with Back to chat. A question asked here goes to that chat. */
export function AskListFrame({ controls, empty, children }) {
	const navigate = useNavigate()
	const assistant = useApi(getAssistant).data
	const working = useAsking()
	const [text, setText] = useState('')
	const noneLeft = !!assistant?.ready && assistant.left === 0
	const left = assistant?.left
	const last = lastChat()

	const send = () => {
		if (working || noneLeft || !text.trim()) return
		const to = askInLastChat(text)
		if (!to) return
		setText('')
		navigate(to)
	}
	const keys = ev => {
		if (ev.key === 'Enter' && !ev.shiftKey) {
			ev.preventDefault()
			send()
		}
	}

	return (
		<Chat>
			<Chat spaced>
				{controls}
				{empty ?? <ChatScroll>{children}</ChatScroll>}
			</Chat>
			<ChatDock
				value={text}
				onChange={setText}
				onKeyDown={keys}
				onSend={send}
				onStop={stopAsking}
				working={working}
				disabled={noneLeft}
				placeholder={noneLeft ? 'No questions left today' : 'Ask about your orders, vendors and budget'}
				left={left > 0 && left <= 3 ? `${plural(left, 'question')} left today` : null}
				end={<ChatMore back={last ? `/ask/${last}` : '/ask'} />}
			/>
		</Chat>
	)
}
