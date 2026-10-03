import { lazy } from 'react'
import { redirect } from 'react-router'
import { AppShell } from './app/AppShell.jsx'
import { RouteError, ShellError } from './app/RouteError.jsx'
import { SignedOut } from './app/SignedOut.jsx'
import { getCurrentUser, getSettings } from './api/client.js'
import { cachedFetch } from './api/useApi.js'
import { setCurrency, setLocale } from './api/format.js'
import { setDensity } from './app/theme.js'

/* Every route under the shell needs a signed-in session, checked once per navigation; the
   account's currency and date format are read on the same wait, before any figure is drawn. */
const requireAuth = async ({ request }) => {
	try {
		const user = await cachedFetch(getCurrentUser)
		// an account that has not had its first run is sent there from every page (20e)
		if (user?.needsSetup) {
			const { pathname, search } = new URL(request.url)
			throw redirect(pathname === '/' ? '/welcome' : `/welcome?next=${encodeURIComponent(pathname + search)}`)
		}
		await cachedFetch(getSettings).then(s => { setCurrency(s?.currency); setLocale(s?.locale); setDensity(s?.density) }).catch(() => {})
		return null
	} catch (e) {
		if (e instanceof Response) throw e
		if (e.status === 401) {
			const { pathname, search } = new URL(request.url)
			throw redirect(pathname === '/' ? '/signin' : `/signin?next=${encodeURIComponent(pathname + search)}`)
		}
		throw e
	}
}

/* A deploy renames every chunk; a tab opened before it asks for a file that is gone. One
   reload fetches the new names, and the flag stops it becoming a loop. */
const RELOAD_FLAG = 'spendly:stale-chunk-reloaded'
const flag = {
	get: () => { try { return sessionStorage.getItem(RELOAD_FLAG) } catch { return null } },
	set: () => { try { sessionStorage.setItem(RELOAD_FLAG, '1') } catch { /* storage denied */ } },
	clear: () => { try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* storage denied */ } }
}

const page = load => lazy(() => load()
	.then(m => { flag.clear(); return m })
	.catch(error => {
		if (flag.get()) throw error
		flag.set()
		window.location.reload()
		return new Promise(() => {})
	}))

const SignIn = page(() => import('./pages/SignIn.jsx'))
const Register = page(() => import('./pages/Register.jsx'))
const Welcome = page(() => import('./pages/Welcome.jsx'))
const ConfirmSent = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ConfirmSent })))
const ConfirmLink = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ConfirmLink })))
const ResetAsk = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ResetAsk })))
const ResetLink = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ResetLink })))
const Home = page(() => import('./pages/Home.jsx'))
const Orders = page(() => import('./pages/Orders.jsx'))
const Order = page(() => import('./pages/Order.jsx'))
const OrderEdit = page(() => import('./pages/OrderEdit.jsx'))
const OrderNew = page(() => import('./pages/OrderNew.jsx'))
const Statistics = page(() => import('./pages/Statistics.jsx'))
const Vendors = page(() => import('./pages/Vendors.jsx'))
const VendorForm = page(() => import('./pages/VendorForm.jsx'))
const Categories = page(() => import('./pages/Categories.jsx'))
const CategoryForm = page(() => import('./pages/CategoryForm.jsx'))
const Bookmarks = page(() => import('./pages/Bookmarks.jsx'))
const BookmarkForm = page(() => import('./pages/BookmarkForm.jsx'))
const Budget = page(() => import('./pages/Budget.jsx'))
const BudgetCheck = page(() => import('./pages/BudgetCheck.jsx'))
const Settings = page(() => import('./pages/Settings.jsx'))
const More = page(() => import('./pages/More.jsx'))
const SavedViews = page(() => import('./pages/OrderViews.jsx'))

/* handle: `title` names the tab and is never drawn, `navKey` the sidebar row, `layout` the body
   (default, split, rail), `fab` the phone's New order button, `remember` a return as it was left. */
export const routes = [
	{ path: 'signin', element: <SignedOut><SignIn /></SignedOut>, handle: { title: 'Sign in' } },
	{ path: 'register', element: <Register />, handle: { title: 'Create your account' } },
	{ path: 'welcome', element: <Welcome />, handle: { title: 'Welcome' } },
	{ path: 'confirm', element: <ConfirmSent />, handle: { title: 'Confirm your email' } },
	{ path: 'confirm/:token', element: <ConfirmLink />, handle: { title: 'Confirm your email' } },
	{ path: 'reset', element: <ResetAsk />, handle: { title: 'Reset your password' } },
	{ path: 'reset/:token', element: <ResetLink />, handle: { title: 'Choose a new password' } },
	{
		element: <AppShell />,
		errorElement: <ShellError />,
		loader: requireAuth,
		// the same address again (the phone's search opening and closing) asks nothing new
		shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) =>
			currentUrl.href !== nextUrl.href && defaultShouldRevalidate,
		HydrateFallback: () => null,
		children: [{
			// a page that fails shows its problem in the content column, under the shell
			errorElement: <RouteError />,
			children: [
				{ index: true, element: <Home />, handle: { title: 'Home', navKey: 'home', fab: true } },

				{ path: 'orders', children: [
					{ index: true, element: <Orders />, handle: { title: 'Orders', navKey: 'orders', layout: 'rail', fab: true, remember: true } },
					{ path: 'new', element: <OrderNew />, handle: { title: 'New order', navKey: 'orders' } },
					{ path: ':id', element: <Order />, handle: { title: 'Order', navKey: 'orders', layout: 'split' } },
					{ path: ':id/edit', element: <OrderEdit />, handle: { title: 'Edit order', navKey: 'orders', layout: 'split' } }
				] },

				{ path: 'statistics', element: <Statistics />, handle: { title: 'Statistics', navKey: 'statistics', remember: true } },

				{ path: 'vendors', children: [
					{ index: true, element: <Vendors />, handle: { title: 'Vendors', navKey: 'vendors', remember: true } },
					{ path: 'new', element: <VendorForm />, handle: { title: 'New vendor', navKey: 'vendors', layout: 'split' } },
					{ path: ':id/edit', element: <VendorForm />, handle: { title: 'Edit vendor', navKey: 'vendors', layout: 'split' } }
				] },
				{ path: 'categories', children: [
					{ index: true, element: <Categories />, handle: { title: 'Categories', navKey: 'categories', remember: true } },
					{ path: 'new', element: <CategoryForm />, handle: { title: 'New category', navKey: 'categories', layout: 'split' } },
					{ path: ':id/edit', element: <CategoryForm />, handle: { title: 'Edit category', navKey: 'categories', layout: 'split' } }
				] },
				{ path: 'bookmarks', children: [
					{ index: true, element: <Bookmarks />, handle: { title: 'Bookmarks', navKey: 'bookmarks', remember: true } },
					{ path: 'new', element: <BookmarkForm />, handle: { title: 'New bookmark', navKey: 'bookmarks', layout: 'split' } },
					{ path: ':id/edit', element: <BookmarkForm />, handle: { title: 'Edit bookmark', navKey: 'bookmarks', layout: 'split' } }
				] },

				{ path: 'budget/check', element: <BudgetCheck />, handle: { title: 'Check a bank statement', navKey: 'budget' } },
				{ path: 'budget/:year?', element: <Budget />, handle: { title: 'Budget', navKey: 'budget', remember: true } },

				{ path: 'settings/:section?', element: <Settings />, handle: { title: 'Settings', navKey: 'settings' } },
				{ path: 'more', element: <More />, handle: { title: 'More', navKey: 'more' } },
				{ path: 'more/views', element: <SavedViews />, handle: { title: 'Saved views', navKey: 'more' } },

				{ path: '*', element: <Home />, handle: { title: 'Home', navKey: 'home', fab: true } }
			]
		}]
	}
]
