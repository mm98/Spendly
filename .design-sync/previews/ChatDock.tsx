import { ChatDock, ChatMore, Menu, MenuItem, MenuSeparator } from 'spendly-react';

const box = { maxWidth: 640 } as const;
const noop = () => {};
const more = (
	<ChatMore>
		<Menu position="floating" aria-label="Conversation">
			<MenuItem icon="message-circle" to="/ask/chats">Chats</MenuItem>
			<MenuItem icon="paperclip" to="/ask/files">Files</MenuItem>
			<MenuSeparator />
			<MenuItem icon="plus" onClick={noop}>New chat</MenuItem>
		</Menu>
	</ChatMore>
);

export const Typed = () => (
	<div style={box}>
		<ChatDock value="How much did I spend at Bilka in September?" onChange={noop} onSend={noop} onHelp={noop} placeholder="Ask about your orders, vendors and budget" end={more} />
	</div>
);

export const Empty = () => (
	<div style={box}>
		<ChatDock value="" onChange={noop} onSend={noop} onHelp={noop} placeholder="Ask about your orders, vendors and budget" end={more} />
	</div>
);

export const Working = () => (
	<div style={box}>
		<ChatDock value="" onChange={noop} onSend={noop} onStop={noop} onHelp={noop} working placeholder="Ask a follow-up" end={more} />
	</div>
);

export const NoneLeft = () => (
	<div style={box}>
		<ChatDock value="" onChange={noop} onSend={noop} onHelp={noop} disabled placeholder="No questions left today" end={more} />
	</div>
);

export const PhoneBar = () => (
	<div style={{ maxWidth: 390 }}>
		<ChatDock bar value="" onChange={noop} onSend={noop} onHelp={noop} placeholder="Ask a follow-up" />
	</div>
);

export const ChatsBack = () => (
	<div style={box}>
		<ChatDock value="" onChange={noop} onSend={noop} onHelp={noop} placeholder="Ask about your orders, vendors and budget" end={<ChatMore back="/ask" />} />
	</div>
);
