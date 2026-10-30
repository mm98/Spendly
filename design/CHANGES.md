# Emails in Danish

## Fixed from handoff_emails_in_danish

**The problem.** The package still called the email files send-ready. Once their words move to the phrase files, the .html and .txt files are templates the server fills in, not finished emails.

**What changed.** `emails/README.md` opens by saying each file is a template: the server fills in the phrases in the email's language, then the values, and sends the two as multipart/alternative. The templates and the phrase files are what the server keeps a copy of. In Auth and first run 20f, the note "Send-ready files" is now "Templates, not finished emails".

**Where.** `emails/README.md`, the opening paragraph. Auth and first run 20f, the first note.

**What is still open.** Nothing.

Answers `Brief-emails-in-danish.md`: a Danish version of every email, where the files live, and the Danish status subject. The words themselves are not in this package. They are taken out of the layouts and written in English and Danish by Claude Code, to the rules below.

## 1. One layout per email, its words in a phrase file per language

**The problem.** Every email is in English only. The server sends `design/emails` as they are, and `design:check` holds them equal to the drawn files, so the app cannot change a word. A copy of every email per language would mean two layouts to keep equal, and one more for each language added later.

**What changed.** Each email keeps the one layout drawn in 20f for every language. Its words move to one phrase file per language, in the ICU message format the app already uses:

- `design/emails/language/en.json` and `design/emails/language/da.json`, one file per language code. The server keeps its copy beside its copy of the emails (`api/src/emails/`), as now.
- Every class, inline style and Outlook detail stays in the layout. Words that are bold or linked inside a sentence (the address, the passkey name, "Change it in Settings", "Files in Ask") are a tag in the phrase, and the tag's markup is in the layout.
- The subject is a phrase too, on the first line of each `.txt`, the status and conversation emails included. `<html lang>` is the email's language.
- The merge fields and Mustache sections stay as they are. The question and the answer in a conversation email are the reader's and Spendly's own words, not phrases.
- The layout does not change with the language: a longer Danish line wraps inside the same card, button and tile, as a long name does.
- A further language is one new file, `emails/language/<code>.json`, and nothing in the layouts.

**Where.** `emails/README.md`, Languages. Auth and first run 20f, notes "Every email is in the account's language" and "The layout does not change with the language". App: `api/src/emails/`, `api/src/lib/emails.js`, and the senders named in the brief.

**What is still open.** Nothing.

## 2. The words the server writes today move into the phrase files

**The problem.** The status and conversation emails get English sentences from the server: your_label, compare, saved_sub, count_sub, limits_heading, scope, over, last_label, difference, next_label, next_rows, orders_link, saving, bookmarks_label, the Needs a look text and action, frequency_line, quiet_heading, quiet_line, subject and preheader (`api/src/lib/statusEmail.js`), and the conversation's subject (`api/src/lib/askChat.js`). The README said "the sentences stay English".

**What changed.** These sentences become phrases, so every word of an email is in one place. The server sends only what the words need: weekly or monthly, the week numbers, month names in the email's language (mid-sentence, and with a capital where a phrase starts with one), the dates and amounts written as now, the counts, which way a comparison went (less, more, the same, no orders before), whether the budget came in under, over or as expected, and which kind each Needs a look row is (drafts, late orders, possible duplicate vendors, orders without a receipt). The README's line "the sentences stay English" is removed.

In the conversation email, `currency_name` is the currency's name in the email's language: "danske kroner" in Danish.

**Where.** `emails/README.md`, Languages, "Words the server writes today", and Ask conversation. Auth and first run 20f. App: `api/src/lib/statusEmail.js`, `api/src/lib/askChat.js` (`currencyName`, the subject).

**What is still open.** Nothing.

## 3. The Danish subjects

**The problem.** The brief asks for the Danish wording of the status subject, weekly and monthly, with and without orders.

**What changed.**

- status, weekly: "Uge 42 i Spendly: 9.870 kr. brugt"
- status, monthly: "September i Spendly: 61.480 kr. brugt"
- status-quiet: "Uge 43 i Spendly: intet brugt", "September i Spendly: intet brugt"
- ask-chat: "Din samtale i Spendly, 21. okt. 2026"

The Danish words follow the app's own Danish: Indstillinger, Spørg, Filer, Statusmail, Ugentlig, Månedlig, Kræver opmærksomhed, Sparet, adgangsnøgle, totrinslogin, gendannelseskode, e-mail.

**Where.** `emails/README.md`, Languages, "Subjects in Danish". Auth and first run 20f, the captions under specimens 5, 6, 7 and 11.

**What is still open.** Nothing.

## later.md

Read on main before the task. Its one entry, Recently deleted, is an idea kept for later and is not part of this change.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Auth and first run.dc.html` - 20f: the two language notes and the Danish subjects in the captions.
- `emails/README.md` - the Languages section, the field notes it changes.
- `emails/*` - the other email files, unchanged, which 20f loads to draw its specimens.
- `support.js`, `components.js`, `icons.js`, `view.js` - what the page loads to open from the folder.
- `styles/tokens.css`, `styles/schemes.css`, `styles/components.css`, `styles/doc.css`, `styles/pages/auth-and-first-run.css` - the stylesheets the page links.

## styles/check.js

0 finding(s) across 28 pages
