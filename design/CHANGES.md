# Favourites lead only in pick lists

Answers `Brief-favourites-only-in-pickers.md`: favourites come first only in the lists you pick from. The Vendors and Categories pages ignore favourites in every sort, and sort by name is plain A to Z.

## 1. The Categories page keeps its chosen sort

**The problem** - The note on the category form said a favourite category is kept at the top of Categories. The 5d drawing showed "Sort: Name A - Z" with the rows in the order Decor, Seating, Lighting, Textiles, Storage, which is not A to Z.

**What changed** - The 5d rows now read Decor, Lighting, Seating, Storage, Textiles. The 5e note now reads: "A favourite category comes first in every category picker, and only there: the Categories page keeps its chosen sort, and Name A - Z is plain A to Z."

**Where** - `Vendors and categories.dc.html` 5d (Categories list) and the 5e note "Favourite works as it does on a vendor." App: the Categories page, all sorts.

**What is still open** - Nothing.

## 2. The Favourite help text no longer promises a place on the page

**The problem** - The Favourite choice on the vendor and category forms said "Kept at the top of Vendors" and "Kept at the top of Categories".

**What changed** - Vendor forms: "Leads the list wherever you pick a vendor." Category forms: "Leads the list in every category picker."

**Where** - `Vendors and categories.dc.html` 5b, 5c, 5e, 5f, 5h. `Mobile screens.dc.html`, the phone vendor edit screen. App: the vendor and category forms.

**What is still open** - Nothing.

## 3. The picker rule names the pages it does not reach

**The problem** - The Combobox note in Components listed what is not a picker, but did not name the Vendors and Categories pages.

**What changed** - Added: "The Vendors and Categories pages are not pickers either: every sort there ignores favourites, and sort by name is plain A to Z." The pickers themselves are unchanged and still lead with Favourites, Recent, then the rest.

**Where** - `Components.dc.html` c5, the note "Favourites first, wherever a vendor or a category is picked." App: the Vendors page and the Categories page.

**What is still open** - Nothing. The Vendors page drawings (5a, phone) are sorted by spend and already ignore favourites; they did not change.

## later.md

Read on main before this task. Its one entry, "A deleted record should not be removed for good at once", is still deferred: its open questions (how long a copy is kept, which kinds, bulk delete, where "Recently deleted" lives) are unanswered. Not settled here.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Vendors and categories.dc.html` - points 1 and 2.
- `Mobile screens.dc.html` - point 2.
- `Components.dc.html` - point 3.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - loaded by every page.
- `styles/pages/budget.css`, `styles/pages/mobile-screens.css` - linked by `Mobile screens.dc.html`.

## styles/check.js

0 finding(s) across 26 pages.
