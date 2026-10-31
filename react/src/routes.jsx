import { lazy } from 'react'
import { redirect } from 'react-router'
import { AppShell } from './app/AppShell.jsx'
import { NewerVersion, RouteError, ShellError } from './app/RouteError.jsx'
import { SignedOut } from './app/SignedOut.jsx'
import { getCurrentUser, getSettings } from './api/client.js'
import { cachedFetch } from './api/useApi.js'
import { setCurrency, setLocale } from './api/format.js'
import { setDensity, setScheme } from './app/theme.js'
import { languageCode, setLanguage } from './language/phrases.js'

/* Every route under the shell needs a signed-in session, checked once per navigation; the
   account's currency, date format and language are read on the same wait, before any word is drawn. */
const requireAuth = async ({ request }) => {
	try {
		const user = await cachedFetch(getCurrentUser)
		// an account that has not had its first run is sent there from every page (20e)
		if (user?.needsSetup) {
			const { pathname, search } = new URL(request.url)
			throw redirect(pathname === '/' ? '/welcome' : `/welcome?next=${encodeURIComponent(pathname + search)}`)
		}
		const s = await cachedFetch(getSettings).catch(() => null)
		if (s) { setCurrency(s.currency); setLocale(s.locale); setDensity(s.density); setScheme(s.colourScheme) }
		// only the account's language is downloaded; with no settings, the browser's
		await setLanguage(s?.language)
		return null
	} catch (e) {
		if (!languageCode()) await setLanguage('auto')
		if (e instanceof Response) throw e
		if (e.status === 401) {
			const { pathname, search } = new URL(request.url)
			throw redirect(pathname === '/' ? '/signin' : `/signin?next=${encodeURIComponent(pathname + search)}`)
		}
		throw e
	}
}

/* A deploy renames every chunk, so a tab opened before it asks for a file that is gone. The tab
   says so and waits: a reload of its own would drop what was typed and hide the update notice. */
const page = load => lazy(() => load().catch(() => ({ default: NewerVersion })))

const SignIn = page(() => import('./pages/SignIn.jsx'))
const Register = page(() => import('./pages/Register.jsx'))
const Welcome = page(() => import('./pages/Welcome.jsx'))
const ConfirmSent = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ConfirmSent })))
const ConfirmLink = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ConfirmLink })))
const ResetAsk = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ResetAsk })))
const ResetLink = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.ResetLink })))
const StatusEmailStop = page(() => import('./pages/AccountLinks.jsx').then(m => ({ default: m.StatusEmailStop })))
const Terms = page(() => import('./pages/Notices.jsx').then(m => ({ default: m.Terms })))
const Privacy = page(() => import('./pages/Notices.jsx').then(m => ({ default: m.Privacy })))
const Home = page(() => import('./pages/Home.jsx'))
const Orders = page(() => import('./pages/Orders.jsx'))
const Order = page(() => import('./pages/Order.jsx'))
const OrderEdit = page(() => import('./pages/OrderEdit.jsx'))
const OrderCompare = page(() => import('./pages/OrderCompare.jsx'))
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
const OrdersCheck = page(() => import('./pages/OrdersCheck.jsx'))
const Settings = page(() => import('./pages/Settings.jsx'))
const Ask = page(() => import('./pages/Ask.jsx'))
const AskFiles = page(() => import('./pages/AskFiles.jsx'))
const AskChats = page(() => import('./pages/AskChats.jsx'))
const More = page(() => import('./pages/More.jsx'))
const SavedViews = page(() => import('./pages/OrderViews.jsx'))

/* handle: `title` names the tab and is never drawn, `navKey` the sidebar row, `layout` the body
   (default, split, rail, fill), `fab` the phone's New order button, `remember` a return as it was left, `placesConfirmBanner` that the page
   draws the confirm-email banner itself, so the shell leaves it out. */
export const routes = [
	{
		// the pages before sign-in follow the browser's language (20a)
		loader: () => setLanguage('auto').then(() => null),
		HydrateFallback: () => null,
		children: [
			{ path: 'signin', element: <SignedOut><SignIn /></SignedOut>, handle: { title: 'page.signIn' } },
			{ path: 'register', element: <Register />, handle: { title: 'page.createYourAccount' } },
			{ path: 'welcome', element: <Welcome />, handle: { title: 'page.welcome' } },
			{ path: 'confirm', element: <ConfirmSent />, handle: { title: 'page.confirmYourEmail' } },
			{ path: 'confirm/:token', element: <ConfirmLink />, handle: { title: 'page.confirmYourEmail' } },
			{ path: 'reset', element: <ResetAsk />, handle: { title: 'page.resetYourPassword' } },
			{ path: 'reset/:token', element: <ResetLink />, handle: { title: 'page.chooseANewPassword' } },
			{ path: 'email/stop/:token', element: <StatusEmailStop />, handle: { title: 'page.stopStatusEmails' } },
			{ path: 'terms', element: <Terms />, handle: { title: 'page.termsOfUse' } },
			{ path: 'privacy', element: <Privacy />, handle: { title: 'page.privacyNotice' } }
		]
	},
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
				{ index: true, element: <Home />, handle: { title: 'page.home', navKey: 'home', fab: true } },

				{ path: 'orders', children: [
					{ index: true, element: <Orders />, handle: { title: 'page.orders', navKey: 'orders', layout: 'rail', fab: true, remember: true } },
					{ path: 'new', element: <OrderNew />, handle: { title: 'page.newOrder', navKey: 'orders' } },
					{ path: 'check', element: <OrdersCheck />, handle: { title: 'page.checkABankStatement', navKey: 'orders' } },
					{ path: ':id', element: <Order />, handle: { title: 'page.order', navKey: 'orders', layout: 'split' } },
					{ path: ':id/edit', element: <OrderEdit />, handle: { title: 'page.editOrder', navKey: 'orders', layout: 'split' } },
					{ path: ':id/compare', element: <OrderCompare />, handle: { title: 'page.compareWithReceipt', navKey: 'orders' } }
				] },

				{ path: 'statistics', element: <Statistics />, handle: { title: 'page.statistics', navKey: 'statistics', remember: true } },

				{ path: 'vendors', children: [
					{ index: true, element: <Vendors />, handle: { title: 'page.vendors', navKey: 'vendors', remember: true } },
					{ path: 'new', element: <VendorForm />, handle: { title: 'page.newVendor', navKey: 'vendors', layout: 'split' } },
					{ path: ':id/edit', element: <VendorForm />, handle: { title: 'page.editVendor', navKey: 'vendors', layout: 'split' } }
				] },
				{ path: 'categories', children: [
					{ index: true, element: <Categories />, handle: { title: 'page.categories', navKey: 'categories', remember: true } },
					{ path: 'new', element: <CategoryForm />, handle: { title: 'page.newCategory', navKey: 'categories', layout: 'split' } },
					{ path: ':id/edit', element: <CategoryForm />, handle: { title: 'page.editCategory', navKey: 'categories', layout: 'split' } }
				] },
				{ path: 'bookmarks', children: [
					{ index: true, element: <Bookmarks />, handle: { title: 'page.bookmarks', navKey: 'bookmarks', remember: true } },
					{ path: 'new', element: <BookmarkForm />, handle: { title: 'page.newBookmark', navKey: 'bookmarks', layout: 'split' } },
					{ path: ':id/edit', element: <BookmarkForm />, handle: { title: 'page.editBookmark', navKey: 'bookmarks', layout: 'split' } }
				] },

				{ path: 'budget/check', element: <BudgetCheck />, handle: { title: 'page.checkABankStatement', navKey: 'budget' } },
				{ path: 'budget/:year?', element: <Budget />, handle: { title: 'page.budget', navKey: 'budget', remember: true } },

				{ path: 'ask', element: <Ask />, handle: { title: 'page.ask', navKey: 'ask', layout: 'fill' } },
				{ path: 'ask/files', element: <AskFiles />, handle: { title: 'page.files', navKey: 'ask', layout: 'dock' } },
				{ path: 'ask/chats', element: <AskChats />, handle: { title: 'page.chats', navKey: 'ask', layout: 'dock' } },
				{ path: 'ask/:chatId', element: <Ask />, handle: { title: 'page.ask', navKey: 'ask', layout: 'fill' } },
				{ path: 'settings/:section?', element: <Settings />, handle: { title: 'page.settings', navKey: 'settings', placesConfirmBanner: true } },
				{ path: 'more', element: <More />, handle: { title: 'page.more', navKey: 'more' } },
				{ path: 'more/views', element: <SavedViews />, handle: { title: 'page.savedViews', navKey: 'more' } },

				{ path: '*', element: <Home />, handle: { title: 'page.home', navKey: 'home', fab: true } }
			]
		}]
	}
]
