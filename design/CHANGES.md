# Spendly - changes since handoff_2026_10_07_changes

Copy these files over handoff_2026_10_07_changes. Answers to Brief 30 are in Brief 30 answers.md.

## 1. Home month card measures against an earlier month (Home 10a)
- Category limits are never added together. There is no overall monthly limit.
- The line under the bar names one whole earlier month: "95% of 64.520 kr. in July", or "90% of 71.890 kr. in August 2025" when it is last year's. Every order dated in that month counts, the same scope as Spent this month.
- The pace marker and the pace words are unchanged: "ahead of pace" when the share is more than 10 points over the marker.
- Past the compared month: the fill stops full and stays green, no over segment, no amber on the bar. The share keeps counting ("105% of 64.520 kr. in July"). The only amber is "ahead of pace".
- Nothing in the compared month: the bar is drawn empty (`sp-gauge--untargeted`), no fill, no marker, no pace words, and under it "Nothing from July to compare with yet." No fallback to the other choice.
- A very different compared month is not corrected.
- Three state specimens under the screen: past the compared month, same month last year, nothing to compare with. All three are the same height.
- Last 8 months: July bar adjusted to match July's total.

## 2. New setting: Compare this month with (Settings 11a)
- In Appearance, a combobox: Last month (default) or Same month last year.
- It drives Home's month card, the phone's Home and the monthly summary. It saves with the card's own save.

## 3. Monthly summary (Duplicate and alerts 8b)
- Heading: "You spent 61.480 kr., 3.040 kr. less than in July", or "... more than ..." the compared month. "You spent 61.480 kr. in August" with nothing to compare. Plain ink.

## 4. Statistics, Monthly limit card (Order statistics 4a)
- The foot line "All categories 61.480 / 68.000 kr." is removed. The card is per category only.
- Note rewritten: limits belong to one category each and are never added together.

## 5. Phone Home (Mobile screens 7a)
- "61.480 of 64.520 kr. in July", the bar at 95%.

## Not changed, open
- Statistics 4a Spend by month still draws the dashed "Monthly limit 68.000 kr." line and legend key (also in Dark mode and image viewer). It is the same sum of limits. Waiting on a decision.
- Home 10a Last 8 months: the August readout overlaps the card's "Statistics" link. This was there before this handoff. Fixing it changes the readout or the card's established styles, so it is waiting on a decision.

## CSS
- No stylesheet changed.

## Check (styles/check.js)
- Unchanged. Result: 0 findings across 26 pages.

## Files
- Home.dc.html
- Settings and import.dc.html
- Duplicate and alerts.dc.html
- Order statistics.dc.html
- Mobile screens.dc.html
- Brief 30 answers.md
