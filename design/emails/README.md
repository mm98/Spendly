# Emails

Seven transactional emails and the status email, drawn in Auth and first run (20f). Each .html and .txt file here is a template, not a finished email: the server fills in the phrases in the email's language and then the values, and sends the two together as multipart/alternative. The templates and the phrase files are what the server keeps a copy of.

From: Spendly <offtopic74@gmail.com>

| File | Subject | Sent when |
|---|---|---|
| confirm-email | Confirm your email for Spendly | An account is created, or Send it again on 20b |
| reset-password | Reset your Spendly password | Send the link on 20c, whether or not the address has an account (nothing is sent when it has none) |
| password-changed | Your Spendly password was changed | A password is saved: Change password in Settings, or Save and sign in on 20c |
| passkey-added | A passkey was added to your Spendly account | A passkey is added: Add a passkey on 20b or in Settings |
| two-step-on | Two-step sign-in is on for your Spendly account | Two-step sign-in is turned on in Settings (11f) |
| two-step-off | Two-step sign-in is off for your Spendly account | Two-step sign-in is turned off in Settings (11f), or by the server's owner for the account |
| recovery-code-used | A recovery code was used for your Spendly account | A recovery code signs in on the code step (20g) |
| account-deleted | Your Spendly account was deleted | Delete account succeeds in Settings (11g), sent to the address the account had |

## Merge fields

- {{name}} - the account's name (confirm-email only)
- {{email}} - the account's address
- {{changed_at}} - password-changed, passkey-added, two-step-on, two-step-off, recovery-code-used and account-deleted: date and time of the change, in the account's own format, e.g. 9 Oct 2026, 14.26
- {{passkey_name}} - passkey-added only: the name the device reported, e.g. iPhone, 1Password
- {{codes_left}} - recovery-code-used only: the recovery codes left after this one, 0 to 9
- {{action_url}} - confirm-email: /confirm/:token (24 hours, single use). reset-password: /reset/:token (1 hour, single use). password-changed: /reset?email={{email}}, the ask step with the address filled in, so it never expires. passkey-added, two-step-on, two-step-off and recovery-code-used: /settings/account.

Every value is HTML-escaped before it is merged. The subject line is in the first line of each .txt file.

## Languages

Every email is sent in the account's language, and in English when the server cannot tell which language that is. Each email keeps one layout for every language, the .html and .txt files here, with its words in one phrase file per language in the app's ICU message format.

- **Where:** `emails/language/en.json` and `emails/language/da.json`, one file per language code. The server keeps its copy beside its copy of the emails, as now.
- **What stays in the layout:** every class, inline style and Outlook detail. Words that are bold or linked inside a sentence are a tag in the phrase, and the tag's markup is in the layout.
- **The subject is a phrase too**, on the first line of each .txt, the status and conversation emails included. `<html lang>` is the email's language.
- **How a layout names a phrase:** `{{@key}}`, filled in before the values around it, with the values as its places. A tag in the phrase takes its markup from the layout: `{{@key|address=<b ...><a ...><span ...>}}` draws `<address>{email}</address>` inside that markup, closed in reverse. The text version names the phrase alone and gets the words. `{{language}}` is the email's language code.
- **The merge fields and sections above stay as they are.** The question and the answer in a conversation email are the reader's and Spendly's own words, not phrases.

### Words the server writes today

The status and conversation emails get sentences from the server now (your_label, compare, saved_sub, count_sub, limits_heading, scope, over, last_label, difference, next_label, next_rows, orders_link, saving, bookmarks_label, needs text and action, frequency_line, quiet_heading, quiet_line, subject, preheader). They move into the phrase files, so every word of an email is in one place. The server sends only what the words need:

- which email it is: weekly or monthly
- the week numbers, and month names in the email's language (mid-sentence, and with a capital where a phrase starts with one)
- the dates and amounts, written as now
- the counts
- which way a comparison went (less, more, the same, no orders before), and whether the budget came in under, over or as expected
- which kind each Needs a look row is (drafts, late orders, possible duplicate vendors, orders without a receipt)

### Subjects in Danish

| Email | Danish subject |
|---|---|
| status, weekly | "Uge 42 i Spendly: 9.870 kr. brugt" |
| status, monthly | "September i Spendly: 61.480 kr. brugt" |
| status-quiet | "Uge 43 i Spendly: intet brugt", "September i Spendly: intet brugt" |
| ask-chat | "Din samtale i Spendly, 21. okt. 2026" |

The Danish words follow the app's own Danish: Indstillinger, Spørg, Filer, Statusmail, Ugentlig, Månedlig, Kræver opmærksomhed, Sparet, adgangsnøgle, totrinslogin, gendannelseskode, e-mail.

### A further language

One new file, `emails/language/<code>.json`, and nothing in the layouts.

## Built for mail clients

Tables and inline styles only; no web fonts (Poppins where installed, then Helvetica, Arial); a VML button for Outlook; a prefers-color-scheme block that maps to the dark tokens; the link is also written out as text under the button.

Outlook for Windows (the Word engine) does not draw rounded corners on boxes, so there the card is square, with its border and white fill. Do not wrap the card in a VML shape: Outlook cannot nest the mark and button shapes inside one, and the card collapses to the top-left corner. The button's cell carries no fill: the colour sits on the link for other clients and on the VML shape for Outlook, so no square fill shows behind the rounded shape. The mark and the button are VML rounded rectangles in an Outlook-only block, so they round everywhere. The address in the body sits in a span inside an anchor with no href, both inked and undecorated, so Outlook does not turn it into an underlined mailto link; format-detection asks Apple Mail and iOS not to either. In the conversation email the two marks are VML shapes as well, a rounded square for S and a circle for the initials, since Outlook ignores the width and height of a div and draws it as a bar across its cell. Its gaps, between messages and between an answer's parts, are spacer rows and cell padding, never margins or div padding, which Outlook drops. Its figures table is a bordered, rounded cell holding a collapsed table of rows, so Outlook does not add space around every cell. Each file is under 13 KB, far below the size at which Gmail clips a message.

## Status email

| File | Subject | Sent when |
|---|---|---|
| status | {{subject}}, e.g. "Week 42 in Spendly: 9.870 kr. spent", "September in Spendly: 61.480 kr. spent" (Danish in Languages, above) | Status email in Settings, Account and profile, is Weekly (Monday at 08:00, for Monday to Sunday just ended) or Monthly (the 1st at 08:00, for the month just ended), in the account's time zone, and the period has orders |
| status-quiet | "Week 43 in Spendly: nothing spent" | The same, when the period has no orders |

Nothing is sent while the setting is None, the default for every account. One template serves both frequencies; the Budget block is monthly only.

The status templates use Mustache sections: `{{#key}}...{{/key}}` repeats over a list or shows when true, `{{^key}}...{{/key}}` shows when false or empty. A section with nothing in it is left out, its rule with it. `first` is true on the first item of each list, so the rule above it is not drawn. `status-sample.json` holds the three specimens' values, and its keys are the full field list.

- Period: period_kind (week or month), week, days ("12 - 18 Oct 2026"), period_month and period_month_in (the month's name in the email's language, to start a sentence and inside one), year, scope_month (the month of the period's last day: a monthly limit in a week is measured as that month so far)
- Tiles: spent, saved_amount (with decimals, for the preheader), compare (none, same, less or more, against the week or month before), compare_amount, before_week, before_month, saved_fig, has_saving (false when the saving is 0, which draws it grey), saving_count, orders_count and orders_shown (the number, and as written), count, delivered
- limits_any, limits_count, limits_shown, limits[]: name, spent, limit, over_pct, fill_pct (the limit as a share of what was spent), limit_period (month or year), limit_year (the calendar year of the period's last day, as a string, "2026", so the number format never writes "2.026"), limit_year_ended (yes when the period's last day is 31 December of limit_year, otherwise no). A monthly limit is measured on scope_month, a yearly one on limit_year up to the period's last day, in both emails; a yearly category is listed while its year so far is past its limit. A row reads "12.640,00 kr. of 10.000,00 kr." for a monthly limit in the monthly email, "... in October so far" in the weekly email, "64.300,00 kr. of 60.000,00 kr. in 2026 so far" for a yearly limit in either, and "... in 2026" once the year has ended (the December monthly email, and a weekly email whose Sunday is 31 December). In Danish: "i oktober indtil nu", "i 2026 indtil nu", "i 2026".
- budget (monthly only): last_real, last_expected, difference_way (same, under or over), difference_amount, under, last_pct, next_month, next_expected, next_rows_count, next_rows_shown. Costs only; income and Left over are never sent.
- categories_any, categories[] (top 5 by amount): name, amount, pct (of the largest)
- orders_any, orders[] (latest 5): vendor, category, has_category, date, amount, saving (the amount saved), has_saving
- bookmarks_any, bookmarks[] (added in the period): name, vendor, price
- needs_any, needs[]: kind (drafts, late, vendors or receipt), need_count, need_shown, url - the rows Home's Needs a look shows, limits left out since they have their own box
- between_from, between_to (status-quiet only: the two ends of the week, "19" and "25 October")
- app_url, settings_url, unsubscribe_url (single use; turns off both Weekly and Monthly without signing in), categories_url, orders_url, bookmarks_url, budget_url

Every value is HTML-escaped before it is merged. Amounts are written in the account's own number format, and month and weekday names in the email's language, as the app writes them ("12. - 18. okt. 2026"). The sentences around them are in the email's language too (Languages, below).

The unsubscribe link opens the answer page drawn in 20f, 8 to 10: Status emails stopped, Already stopped (a second visit), That link has expired (after 60 days). The tiles stack below 480px; the dark block maps to the dark tokens, as in the auth emails.

## Ask conversation

| File | Subject | Sent when |
|---|---|---|
| ask-chat | {{subject}}, e.g. "Your Spendly conversation, 21 Oct 2026" | Email this chat is pressed on Ask (24c). Only to the account's own address, never another. At most one per account per minute: the server refuses a second within the minute, and the page shows the problem toast. |

The conversation as it stood when the button was pressed, in order. Each message is the reader's question (right, on the primary tint, with their initials) or Spendly's answer (left, with the S mark, on white). `ask-chat-sample.json` holds the specimen's values and its keys are the full field list.

- Header: preheader (the first two questions), date, currency_name (the account currency's name, "Danish kroner"), email, initials, chat_url (this chat in the app, /ask/:chatId, the button at the end, Open this chat; a chat that is deleted or past its 30 days opens Ask's empty page with the toast "That chat is no longer kept.")
- messages[]: mine (true for a question), question (mine only), blocks[] (answers only)
- blocks[]: one of p (runs[]), list (items[]: runs[]), table (head[]: label, align; rows[]: cells[]: runs[], align, last), files, chart
- files: items[] (title, kind, size, first, attached; or failed with reason), files_url (the Files page, /ask/files), kept_until (the last day the files are kept, ISO 8601 date). The files an answer made are attached to the email, up to 15 MB in all, in the order they were made; attached is true for each one that went with it. A file that would take the email past 15 MB is not attached, and its line reads "Too big to attach. Download it from Files in Ask until" kept_until, with Files in Ask linked to files_url, which asks for a sign-in. The title is the file's name without the time it was made, as on the row (Ask 24d): "Orders at Bilka in 2026.xlsx". An attachment and a download take the same name with the time it was made in brackets: "Orders at Bilka in 2026 (2026-10-22 14.05.33).xlsx".
- chart: title, meta (the period or total), src, width, alt, values. The server draws the chart as a PNG at twice its width (1040 for 520) and attaches it to the message inline, `cid:` in src, so it shows without signing in and no address leads to it. Outlook for Windows takes the width attribute; every other client scales it with the bubble. The bars are the mid green the initials use (#508066) and the ticks the meta grey, on a transparent ground, so it reads on the light and the dark card; a chart with more than one series has its key drawn under the bars. alt is the title and every value, for clients that block images; values is the same list for the text version. The specimen's src is emails/ask-chart-sample.png.
- runs[]: text, and either url (a link to the record, absolute, into the app) or amount (true for an amount, set in bold and never broken; the server writes the space between the number and the currency as a no-break space, U+00A0, because Outlook ignores `white-space: nowrap` and would otherwise break "46.300,88 kr." across two lines)

currency_name is the currency's name in the email's language: "Danish kroner", "danske kroner".

Every text value is HTML-escaped before it is merged; a link is only ever a run with a url the server built from the record's own route, so an answer can never put markup or an outside link in the email. Amounts are written in the account's own number format, as in the app. Each table cell's `last` is true on its row's last cell, for the text version's commas.
