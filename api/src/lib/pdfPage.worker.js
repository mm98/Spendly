/* mupdf, on a thread of its own.

   Rendering a PDF's first page is the one genuinely CPU-bound step in the upload pipeline, and
   it is WASM: synchronous, uninterruptible, and on the main thread it stops everything. Not by
   a little -- a 25MB file costs 411ms in mupdf's parse before it renders a pixel, and Express
   is one loop over a synchronous database driver, so for those 411ms every other request on
   the box waits, including requests from accounts that have never uploaded anything.

   The cost is in the parsing, not in the startup: instantiating the WASM module measures 5.2ms
   and opening a small valid PDF 0.4ms, against 411ms for a large one. That is what makes a
   worker per render the right shape rather than a pool -- there is no expensive warm state to
   keep alive, so each render gets a clean heap that goes away with it, and mupdf's native
   allocations cannot accumulate across uploads.

   This file is the whole worker: bytes in, one page's PNG or the first pages' words out, with the page count. sharp is
   deliberately left in the parent -- it is already asynchronous (libvips has its own
   threadpool), so importing it here would add startup for work that never blocked the loop. */

import { parentPort, workerData } from 'node:worker_threads'
import * as mupdf from 'mupdf'

// A malformed upload is an expected outcome here, not an exceptional one, and mupdf's own
// "repairing PDF document" chatter would otherwise reach the server's log on every one.
mupdf.setLog(() => {})

// drawn at the wide copy's width, never taller than WebP can hold
const { width: WIDTH, maxHeight: MAX_HEIGHT } = workerData
// the page to render, counted from 0; the page count travels back with it
const PAGE = workerData.page ?? 0
const TEXT_PAGES = workerData.textPages ?? 0

function pageTexts(doc, count) {
	const texts = []
	for (let i = 0; i < count; i++) {
		const one = doc.loadPage(i), text = one.toStructuredText('preserve-whitespace')
		try { texts.push(text.asJSON()) } finally { text.destroy(); one.destroy() }
	}
	return texts.length ? texts : null
}

let doc, page, pixmap
try {
	doc = mupdf.Document.openDocument(Buffer.from(workerData.buffer), 'application/pdf')
	const pages = doc.needsPassword() ? 0 : doc.countPages()
	if (TEXT_PAGES) parentPort.postMessage({ text: pageTexts(doc, Math.min(pages, TEXT_PAGES)), pages })
	else if (pages < 1 || PAGE >= pages) parentPort.postMessage({ png: null, pages })
	else {
		page = doc.loadPage(PAGE)
		const [x0, y0, x1, y1] = page.getBounds()
		const scale = Math.min(WIDTH / Math.max(x1 - x0, 1), MAX_HEIGHT / Math.max(y1 - y0, 1))
		pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, false)
		const png = pixmap.asPNG()
		// Transferred rather than copied: a 1600px page is megabytes, and the parent is the
		// only side that needs it once this thread is done.
		const bytes = png instanceof Uint8Array ? png : new Uint8Array(png)
		const copy = new Uint8Array(bytes)   // detach from WASM memory before it is freed below
		parentPort.postMessage({ png: copy.buffer, pages }, [copy.buffer])
	}
} catch (e) {
	// Encrypted, corrupt, zero pages, or not a PDF at all -- the caller draws the document icon,
	// exactly as it already does for an image sharp cannot decode.
	parentPort.postMessage({ png: null, error: e?.message ?? String(e) })
} finally {
	/* WASM objects hold native heap outside JS's GC. The thread is about to end and take the
	   whole heap with it, but destroying them in order is still what keeps this correct if the
	   worker is ever reused. */
	pixmap?.destroy(); page?.destroy(); doc?.destroy()
}
