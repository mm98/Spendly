import { SkeletonBlock } from 'spendly-react'

/* One shimmering bar. It owns the shimmer and nothing else, so every cell here sets its
   own width and height -- the sizes the app's own waiting states use.

   The shimmer runs on a 1.6s loop, so two still captures of the same bar can land on
   different phases of the same gradient. */

const column: React.CSSProperties = { width: 380 }

export const APageTitle = () => (
	<div style={column}>
		<SkeletonBlock width={180} height={34} style={{ margin: '4px 0 18px' }} />
	</div>
)

export const LinesOfText = () => (
	<div style={{ ...column, display: 'grid', gap: 8 }}>
		<SkeletonBlock width="90%" height={12} />
		<SkeletonBlock width="90%" height={12} />
		<SkeletonBlock width="55%" height={12} />
	</div>
)

export const APanel = () => (
	<div style={column}>
		<SkeletonBlock width="100%" height={140} />
	</div>
)

export const RoundAndSquare = () => (
	<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
		<SkeletonBlock round width={36} height={36} />
		<SkeletonBlock width={36} height={36} />
	</div>
)
