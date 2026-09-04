// Preview wrapper for design-sync cards. Rows, tiles and buttons that take `to` render a
// react-router <Link>, which throws outside a Router -- so every card mounts inside one.
//
// It has to be a DATA router, not a plain <MemoryRouter>: RouteError calls useRouteError,
// which throws "must be used within a data router" and takes the whole card down with it,
// blank and with no reported error. Memory, not browser, because a card has no address bar.
//
// Deliberately not wrapping ToastProvider: useToast's context default is a no-op, so
// components read it fine unwrapped, and a toast is not a state a still card can show.
import { useMemo } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'

export function PreviewEnv({ children }) {
	// Rebuilt only when the children change: createMemoryRouter on every render would
	// remount the card and lose any state a preview has settled into.
	const router = useMemo(
		() => createMemoryRouter([{ id: 'preview', path: '*', element: children }]),
		[children],
	)
	return <RouterProvider router={router} />
}
