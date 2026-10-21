# Emails

Four transactional emails and the status email, drawn in Auth and first run (20f). Send each as multipart/alternative: the .html file and the .txt file beside it.

From: Spendly <offtopic74@gmail.com>

| File | Subject | Sent when |
|---|---|---|
| confirm-email | Confirm your email for Spendly | An account is created, or Send it again on 20b |
| reset-password | Reset your Spendly password | Send the link on 20c, whether or not the address has an account (nothing is sent when it has none) |
| password-changed | Your Spendly password was changed | A password is saved: Change password in Settings, or Save and sign in on 20c |
| passkey-added | A passkey was added to your Spendly account | A passkey is added: Add a passkey on 20b or in Settings |

## Merge fields

- {{name}} - the account's name (confirm-email only)
- {{email}} - the account's address
- {{changed_at}} - password-changed and passkey-added: date and time of the change, in the account's own format, e.g. 9 Oct 2026, 14.26
- {{passkey_name}} - passkey-added only: the name the device reported, e.g. iPhone, 1Password
- {{action_url}} - confirm-email: /confirm/:token (24 hours, single use). reset-password: /reset/:token (1 hour, single use). password-changed: /reset?email={{email}}, the ask step with the address filled in, so it never expires. passkey-added: /settings/account.

Every value is HTML-escaped before it is merged. The subject line is in the first line of each .txt file.

## Built for mail clients

Tables and inline styles only; no web fonts (Poppins where installed, then Helvetica, Arial); a VML button for Outlook; a prefers-color-scheme block that maps to the dark tokens; the link is also written out as text under the button.

Outlook for Windows (the Word engine) does not draw rounded corners on boxes, so there the card is square, with its border and white fill. Do not wrap the card in a VML shape: Outlook cannot nest the mark and button shapes inside one, and the card collapses to the top-left corner. The button's cell carries no fill: the colour sits on the link for other clients and on the VML shape for Outlook, so no square fill shows behind the rounded shape. The mark and the button are VML rounded rectangles in an Outlook-only block, so they round everywhere. The address in the body sits in a span inside an anchor with no href, both inked and undecorated, so Outlook does not turn it into an underlined mailto link; format-detection asks Apple Mail and iOS not to either. Each file is under 10 KB.

## Status email

| File | Subject | Sent when |
|---|---|---|
| status | {{subject}}, e.g. "Week 42 in Spendly: 9.870 kr. spent", "September in Spendly: 61.480 kr. spent" | Status email in Settings, Account and profile, is Weekly (Monday at 08:00, for Monday to Sunday just ended) or Monthly (the 1st at 08:00, for the month just ended), in the account's time zone, and the period has orders |
| status-quiet | "Week 43 in Spendly: nothing spent" | The same, when the period has no orders |

Nothing is sent while the setting is None, the default for every account. One template serves both frequencies; the Budget block is monthly only.

The status templates use Mustache sections: `{{#key}}...{{/key}}` repeats over a list or shows when true, `{{^key}}...{{/key}}` shows when false or empty. A section with nothing in it is left out, its rule with it. `first` is true on the first item of each list, so the rule above it is not drawn. `status-sample.json` holds the three specimens' values, and its keys are the full field list.

- Header: subject, preheader, your_label (Your week / Your month), period
- Tiles: spent, compare (by amount, against the week or month before), saved_fig, has_saving (false when the saving is 0, which draws it grey), saved_sub, count, count_sub
- limits_any, limits_heading, limits[]: name, spent, limit, scope (" in October so far" in a weekly email, since limits are monthly; empty in a monthly one), over ("+26% over the limit"), fill_pct (the limit as a share of what was spent)
- budget (monthly only): last_label, last_real, last_expected, difference, under, last_pct, next_label, next_expected, next_rows. Costs only; income and Left over are never sent.
- categories_any, categories[] (top 5 by amount): name, amount, pct (of the largest)
- orders_any, orders_link, orders[] (latest 5): vendor, category, date, amount, saving ("Saved 995,00 kr."), has_saving
- bookmarks_any, bookmarks_label, bookmarks[] (added in the period): name, vendor, price
- needs_any, needs[]: text, action, url - the rows Home's Needs a look shows, limits left out since they have their own box
- quiet_heading, quiet_line (status-quiet only)
- frequency_line, app_url, settings_url, unsubscribe_url (single use; sets the setting to None without signing in), categories_url, orders_url, bookmarks_url, budget_url

Every value is HTML-escaped before it is merged. Amounts are written in the account's own number format, and month and weekday names in the account's language, as the app writes them ("in Oktober so far", "12. - 18. okt. 2026"); the sentences stay English.

The unsubscribe link opens the answer page drawn in 20f, 8 to 10: Status emails stopped, Already stopped (a second visit), That link has expired (after 60 days). The tiles stack below 480px; the dark block maps to the dark tokens, as in the auth emails.

## Ask Spendly conversation

| File | Subject | Sent when |
|---|---|---|
| ask-chat | {{subject}}, e.g. "Your Ask Spendly conversation, 21 Oct 2026" | Email this chat is pressed on Ask Spendly (24c). Only to the account's own address, never another. At most one per account per minute: the server refuses a second within the minute, and the page shows the problem toast. |

The conversation as it stood when the button was pressed, in order. Each message is the reader's question (right, on the green tint, with their initials) or Spendly's answer (left, with the S mark, on white). `ask-chat-sample.json` holds the specimen's values and its keys are the full field list.

- Header: subject, preheader (the first two questions), date, currency_name (the account currency's name, "Danish kroner"), email, initials, ask_url
- messages[]: mine (true for a question), question (mine only), blocks[] (answers only)
- blocks[]: one of p (runs[]), list (items[]: runs[]), table (head[]: label, align; rows[]: cells[]: runs[], align, last)
- runs[]: text, and either url (a link to the record, absolute, into the app) or amount (true for an amount, set in bold and never broken)

Every text value is HTML-escaped before it is merged; a link is only ever a run with a url the server built from the record's own route, so an answer can never put markup or an outside link in the email. Amounts are written in the account's own number format, as in the app. Each table cell's `last` is true on its row's last cell, for the text version's commas.
