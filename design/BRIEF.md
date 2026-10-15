# Households: what the app is missing

Compared on 15 Oct 2026: the design update on `main` ("Households, invites and the Settings regroup", `design/README.md`) against the app (`react/`) and the server (`api/`). Nothing in the app has been changed.

The earlier design update in the same folder (Needs a look above Drafts on Home) is already built, so this list covers only the new update.

## Short version

- **Nothing about households exists in the app today.** Every record belongs to one person. Shared use needs a change to how all data is stored, and that change touches every page.
- **The Settings changes are small and stand on their own.** They can be built first, without households.
- **Four questions need your answer** before the household part is built (end of this file).

## 1. Households

### Data

Today 24 tables store data by person. The design says the shared ones move to a household.

| Moves to the household (the design names it) | Stays with the person (the design names it) | The design does not say |
|---|---|---|
| Orders (and their lines, files and status dates) | Login, password, passkeys, sign-in sessions | **Budget** (years, accounts, groups, lines, bank links) |
| Vendors, vendor alternative names, vendor pictures | Profile picture | **Bookmarks** (and their photos) |
| Categories and their limits | Theme, row density, compare this month with | **Drafts and scanned files** |
| Statuses | Date, time and number format | |
| Saved views | Limit alerts, Needs a look switches | |
| Order imports | Monthly summary already seen | |
| Currency, defaults, lists settings | | |

New tables: households, memberships (person, household, role, joined date) and invites (address, who invited, link, expiry, accepted, cancelled). Orders get "added by".

The settings are stored as one set per person today. They must be split into a personal set and a shared set.

### What happens to the existing data

- Every existing account becomes a household of one, with that person as owner. Every record moves to that household, and every order gets "added by" = the account's owner.
- Nothing is deleted, and nothing looks different for a person on their own: the design shows no household words with only one person.
- This is a one-way change to the database. It can only be undone by another change written for that purpose. I would test it on a copy of a real-sized database first.

### Server

- About 300 places in the server read data "for this person". Each must read "for this household" instead. This is the largest part of the work, and a missed place would show one person's data to the wrong household, so each route needs a test.
- A permission check ("may manage people"), not a check of the role name. Owner has all; member has all but removing people.
- New: send invite, send again, cancel invite, remove a person, leave, open an invite link, accept it (new account), join with an existing account.
- The invite email (the design's `invite.html` and `invite.txt`) goes beside the four emails the server sends today.
- The speed check for database questions (`queries:check`) must be run again and its results accepted, because every question changes.

### Screens

- **Settings, People with access card** (new): you, the other people, pending and expired invites, the invite field, Send invite, Send again, Cancel invite, Remove, Leave, with the existing confirm box.
- **Accept an invite** (new page `/invite/…`): create account and join, plus the four other cases (link no longer works, signed in as someone else, address already has an account, and the "Your 12 orders move to…" question).
- **Who added an order**, only with two or more people:
  - Order list: an "Added by" filter with counts, a filter chip, and saved views that keep it.
  - Order page: an "Added by" row after Reference.
  - Scanned before: "by Anna M." after the scan time.

### Changes that delete or merge data (need care)

- **Joining with an account that already has orders** moves those orders into the other household, joins vendors and categories with the same name, drops the joining account's own statuses, lists and defaults, and deletes the old household. This cannot be undone. I suggest building it last.
- **Fill with demo data** today removes all orders, vendors, categories and bookmarks of the account first. In a shared household it would remove them for everyone. The design keeps Demo data as a shared setting and does not say more.
- **Remove a person**: their access ends at once, their orders stay. No data is lost.
- The design says "deleting the account deletes the household". The app has no way to delete an account today, so there is nothing to build for this now.

## 2. The other design changes, by screen

### Settings, desktop

- The menu is split in three groups with headings: **You** (Account and profile, Appearance, Dates times and numbers, Limit alerts, Needs a look), **Shared** (People with access, Currency, Defaults, Lists, Statuses, Import, Demo data), **App** (This build). Today it is one list under "Settings". The cards follow the same order.
- The card "Money, dates and times" splits in two: **Dates, times and numbers** (format and preview) and **Currency** (with new help text).
- Below 900 pixels the section picker shows the three groups.
- **Divider fix**: today the line beside the menu stops at the last card when you scroll to the end. The app draws that line on the cards, which is exactly the fault the design describes. The design moves it to the menu, which stays in place while the cards scroll.

### Settings, phone

- The list gets the same groups: the profile card heading reads **YOU**, then **SHARED** and **APP** labels.
- "Money, dates and times" becomes "Dates, times and numbers" in You, and "Currency" in Shared.
- "People with access" with a count, first in Shared.

These Settings changes do not need households, except the People with access card.

## Proposed order of work

1. **Settings regroup, the split card and the divider fix.** Small, no data change. One pull request. People with access waits for step 3.
2. **Households in the data and the server**, including the move of existing data. No visible change for a person on their own. Tested on a large account and on ten accounts, so one household can never see another's data.
3. **Invites**: People with access, the invite email, Accept an invite for a new account, Remove and Leave.
4. **Who added an order**: the filter, the order row and the scan line.
5. **Joining with an existing account** (the merge). Last, because it deletes the old household.

Steps 2 to 4 only make sense together for the user, so they could go in one pull request and one merge, if you prefer.

## Questions for you

1. **Budget, bookmarks and drafts.** The design does not say if they are shared or personal. My suggestion: all three shared, like orders.
2. **Lists is in Shared.** That means page size, sort order and number of recent rows become the same for everyone in the household. Is that what you want, or should only some of it be shared?
3. **Demo data in a shared household** would remove the other people's orders too. Should it be only for the owner, only for a household of one, or as the design shows (anyone)?
4. **Where to start.** Step 1 alone, steps 1 to 4, or everything.
