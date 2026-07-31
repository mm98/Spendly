import { NAMES, PER_SHARD, SHARDS } from './tabler/index.js'

export { NAMES, PER_SHARD }

export const shardOf = index => Math.floor(index / PER_SHARD)

const shards = new Map()

export const loadShard = i => {
	let pending = shards.get(i)
	if (!pending) {
		pending = SHARDS[i]().then(module => {
			const from = i * PER_SHARD
			const paths = {}
			module.default.forEach((d, at) => { paths[NAMES[from + at]] = d })
			return paths
		})
		shards.set(i, pending)
	}
	return pending
}
