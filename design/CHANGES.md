# Spendly - changes since handoff_2026_10_04e_changes_fixed

Copy these files over handoff_2026_10_04e_changes_fixed.

## 1. The bookmark card has two click targets

- The picture strip is a link to the bookmark's URL, opening in a new tab (unchanged).
- Everything below the strip opens the bookmark at `/bookmarks/:id/edit`, as a click on an order card opens the order. Before, the rest of the card did nothing while still showing the pointer and hover border.
- A category chip filters the list, and the menu button over the strip opens the menu; both stop the click there.
- No CSS change: the card's pointer and hover border now match what it does.
- Documented in Bookmarks 22a and Components c1 (Actions).

**What the app changes**
- Make the card body (below the strip) open the edit page. Stop propagation on the chips and the menu button.

## 2. A card's menu truncates long labels

"Open at" a long domain wrapped over several lines in the bookmark menu.

- `styles/components.css`, beside the record menu rules:
  - `.sp-record__menu .sp-menu { width: 214px; }` (the menu's own minimum width)
  - `.sp-record__menu .sp-menu__item > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`
- The menu component (c9) is unchanged elsewhere. Applies to every card menu, orders and bookmarks.
- "Open at" names the domain without `www.`; the full domain goes in the item's `title`.
- Documented in Bookmarks 22a and Components c9 (Fixed). Logged in `styles/COMPONENT-STATUS.md`.

**What the app changes**
- Take the new components.css. Set `title` on the Open at item to the full domain.

## 3. Components documents the bookmark card head

Components c1 gains a note on `sp-record__head--chips` and its touch behaviour (handoff_2026_10_04d and 04e). Documentation only.

## Files

- `Bookmarks.dc.html`
- `Components.dc.html`
- `styles/components.css`
- `styles/COMPONENT-STATUS.md`

`styles/check.js`: 84 finding(s) across 26 pages.
