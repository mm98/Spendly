# The confirmation link no longer signs in

Answers `Brief-confirm-link.md`. Also settles one `later.md` entry.

## 1. The lede of the confirmation section

**The problem** - The lede said following the link "confirms and signs in". It no longer signs in.

**What changed** - It now says following the link confirms the address and signs nobody in.

**Where** - `Auth and first run.dc.html`, 20b, the section lede.

**What is still open** - Nothing.

## 2. The note under "4 - CONFIRMED"

**The problem** - The note said "Opening the link signs the session in, so this never asks for the password again." That is no longer true.

**What changed** - The note now says this state is shown when the link opens in the browser that registered, which registering already signed in. The rest of the note is unchanged (Add a passkey, Not now, Continue on a device without passkeys). A second opening in this browser reads "Already confirmed".

**Where** - `Auth and first run.dc.html`, 20b, "4 - CONFIRMED". App: `react/src/pages/AccountLinks.jsx`, `ConfirmLink`, signed-in branch.

**What is still open** - Nothing.

## 3. Confirmed in a browser that is not signed in

**The problem** - The app builds this state, but the design did not draw it.

**What changed** - New specimen "4 - CONFIRMED, NOT SIGNED IN" beside "4 - CONFIRMED", using the same card, mark and button. Heading "Email confirmed", lead "Sign in to carry on.", one primary button **Sign in**, which opens sign in (20a). It has no passkey offer, since a passkey is added in Settings. A link opened a second time in such a browser reads "Already confirmed", with the same lead and button.

**Where** - `Auth and first run.dc.html`, 20b, "4 - CONFIRMED, NOT SIGNED IN". App: `react/src/pages/AccountLinks.jsx`, `ConfirmLink`, signed-out branch.

**What is still open** - Whether Sign in fills in the confirmed address on the sign-in page is not drawn. Please confirm against what the app already does.

## 4. The check-your-email page

**The problem** - "Open it and you're in." holds only when the link is opened in the same browser.

**What changed** - Both specimens now read: "We sent a link to {email}. Open it to confirm your address, then sign in if asked. It expires in 24 hours."

**Where** - `Auth and first run.dc.html`, 20b, "1 - LINK SENT" and "LINK SENT, A LONG ADDRESS". App: `react/src/pages/AccountLinks.jsx`, the `/confirm` page.

**What is still open** - Nothing.

## 5. The confirmation email

**The problem** - Line 5 said "open this link to confirm {{email}} and you're in." This is the same problem as point 4.

**What changed** - It now reads: "Hi {{name}}, open this link to confirm {{email}}. If you're not signed in on that device, sign in afterwards." The HTML and text versions match.

**Where** - `emails/confirm-email.html`, `emails/confirm-email.txt`. App: `api/src/emails/confirm-email.html` and `.txt`, which are held equal to the design's copies by the design check.

**What is still open** - Nothing.

## later.md: "A category cannot be marked as a favourite"

**The problem** - Pickers list favourite categories first, and demo data makes three of them, but the category page had no control to set or clear one. Vendors have it.

**What changed** - The category page has the same Favourite choice the vendor page uses (`sp-choice sp-choice--described` with `sp-check`), placed in the MARK card after Colour, as on the vendor page. Its help text reads "Kept at the top of Categories, and leads the list in every category picker." It is off on create and drawn on for Decor on edit. A note in 5e states the behaviour.

**Where** - `Vendors and categories.dc.html` 5e (Categories - create) and 5f (Categories - edit). App: `react/src/pages/CategoryForm.jsx`. This settles the later.md entry "A category cannot be marked as a favourite". Please remove it.

**What is still open** - Nothing.

## later.md entries not settled in this pass

You chose to leave these for later. The answers given so far are recorded here so they are not lost. Please confirm before building:

- "The order form promises an order number nobody sees": show it in the order detail header and in order list rows. Not drawn yet.
- "The privacy notice does not name the exchange-rate lookup": proposed sentence "A receipt in another currency sends its currency and date to frankfurter.dev to look up that day's exchange rate. Nothing else is sent." Not drawn yet.
- "A saved view's warning colour has no control": your answer was "The design already describes it". Nothing was changed. Please confirm which page and screen holds it.
- "Search finds categories and bookmarks but does not show them": not taken up.
- "51 of the design's checks are not held against the app", "Demo data counts returned orders as spending", "Categories with equal spend sort by their generated ids": these are app-side, with no design change.

## Files

- `README.md` - the design overview, unchanged.
- `CHANGES.md` - this note.
- `Auth and first run.dc.html` - points 1 to 4.
- `Vendors and categories.dc.html` - the favourite category control.
- `emails/confirm-email.html`, `emails/confirm-email.txt` - point 5.
- `support.js`, `components.js`, `icons.js` - loaded by the pages.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - shared styles the pages link.
- `styles/pages/auth-and-first-run.css` - linked by Auth and first run.

## styles/check.js

0 finding(s) across 26 pages.
