# Spendly - changes since handoff_2026_10_05_changes

Copy these files over handoff_2026_10_05_changes. The HTML files are design references; rebuild them in the app's own code. Answers Design brief 22.

## 1. What is kept of an uploaded picture (17a step 4, 17e, Icon legend)

- The original is never kept.
- Orientation is applied to the pixels first, then all tracking and device data is removed: GPS, camera make, model and serial, lens, software, owner and artist names, dates and times, maker notes, XMP, IPTC, comments, and any colour profile other than sRGB or Display P3.
- A picture filed on the order itself (a receipt, a scanned page): the two renditions plus one full-size copy in the upload's own format, cleaned as above.
- A line's photo, the vendor image, a bookmark picture, the account picture: the two renditions only.
- A PDF: kept exactly as uploaded; its renditions come from a first-page render.
- A file the app cannot open: refused, never stored. Tile: "Not a supported type".
- Download: an order's picture saves the full-size cleaned copy; a line's photo saves its display copy; a PDF saves as uploaded. The file name is always the one it was uploaded with.

## 2. HEIC: option b, stop offering it

HEIC is removed from every picker and every accepted-types or help text:
- Order create 3a: `accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"`, "PDF, JPG, PNG, WebP or GIF".
- 17e and Vendors 5b/5c: `accept="image/png,image/jpeg,image/webp,image/svg+xml"`, help "Use a PNG, JPEG, WebP or SVG file."
- A HEIC that still arrives is refused as not supported.

Not tested: that the iPhone photo picker hands over a JPEG once HEIC is not offered. Please check on a device.

## 3. One set of sizes for every picture (17a table)

| Rendition | Size | Serves |
|---|---|---|
| square-256 | 256 x 256, centre crop | Every small square: order row, item line, bookmark row (42px), form slot (64px), account picture, file tile on an order |
| wide-1080 | 1080 px wide, aspect kept | Card photo band, vendor image in the band, bookmark card strip, the image viewer fitted |
| full-size | as uploaded, cleaned | An order's own picture only: Download, and zoom in the viewer past wide-1080 |

WebP, quality 85, alpha kept, never upscaled.

**What the app changes**
- Remove square-128 and view-2560 from the design (square-128 already removed in the app).
- Item photos and order files: 200 and 1000 become square-256 and wide-1080.
- Bookmark pictures: 800 becomes square-256 and wide-1080.
- Vendor image: 128 dropped; 256 and 1080 stay.
- Account picture: 256 square, unchanged.

Answers to the brief's questions: 1) view-2560 is not needed, wide-1080 serves the viewer and the card band. 2) Bookmarks join the set. 3) Receipts and order files use the same set, plus the full-size copy for an order's own pictures.

## Files
- Images and files.dc.html - 17a step 4, the sizes table and its notes, 17e accepted types, help and notes
- Order create.dc.html - 3a accepted types (two pickers)
- Vendors and categories.dc.html - 5b/5c image picker accept
- Icon legend.dc.html - Download
- styles/COMPONENT-STATUS.md - change log entry
