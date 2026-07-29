import { AppShell } from './components/Shell.jsx'
import Home from './pages/Home.jsx'
import Orders from './pages/Orders.jsx'
import AllOrders from './pages/AllOrders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import { NewOrderDetails, NewOrderItems, NewOrderLayout } from './pages/NewOrder.jsx'
import Settings from './pages/Settings.jsx'
import { ScanReading, ScanReview, ScanUpload } from './pages/Scan.jsx'
import Vendors from './pages/Vendors.jsx'
import Categories from './pages/Categories.jsx'
import Stats from './pages/Stats.jsx'

/* The routes, and the four things the shell reads off each one.

   `handle` is where a page says what it is called, which rail item it belongs to, whether it
   has a back button and what its sub-tabs are. Putting them here rather than in the shell is
   what makes a page impossible to reach and leave unnamed -- the prototype kept those four
   in four places, and eleven of twelve pages could render carrying home's title and home's
   tabs without anything failing. See components/Shell.jsx.

   `back.label` is the destination, not the origin. It was a fixed "Back to orders" while two
   of the three pages it appears on go back to Scan receipt, so it announced the wrong place
   two times out of three. S18. */

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

			{ path: 'vendors', element: <Vendors />,
				handle: { title: 'Vendors', navKey: 'vendors', tabs: VIEW_TABS('Favourites') } },
			{ path: 'categories', element: <Categories />,
				handle: { title: 'Categories', navKey: 'categories', tabs: VIEW_TABS('Manage') } },
			{ path: 'stats', element: <Stats />, handle: { title: 'Statistics', navKey: 'stats' } },
			{ path: 'settings', element: <Settings />,
				handle: { title: 'Order settings', navKey: 'orders', back: { to: '/orders', label: 'orders' } } },

			{ path: '*', element: <Home />, handle: { title: 'Home', navKey: 'home' } }
		]
	}
]
