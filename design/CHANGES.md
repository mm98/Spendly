# Spendly - changes since handoff_2026_10_14d_changes

Copy these files over handoff_2026_10_13_full with handoff_2026_10_13b_changes, handoff_2026_10_14_changes, handoff_2026_10_14b_changes, handoff_2026_10_14c_changes and handoff_2026_10_14d_changes applied. No stylesheet changes.

## 1. The fault
- On the 30 days preset the window control's label read "16. aug. - 14. sep.". It needs about 125px; the label has 92px inside the fixed 190px `--window-w`, so it ran into the next arrow. It also repeated the dates on the resolved line.

## 2. The answer
- The 30 days window's label is the words "30 days", in the present window and when stepped back.
- The window's label names the window, never its dates: W34, August, Q3, 2026, 30 days. The dates stay on the resolved line beside it (for example 22/07 - 20/08/2026).
- `--window-w` stays 190px for every preset. No label may need more room than "September".

## 3. In the app
- Change the label the period control passes for the 30 days preset to "30 days". Nothing else changes.

## 4. In the design
- Components c14: a 30 days specimen above Week, and a note on the window label.

## 5. Check (styles/check.js)
- Clean: 0 findings across 26 pages.

## Files
- Components.dc.html
- styles/COMPONENT-STATUS.md
