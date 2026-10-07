# Spendly - changes since handoff_2026_10_07b_changes

Copy these files over handoff_2026_10_07b_changes.

## 1. Token field: the trail button stays with the first row (Order create 3a)
- Beside a token field (`.sp-tokens + .sp-field__trail`), the trail button (the bulb) no longer centres on the whole field. It sits centred on the first row, so it stays top aligned as the values wrap onto more rows.
- Desktop: top = (`--control-h` - `--field-trail`) / 2. Touch: the same with `--control-h-touch`.
- A state of the existing trail button, added beside its rules. Every other trail (clear, date, search) is unchanged and stays vertically centred.

## Not changed
- Token field padding stays 6px vertical, 10px horizontal, matching the text inset of every other input.

## Check (styles/check.js)
- Unchanged. Result: 0 findings across 26 pages.

## Files
- styles/components.css
