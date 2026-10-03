/* The demo fill on a thread of its own, with its own connection, so the request that asked for
   it can report how far it has got while the batches commit. */

import { parentPort, workerData } from 'node:worker_threads'
import { replaceWithDemo } from './demoFill.js'

try {
	const { userId, ...options } = workerData
	const result = replaceWithDemo(userId, { ...options,
		onProgress: (done, total) => parentPort.postMessage({ done, total }),
		onLanded: landed => parentPort.postMessage({ landed }) })
	parentPort.postMessage({ result })
} catch (e) {
	parentPort.postMessage({ error: e.message ?? String(e) })
}
