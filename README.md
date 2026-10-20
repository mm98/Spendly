# Spendly

**A personal ledger for what you buy.** Capture a receipt, keep every order and its lines straight,
see where the money went per month, vendor and category, plan the year in a budget, and keep a list
of things worth buying later.

Spendly runs on your own server, in one container, with your data in one folder. Each person has
their own account, and nobody sees another account's records. Formats are Danish by default
(kroner, day-first dates, decimal commas) and every account can choose its own.

![Home](docs/home.png)

## Contents

- [Features](#features)
- [Running it](#running-it)
- [Stack](#stack)
- [How it is built](#how-it-is-built)
- [Working on it](#working-on-it)
- [The design system](#the-design-system)

## Features

### Home

Everything that needs you, on one page.

- **This month** - what you spent, what you saved, how many orders, and how far into the month you
  are, measured against last month or the same month last year.
- **Needs a look** - categories over or near their limit, orders still "Ordered" after two weeks,
  vendors that look like duplicates, and orders without a receipt. Each one opens the matching
  list. Each rule can be turned off in Settings.
- **Last month in review** - from the 1st of each month: which categories went over, how often,
  and when a limit may be too low.
- **Recent orders and drafts** - drafts update while a receipt is still being read.
- **Add an order** - drop a receipt, start an empty order, or copy an earlier one.
- **Top categories** with their limit bars, and **the last 8 months** as a chart. A click opens
  Statistics at that point.

### Orders

![The order list with its filters and saved views beside it](docs/order-list.png)

- **Search** by vendor (and its other names), item, note or reference.
- **Filters** for date, status, receipt attached or missing, vendor, category, kind (expense, gift,
  sold, work, other), amount, attachments and discounts. Every filter shows a live count, and
  each active one shows as a tag you can remove.
- **Sort** by date, total or vendor, and show orders as **rows or cards with photos**.
- **Saved views** keep a search, filters, sort and layout. Save, rename, reorder, set a default
  view, highlight a view's count, and see them in the sidebar with live counts.
- **Work on many at once** - set a status, add a category, export or delete, with undo for status
  and category changes.
- **Export** what you see as a spreadsheet file (CSV, ready for a Danish spreadsheet).
- **Statuses** - Draft, Ordered, Delivered, Returned and Cancelled are built in. Add your own in
  Settings.

### One order

![One order, with its lines, details and totals](docs/order.png)

- Items with photos, quantities, prices and retail prices, so every line shows what you saved.
- Details: vendor, date, kind, status and its date, categories, reference and note.
- Totals: items, discount, shipping, total and saved.
- **Attachments** - receipts, photos and PDFs, in a viewer with zoom, swipe and every page of a
  PDF.
- **Leave out of statistics** - for an order that should be listed but not counted.
- **Duplicate, edit or delete.** A deleted order can be brought back from the message that follows.
- **While you edit:**
  - Lines can be reordered by dragging, duplicated, and given a photo (pasting works).
  - Category suggestions come from your own earlier orders.
  - A warning shows before a save takes a category over its limit. It never blocks the save.
  - Unsaved changes are never lost by accident.
  - A change made on another device is shown, and you choose which to keep.
  - A save made without internet is sent when the connection comes back.
- **Compare with the receipt** - when you add a receipt to a saved order, see every line that
  differs, pick the receipt or the order for each, and the order is marked as checked.

### Adding orders

![Start from a receipt, or from scratch](docs/new-order.png)

- **Scan a receipt** - drop a photo or a PDF (up to 25 MB). Spendly reads the vendor, date,
  currency, VAT, shipping, discount, total, order number and every line, and drafts the order.
  - Amounts are turned into prices with VAT included.
  - A receipt in another currency is converted at that day's rate.
  - The review step points at what needs a look, and lets you pick which lines to keep.
  - The kind of document sets the status: a receipt is Delivered, an order confirmation is Ordered,
    a return is Returned.
  - The vendor is found by VAT number, web address or name, and a new name it was printed with is
    saved as one of its other names.
  - A file that was scanned before is recognised, and you choose what to do with it.
- **Empty order** - type it in yourself.
- **Copy an order** - same vendor, same lines, today's date. Orders you repeat often are listed
  first.
- **Drafts** - an order you start is kept as a draft from your first change, so you can come back
  to it.
- **Import** - bring in many orders at once from a spreadsheet (CSV, XLSX or JSON). See
  [Settings](#settings).

### Search and keyboard

![All orders, filtered, with the search open](docs/all-orders.png)

- **One search for everything** - press Ctrl K (⌘ K on a Mac) or just start typing. It finds
  orders, vendors and items, offers "New order for ..." and "See ... in Statistics", lists what you
  opened last, and runs actions like scan, import or dark mode.
- **Keyboard shortcuts** - S scans, N starts a new order, G then O, T, V, C or S goes to Orders,
  Statistics, Vendors, Categories or Settings, and ? shows them all.
- **Paste a picture anywhere** and it goes where the page takes one.

### Statistics

![Statistics for the month, by day and by category](docs/statistics.png)

- **Periods** - 30 days, week, month, quarter, year or your own dates, with shortcuts for this
  month, last month, year to date and all time.
- **Count** expenses only, refunds only, or net of refunds, and compare with the same period a year earlier.
- **Figures** - total spend, orders, median order and saved, each with its change.
- **Charts and breakdowns** - spend over time, stacked by category; by category, status and vendor;
  spend against saving; and how each limit is doing.
- **Drill down** - click a month, a category, a vendor or a status to look closer, up to three
  steps, and open the orders behind any view.

### Budget

![The budget for the year, month by month](docs/budget.png)

- **A yearly plan** with income and costs, in groups and rows, with an expected amount for each
  month and the real amount once you know it.
- **Months or the whole year** - one month in front with what is left over and how much of the
  income is used, or the whole year as a sheet.
- **Start next year** as a copy of this one, or **import** a year from Excel.
- **Check a bank statement** - load your bank's CSV file and Spendly matches each payment against
  the budget, then saves the real amounts. The file is read in your browser and never sent
  anywhere. It works with any bank's export.

### Vendors and categories

![Vendors, with their orders and spend](docs/vendors.png)

![Categories, with this month against each limit](docs/categories.png)

- **Vendors** - search, sort, favourites first, archive, and merge two into one. A vendor has a
  picture, a colour, other names it matches on receipts, default categories, and "Leave out of
  statistics" for one-off shops. **Possible duplicates** are found by name or VAT number.
- **Categories** - favourites first, an icon from a large library, a colour, and a **monthly limit**. Each row shows
  this month against its limit. Spendly warns you when a limit you type would have been passed in
  most of the last 12 months.
- **Category suggestions** come from a small language model that runs on your own server and
  learns from your own orders.

### Bookmarks

![Bookmarks: things worth buying later](docs/bookmarks.png)

- Things worth buying later, with a link, name, price, categories and a picture.
- Paste a link and Spendly reads the page's name and picture for you.
- Search, filter by category, sort, archive.

### Settings

![Settings](docs/settings.png)

- **Account** - name, picture, password, and **passkeys** (fingerprint, face or device PIN).
- **Status email** - a weekly or monthly summary of spending, saving, limits, your latest orders and bookmarks.
- **Appearance** - light, dark or follow the system; comfortable or compact rows.
- **Money, dates and times** - currency (DKK, SEK, NOK, EUR, USD, GBP) and date format.
- **Defaults** for a new order, **lists** (page size, sort, how many saved views and recent
  orders), **limit alerts**, and which **Needs a look** rules show on Home.
- **Statuses** - add, rename, colour and reorder your own.
- **Import** orders from CSV, XLSX or JSON: map the columns, review totals and possible
  duplicates, download skipped rows, and undo an import for 24 hours. A template is included.
- **Demo data** - fill an account with realistic orders to try Spendly out.
- **This build** - the installed version, and "Update and reload" when a newer one is ready.

### Light, dark and phone

![Home in dark mode](docs/dark.png)

<img src="docs/phone.png" alt="Home on a phone" width="393">

- **Dark mode** everywhere, switched from the sidebar, search or Settings.
- **On a phone** - a tab bar for Home, Orders, Statistics and More, sheets from the bottom for
  filters and choices, full-screen pictures, and touch-sized controls. Add Spendly to the home
  screen and it opens like an app.
- **Every page remembers where you were**, scroll position included.

### Accounts and security

- **Sign in** with a password (at least 12 characters, with a strength bar) or a passkey. "Stay
  signed in" lasts 30 days.
- **Email confirmation** and **password reset** by email. You get an email when your password
  changes or a passkey is added.
- **Changing the password** in Settings signs out every other device. A **password reset** signs
  out every device and removes every passkey.
- **Adding a passkey** asks for the password first.
- **After 5 wrong passwords** in 15 minutes from one device, signing in to that email from that
  device pauses for 5 minutes. Each device also has a limit on how often it can try to sign in,
  register or ask for a reset email.
- **If your session ends** while you work, you sign in again on top of the page, and nothing you
  typed is lost.
- **Pictures are cleaned** of location and device details when they are uploaded.
- **Nightly backup** - just before midnight the server keeps a copy of the database, and keeps
  the newest five.

## Running it

Spendly is one container. [`docker-compose.yml`](docker-compose.yml) runs it on a home server with
HTTPS in front ([Caddy](https://caddyserver.com/)) and automatic updates when a new version is
published ([Watchtower](https://github.com/nicholas-fedor/watchtower)). It also answers plain http
on port 4000 on the home network, for a device that does not trust the certificate. Every setting
in it has a note that says what it does.

```bash
docker compose up -d
```

Then open the address you set, and create the first account.

**Your data is one folder.** The database lives in the folder mounted at `/data`. Back up that
folder and you have backed up Spendly.

**Some features need a setting on the server.** Everything else works without them.

| Setting | Turns on | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Reading receipts, and the light-bulb button that suggests categories (it can propose a new one) | The receipt is attached and you type the details yourself. |
| `SPENDLY_SMTP_*` and `SPENDLY_PUBLIC_URL` | Email confirmation, password reset, the status email | New accounts are confirmed at once, and email features are hidden. |
| `SPENDLY_PUBLIC_URL` | Passkeys, and the links in emails | Passkeys are not offered. |
| `SPENDLY_UPDATER_URL` and `SPENDLY_UPDATER_TOKEN` | "Update and reload" in Settings, for the person who manages the server | Settings can only check for a newer version. |
| `SPENDLY_OWNER_EMAIL` | Which account manages the server and may install updates | The first account made on the server. |
| `SPENDLY_SECURITY_CONTACT` | A `security.txt` page with where to report a security problem | No such page. |
| `SPENDLY_TERMS_URL` and `SPENDLY_PRIVACY_URL` | Your own terms and privacy notice | The built-in pages are used. |
| `SPENDLY_PDF_READING` | How a PDF is sent to be read: `text` (default), `pictures` or `document` | Text. |

A receipt in another currency is converted with rates from
[frankfurter.dev](https://frankfurter.dev). Without internet access to it, the receipt keeps its
printed amounts.

## Stack

| Part | Built with |
|---|---|
| The app | [React 19](https://react.dev), [React Router](https://reactrouter.com), built with [Vite](https://vite.dev) |
| Icons | [Tabler Icons](https://tabler.io/icons) |
| The server | [Node.js 22](https://nodejs.org) and [Express 5](https://expressjs.com) |
| The database | [SQLite](https://sqlite.org), through [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Reading receipts | [Claude](https://www.anthropic.com/claude), through the Anthropic API |
| Category suggestions | A small language model, run on the server with [Transformers.js](https://huggingface.co/docs/transformers.js) |
| PDFs and pictures | [MuPDF](https://mupdf.com) and [sharp](https://sharp.pixelplumbing.com) |
| Passkeys | [SimpleWebAuthn](https://simplewebauthn.dev) |
| Email | [Nodemailer](https://nodemailer.com) |
| Shipping | [Docker](https://www.docker.com), built and published by GitHub Actions |
| Design | A design system of its own, in [`design/`](design/), made with Claude Design |

## How it is built

- **One container.** The server serves the built app and the API from the same address. The image
  is built in stages: the app, the server's packages, and the language model are each built
  separately and copied into a small final image.
- **The app** loads each page when it is first opened, keeps every request in one place, and
  shares one cache across pages, so a count in the sidebar follows a change made on another page.
  Files are compressed ahead of time, and the server sends the smallest one the browser accepts.
- **The server** keeps each account's records apart in every query. Totals and counts are kept on
  the record by the database itself, so lists and statistics read them for free.
- **Every change that lands on `main`** runs the checks below, then builds and publishes a new
  image. A server running Watchtower picks it up by itself.
- **The checks:**
  - The design system's rules, held against the app's own code.
  - The query plan of every statement the server runs, against an account of real size.
  - The bank statement reader, against example files.
  - The icon library, against its source.
  - Comments, external links, and the security of every package.

The app's own [README](react/README.md) goes deeper: routes, the shell, data, the build and
measurements.

## Working on it

| Folder | What it is |
|---|---|
| [`react/`](react/) | The app: every page you see. |
| [`api/`](api/) | The server, the database and its migrations, and the background jobs. |
| [`design/`](design/) | The design system: every screen and component, and the rules below. |
| [`docs/`](docs/) | The screenshots on this page, rendered from the running app. |
| [`CLAUDE.md`](CLAUDE.md) | The rules for working in this repository: how to check a change and what counts as done. |
| [`later.md`](later.md) | Known small faults and things to look at again. |

Run it on your own computer with two terminals:

```bash
cd api && npm install && PORT=4000 npm run dev
cd react && npm install && npm run dev
```

Open http://localhost:5173, create an account, and fill it from Settings, Demo data.

The screenshots on this page are made by `react/scripts/regen-docs.mjs` from the running app.

## The design system

The design system lives in [`design/`](design/), and it is the specification for every screen.
Start with [`design/README.md`](design/README.md) and [`design/PROJECT-RULES.md`](design/PROJECT-RULES.md),
then `design/index.html`, the map of every page.

- **Screens.** Each `*.dc.html` page draws its screens with an id (`1a`, `2b`, ...) and notes
  beneath them. The markup is the specification: the classes and the order of the elements are
  what the app builds, and the notes say what the drawing cannot show.
- **Components.** `design/Components.dc.html` draws every component once, with its states. A
  component looks the same on every screen that shows it; a variation is a named state of that
  component, never a second version.
- **Values.** `design/styles/tokens.css` holds every colour, size, radius and spacing value;
  `design/styles/components.css` holds every component rule; `design/styles/pages/*.css` holds
  each screen's own layout and nothing else.
- **Limits.** `design/styles/COMPONENT-STATUS.md` says what is settled and what the limits are.

Where the design shows something the app cannot do yet, the app leaves it out rather than drawing
a control that does nothing.

### The rules the app is held to

- Spacing comes only from the scale: 6, 8, 10, 12, 14, 16. Card to card is 12. Inside a card, 6
  between the lines of one thing and 8 between separate things, unless a drawing says otherwise.
- A settled value (type, colour, radius, spacing, a component's size) is not changed to make
  something fit. A look the components cannot express is a gap in the system, added to the
  system first.
- Every variant is a named choice from a closed set. Colour is a separate choice from structure.
- A fade is one of a few named strengths, one for each meaning. A faded part is at full strength
  while a list or a menu inside it is open.
- After Save, a field shows the saved value at once and never the old one, not even for a moment.
- Anything that can be derived is derived: a vendor's initials and colour from its name, an icon
  button's name from its icon.
- A saving is always an amount (`Saved 1.320,00 kr.`), green above zero and grey at zero, never a
  percentage.
- A typical order is the median, never the average, so one very large order barely moves it.
  Totals and breakdowns stay sums.
- An order left out of statistics is still listed, searched, filtered and exported, but no spend
  figure, chart, breakdown or limit counts it, on any page. A copy of it is a new purchase and
  starts counted.
- A filter over amounts is spaced by how many orders fall along it, not by kroner, and its top end
  reads as "and above".
- A chart whose labels do not all fit labels its first and last bar and evenly spaced bars between,
  with at least 48 clear between two labels. A label is one line, centred under its bar.
- Copy uses plain hyphens and straight quotes, no decorative emoji, and plain words a
  non-technical reader understands. Explanations of how the design works live in the notes,
  never on the screen.
- The area for things worth buying later is called Bookmarks, everywhere.
