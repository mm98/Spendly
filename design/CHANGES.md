# A monospaced face for codes, keys and code

Brief: find a monospaced font that sits with Poppins, and use it everywhere the product shows a key or a code, and for code examples.

## Red Hat Mono, as --font-mono

**The problem.** Codes and keys were set in Poppins. A sign-in code had tabular digits, but in a recovery code or a token 0 and O, and 1, l and I, are hard to tell apart. Code in the documents took three different system monospace stacks, and a doc `code` took the body face.

**What changed.** Red Hat Mono, chosen from four candidates set side by side, is the one monospaced face, at 400 (500 loaded for bold inside code). It is the token `--font-mono: "Red Hat Mono", ui-monospace, monospace;`, beside `--font`. It takes the size of the text it replaces; no type size, weight or colour changed. Amounts, dates and counts stay in Poppins with tabular digits.

**Where.**
- `styles/tokens.css`: `--font-mono`.
- `styles/components.css`:
  - `.sp-input--code` takes `var(--font-mono)`: the sign-in code and recovery code fields (Auth and first run 20g, Settings and import 11f, the delete-account code in 11g), and now the readonly token and address fields of an AI assistant (11e).
  - `.sp-code`, new: a code or key shown rather than typed. The recovery code list (11f) and "Authorization: Bearer" in the 11e help line.
  - `.sp-well--snippet` (c26) takes `var(--font-mono)`: an assistant's setup text and key (11e) and the two-step key (11f).
  - `.sp code` (documents) takes `var(--font-mono)`.
- `styles/doc.css` `.doc-code`, `styles/pages/auth-and-first-run.css` `.au-mono`, `styles/pages/responsive-reference.css` `.rr-code__body`: their system stacks replaced by `var(--font-mono)`.
- Auth and first run 20g: the two recovery code fields were `.sp-number`; they are `.sp-input--code` as the sign-in code field is.
- Every page loads Red Hat Mono 400 and 500 beside Poppins.
- Typography 13a: the lede and the Stack now name the second face. 13b: the comparison, with Red Hat Mono marked as chosen, and notes on where it is used and how it loads.
- `react_handoff/Inputs.jsx`: `TextField` takes a boolean `code` prop in place of `variant="code"`, so a key can be readonly and monospaced at once. JSDoc updated.
- App:
  - `react/src/styles/fonts.css` and `react/src/fonts/`: self-host Red Hat Mono 400 and 500, latin and latin-ext, `font-display: swap`, the same unicode range as Poppins.
  - `variant="code"` becomes `code` in `react/src/app/SessionDialog.jsx`, `react/src/pages/SignIn.jsx`, `react/src/pages/SettingsTwoStep.jsx` (two places) and `react/src/pages/SettingsDeleteAccount.jsx`.
  - The assistant's token and address fields take `variant="readonly" code`; the recovery code list takes `sp-code`; the help line's header name sits in an `sp-code` span.
  - Copy `styles/tokens.css` and `styles/components.css` into `react/src/styles/`.

**What is still open.** Nothing.

## styles/check.js

New assertion "One monospaced face": `--font-mono` is Red Hat Mono; no stylesheet outside Typography and Type specimen states its own monospace stack; `.sp-code`, `.sp-input--code`, `.sp-well--snippet` and `.sp code` take the token; every page that loads Poppins loads Red Hat Mono; a code field is `.sp-input--code` and nothing else is; a recovery code in its list is `.sp-code`; and any key or code in the product's text (`spk_`, a 4-4 recovery code, the two-step key, `Authorization: Bearer`) sits in a monospaced element. It reported 47 findings before the change.

## later.md

The one entry, "A deleted record should not be removed for good at once", is marked as an idea not to be built until asked, so it is left as it is.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Typography.dc.html` - 13a names the face, 13b the comparison and the decision.
- `Settings and import.dc.html` - 11e token fields and help line, 11f recovery codes and key, 11g code field.
- `Auth and first run.dc.html` - 20g recovery code fields.
- `Components.dc.html` - c26 snippet well, now monospaced.
- `Responsive reference.dc.html` - the CSS panels.
- `support.js`, `components.js`, `icons.js`, `view.js` - what the pages load to open.
- `styles/tokens.css`, `styles/components.css`, `styles/doc.css` - the changed stylesheets.
- `styles/schemes.css`, `styles/pages/typography.css`, `styles/pages/settings.css`, `styles/pages/auth-and-first-run.css`, `styles/pages/responsive-reference.css` - stylesheets the pages link; the Auth and Responsive reference ones changed.
- `styles/check.js` - the checker with the new assertion.
- `react_handoff/Inputs.jsx` - `TextField` with the `code` prop.

Every other page changed only its font link, so it is not in the package.

## Result

0 finding(s) across 28 pages
