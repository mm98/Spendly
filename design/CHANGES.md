# Vendor initials are too faint in the dark theme, and one tweak bar on every page

Fixed from `handoff_vendor_colours`: vendors on a failing colour are moved by a migration, without asking. The alert card on Vendors overview 5a is removed.


Answers `Brief-vendor-colours.md`, plus a request made with it: the same tweak bar on every page, with Touch only removed.

## 1. A vendor with no chosen colour takes one of the eight swatches

- **The problem:** a vendor with no chosen colour gets one of twelve colours from `VENDOR_PALETTE` in `api/src/lib/palette.js`. In the dark theme five of the twelve (`#877364`, `#177DA7`, `#AD620D`, `#8453F5`, `#B4552B`) fail 4.5:1 with either ink. The design already said the colour is a stable hash of the name over the eight swatches. The twelve-colour list was never drawn here.
- **What changed:** there is no vendor palette any more. A new vendor, one made by a receipt scan and the demo vendors all take the swatch their name hashes to over the eight, in the picker's order: Primary, Mid, Light, Pale, Brown, Sand, Rust, Grey (`primary`, `primary-3`, `primary-4`, `primary-5`, `amber-ink`, `amber-2`, `red-ink`, `ink-6`). The vendor stores the swatch's name, not a hex value, the same as a picked swatch, so the mark follows the scheme and the theme and takes its ink from the existing rules. The ink rule does not change (the dark theme does not switch to pure white). Emails, which are light only, resolve the name to its light value in the reader's scheme.
- **Where:** `Components 2` (IdentityMark, badge c2): a new specimen, "A vendor with no chosen colour", and a note under the same heading. No CSS changes: `.sp-mark--solid[data-swatch]` already covers all eight. App: delete `VENDOR_PALETTE` from `api/src/lib/palette.js` and hash over the swatch names in `api/src/lib/findOrCreate.js` and `api/src/routes/vendors.js`. Also update `api/src/lib/demoData.js`, `react/src/app/categoryMark.jsx` (`VendorMark` takes a swatch name, as `Mark` does with `inkFor` in `react_handoff/colour.js`) and `api/src/format/offers/index.js` (resolve the swatch to its light value before `inkOn`).
- **What is still open:** nothing.

## 2. Vendors already on a failing colour are moved automatically

- **The problem:** a vendor keeps its stored colour, so changing the palette fixes only new vendors.
- **What changed:** a one-time migration moves every vendor stored on one of the five failing colours to the swatch its name hashes to. Those colours were given by the app, not picked by the owner, so nothing is asked and nothing is announced. A vendor on any other colour, picked or automatic, is not touched. Vendors overview shows no alert for this.
- **Where:** `Components 2` (c2), the note "A vendor with no chosen colour". App: a migration in `api/` that matches `color` against the five values, case-insensitively, and writes the swatch name.
- **What is still open:** nothing.

## 3. One tweak bar on every page

- **The problem:** Components had a Touch only tweak. Input types had Error states and Combobox variant. React components had Go to and Shell menu, with its theme and scheme under a section called Theme. Every other page had Theme and Scheme under View.
- **What changed:** every page carries the same two tweaks, Theme and Scheme, in the View section, and nothing else. Input types always shows its error states and both combobox modes. React components always opens at the top with the menu expanded. The menu's other states can still be reached from the grip on the page. The Touch only rules are removed from `doc.css`.
- **Where:** the `data-props` of `Components`, `Input types` and `React components`, the logic that read the removed tweaks, and `styles/doc.css` (the `.sp[data-touch="only"]` rules). `styles/check.js`: the Go to menu assertion is replaced by "one tweak bar on every page", which fails any page whose tweaks are not exactly Theme and Scheme, or differ from the others. Design docs only, nothing in the app.
- **What is still open:** nothing.

## later.md

Its one entry, "A deleted record should not be removed for good at once", is marked as an idea not to build until asked. It is untouched.

## Files

- `README.md`: the design's overview, unchanged.
- `CHANGES.md`: this note.
- `Components.dc.html`: c2 specimen and note, tweak bar.
- `Vendors and categories.dc.html`: unchanged from the project, included because Components links to it.
- `Input types.dc.html`, `React components.dc.html`: tweak bar.
- `support.js`, `components.js`, `icons.js`, `view.js`: what the pages load to open.
- `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`: loaded by the pages, unchanged.
- `styles/doc.css`: Touch only rules removed.
- `styles/pages/input-types.css`: loaded by Input types.
- `styles/check.js`: the new assertion.
- `react_handoff/`: the component sources React components renders, unchanged.
- `assets/shop-logo.svg`: used by Components.

## styles/check.js

0 finding(s) across 28 pages.
