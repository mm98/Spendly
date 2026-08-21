/* What each picker in the app will take, written once.

   Two consumers need the same answer in two different shapes: the `accept` attribute on
   `<input type="file">`, and the `types` list the File System Access API wants. Spelling them
   separately is the near-miss this file exists to prevent -- the two drift, and the drift shows
   up as a picker that offers something the server then refuses.

   The lists are deliberately explicit rather than `image/*`. A wildcard is expanded by the
   browser into every image type it knows, which is what produced the twenty-one-extension
   "Custom files (*.tif;*.jfif;*.pjp;*.apng;*.xbm;*.jxl;...)" line in the Windows dialog --
   including formats this pipeline has no thumbnail path for (svg, ico, xbm). Naming the six it
   actually handles makes the filter readable and honest.

   Whatever is picked, the server still reads the file's own first bytes and files it by what
   it is (api/src/lib/fileType.js). A picker filter is a convenience, never the check. */

/** description: the label the OS dialog prints for the filter.
    accept: MIME type -> the extensions that carry it, the File System Access API's own shape. */
export const RECEIPT_FILES = {
	description: 'Receipts and photos',
	accept: {
		'image/jpeg': ['.jpg', '.jpeg'],
		'image/png': ['.png'],
		'image/webp': ['.webp'],
		'image/heic': ['.heic'],
		'image/gif': ['.gif'],
		'application/pdf': ['.pdf']
	}
}

export const PHOTO_FILES = {
	description: 'Photos',
	accept: {
		'image/jpeg': ['.jpg', '.jpeg'],
		'image/png': ['.png'],
		'image/webp': ['.webp'],
		'image/heic': ['.heic'],
		'image/gif': ['.gif']
	}
}

export const EXPORT_FILES = {
	description: 'Spendly export',
	accept: { 'application/json': ['.json'] }
}

/** The same set as an `accept` attribute -- MIME types and extensions both, since a browser
    matching on either is a browser that offers the file. */
export const acceptAttribute = spec =>
	Object.entries(spec.accept).flatMap(([type, extensions]) => [type, ...extensions]).join(',')
