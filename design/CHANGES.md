# Spendly - answers to the New order follow-up

Copy these files over the behaviour notes package (handoff_2026_10_03e_changes).

1. **Empty order buttons open an empty order directly**: the edit screen, not saved yet, wherever the button appears (Home, Statistics, the order list's empty state). Only New order shows step 1. Noted in 3a.
2. **While a new order is being made, the New order row is current** (`aria-current="page"`, `--shell-current`): on step 1, while a scan is read, and on the edit screen until it is saved. Once saved, All orders is current. Scan receipt never takes the current state. Noted in 9a.

## Files

- `Navigation shell.dc.html`
- `Order create.dc.html`
