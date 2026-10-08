# Behaviour gaps - 3 October 2026

Every button and menu row on every page was checked against the notes. Below are the actions whose outcome no note states. Each has a proposed behaviour, built from what the drawing and its lede already imply. All of it is now written into the pages as notes.

Sections with no notes at all: 20c, 8a, 2a, 11b, 6a, 6c, 6e.

## Auth and first run

**20a Forgot it?** Opens 20c with the email already typed in the field.

**20c Forgotten password** (no notes)
- *Send the link*: always answers with the same "check your inbox" state, whether or not the address has an account.
- *Send it again*: available after 60 seconds; until then it reads "Send again in 0:47" and counts down.
- *Save and sign in*: sets the password, signs in and opens Home. Every other session is signed out.
- *Start again*: on an expired or used link, returns to the email step with the address filled in.

## Order list

**2a Bulk bar** (no notes)
- *Set status* / *Add category*: open their flyouts; Apply writes to every selected order and asks first above 10 orders (6d). Cancel closes without writing.
- *Export*: downloads the selected orders as CSV, in the columns the list shows.
- *Delete*: the 6d confirmation, naming the count.

**2e Create a category** (row menu flyout): the same inline create as the combobox (14a). The new category is ticked at once on that order.

## Order create

**3a Jump to first**: moves focus to the first value that needs a look and scrolls it into view.

**3c Discard the upload**: deletes the uploaded file and returns to step 1. Nothing is created.

## Duplicate and alerts

**8a Duplicate an order** (no notes)
- *Create copy*: opens the copy in the edit screen, not saved yet, as 3a step 3 does. Save creates it; leaving discards, with a confirm.
- *Discard* / *Cancel*: closes the sheet; nothing is created.
- *Add files*: adds files to the copy only.

**8b Open statistics**: opens Statistics (4a) for the current month with that category as a crumb.

## Order statistics

**4a Edit on category**: opens that category's edit page (5f) with the limit field focused.

## Vendors and categories

**5l Add both**: adds the suggested categories to the order's category field. Nothing else changes.

## Budget

**21g Checking a bank statement**
- *Use TV antenna*: places the payment on the suggested row and marks it saved.
- *Pick from budget*: opens a searchable list of the budget's rows; picking one places the payment there.
- *Always leave out* / *Leave out once*: "always" hides this text in every future file; "once" hides it for this file only.

**21h Close columns**: returns to the payment list with the chosen mapping. *Another file*: opens the file picker; the new file replaces the current one, and payments already placed stay placed.

## Mobile screens

**7b Filter sheet**
- *Show 39 more*: expands that facet's list in place inside the sheet.
- *Show 18 orders*: applies the filters and closes the sheet. The label is the live result count; with no results it reads "No orders match" and is disabled.

## Settings and import

**11b Import** (no notes)
- *Replace file*: back to stage 1 with the mapping kept when the new file has the same columns.
- *Reuse mapping*: applies the mapping saved from the last import with these columns.
- *Match them*: scrolls to the unknown values list. *Pick, or create it*: a combobox of categories with an inline create.
- *Back to mapping*: returns to stage 2 with every choice kept.
- *Import 41 orders*: writes the orders and shows stage 4.
- *Download skipped*: a CSV of the skipped rows with a column saying why each was skipped.
- *See the 41 orders*: the order list filtered to this import.

## States and confirmations

**6a Empty states** (no notes)
- *Search this year*: widens the period to this year and keeps every other filter.
- *Clear filters*: removes every filter and keeps the sort.
- *Scan a receipt*: the Scan receipt path (file picker, then 3a step 2). *Empty order*: 3a, empty order. *New category*: 5f, new.

**6c Validation** (no notes)
- A category name is unique, compared without case. Typing one that exists is an error; *Keep both* is gone.
- *Use Decor*: uses the existing category instead of creating one.

**6d This order changed in another tab**
- *See theirs*: reloads the order as the other tab saved it. Your unsaved line edits are kept and shown on top.
- *Keep mine*: saves your version over theirs, status included.

**6e When the scan fails** (no notes)
- *Continue manually*: opens 3a step 3 with whatever was read and the file attached.
- *Try another photo*: opens the file picker; the new file replaces the failed one and reading starts again.
- *Discard*: deletes the file and returns to the page the scan started from.

## Checked and already covered

Undo this import, Check for updates, Fill with demo data, Open (bookmarks), See more in statistics, Merge, Archive, Delete (5a/5d), Keep checking, Retry now, every nav destination.
