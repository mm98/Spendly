// Preview wrapper for design-sync cards. Rows, tiles and buttons that take `to` render a
// react-router <Link>, which throws outside a Router -- so every card mounts inside one.
// MemoryRouter (not BrowserRouter) because a card has no address bar to own.
//
// Deliberately not wrapping ToastProvider: useToast's context default is a no-op, so
// components read it fine unwrapped, and a toast is not a state a still card can show.
import { MemoryRouter } from 'react-router'

export function PreviewEnv({ children }) {
	return <MemoryRouter>{children}</MemoryRouter>
}
