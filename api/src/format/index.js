import { fileMaker } from './file/index.js'
import { chartMaker } from './chart/index.js'

/* What Ask makes while it answers, one maker each, in the order Claude is offered their tools. A maker is
   { place, name, formats, example, note?, off?, tool, rules?, doing, make, byIds, emailBlocks, attachments, sweep }
   (README: "What Ask makes"). */
export const MAKERS = [fileMaker, chartMaker]

/** What Ask can make, for the reader (Ask 24c): each maker with its formats' names and one example question.
    `off` says why a maker makes nothing on this server, and then it carries no note. */
export const askMakes = ({ unlimited = false } = {}) => MAKERS.map(m => {
	const off = m.off?.(unlimited) ?? null
	return { name: m.name, formats: m.formats(), example: m.example, note: off ? null : m.note ?? null, off }
}).filter(m => m.formats.length)

export const makerOfPlace = place => MAKERS.find(m => m.place === place) ?? null

/** The makers the reader `userId` is offered, each with its tool: [{ maker, tool }]. */
export const makersFor = userId => MAKERS
	.map(maker => ({ maker, tool: typeof maker.tool === 'function' ? maker.tool(userId) : maker.tool }))
	.filter(m => m.tool)

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
