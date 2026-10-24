import { Toast, ToastUndo } from 'spendly-react';

const col = { display: 'grid', gap: 12, justifyItems: 'start' } as const;

export const Kinds = () => (
	<div style={col}>
		<Toast icon="check">
			Line removed from SPENDLY-447
			<ToastUndo onClick={() => {}}>Undo</ToastUndo>
		</Toast>
		<Toast color="danger" icon="alert-circle">That file could not be read</Toast>
		<Toast compact>4 picked</Toast>
	</div>
);

export const WithCountdown = () => (
	<Toast icon="trash" seconds={6}>
		3 orders deleted
		<ToastUndo onClick={() => {}}>Undo</ToastUndo>
	</Toast>
);

export const Asks = () => (
	<Toast asks icon="alert-triangle">
		This cannot be undone after the toast disappears
		<ToastUndo onClick={() => {}}>Keep it</ToastUndo>
	</Toast>
);
