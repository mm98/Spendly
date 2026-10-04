# Spendly

Personal receipt and order tracking for one person: capture a receipt, keep the order and its
lines straight, see what it added up to per month, vendor and category, plan the year in a
budget, and keep a list of things worth buying later.

![Home](docs/home.png)

## The design system

The design system lives in [`design/`](design/), and it is the specification. Start with
[`design/README.md`](design/README.md) and [`design/CLAUDE.md`](design/CLAUDE.md),
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

## The rules the app is held to

- Spacing comes only from the scale: 6, 8, 10, 12, 14, 16. Card to card is 12. Inside a card, 6
  between the lines of one thing and 8 between separate things, unless a drawing says otherwise.
- A settled value (type, colour, radius, spacing, a component's size) is not changed to make
  something fit. A look the components cannot express is a gap in the system, added to the
  system first.
- Every variant is a named choice from a closed set. Colour is a separate choice from structure.
- Anything that can be derived is derived: a vendor's initials and colour from its name, an icon
  button's name from its icon.
- A saving is always an amount (`Saved 1.320,00 kr.`), green above zero and grey at zero, never a
  percentage.
- Copy uses plain hyphens and straight quotes, no decorative emoji, and plain words a
  non-technical reader understands. Explanations of how the design works live in the notes,
  never on the screen.
- The area for things worth buying later is called Bookmarks, everywhere.

## The app

![All orders, filtered, with the search open](docs/all-orders.png)

![The order list with its filters and saved views beside it](docs/order-list.png)

The app in [`react/`](react/) builds these screens on the API in [`api/`](api/). Its own
README says how it is put together and how to run it. Where the design shows something the app
cannot do yet, the app leaves it out rather than drawing a control that does nothing.

<img src="docs/phone.png" alt="The phone" width="393">
