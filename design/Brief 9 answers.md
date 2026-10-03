# Brief 9 answers

Applied. Rule used: where a note gives its reason, the note wins over a drawing or a stylesheet that drifted; where two notes disagree, the section that owns the subject wins; the stylesheet wins over a number quoted in prose. Seven items were the owner's calls; their answers are in place.

## From the user
- DateField: shortcuts are Today and Yesterday. "This month" is removed from the note.

## Order list
1. Kind facet: a dropdown over the five kinds the app stores, "All kinds" first. 2b is redrawn as a combobox.
2. The week always starts on Monday. "per the Settings value" goes from 2d and Input types.
3. The submenu waits `--submenu-delay`, 500ms. 2e is corrected; the token is the stylesheet's value.
4. Cancelled row: the 0.6 moves from the row to every cell except the status cell, so the pill keeps full contrast as the note says.
5. The column header never changes: the `--all-selected` header tint goes from the stylesheet and the 2h drawings.
6. A selected card: green border at 2px (the extra 1px drawn inside, so nothing moves), no fill, as the note says.
7. Cards at a list column of 640px or less. 2i's figure is corrected: 1280 - 248 - 32 - 284 = 716, so a 1280 window keeps rows.
8. The view-name field sits under All orders, at position 2, as the notes say. The drawing is corrected.
9. 2e is the row menu. 8a's drawing is corrected; there is no Export as PDF.
10. The phone order list keeps its own search field, above Filters and Sort; it filters the list. 7a/7b drawn and noted.

## Navigation shell
11. An order is `receipt`, a vendor is `building-store`, everywhere: All orders, the Orders tab, palette rows. Drawings corrected (2b, 2g, 9d, Mobile screens).
12. The register gets rows for wallet, keyboard, power, sun, tag, archive, arrows-join, alert-circle, eye, minus, refresh, star, device-desktop, wifi. `keyboard` is already in icons.js. shopping-bag is not added: vendors use building-store (11). clock and bookmark get their saved-view use added to their rows, as 9e draws.
13. 9b wins: tooltip and name "Dark mode", with aria-pressed. 19a corrected.
14. Statistics' Which orders and Export stay at the top bar's right end (4a). 9f now names this as the one exception: one named slot that only Statistics fills.
15. No page heading and no title anywhere. The leftover lines in 9a and 9f go.
16. The grip stays and the choice is stored per user. No hover peek. 9b, 9i and 16a corrected.
17. The account chevron points up in both states (9e and every drawing). 9c and 16a corrected.
18. 9f and 7b win: on a phone the search field opens the full-screen palette. The 9d line goes.
19. 9d is the palette's reference. 9b is brought in line: groups Orders, Vendors, Items, Actions; orders led by the vendor name; foot "⌘↵ new tab".
20. This year is a tile on the collapsed rail. 9b and 9h drawings get it.
21. The stylesheet wins: palette 520px; menu radius `--r-field`; sidebar rows `--shell-item-pad` with `--shell-gap` after the glyph in a `--mark-small` slot; sidebar scrollbar as 9e. 9c, 9d, 9f, 9g, 9h and 15c corrected.
22. A library list (vendors, categories) ends its toolbar with its own New button. 15e's "No New button" is narrowed to orders, which are created from the sidebar.
23. The profile photo and its initials are round everywhere, initials on `--green-3`. In Settings it is a FileDrop: drop or click. Navigation shell drawings corrected.
24. 7a wins: the FAB is on Home and Orders only, and the save bar takes the tab bar's place. 9h corrected.

## Layout rules
25. 15e corrected: the field's own trailing x clears it.
26. The phone inset is 16 (`--phone-gutter`), as 15a and 15c say. Mobile screens' 12 is corrected.
27. Date stays below 880. 15d corrected to match 2i.
28. A move in phone Reorder mode waits for the order's Save, like any change (1b). 1c corrected.
29. The folded summary is categories · kind · reference, as drawn. The 1c note corrected.
30. Phone rows have no pencil; the row opens the sheet (1c). 1b corrected.
31. The line editor's photo slot is `--mark-medium`. 17b and 17d corrected.
32. The add tile is c16's bare tile, its name in aria-label only. 17b, 17d and 12b corrected.

## Actions inventory
33. Save keeps you on the screen (3a, 16a). On a phone the save bar then goes and the tab bar returns, which is 9h's "task ends". After Create, the app goes to `/orders/:id/edit` in the created state, with the Created notice above the form.
34. No item-count sort. 16a corrected.
35. Home's link stays. The 16a Review / Merge row goes.
36. 11a wins: Delete is absent on a status with orders. Every status row has the pencil; a row with no orders also has the trash. Reorder, rename and delete wait for the save bar.

## Order statistics
37. Six presets: 30 days, Week, Month, Quarter, Year, Custom - 4a, 4b, 4c and 4f redrawn, the step note covers Week and Month (by day). On a phone the period is one select (7b redrawn, 18b already says so).
38. By category, Top vendors and Monthly limit show the current month of the period, as drawn: limits are monthly. The four figures and Spend by month cover the period. Noted in 4a.
39. Expenses only counts Ordered and Delivered; Returned is not an expense. Refunds only reads "Returned orders." The 4e CONFIRM item is closed with this, and 4a's By status drawing loses its Returned row.
40. The drill path is the card under the period row, with Reset and Open in orders (4b, 4c, as built). 4a's bottom drill path goes. 4d's counts strip at rest goes (4b: absent at rest).
41. One card: "Top vendors", resting at the top eight and Other, meta "top 8 of 200" or "all 200", footer carries the total beside Show all.
42. "Ahead of pace" shows when the share used is more than 10 points over the pace, in Statistics and in list rows. 5i corrected.

## Home
43. "from scanning" goes.

## Order create
44. 5l's vendor defaults are the one source. 3a's "suggested from your history" and its dashed chip go.
45. One notice for a copy, 3b's: "Copied from Indbo Møbler, 12 Aug - the receipt stays on that order." 8a corrected.
46. No input opens the camera directly; the device's picker offers it. `capture` goes from every drawing, and 3a's note says so.
47. The Attach row goes from 3c: a matched file is already on that order.

## Duplicate and alerts
48. No phone notifications. 8b's phone drawing is removed; alerts are in-app and email.
49. A tenth pane, "Limit alerts", between Lists and Statuses, holds 8b's controls. 11a and the 7a Settings frame corrected.

## Vendors and categories
50. "facets" becomes "filters"; "recompute against the target" becomes "count them under the one you pick". The button names its object: "Archive vendor".
51. Two vendors may not share a name, as with categories. 5b and 5e corrected.
52. No Favourite vendors card. The text becomes "Kept at the top of Vendors, and leads the list on a new order."
53. 6f wins: Archive from a row applies at once with Undo. 5a's confirm popover goes.
54. The 5f sentence goes.
55. The 5c lede is corrected: create has aliases too.
56. "Merge is vendors only" goes.
57. Deleting a category takes it off its orders (5f). 5l corrected.

## Bookmarks
58. The source-file sentence goes.

## Auth and first run
59. Only scanning and importing wait for confirmation. The banner and STILL AVAILABLE are corrected.
60. The clock was a mistake: alert-circle.
61. The trail button is the reveal: eye, "Show password". The drawings are corrected.

## Settings and import
62. The locale sets numbers too: every figure follows it, amounts included. NUMBER_LOCALE must follow the setting. Noted in 11a; 20d's "Number format" stays.
63. The switch is the app's: a scan that shows the paper's kind sets status or kind. 11a corrected.
64. The drawings win: the hint shows at rest and while checking. 11d corrected.
65. Undo is offered in the history list while the 24 hours last. 11b gains it.

## Mobile screens
66. c12 wins: wrapped chips and Clear all. 7b corrected.
67. On a phone the viewer bar is filename, Previous, Next, download and close; swipe as well. 18b corrected.
68. It counts: on touch each option's press area is the full 48px track (`.sp-touch .sp-segmented__item::before`). No change.

## Budget
69. One bar, as 7a draws: the year control is compact on a phone.

## Dark mode
70. The tokens win: four steps, `#5d9b76, #508062, #405e49, #313e32`. 12a corrected.
71. "half the opacity" goes.
72. The sidebar's action, brand mark, account mark and warning count take `--shell-*` literals, so dark changes none of them.

## Also
- Search's clear: not every browser shows a native clear control, so the field draws its own trailing x (15e says so).
- New tokens: `--shell-action`, `--shell-action-hover`, `--shell-mark`, `--shell-warning` (72).
- The design's `CategoryForm` hint wording ("facets") is the app's to change to "filters" (50).
