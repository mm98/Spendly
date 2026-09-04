import { Async, Card, CardBody, CardDivider, CardHeader, InsetPanel, ItemRow, SkeletonCard, SkeletonRows } from 'spendly-react'

/* Async is the four states a page's own region has: still waiting, waiting behind a
   skeleton shaped like the answer, failed, and loaded. Each cell below is one of them,
   with the same card around it, so the axis is the state and nothing else.

   `state` is exactly what `useApi` returns: { data, error, loading, refresh }. */

const column: React.CSSProperties = { width: 380 }

type Scan = { id: string; name: string; meta: string; amount: string }

const scans: Scan[] = [
	{ id: 'o-4821', name: 'Bilka, Fields', meta: '18 lines • 2 May', amount: '742,45 kr.' },
	{ id: 'o-4818', name: 'Elgiganten', meta: '2 lines • 28 April', amount: '2.499,00 kr.' },
	{ id: 'o-4809', name: 'Netto, Amager', meta: '11 lines • 24 April', amount: '318,95 kr.' }
]

const RecentScans = ({ children }: { children: React.ReactNode }) => (
	<div style={column}>
		<Card aria-label="Recent scans">
			<CardHeader title="Recent scans" />
			<CardDivider />
			<CardBody variant="card-body-tight">{children}</CardBody>
		</Card>
	</div>
)

export const Loaded = () => (
	<RecentScans>
		<Async state={{ data: scans, error: null, loading: false }} label="Loading recent scans">
			{(rows: Scan[]) => (
				<InsetPanel>
					{rows.map(row => (
						<ItemRow key={row.id} className="item-row-group" icon="check" title={row.name}
							meta={row.meta} amount={row.amount} to={`/orders/${row.id}`} />
					))}
				</InsetPanel>
			)}
		</Async>
	</RecentScans>
)

export const WaitingWithNoSkeleton = () => (
	<div style={column}>
		<Async state={{ data: undefined, error: null, loading: true }} label="Loading recent scans">
			{() => null}
		</Async>
	</div>
)

export const WaitingBehindASkeleton = () => (
	<div style={column}>
		<Async state={{ data: undefined, error: null, loading: true }} label="Loading orders"
			skeleton={<SkeletonCard bodyVariant="card-body-tight"><SkeletonRows count={4} /></SkeletonCard>}>
			{() => null}
		</Async>
	</div>
)

export const Failed = () => (
	<div style={column}>
		<Async state={{ data: undefined, loading: false, error: { status: 500, message: 'Failed to fetch' } }}
			label="Loading your orders">{() => null}</Async>
	</div>
)

export const NotFound = () => (
	<div style={column}>
		<Async state={{ data: undefined, loading: false, error: { status: 404, message: 'No order o-4821' } }}
			label="Loading the order">{() => null}</Async>
	</div>
)
