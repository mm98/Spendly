import { fileMaker } from './file/index.js'
import { chartMaker } from './chart/index.js'

/* What Ask makes while it answers, one maker each, in the order Claude is offered their tools. A maker is
   { place, tool, doing, make, byIds, emailBlocks, attachments, sweep } (README: "What Ask makes"). */
export const MAKERS = [fileMaker, chartMaker]

export const makerOfPlace = place => MAKERS.find(m => m.place === place) ?? null
export const makerOfTool = name => MAKERS.find(m => m.tool.name === name) ?? null

const places = MAKERS.map(m => m.place).join('|')
// a line that is only the place mark of something an answer made: {{file:ID}}
export const PLACE_LINE = new RegExp(`^\\s*\\{\\{(${places}):([\\w-]{1,64})\\}\\}\\s*$`)
const PLACE = new RegExp(`\\{\\{(${places}):([\\w-]{1,64})\\}\\}`, 'g')
export const placesIn = text => [...text.matchAll(PLACE)].map(m => ({ place: m[1], id: m[2] }))

/** Nothing made yet, a key per maker: { file: {}, chart: {} }. */
export const nothingMade = () => Object.fromEntries(MAKERS.map(m => [m.place, {}]))

/** What `places` name, as each is now, by maker and id. */
export function madeIn(userId, places) {
	return Object.fromEntries(MAKERS.map(m => [m.place, m.byIds(userId, [...new Set(places.filter(p => p.place === m.place).map(p => p.id))])]))
}

/** Of `made`, only what `places` name. */
export const madeOf = (made, places) => Object.fromEntries(MAKERS.map(m => [m.place,
	Object.fromEntries(places.filter(p => p.place === m.place && made[m.place]?.[p.id]).map(p => [p.id, made[m.place][p.id]]))]))
