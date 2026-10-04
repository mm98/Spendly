# Design brief 20: copying an order copies the item photos

## What the app does now
Duplicate an order, and Copy a previous order, open the copy unsaved in the edit screen. Lines and prices come, the date becomes today, the status resets. Nothing about a line's photo comes: every copied line shows the empty photo slot.

## What the design says
- Duplicate and alerts 8a: "Lines and prices come, the date becomes today, the status resets and attachments do not follow."
- Order create 3b: the same copy rules. The note under the copy reads "Attachments were not copied - add this trip's receipt".
- That text is about the order's own files, the receipt. It does not say what happens to a line's own photo.

## The wish
A copy should also carry each line's photo. The photo is a picture of the product, and the product is the same.

## Please decide
1. **Do line photos follow a copy?** Recommendation: yes. The order's own files (receipts, PDFs) still do not.
2. **Wording.** 8a and 3b say "attachments do not follow". Please name which: "The order's files are not copied", and say that the line photos are.
3. **What the unsaved copy shows.** Recommendation: the same photos in the line rows and in the open line editor, with Remove and replace working as on any line. Save stores the copy's own pictures, so deleting the original order later does not change the copy.
4. **The note after Duplicate.** Should it still say "Attachments were not copied"? Recommendation: "The receipt was not copied - add this trip's receipt", and only when the original had files.
