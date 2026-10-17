# A simpler invoice, and vendors without an address

## Fixed from design_handoff_invoice_simple_fixed

The invoice dialog sent the user away to the vendor's edit page to add a missing address or CVR number, and a vendor's CVR number was only looked up by the overnight job. Both are changed; see points 3 and 4.

## Fixed from design_handoff_invoice_simple

The Company details toggle was drawn as `sp-btn sp-btn--text`, which stretched to the full width of the dialog's field column with its label centred. It is now the existing text toggle `sp-field-group__more` (the rail's "Show 38 more"), which sits at the start under Address. It reads "Show company details" while closed and "Hide company details" while open, so it needs no chevron. Where: `Invoice.dc.html` 24c (both specimens and the first note) and 24d.

Answers the brief: making an invoice asks too many questions on every order, and the vendor list should show which vendors are missing details.

## 1. Make invoice asks for a name and an address

**The problem** - The Make invoice dialog asked for Name, Country, CVR, Address and Att. every time. Most invoices go to the user at their own address, so four of the five fields were noise.

**What changed** - The dialog shows Name and Address only. A text toggle, Show company details, sits under them and opens Country, CVR (VAT number outside Denmark) and Att.; open, it reads Hide company details. It opens already open when the remembered recipient has a CVR or VAT number, an Att., or a country other than Denmark, and closed otherwise. Closing it keeps the values. CVR lookup, the remembered recipient and the PDF preview are unchanged; with CVR found, the register's address fills Address above the button.

**Where** - `Invoice.dc.html` 24c (both specimens, first note) and 24d (dialog, last note). Uses the existing `sp-field-group__more`, no new styles. App: the Make invoice dialog component in `react/src/`.

**What is still open** - Nothing.

## 2. Vendors without an address are marked in the list

**The problem** - There was no way to see which vendors would give an invoice with only a name in From.

**What changed** - A vendor without an address gets "No address" at the end of its grey line, after the order count: `14 orders · No address`. Only the address counts; a missing CVR number is not marked. A vendor with an address shows nothing extra. The Active / Archived control gains a third choice, No address, listing active vendors without an address; the toolbar count follows it, and the empty state reads "Every vendor has an address."

**Where** - `Vendors and categories.dc.html` 5a (segmented control, Ferm Living and Indbo Moebler A/S rows, two new notes). Uses existing `sp-meta` and `sp-segmented`. App: `react/src/pages/` vendors list.

**What is still open** - The answers asked for both a quiet warning icon and text in the grey line. This draws the text only, since an icon inside the grey line would be a new component. Please confirm, or say if the icon should be added as well.

## 3. The vendor's missing details are filled in inside the invoice dialog

**The problem** - With a vendor missing its address or CVR number, the alert in the dialog offered Add them, which closed the dialog and opened the vendor's edit page. Nothing else in the app leaves a dialog that way, and a CVR number saved there waited for the overnight job.

**What changed** - The dialog never leaves. For a Danish vendor the alert holds a field, "Flying Tiger's CVR". Eight digits look the company up at once, with the same help lines as the recipient's CVR. Found, the alert goes, a plain field keeps the number with the help line "Flying Tiger A/S, Strøget 12, 1160 København K. Saved to Flying Tiger when you download.", and the preview's From fills in. Not found, or no lookup left, the alert gains an Address field. A vendor outside Denmark gets "Nordlys AB's VAT number" and "Nordlys AB's address" in the alert. A saved CVR the register does not know: "Check the number, or type the address.", with both fields. Download PDF saves what was typed to the vendor; Cancel saves nothing. Every field is optional.

**Where** - `Invoice.dc.html` 24d (two specimens: asked, found; notes rewritten). New variant `sp-alert--field` in `styles/components.css` beside `.sp-alert` (`align-items: flex-start`, body `flex: 1`); the locked alert rules are unchanged. Documented as a specimen and a States note in `Components.dc.html` c19. App: the Make invoice dialog and the vendor update endpoint in `react/src/`.

**What is still open** - Nothing.

## 4. The vendor page looks up a CVR number as it is typed

**The problem** - On the vendor page a new CVR number was looked up within a day by the background job, so the address was empty until the next day.

**What changed** - Eight digits look the company up at once, as in the invoice dialog. State 1 is now "CVR typed, looking up", with "Looking up…" under CVR. With no answer from the register: "The company could not be looked up. It is tried again tonight."; with the day's lookups used: "Company lookup is not available until tomorrow. The address is filled in then." In both cases the number is saved and the job looks it up, first in its queue. The weekly check, the name search and the 40-a-day cap are unchanged; the 10 left each day serve lookups typed on the vendor page and in the invoice dialog. A wrong number is marked at once. The Address help line drops "within a day of saving".

**Where** - `Vendors and categories.dc.html` 5m (lede, first and limits notes, state 1), the Address help line in 5b and 5m states 3 and 5; `Mobile screens.dc.html`, the vendor's Address help line. App: the vendor form and `api/` CVR lookup.

**What is still open** - Nothing.

## later.md

The one entry ("51 of the design's checks are not held against the app") concerns `react/scripts/check-design.mjs` and is not a design fix. Nothing settled here.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Invoice.dc.html` - points 1 and 3.
- `Vendors and categories.dc.html` - points 2 and 4.
- `Components.dc.html` - the `sp-alert--field` variant in c19.
- `Mobile screens.dc.html` - the vendor Address help line.
- `support.js`, `components.js`, `icons.js` - needed to open the pages.
- `styles/tokens.css`, `styles/doc.css` - shared styles, unchanged.
- `styles/components.css` - adds `sp-alert--field`.
- `styles/pages/invoice.css`, `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - linked by the pages above, unchanged.

## styles/check.js

0 findings across 27 pages.
