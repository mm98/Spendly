import { lazy } from 'react'
import { redirect } from 'react-router'
import { AppShell } from './app/AppShell.jsx'
import { RouteError } from './app/RouteError.jsx'
import { getCurrentUser, getSettings } from './api/client.js'
import { cachedFetch } from './api/useApi.js'
import { setCurrency, setLocale } from './api/format.js'

/* Every route under the shell needs a signed-in session, checked once per navigation; the
   account's currency and date format are read on the same wait, before any figure is drawn. */
const requireAuth = async () => {
	try {
		await cachedFetch(getCurrentUser)
		await cachedFetch(getSettings).then(s => { setCurrency(s?.currency); setLocale(s?.locale) }).catch(() => {})
		return null
	} catch (e) {
		if (e.status === 401) throw redirect('/signin')
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

/* A route's handle: `title` names the browser tab (never drawn in the page), `navKey` the
   sidebar row it belongs to, `layout` the body its columns sit in (default, split, rail), and
   `fab` whether a phone shows the New order button over it. */
export const routes = [
	{ path: 'signin', element: <SignIn />, handle: { title: 'Sign in' } },
	{ path: 'register', element: <Register />, handle: { title: 'Create your account' } },
	{
		element: <AppShell />,
		errorElement: <RouteError />,
		loader: requireAuth,
		HydrateFallback: () => null,
		children: [
			{ index: true, element: <Home />, handle: { title: 'Home', navKey: 'home', fab: true } },

			{ path: 'orders', children: [
				{ index: true, element: <Orders />, handle: { title: 'Orders', navKey: 'orders', layout: 'rail', fab: true } },
				{ path: 'new', element: <OrderNew />, handle: { title: 'New order', navKey: 'orders' } },
				{ path: ':id', element: <Order />, handle: { title: 'Order', navKey: 'orders', layout: 'split' } },
				{ path: ':id/edit', element: <OrderEdit />, handle: { title: 'Edit order', navKey: 'orders', layout: 'split' } }
			] },

			{ path: 'statistics', element: <Statistics />, handle: { title: 'Statistics', navKey: 'statistics' } },

			{ path: 'vendors', children: [
				{ index: true, element: <Vendors />, handle: { title: 'Vendors', navKey: 'vendors' } },
				{ path: 'new', element: <VendorForm />, handle: { title: 'New vendor', navKey: 'vendors', layout: 'split' } },
				{ path: ':id/edit', element: <VendorForm />, handle: { title: 'Edit vendor', navKey: 'vendors', layout: 'split' } }
			] },
			{ path: 'categories', children: [
				{ index: true, element: <Categories />, handle: { title: 'Categories', navKey: 'categories' } },
				{ path: 'new', element: <CategoryForm />, handle: { title: 'New category', navKey: 'categories', layout: 'split' } },
				{ path: ':id/edit', element: <CategoryForm />, handle: { title: 'Edit category', navKey: 'categories', layout: 'split' } }
			] },
			{ path: 'bookmarks', children: [
				{ index: true, element: <Bookmarks />, handle: { title: 'Bookmarks', navKey: 'bookmarks' } },
				{ path: 'new', element: <BookmarkForm />, handle: { title: 'New bookmark', navKey: 'bookmarks', layout: 'split' } },
				{ path: ':id/edit', element: <BookmarkForm />, handle: { title: 'Edit bookmark', navKey: 'bookmarks', layout: 'split' } }
			] },

			{ path: 'budget/check', element: <BudgetCheck />, handle: { title: 'Check a bank statement', navKey: 'budget' } },
			{ path: 'budget/:year?', element: <Budget />, handle: { title: 'Budget', navKey: 'budget' } },

			{ path: 'settings/:section?', element: <Settings />, handle: { title: 'Settings', navKey: 'settings' } },
			{ path: 'more', element: <More />, handle: { title: 'More', navKey: 'more' } },

			{ path: '*', element: <Home />, handle: { title: 'Home', navKey: 'home', fab: true } }
		]
	}
]
