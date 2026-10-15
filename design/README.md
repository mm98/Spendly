# Handoff: Answers to the household questions

## Overview

This answers questions 1 to 3 at the end of `BRIEF.md` (the report "Households: what the app is missing"). It adds to the design update "Households, invites and the Settings regroup"; everything in that update still holds unless changed below.

Question 4 (where to start) is a build decision and is not answered here.

## About the design files

The `.dc.html` files are design references built in HTML. They show the intended layout and behaviour; they are not production code. Recreate the changes in the existing React app (`react/`) and server (`api/`) using their existing components and patterns.

## Fidelity

High fidelity. Every card and control is an existing library component, unchanged. No type, colour, spacing or component style changes.

## The answers

### 1. Budget, bookmarks and drafts are shared

All three move to the household, like orders.

- Budget: years, accounts, groups, lines, bank links.
- Bookmarks and their photos.
- Drafts and scanned files.

None of them has a Settings pane, so no screen changes. In the brief's data table, all three move from "The design does not say" to "Moves to the household". The existing-data migration treats them like orders: every record moves to the account's household of one.

### 2. Lists is personal

The Lists card moves from Shared to You. All four of its settings are stored per user:

- Order views in the menu
- Rows per page
- Sort orders by
- Sort vendors and categories by

The saved views themselves stay shared (household). Only how many of them the sidebar shows is personal.

In the settings split (personal set and shared set), the Lists values go in the personal set.

Position:

- Desktop section nav and card column: the last item in **You**, after Needs a look. Shared is now People with access, Currency, Defaults, Statuses, Import, Demo data.
- Below 900px the section picker follows the same groups.
- Phone Settings list: the last row in **YOU**, after Limit alerts.

The People with access card's intro line changes to: "Everyone here sees and adds to the same orders, vendors, categories and limits. Appearance, formats, alerts and lists stay your own."

Reference: `Settings and import.dc.html` frame 11a; `Mobile screens.dc.html`, phone Settings.

### 3. Demo data is for the owner only

- New permission: **fill demo data**. Owner has it; member does not. Check the permission, not the role name, as with manage people. Member now has every permission except manage people and fill demo data.
- For a member, Demo data is absent: no entry in the section nav, no pane, no row in the phone Settings list. Absent, not disabled.
- The server refuses the fill for a user without the permission.
- What a fill removes in a shared household: every order, vendor, category and bookmark of the household, for everyone.

New state, 6 - Choosing, more than one person (frame 11c). Shown to the owner when the household has two or more members. It is state 2 with a different warning and confirm:

- Warning title: "This replaces what is here now, for everyone"
- Warning text: "Every order, vendor, category and bookmark in the household is removed first, for both of you: you and Anna M."
- Buttons: "Cancel" and "Yes, fill it for everyone" (danger)

Naming rules for the warning text:

- Every member is named, by the name People with access shows. "you" is first, then the others.
- With two members: "for both of you: you and Anna M."
- With three or more: "for all N of you: you, Anna M. and Jonas K." (N written as a word up to ten).
- A pending or expired invite is not named and not counted.

In a household of one, state 2 is unchanged ("Every order, vendor and category you have added is removed first.").

Filling, Done and Failed (states 3 to 5) are unchanged.

## Notes updated in the design

Frame 11a, Notes for implementation:

- People with access: the household data list now names saved views, the budget, bookmarks, and drafts with their scanned files.
- Owner and member: both can do everything except Fill with demo data, which only the owner has.
- Build roles as permissions: member has all but manage people and fill demo data.
- Shared and personal settings: Lists is in You.
- New: "Lists is personal."
- New: "The budget, bookmarks, and drafts with their scanned files are shared."

Frame 11c: lede mentions state 6; new note "With more than one person, only the owner sees this pane."

## Tests to add

- A member gets no Demo data entry or pane, and the fill route refuses them.
- One member's Lists settings do not change another member's.
- Budget, bookmarks and drafts are visible to every member of the household and to no one outside it.

## Files

- `Settings and import.dc.html`: Settings, frames 11a (desktop) and 11c (Demo data states)
- `Mobile screens.dc.html`: phone Settings list
- `styles/`, `support.js`, `components.js`, `icons.js`: needed only to open the pages in a browser
- `BRIEF.md`: the report these answers respond to
