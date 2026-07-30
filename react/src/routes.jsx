import { lazy } from 'react'
import { AppShell } from './components/Shell.jsx'

/* Every page is loaded when it is first opened, not when the app is.

   Ten page modules held one chunk between them, so opening Home downloaded the scan flow, both
   forms, the statistics pager and every page's charts. They are `lazy` here rather than
   imported: the bundler gives each module a chunk, the shell has one Suspense boundary for the
   lot (see components/Shell.jsx), and a page arrives when it is navigated to.

   `handle` stays right here, static, and that is the point rather than an oversight -- the
   title, the rail item, the back button and the sub-tabs are known before a page's chunk is
   requested, so the shell is never drawn nameless while one is in flight. A page that named
   itself from inside its own module would put those four back where the prototype had them.

   A module with more than one page in it (NewOrder, Scan) is named once per export and still
   fetched once: they resolve to the same chunk. */

const page = (load, name = 'default') => lazy(() => load().then(m => ({ default: m[name] })))

const Home = page(() => import('./pages/Home.jsx'))
const Orders = page(() => import('./pages/Orders.jsx'))
const AllOrders = page(() => import('./pages/AllOrders.jsx'))
const OrderDetail = page(() => import('./pages/OrderDetail.jsx'))
const NewOrderLayout = page(() => import('./pages/NewOrder.jsx'), 'NewOrderLayout')
const NewOrderDetails = page(() => import('./pages/NewOrder.jsx'), 'NewOrderDetails')
const NewOrderItems = page(() => import('./pages/NewOrder.jsx'), 'NewOrderItems')
const Settings = page(() => import('./pages/Settings.jsx'))
const CategoryForm = page(() => import('./pages/CategoryForm.jsx'))
const VendorForm = page(() => import('./pages/VendorForm.jsx'))
const ScanUpload = page(() => import('./pages/Scan.jsx'), 'ScanUpload')
const ScanReading = page(() => import('./pages/Scan.jsx'), 'ScanReading')
const ScanReview = page(() => import('./pages/Scan.jsx'), 'ScanReview')
const Vendors = page(() => import('./pages/Vendors.jsx'))
const Categories = page(() => import('./pages/Categories.jsx'))
const Stats = page(() => import('./pages/Stats.jsx'))

/* The routes, and the four things the shell reads off each one.

   `handle` is where a page says what it is called, which rail item it belongs to, whether it
   has a back button and what its sub-tabs are. Putting them here rather than in the shell is
   what makes a page impossible to reach and leave unnamed -- the prototype kept those four
   in four places, and eleven of twelve pages could render carrying home's title and home's
   tabs without anything failing. See components/Shell.jsx.

   `back.label` is the destination, not the origin. It was a fixed "Back to orders" while two
   of the three pages it appears on go back to Scan receipt, so it announced the wrong place
   two times out of three. README: Accessibility. */

const ORDER_TABS = at => [
	{ label: 'Overview', to: '/orders', on: at === 'overview' },
	{ label: 'All orders', to: '/orders/all', on: at === 'all' }
]

const VIEW_TABS = second => [
	{ label: 'Overview', view: 'overview' },
	{ label: second, view: second.toLowerCase() }
]

export const routes = [
	{
		element: <AppShell />,
		children: [
			{ index: true, element: <Home />, handle: { title: 'Home', navKey: 'home' } },

			{ path: 'orders', handle: { title: 'Orders', navKey: 'orders' }, children: [
				{ index: true, element: <Orders />, handle: { title: 'Orders', navKey: 'orders', tabs: ORDER_TABS('overview') } },
				{ path: 'all', element: <AllOrders />, handle: { title: 'Orders', navKey: 'orders', tabs: ORDER_TABS('all') } },
				{ path: 'new', element: <NewOrderLayout />, handle: { title: 'New order', navKey: 'orders' }, children: [
					{ index: true, element: <NewOrderDetails />, handle: { title: 'New order', navKey: 'orders' } },
					{ path: 'items', element: <NewOrderItems />, handle: { title: 'New order', navKey: 'orders' } }
				] },
				{ path: ':id', children: [
					{ index: true, element: <OrderDetail />,
						handle: { title: 'Order details', navKey: 'orders', back: { to: '/orders', label: 'orders' } } },
					/* Editing an order is the New order flow with the order loaded into it, rather
					   than a second form that would drift from the first. Both steps are here, so
					   the item list is editable on an existing order too. */
					{ path: 'edit', element: <NewOrderLayout mode="edit" />,
						handle: { title: 'Edit order', navKey: 'orders' }, children: [
						{ index: true, element: <NewOrderDetails mode="edit" />,
							handle: { title: 'Edit order', navKey: 'orders' } },
						{ path: 'items', element: <NewOrderItems mode="edit" />,
							handle: { title: 'Edit order', navKey: 'orders' } }
					] }
				] }
			] },

			{ path: 'scan', handle: { title: 'Scan receipt', navKey: 'orders' }, children: [
				{ index: true, element: <ScanUpload />, handle: { title: 'Scan receipt', navKey: 'orders' } },
				{ path: 'reading', element: <ScanReading />,
					handle: { title: 'Scan receipt', navKey: 'orders', back: { to: '/scan', label: 'scan receipt' } } },
				{ path: 'review', element: <ScanReview />,
					handle: { title: 'Review scan', navKey: 'orders', back: { to: '/scan', label: 'scan receipt' } } }
			] },

			/* A vendor and a category are edited on their own page, the same as an order. Two
			   patterns for one job is a system with a hole in it -- and the inline one nested a
			   bordered section inside a card body inside a card, which at 390px leaves the fields
			   about as wide as their own labels. */
			{ path: 'vendors', children: [
				{ index: true, element: <Vendors />,
					handle: { title: 'Vendors', navKey: 'vendors', tabs: VIEW_TABS('Favourites') } },
				{ path: 'new', element: <VendorForm mode="create" />,
					handle: { title: 'New vendor', navKey: 'vendors', back: { to: '/vendors', label: 'vendors' } } },
				{ path: ':id/edit', element: <VendorForm mode="edit" />,
					handle: { title: 'Edit vendor', navKey: 'vendors', back: { to: '/vendors', label: 'vendors' } } }
			] },
			{ path: 'categories', children: [
				{ index: true, element: <Categories />,
					handle: { title: 'Categories', navKey: 'categories', tabs: VIEW_TABS('Manage') } },
				{ path: 'new', element: <CategoryForm mode="create" />,
					handle: { title: 'New category', navKey: 'categories', back: { to: '/categories', label: 'categories' } } },
				{ path: ':id/edit', element: <CategoryForm mode="edit" />,
					handle: { title: 'Edit category', navKey: 'categories', back: { to: '/categories', label: 'categories' } } }
			] },
			{ path: 'stats', element: <Stats />, handle: { title: 'Statistics', navKey: 'stats' } },
			{ path: 'settings', element: <Settings />,
				handle: { title: 'Order settings', navKey: 'orders', back: { to: '/orders', label: 'orders' } } },

			{ path: '*', element: <Home />, handle: { title: 'Home', navKey: 'home' } }
		]
	}
]
