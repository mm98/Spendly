# Spendly - changes since handoff_2026_10_14b_changes

Copy these files over handoff_2026_10_13_full with handoff_2026_10_13b_changes, handoff_2026_10_14_changes and handoff_2026_10_14b_changes applied. This answers brief 39. Notes only; nothing in the app changes.

## 1. The answer: option 1, keep two lists, one strength
- Brief 38's "the light and dark rules become one rule" meant one strength (`--fade-photo`), not one list. The two rules in `app.css` stay separate, as they are today.
- They differ on purpose. Light tones to even out the colour of product photos. Dark tones to take the glare off white paper on a dark ground.

## 2. Questions inside the choice
- Hover: light stays as it is. A toned photo of goods does not change on hover. Dark returns to full strength on hover, as today.
- Saturation: does not apply. With option 1 no receipt is toned on light.
- Receipt preview while a scan is read (new-order screen): stays untoned in both themes. It is a viewer stage, and the viewer is never toned.

## 3. Every place a picture is drawn
- No change to any of the three groups in the brief. Goods: toned in both themes. Receipts, scans, files and the form picture box: toned on dark only. The user's own picture, the viewer and its page strip, and the scan preview: never toned.

## 4. Notes in the design
- Images and files 17a/17b: the thumbnail-tone notes now say both themes share one strength but tone different lists, and why; light no longer claims "every thumbnail" or full strength on hover. The positions note scopes "goods only" to light and points to 12a for dark.
- Dark mode and image viewer 12a: every thumbnail on dark is toned, paper included; light's list is goods only; the two lists differ on purpose.

## 5. Check (styles/check.js)
- Clean: 0 findings across 26 pages.

## Files
- Images and files.dc.html
- Dark mode and image viewer.dc.html
