import { Router } from 'express'
import { accountExportFiles, accountExportName } from '../lib/accountExport.js'
import { streamZip } from '../lib/zip.js'

/* A copy of the account's data as one .zip (lib/accountExport.js). Delete account offers it (11g). */
export const router = Router()

router.get('/', async (req, res) => {
	res.set({
		'Content-Type': 'application/zip',
		'Content-Disposition': `attachment; filename="${accountExportName(req.today)}"`,
		'Cache-Control': 'no-store'
	})
	try {
		await streamZip(res, accountExportFiles(req.user.id))
		res.end()
	} catch (e) {
		console.error(`[export] the copy for ${req.user.id} stopped: ${e.message}`)
		// once bytes are sent the status is gone, so a broken connection is how the browser learns it failed
		if (res.headersSent) res.destroy()
		else res.status(500).json({ error: 'The copy could not be made. Try again.' })
	}
})
