import { Field, PasswordField } from 'spendly-react';

const col = { display: 'grid', gap: 16, maxWidth: 360 } as const;
const noop = () => {};

export const Default = () => (
	<div style={col}>
		<Field label="Password" required>
			<PasswordField value="kaffe-og-kage-2026" onChange={noop} autoComplete="current-password" />
		</Field>
		<Field label="New password" message="At least 12 characters.">
			<PasswordField value="" onChange={noop} autoComplete="new-password" />
		</Field>
	</div>
);

export const States = () => (
	<div style={col}>
		<Field label="Password" messageType="danger" message="That password is not right.">
			<PasswordField value="kaffe2025" onChange={noop} autoComplete="current-password" />
		</Field>
		<Field label="Disabled">
			<PasswordField value="kaffe-og-kage-2026" onChange={noop} disabled />
		</Field>
	</div>
);
