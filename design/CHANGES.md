# Spendly - changes since handoff_2026_10_05b_changes

Copy these files over handoff_2026_10_05b_changes. The HTML files are design references; rebuild them in the app's own code. Answers Design brief 23.

## 1. square-256 is cut around the subject (17a, 17e)

- square-256 is no longer a centre crop. The server centres the square on the part of the picture with the strongest colour, contrast and skin tones.
- This applies to every square: line photos, files on an order, the first page of a PDF, bookmark pictures, the vendor image and the account picture.
- 17a sizes table, square-256, "How it is made": "Cut around the subject (the strongest colour, contrast and skin tones)."
- Item line photo, account picture and the 17e filled slot now say the same instead of "centre crop".
- The crop note under the image positions reads: squares are cut around the subject; the card band and bookmark strip crop the wide copy with cover, centred. The receipt preview and page thumbnails still letterbox at page aspect.

## 2. Limits, stated in 17a notes

- The subject cut is a guess. A busy background, or a large logo on a receipt, can pull the square away from what matters.
- It has not been tested on real product photos yet.

## 3. Unchanged

- wide-1080 keeps its aspect. The card band and the bookmark strip crop it with cover, centred.
- Centring those on the subject would need a stored focus point for each picture. Not built, not asked for now.

## Files
- Images and files.dc.html - 17a sizes table and notes, image positions table and crop note, 17e filled slot note
- styles/COMPONENT-STATUS.md - change log entry
