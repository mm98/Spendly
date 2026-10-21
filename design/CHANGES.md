# Assistant tokens: a Settings section for MCP access

## Fixed from design_handoff_assistant_tokens_fixed

- **The card is in the Settings screen, 11a.** 11a draws every pane's card in one column. The AI assistants card, at rest with two tokens, now sits there after Statuses, like the other panes. The second Settings screen that 11e opened with is gone; 11e holds the states again, with state 4 at the pane's width.

## Fixed from design_handoff_assistant_tokens

- **Read-only fields.** Token, Address and Address with the token in it are now read-only inputs with bound labels. Before, the long address ran past the field and the card, and the values sat above the copy button's centre.
- **Set up in labels.** "Claude Desktop" is now "Claude", meaning the web and the desktop app, which share the Connectors setting. All four labels now fit at the pane's width. On a phone the new token shows without Set up in: the token and both addresses are there to copy, and the programs it sets up run on a computer.

Answers `Brief-assistant-tokens.md` ("a Settings section for assistant tokens").

## 1. Where the section goes

- **The problem:** Settings had nowhere to make, see or remove the tokens an assistant program reads `/mcp` with.
- **What changed:** a pane of its own, **AI assistants**, in the Settings nav after Statuses and before the divider. Settings now has twelve panes. On a phone it is its own page, opened from an "AI assistants" row in Settings that shows the token count, placed after Statuses.
- **Where:** `Settings and import.dc.html` 11a (nav item, lede, note) and 11e (the pane, every state); `Mobile screens.dc.html` 7a (the Settings row and the AI assistants phone page). App: `react/src/pages/Settings.jsx` (section list), a new pane beside `react/src/pages/SettingsPasskeys.jsx`, and the phone layout of Settings.
- **What is still open:** nothing.

## 2. The list, the empty state, making a token

- **The problem:** the brief asks for a named list with made and last-used dates, an empty state, and a required name of at most 80 characters, at most 20 tokens.
- **What changed:** one card in the Passkeys family: head "AI ASSISTANTS" with New token, the line "Let an assistant such as Claude look up your orders, vendors and budget. A token gives it read-only access to this account: it can read, never change or delete.", then one row per token at the passkey row's 42px (`.st-pk-row`): the name over "Made 14 Oct 2026 · last used today" or "Made 2 Sep 2026 · never used", and Remove. Newest first.
  - Empty: the card with only its line and New token.
  - New token opens a naming row at the top (name field, Cancel, Create), the passkey rename row's shape. Enter creates, Escape cancels, the field stops at 80 characters. Create with no name shows "Give the token a name." under it. New token is disabled while the naming row or a new token is open.
  - At 20: New token disabled, and the line "20 of 20 tokens. Remove one to make another."
  - No rename, as the server offers none.
- **Where:** `Settings and import.dc.html` 11e, states 1, 2, 3, 5, 6.
- **What is still open:** nothing.

## 3. The one-time token

- **The problem:** a long token must be copied once without mistakes, with both address forms.
- **What changed:** shown in the card, where the naming row was, until Done. It holds: the token's name; a warning well "Copy the token now. It won't be shown again." / "If you lose it, remove it and make a new one."; three read-only inputs with a copy button each (a long value is cut at the field's edge; the button copies all of it): Token, Address (`https://<server>/mcp`, help "Send the token with it, as the header Authorization: Bearer and the token."), Address with the token in it (`https://<server>/mcp/<token>`, help "For a program that takes only an address."). Then **Set up in**, the fill Segmented with Claude (web and desktop app), Claude Code, Cursor, ChatGPT (Claude Code first), each showing one line and its setup text with the token filled in, copyable. Copy swaps the icon for a check for 2 seconds and shows the toast "Copied." Done, or leaving the pane, ends the showing; the card returns to the list with the new row on top. `<server>` is the address this Spendly is opened on.
- **Where:** `Settings and import.dc.html` 11e, state 4 and "Set up in - the other three". New component variant `.sp-well--snippet` in `styles/components.css` (unlayered, beside `.sp-well`), drawn in `Components.dc.html` c26: keeps line breaks, breaks long words, holds the field's copy button (`.sp-field__trail`) top right. The text is the product face at `.sp-data`, no code font.
- **What is still open:** the client steps (menu names in Claude and ChatGPT, the `claude mcp add` flags, the Cursor file path) are written from current documentation; please confirm them against each client before shipping.

## 4. Remove

- **The problem:** removing stops the program at once and cannot be undone.
- **What changed:** Remove opens the confirm dialog: "Remove Claude on my laptop?", "An assistant using this token stops reading Spendly at once. This can't be undone.", Keep the token / Remove token (danger). After it the row is gone and the toast says "Token removed."
- **Where:** `Settings and import.dc.html` 11e, state 7.
- **What is still open:** nothing.

## 5. Checker

- **The problem:** `styles/check.js` read the command-line flags in a setup snippet (`--transport`, `--header`) as cited CSS tokens.
- **What changed:** text inside `.sp-well--snippet` is skipped by the "a named token exists" assertion, since it is copy the user pastes.
- **Where:** `styles/check.js`.
- **What is still open:** nothing.

## later.md

Not touched in this pass: "A deleted record should not be removed for good at once" stays deferred, as chosen.

## Files

- `Settings and import.dc.html` - 11a nav, notes and the AI assistants card; new 11e with every state.
- `Mobile screens.dc.html` - 7a Settings row and the AI assistants phone page.
- `Components.dc.html` - c26 snippet well specimen and note.
- `index.html` - 11e listed, screen count 99.
- `README.md` - the design's overview, unchanged.
- `styles/components.css` - `.sp-well--snippet`.
- `styles/check.js` - snippet exemption.
- `styles/tokens.css`, `styles/doc.css`, `styles/pages/settings.css`, `styles/pages/mobile-screens.css`, `styles/pages/budget.css`, `support.js`, `components.js`, `icons.js` - loaded by the pages above, unchanged.

## styles/check.js

0 findings across 26 pages.
