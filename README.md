# Spendly

A personal ledger for what you buy. Capture a receipt, keep the order and its lines straight, see
what it added up to per month, vendor and category, plan the year in a budget, and keep a list of
things worth buying later.

Spendly runs on your own server. Each person has their own account, and nobody sees another
account's records.

![Home](docs/home.png)

## What it does

- **Orders.** Every purchase is an order with a vendor, a date, a status and its lines. Attach the
  receipt, a photo or a PDF, and compare the order with it side by side.
- **Scan.** Drop a receipt and Scan drafts the order for you: vendor, date, lines and prices. You
  check it and save. Without a scanning key, the receipt is attached and you type the details.
- **Lists and search.** Filter orders by vendor, category, status, date and amount, save a filter
  as a view, search everything at once, and export what you see as a spreadsheet.
- **Statistics.** Spend per month, vendor and category, with limits that warn you before you go
  over them.
- **Budget.** Plan the year per category, and check a bank statement against what you planned.
- **Vendors and categories.** Each with its own page and its orders. Mark favourites to find them
  first.
- **Bookmarks.** Things worth buying later, with a price and a link.
- **Import.** Bring in orders from a spreadsheet file. A template shows the columns.
- **Status email.** A weekly or monthly summary by email, if you want one.
- **Your formats.** Currency, dates and numbers in your own format, light or dark, on a computer or
  a phone.
- **Signing in.** A password or a passkey. Forgotten passwords are reset by email.

![All orders, filtered, with the search open](docs/all-orders.png)

![The order list with its filters and saved views beside it](docs/order-list.png)

<img src="docs/phone.png" alt="The phone" width="393">

## Running it

Spendly is one container. [`docker-compose.yml`](docker-compose.yml) runs it on a home server, with
HTTPS in front and automatic updates when a new version is built. Every setting in it has a note
that says what it does.

- **Your data is one folder.** The database lives in the folder mounted at `/data`. Back up that
  folder and you have backed up Spendly. Spendly also keeps a copy of the database each night,
  and keeps the last five.
- **Scan needs a key.** Without one, everything else works and receipts are typed in by hand.
- **Email needs a mail account.** Without one, email stays off: no confirmation emails, no password
  reset, no status email.

## Working on it

| Folder | What it is |
|---|---|
| [`react/`](react/) | The app: every page you see. Its README says how it is built and how to run it. |
| [`api/`](api/) | The server the app reads and writes through, and the database. |
| [`design/`](design/) | The design system: every screen and component, and the rules below. |
| [`docs/`](docs/) | The screenshots on this page, rendered from the running app. |
| [`CLAUDE.md`](CLAUDE.md) | The rules for working in this repository: how to check a change and what counts as done. |
| [`later.md`](later.md) | Known small faults and things to look at again. |

To run it on your own computer, start the server in `api/` and the app in `react/`, each with
`npm install` and then `npm run dev`, and open http://localhost:5173.

Every change that lands on `main` runs the checks and builds a new version of the container.

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
