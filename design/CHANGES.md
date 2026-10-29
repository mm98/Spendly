# A field does not open the keyboard on touch when a form opens

The brief: on a phone the keyboard pops up every time a form is shown, before the reader has decided to type, and has to be closed first.

## 1. On touch a field takes focus only when the reader has just asked to type

- **The problem:** pages and forms autofocus their first field on every device. On touch that opens the keyboard over half the form as it opens, whether or not the reader wants to edit. Ask already skips it on touch (`Ask.jsx:80`), and the rest of the app does not.
- **What changed:** one rule for every field. On touch (`useShellShape() === 'touch'`, the shell that adds `.sp-touch`) opening a page or form focuses nothing. Desktop keeps its autofocus. Focus still goes to the field on touch when:
  - a tap meant "type here": Add row, Rename, New token, naming a view or a set of orders, a new item's name, Add link, search and the palette;
  - the dialog's only job is a password or a code: confirm password, two-step, delete account;
  - a submit failed: focus goes to the first field in error.
- **Where:** Components, the opening notes, new note "On touch a field takes focus only when the reader has just asked to type". Auth and first run, the sign in / register note: email is autofocused on desktop, not on touch. App, page-open autofocus to gate with `autoFocus={!touch}` (or `if (!touch)` in the effect):
  - `react/src/pages/VendorForm.jsx:289` name
  - `react/src/pages/CategoryForm.jsx:218` name
  - `react/src/pages/BookmarkForm.jsx:194` URL
  - `react/src/pages/OrderForm.jsx:1185` VendorPicker `autoFocus={vendorFirst}` becomes `vendorFirst && !touch`
  - `react/src/pages/SignIn.jsx:202, 208` email and password
  - `react/src/pages/Register.jsx:78` email
  - `react/src/pages/AccountLinks.jsx:221, 272` email and new password
  - `react/src/pages/Welcome.jsx`: no page-open focus; its focus follows a tap on Other, which stays.
  Left as they are, since each follows a tap or a failed submit: Budget.jsx row naming (959, 1026, 1162) and cells (785), OrderForm.jsx item title (1827) and link (1833), OrderViews.jsx, OrderBulk.jsx, OrderMenu.jsx, CopyPicker.jsx, Orders.jsx naming, SettingsStatuses.jsx, SettingsPasskeys.jsx, SettingsAssistants.jsx, the re-auth dialogs (SessionDialog.jsx, SettingsTwoStep.jsx, SettingsDeleteAccount.jsx, SettingsAccount.jsx change password) and every focus-on-error. If any of the left-as-is screens opens from navigation rather than a tap, it takes the gate too.
- **What is still open:** nothing.

## later.md entries left as they are

- **A deleted record should not be removed for good at once:** an idea for later, not a planned task; untouched.

## Files

- README.md: the design's overview, unchanged.
- CHANGES.md: this note.
- Components.dc.html: the new focus-on-touch note.
- Auth and first run.dc.html: the sign in / register note names the rule.
- support.js, view.js, components.js, icons.js: what the pages load to open.
- styles/tokens.css, styles/schemes.css, styles/components.css, styles/doc.css: shared styles, unchanged.
- styles/pages/auth-and-first-run.css: Auth and first run's page styles, unchanged.
- assets/shop-logo.svg: the logo mark drawn in Components.

## styles/check.js

0 findings across 28 pages.
