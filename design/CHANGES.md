# Invoice PDF from an order, and company details from the CVR register

Brief: make a properly formatted, good-looking invoice PDF from the information saved on an order. While answering it: keep vendor company details current from the CVR register (cvrapi.dk), searchable by CVR number or company name, and handle vendors and recipients outside Denmark.

Every question was answered in the design chat; nothing is open. The repo's `later.md` had no entries when this was built.

## 1. The invoice PDF

**The problem** - An order could not be handed to an employer or accountant for repayment as a proper document.

**What changed** - An A4 PDF in English, made from a saved order. The vendor is the sender. Layout: the vendor's mark and Name, "INVOICE"; three tiles (Number, Date, Total with VAT, the total tile green); From and To boxes; the lines with photo, quantity, unit price and amount; Shipping and Discount rows when set; Note; Without VAT, VAT 25%, Total; a foot with the vendor's register name, CVR and page number. Prices on an order include VAT, so VAT is 20% of the total. Number is the order's Reference, or "Order 447" when it has none. Rows with nothing in them are left out. An order longer than a page continues on page 2 with the column heads repeated and "Continued, Order 512"; totals follow the last line; "Page 1 of 2". File name `Invoice SPENDLY-447 Indbo Møbler.pdf`. Downloaded, not kept on the order. The PDF is drawn by the app at these exact sizes, with Poppins embedded.

**Where** - Invoice 24a (one page), 24b (two pages, no Reference, discount). `styles/pages/invoice.css` (`.iv-*`) holds the PDF's print measurements.

## 2. Make invoice, and the dialog

**The problem** - There was no way to start an invoice, and no way to say who it is for.

**What changed** - "Make invoice" in the order row menu and the card menu, under Download receipt, with the Tabler `file-invoice` icon. It is not on the read view. It opens a dialog, "Make an invoice": the order in one line; Recipient, which takes a CVR number or a company name; the company found, from the CVR register; Att. (optional); a 40% live preview of the PDF beside the fields; Cancel / Download PDF. The last recipient is remembered per account. Eight digits look up at once; a name looks up on Enter. "Type the address instead" swaps in Company (required), Address, Country and Att. for a recipient outside Denmark or without a CVR; "Look up instead" swaps back. A vendor with no address or CVR still gets an invoice with its Name alone, and an amber alert names what is missing with "Add them", which opens the vendor's edit page in a new tab. Download PDF downloads and closes; no toast.

**Where** - Invoice 24c and 24d. Order list 2b and the card menu note (seven items); Duplicate and alerts 8a (menu and note); Dark mode and image viewer (the same menu); Actions inventory 16a (new row). `icons.js` `file-invoice`, registered in Icon legend 19a. New c13 variant `.sp-dialog--preview` with `.sp-dialog__split`, `.sp-dialog__fields`, `.sp-dialog__preview` in `styles/components.css`: 760 wide, a 320 preview, falling back to the plain 420 dialog below 760. Documented in Components c13 and `styles/COMPONENT-STATUS.md`. No existing component changed.

## 3. Vendor Country, CVR and Address

**The problem** - The invoice's From box needs the vendor's address and CVR number, which a vendor did not have.

**What changed** - In THE VENDOR card, under Name: Country (default Denmark), CVR, Address. All optional. With a CVR number the address comes from the register and is shown, not edited ("From the CVR register, checked 14 Oct."). Without one, Address is typed. Outside Denmark, CVR becomes a typed VAT number and Address stays typed. Country is printed on an invoice only when it is not Denmark.

**Where** - Vendors and categories 5b (create), 5c (edit, with its note), Mobile screens vendor create. The vendor model gets country, cvr, vat number, address, register name, and dated address history.

## 4. Company details kept in sync with the CVR register

**What changed** - A background job, never a lookup while the vendor page is open. A newly saved CVR is looked up within a day, then every vendor with a CVR is checked weekly. The register always wins and changes are applied silently. The register's company name is stored beside the vendor's own Name (printed as From); Name never changes. Addresses are kept with the date they took effect, and an invoice uses the one valid on the order date. A Danish vendor without a CVR is searched by name; the best match is offered on the vendor page as "Is this the company?" with Not this one / Use it. Not this one is remembered until Name changes. A company that has ceased trading keeps its last address with "Ceased trading 3 Mar 2026."; nothing else changes. An unknown CVR is marked on the field and Address returns to typed. Vendors outside Denmark are never looked up.

**Access** - cvrapi.dk's free tier, 50 lookups a day, called from the server with a user agent naming Spendly and a contact. The weekly job uses at most 40 a day; 10 stay free for the invoice dialog and newly saved CVR numbers, which go first. When the limit answers, the job stops until the next day, with nothing shown to the user. A result is reused for every vendor with that CVR. In the dialog, when the day's lookups are used, the help line reads "Company lookup is not available until tomorrow. Type the address instead." and the typed fields open.

**Where** - Vendors and categories 5m (six states and notes). Invoice 24c (the dialog's lookup and the limit).

## 5. The checker

**What changed** - `styles/check.js` no longer holds the invoice's print stylesheet to the app's spacing scale: the PDF is an A4 document, not app UI. Nothing else in the checks changed.

**Where** - `styles/check.js`, section 6 (`PRINT`). `checks.html` PAGES and `index.html` list the new Invoice page (24a-24d) and the 5m screen.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Invoice.dc.html` - new page: the PDF (24a, 24b) and the dialog (24c, 24d).
- `Vendors and categories.dc.html` - vendor fields in 5b and 5c, the register states in 5m.
- `Mobile screens.dc.html` - vendor fields on the phone.
- `Order list.dc.html`, `Duplicate and alerts.dc.html`, `Dark mode and image viewer.dc.html` - Make invoice in the row and card menu.
- `Actions inventory.dc.html` - the Make invoice row.
- `Icon legend.dc.html`, `icons.js` - the `file-invoice` icon.
- `Components.dc.html`, `styles/components.css`, `styles/COMPONENT-STATUS.md` - the `sp-dialog--preview` variant.
- `styles/pages/invoice.css` - the PDF's layout.
- `styles/check.js`, `checks.html`, `index.html` - the checker exception and the new page in the lists.
- `support.js`, `components.js`, `styles/tokens.css`, `styles/doc.css` - loaded by the pages, unchanged.
- `styles/pages/budget.css`, `mobile-screens.css`, `order-list.css`, `duplicate-and-alerts.css`, `dark-mode.css`, `icon-legend.css`, `actions-inventory.css` - linked by the pages above, unchanged.

## styles/check.js

0 finding(s) across 27 pages.
