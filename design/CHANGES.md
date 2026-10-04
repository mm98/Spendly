# Spendly - changes since handoff_2026_10_04m_changes

## Fixed in this package (replaces handoff_2026_10_04n_changes, _fixed, _fixed_2 and _fixed_3)

- **04n_fixed_2 and _fixed_3** described the fade below, but their CSS, token, check and page files did not contain it. This package does.

- **04n** gave the vendor image its own look: a grey, small mark centred in the card band, with `.sp-mark--vendor`, `.sp-mark--faded` (opacity + grayscale) and `.sp-record__photos--fallback`. Wrong.
- **04n_fixed** drew it exactly as an item photo with no fade. Also wrong.
- **Correct, this package:** drawn exactly as an item photo, filling the band, and faded. The fade is the only difference. Delete `.sp-mark--vendor` and `.sp-record__photos--fallback` if built; render through the item photo component with the faded state below.

Copy these files over handoff_2026_10_04m_changes. The HTML files are design references; rebuild them in the app's own code.

## 1. Copying an order copies the item photos (Brief 20)

Duplicate (Duplicate and alerts 8a) and Copy a previous order (Order create 3b) now carry every line whole, its photo included. The order's own files (receipt, PDFs) are still not copied. Date becomes today and the status resets, as before.

- The unsaved copy shows each line's photo in the line row and in the open line editor. Remove and replace work as on any line.
- Save stores the copy's own pictures, so deleting the original order later does not change the copy.
- The note after Duplicate reads "The receipt was not copied - add this trip's receipt", and shows only when the original order had files.
- 3b dialog copy: "The vendor, category and item lines are copied, with each item's photo. The date becomes today, the status resets, and the receipt stays on the original order."

**What the app changes**
- Duplicate and Copy: copy each line's photo file (a new stored file per line, not a reference to the original's).
- Show the receipt note only when the source order had files, with the new wording.

## 2. Vendor image - fallback for orders with no item photo

A vendor can carry one optional image: a logo, the shop, any picture. Its only use: on that vendor's orders where no item line has a photo, it is shown in place of the item photo, **drawn exactly as an item photo, faded**. The fade is the only difference: no new component, no grayscale, no other styling. The vendor's own mark stays initials everywhere.

Full spec: Images and files 17e. Upload slot: Vendors and categories 5b (empty) and 5c (filled).

**Where it shows**
- Order row thumbnail (2b, 10a, 8a): the same `.sp-mark--photo` an item photo uses, plus `.sp-mark--faded`.
- Order card photo band (2c): the band's one `.sp-record__photo`, filling it as a single item photo does, plus `.sp-record__photo--faded`, instead of "No photos".
- Precedence: first item line with a photo, then the vendor image, then the existing empty state.
- Same crop, tone and click as an item photo in that spot. The fade says the picture belongs to the vendor, not the order. Data: the order's photo count and the No photos filter count item photos only.

**Form field** (5b, 5c, in THE VENDOR card under Name)
- The c17 thumb slot at `--mark-large`, as an item photo slot. Label "Image". Help: "Shown on this vendor's orders that have no item photo. A logo, the shop, anything you know it by."
- `accept="image/png,image/jpeg,image/webp,image/heic,image/svg+xml"`.
- Empty, uploading, filled (Remove beneath), rejected (banner with the reason). Lifecycle as 17a: staged upload, committed on save, replace is upload-swap-release, Remove needs no confirmation.

**Validation** (browser first, server again)
- Type: PNG, JPEG, WebP, HEIC, SVG. Banner "Not supported", help "Use a PNG, JPEG, WebP, HEIC or SVG file."
- Size: 5 MB max. Banner "Too large", help "The image is over 5 MB. Use a smaller file."
- Smallest: 128 px on the shorter side (SVG exempt). Banner "Too small", help "The image needs to be at least 128 px on its shorter side."
- Largest: 8000 px either side, 40 MP, checked on the server before full decode. Banner "Too large".
- Unreadable or failed SVG sanitising: banner "Failed", help "This file could not be read. Try another."
- Network failure: banner "Failed", Retry beneath; a replace keeps the old image.

**Server processing**
Sniff type; SVG is sanitised (scripts, event handlers, external references, `foreignObject` stripped) and rasterised to PNG at 1024 px, never served as SVG; HEIC converted; EXIF orientation applied and all metadata stripped; first frame of an animated WebP; size rules checked; renditions written. The original is kept and never served.

**Renditions - one set for every picture of goods (17a, new)**
Item photos and the vendor image share one resize job:
- `square-128` (centre crop): `--mark-medium` at up to 3x, the order row.
- `square-256` (centre crop): `--mark-large` at up to 3x, the form slot.
- `wide-1080` (aspect kept): the card photo band at up to 3x.
- `view-2560` (longest side, aspect kept): the image viewer. Not made for the vendor image.
WebP, quality 85, alpha kept, never upscaled. Served with srcset; immutable, addressed by content hash.

**Data model**
- `vendor.image_file_id`, nullable. Nothing is stored on orders; the fallback is resolved at render, so changing or removing the image changes every one of the vendor's orders at once.
- Archive keeps the image; delete releases it; merge keeps the target's, or moves the source's if the target has none; duplicating an order does not touch it.

**Open, not designed: dark mode**
A transparent image on `--surface-2` can disappear in the dark theme. This needs implementation and testing with real images before it can be designed. Until then the dark theme shows it as the light theme does, and nothing is added for it.

**Token** (`styles/tokens.css`, new)
```css
--photo-fallback-opacity: 0.6;
```

**CSS** (`styles/components.css`, unlayered, beside `.sp-record__photos--empty`)
```css
.sp-mark--photo.sp-mark--faded,
.sp-record__photo--faded { filter: opacity(var(--photo-fallback-opacity)); }
```
`filter: opacity()` rather than `opacity`, so it compounds with an opacity the element already has (the void row's 0.6) instead of replacing it.

**Check** (`styles/check.js`): `.sp-mark--faded` only with `.sp-mark--photo`; `.sp-record__photo--faded` only with `.sp-record__photo`.

**Docs updated**
- Images and files: 17a (five upload places, renditions table), 17c (four thumbnail states), 17d (order thumbnail and card strip rows), 17e (new).
- Order list 2b note: four thumbnail states.
- Components c2: faded photo specimen and state note. Vendors 5b note.

## Files

- `Duplicate and alerts.dc.html`
- `Order create.dc.html`
- `Images and files.dc.html`
- `Vendors and categories.dc.html`
- `Components.dc.html` (04n specimen removed)
- `Order list.dc.html`
- `Brief 20.md`
- `styles/components.css`
- `styles/tokens.css`
- `styles/check.js`
- `styles/COMPONENT-STATUS.md`

`styles/check.js` reports 0 findings.
