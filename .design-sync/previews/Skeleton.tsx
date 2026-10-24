import { Button, Card, Hold, Skeleton } from 'spendly-react';

const row = { display: 'flex', gap: 12, alignItems: 'center' } as const;

export const LoadingRow = () => (
	<div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
		{[0, 1, 2].map(i => (
			<div key={i} style={row}>
				<Skeleton shape="mark" />
				<div style={{ display: 'grid', gap: 6, flex: 1 }}>
					<Skeleton shape="title" />
					<Skeleton shape="line" />
				</div>
				<Skeleton shape="pill" />
				<Skeleton shape="end" data-w="74" data-h="18" />
			</div>
		))}
	</div>
);

export const Shapes = () => (
	<div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
		{(['line', 'short', 'title', 'end', 'pill', 'mark', 'mark-large', 'check', 'icon'] as const).map(shape => (
			<div key={shape} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16, alignItems: 'center' }}>
				<span className="sp-meta">{shape}</span>
				<div style={{ display: 'flex' }}>{shape === 'end' ? <Skeleton shape="end" data-w="74" data-h="18" /> : <Skeleton shape={shape} />}</div>
			</div>
		))}
	</div>
);

export const HeldAtItsShape = () => (
	<div style={{ display: 'flex', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
		<Hold shape={<Button variant="outline" size="small">Show all 18</Button>}>
			<Skeleton shape="fill" />
		</Hold>
		<div style={{ width: 260 }}>
			<Hold shape={<Card><span className="sp-title">August</span><span className="sp-stat__figure">61.480 kr.</span><span className="sp-meta">Across 18 orders</span></Card>}>
				<Skeleton shape="fill" />
			</Hold>
		</div>
	</div>
);
