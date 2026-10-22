import { bars } from './bars.js'
import { shares } from './shares.js'

/* The chart kinds Ask draws; the first is the one a chart falls back to. A kind is { kind, use, properties,
   shape(asked, chart), picture(chart, write), words(chart, money) } (README: "What Ask makes"). */
export const CHART_KINDS = [bars, shares]

export const chartKind = kind => CHART_KINDS.find(k => k.kind === kind) ?? null
