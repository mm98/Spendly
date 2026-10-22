# React components from the library

25 files, grouped by what a component belongs to:

    Button.jsx        Button, IconButton
    Card.jsx          Card, CardHeader, Cards, CardBody, Toolbar, ListFooter
    Chat.jsx          ChatFiles, ChatFile, ChatChart, ChatShares
    Chip.jsx          Chip
    Choice.jsx        Check, Radio, Switch, Choice, FieldGroup, Picker
    Combobox.jsx      Combobox, ComboboxOption, ComboboxGroup, ComboboxEmpty
    Data.jsx          Gauge, GaugeKey, Bars, Plot, Stat, Sum
    DatePickers.jsx   RangePicker, PeriodPicker, Calendar, DateField
    Field.jsx         Field
    FileDrop.jsx      FileDrop
    Inputs.jsx        TextField, PasswordField, NumberField, SearchInput, RangeSlider, TokensField
    LineEditor.jsx    LineEditor
    List.jsx          Caption, Selected, ListHead, ListRow, Foot, ListCell, List
    ListItem.jsx      ListItem, Insertion, ListItemRemove
    Mark.jsx          Mark, MarkRemove
    Overlays.jsx      Menu, MenuItem, MenuLabel, MenuSeparator, Popover, Anchor,
                      Dialog, DialogTitle, DialogBody, DialogActions,
                      Toast, ToastUndo, Alert
    Touch.jsx         TabBar, TabBarItem, Sheet, SaveBar
    Pill.jsx          Pill
    Segmented.jsx     Segmented
    Shell.jsx         Shell, TopBar, ShellContent, Sidebar, SidebarBrand,
                      SidebarGroup, SidebarGrip, SidebarDivider, NavItem, Scrim
    Stepper.jsx       Stepper
    Utilities.jsx     Stacked, Line, Kbd, Empty, EmptyTitle, EmptyBody, Skeleton, Spinner,
                      AddRow
    Well.jsx          Well
    format.js         formatNumber, parseNumber, round
    variants.js       join, pick, reject

Two rules decide the grouping. A component lives with the thing it is part of - a
card's header with the card, a phone's bars with the phone - and a piece used by
three of them lives in `Utilities.jsx`, which is why `Stacked` and `Kbd` are there
rather than in the first file that happened to need them. Nothing is grouped by
being small.

`DateField` is the one that looks misplaced and is not: it needs the date engine
the calendars are built on - the parser, the reader's own format, the typed-text
hook - so it sits with them rather than with the other fields. Exporting five
internals to move one component is worse than the move.

`React components.dc.html` renders every one of them from these files - it fetches
each, strips the module syntax, and evaluates it against React with three stand-ins
(the router link, the app's `Icon`, React's hooks). Nothing is redrawn there, so a
prop set that drifts from the library shows up as a broken specimen.

## What is exported, and what is not

Exported: what a page composes - a control, a surface, or a part a page puts inside
one (`Stacked`, `ComboboxOption`, `ToastUndo`, `Insertion`). Not exported:
what only the components need - `Box` and `Trailed` behind the text fields,
`Month` behind the two calendars, `useDateText` behind every date field,
`standardRanges`, `decimalSeparator`. Every export is used by another file; the
audit that closed `Month` and `decimalSeparator` also found `Dialog` drawing its
own scrim markup instead of using `Scrim`, which is why nothing referenced it.

## A field's size never follows its own content

A field takes the width its container gives it and holds it - the reader typing
must never move the box, or the layout shifts under their hands. So nothing about a
field's size may be conditional on its value: the search field reserves the trail's
room whether or not the clear is in it, the facet chip reserves its selected width,
and the segmented control measures its labels at their selected weight. Verified by
measuring all 35 fields empty and filled, not by reading the CSS - the search
field's own regression was invisible in the rules, because the padding that came and
went was applied by a class the component chose from the value.

A field handed a value it cannot read draws itself empty. It never throws: the date
helpers return null rather than an Invalid Date, since one component crashing takes
the whole page with it.

## A glyph that is never a choice belongs to the component

Five of them were required props, and a caller who left one out got a blank button
with no error: the stepper's `minus` and `plus`, the combobox's `chevron`, a chosen
option's `check`, a token's `remove`, and the password field's `reveal` / `hide`.
Every call site in the library passed the same glyph to each - `minus`, `plus`,
`chevron-down`, `check`, `x`, `eye` - which is the proof that none of them was a
decision. They are the components' own now, on the rule the search field already
followed: a search field with a different lead is not a search field, and a stepper
whose buttons are blank is not a stepper.

What stayed a slot is what a page genuinely decides: a `Card`'s and a `ListItem`'s
chevron, since only some cards and rows go somewhere; a `Mark`'s `remove`; and a
`Field`'s `lead`, `trail`, `kbd` and `chevron`, which say what the control inside
it carries.

Worth knowing about the password field: the register has `eye` and no struck-through
counterpart, so the control states which way it is through `aria-pressed` and its
label rather than through a second glyph. It read the same either way before, since
both props were passed `eye`.

## An icon is always passed as an element

Every slot in this library takes the glyph itself, not its name: `Combobox`'s
`lead`, a `Field`'s `lead` and `trail`, a `Mark`'s `text`, a `ListItem`'s
`chevron`, `Button`'s `iconStart` and `iconEnd`. `IconButton` accepts either - an
element, or a name string, which was its first form - so a shared-component pass
cannot silently render an empty box by passing one where the other was expected.
That is exactly what happened when the date field's trail and the token field's
remove were first moved onto `IconButton`.

## A component uses the other components

No component redraws another's markup. The date pickers' quick ranges are `Chip`,
their foot is two `Button`s, their calendar trail is an `IconButton`; the token
field's values are `Chip` with a `trail`; the list's search is `SearchInput`, which
carries that box itself; `Dialog` uses `Scrim`. The audit that found those also found
the reverse defect - a component whose offer was a caller's to leave out - so
`RangePicker` now owns its quick ranges, its day count and its Cancel/Apply pair,
and a call site can only replace the ranges, never remove them.

Two places keep their own markup on purpose, each with the reason written beside it:
a token is a chip carrying a control, which the chip component takes as `trail`
rather than as children; and the date field's input is a raw box because the shared
date-typing behaviour already owns its `value`, `onChange` and `onKeyDown`, so a
`TextField` around it would fight it for all three.

## The shape, in five rules

**Every variant is a named prop with a closed set of values.** Not a `variant`
string the caller assembles, and not a class name passed in. An unknown value is
reported, because the alternative is a class with no rule behind it and a control
that looks a weight it is not.

**Two axes, never one.** A variant is structure and rides in the class; a colour is
values and rides in `data-color`. One vocabulary for the whole system - `primary`
is the default and carries no attribute, then `warning`, `danger`, `success`. That
is why there is no `secondary-destructive` anything: a fourth colour costs one rule
and works at every variant.

**The sets are read out of the stylesheet, never typed from memory.** Scanning
`components.css` for each family's rules is how the missing attention states, the
unreachable `sp-field__chevron` and `sp-card__chevron` turned up, and it is how the
remaining components will be derived.

**No custom styling reaches the control.** There is no `className` and no `style`.
A look the props cannot express is a gap in the design system: it gets drawn in
`Components.dc.html`, given a rule in `components.css`, and added to the set in the
component. A one-off style at a call site is invisible to the design system and to
`styles/check.js`, and it is how a component ends up with two implementations.

**Tokens stay the value layer.** No component states a colour, a size, a radius or
any other measurement - not in code and not in a comment. `tokens.css` holds them,
`components.css` consumes them, the components name neither. A measurement written
in two places disagrees in two places.

## What the components decide

`Button` / `IconButton` - `to` renders a react-router link with `data-go`, `href`
an anchor, neither a real button. A control that goes somewhere is a link, one that
acts in place is a button. `IconButton` requires `label`.

`Mark` - `size`, `fill` and `swatch` are independent; a swatch outside a filled
mark is reported. A document is a mark too: `fill="none"` with a file glyph. `onClick` makes it a button, `as="label"` wraps a file input.

`Chip` - the facet variant reserves its selected width so selecting does not move
its neighbours, and works controlled or uncontrolled.

`Pill` - a state, never a control, so it renders a span and takes no handler.
`progress` is `data-state`, not a colour: in flight is not in trouble.

**One box, five fields.** `Inputs.jsx` has an internal `Box` that owns what every
text field repeated - the class, `error` becoming `aria-invalid`, the value wiring,
and refusing a `className` - plus a `Trailed` helper for the wrap and slot a
password, a date and a search all need. Each field is then only what makes it that
field: a type, a slot, a format. Only where it earns it: the boxes, the segmented
control, the stepper and the pickers are not bordered text fields and keep their own
markup.

**The inputs are controlled, and none of them takes a colour.** `value` and
`onChange`, no internal copy: the draft is the single source of truth, and a control
holding its own copy is how a field silently disagrees with what gets saved. An
error is a boolean and a message, never a variant, so the red state cannot be
applied for decoration. That is the library's own API rule, from Input types 14a.

**Numbers are written the reader's way.** `1.320,00` is not something a native
number input can render - its value is always dot-decimal - so an amount is a text
input with a decimal input mode: formatted on blur, either separator accepted while
typing, and the value stays a number. `format.js` holds the formatting and parsing;
the locale is an argument and defaults to the browser's. A stepper whose `step` has
decimals switches to the same kind of input for the same reason, and every step is
rounded to the decimals the step implies, since 0.1 three times is
0.30000000000000004 in binary floating point.

**A native control's own glyphs are the only ones in the design that are not from
the register.** A date field's black calendar and a search field's grey clear are
suppressed in `components.css`, and the field's trail carries the register's icon,
which opens the same platform picker. Worth knowing: a DOM-snapshot screenshot
re-renders those pseudo-elements from the UA sheet, so a capture can show the native
glyph even where a real browser does not - check it in the live view, not in a
screenshot.

**One cell group, two kinds of cell.** `Picker` is the swatch group and the icon
group: pass `swatches` or `icons`. A colour group may also offer a custom colour,
which is the one place a native colour input is right - it brings the platform's own
picker.

**A live position is the one thing a class cannot carry.** `RangeSlider` writes its
percentages into the rail's own custom properties, because no stylesheet can have
seen the value. That is a measurement, not a look - the component still sets no
colour, size or radius, and the rail's rules draw it.

`Check` / `Radio` / `Switch` - each box is the input itself, restyled, so hover,
focus, checked, indeterminate and disabled are the element's own states and the
control works in a form with no JavaScript. A switch applies at once and a checkbox
waits for the save, which is why they are two controls rather than one with a
variant.

`Segmented` - radios in a shell, so the arrow keys work; each label is measured at
its selected weight so the row does not shift as the pick moves. Past four options
the component says to use a Combobox.

`Stepper` - an uncontrolled stepper cannot disable its buttons at the bounds, since
it cannot see its own value; passing `min` or `max` without `value` is reported.
Inside a `Field` with a text label it takes its name from the label: the label names
the value input, and the two buttons read "One step fewer Quantity" and "One step
more Quantity" from the same text, so the page writes `<Field label="Quantity">
<Stepper /></Field>` with no `aria-label`. Outside a Field, or under a label that is
not plain text, it takes `aria-label`, and a stepper with neither is reported.
`Stepper.fieldLabel` is what asks `Field` for the text; no other control sets it.

`FileDrop` - a label around a real file input: the click, the keyboard and the
platform picker all work with no script, and on a phone that picker offers the
camera, which is why there is no separate Take a photo control.

`Menu` / `Popover` / `Dialog` - three promises rather than three sizes. A menu item
acts on click and closes; a popover waits for Apply; a dialog interrupts and cannot
be answered by ignoring it.

`Toast` takes its `ToastUndo` as a child rather than an `undo` prop, and finds it the
same way. The message is whatever else it holds.

`Dialog` takes its parts as children - `DialogTitle`, `DialogBody`, `DialogActions` -
rather than a `title` string and an `actions` array. The order on the page is the
order in the call, the action row spaces its own buttons, and a button cannot be
passed where a sentence goes. The dialog reads which child is the action row and
puts the rest above it, each part straight in `.sp-dialog` and 12 apart, as drawn, the same way `MenuItem` reads which of its children is a
submenu. Plain words handed straight to the dialog are wrapped as the body, so the
common case stays one sentence. A dialog with no `DialogActions` is reported.

`Toast` / `Alert` - a toast reports what already happened and takes itself away; an
alert states a condition that persists and stays until the condition does.

`List` / `Table` - the list is a surface, not a renderer. Its body is a table where
rows must align, a column of rows where each stands alone, or a grid of record
cards. Exactly one column states no width and the component says so if that is not
true: in a fixed table the unstated column absorbs the slack.

`DateField` - drawn on desktop, native on touch, and the surface decides rather
than the caller: the field looks for a `.sp-touch` ancestor. On a phone the
platform's picker beats anything drawn; on a desktop it is a small dark dropdown
nobody can style, so the field opens the library's own calendar. On desktop the date
can also be typed, in the reader's own format, and every value in and out is an ISO
date.

`Month` / `RangePicker` / `PeriodPicker` - one month grid, used three times: the
date field's dropdown, the range's two months, and the phone's sheet. The weekday
order comes from the locale, so a week starts where the reader thinks it does, and
the range is backed by its two fields as well as the calendar - one `value` of two
ISO dates, so the fields and the grid cannot disagree.

**A month shows the days either side of it.** The cells before the first and after
the last are the neighbouring months' real days, drawn faded and pickable - a reader
looking at the start of August sees 31 July where 31 July belongs. They never hold
the tab stop, and walking the keyboard into a day the picker already shows does not
move the months: only a day that is nowhere on screen does.

**The weeks are named where the reader names them.** Every month numbers its rows
with their ISO week under a `W` at the column's head - the number on their own
invoices and delivery notes, so a month that hides it makes them count. It is
`showWeeks` on `Month`, `DateField` and `RangePicker`, on by default, and the
column is a variant class so the library's own static pages are unchanged.

**The calendar takes the keyboard.** It is a real grid - rows of gridcells with one
day in the tab order - so the arrow keys walk the month instead of the reader
tabbing through 31 buttons. Arrows move a day and a week, PageUp and PageDown a
month, with Shift a year, Home and End the ends of the week; Enter picks; Escape
closes and returns focus to the trigger; clicking away closes it. Every day carries
its full date as its label, today is `aria-current="date"`, the chosen day is
`aria-selected`, and a day outside `min` or `max` is disabled rather than missing.
The two months of a range share one tab stop, so walking off the end of one moves
into the other rather than trapping the reader.

`Shell` / `Sidebar` - the shell is a grid of two tracks, and collapsing it is a
track width rather than an animation: an animated track reflows every card beside
it on every frame. The rail is the same sidebar at its narrow width.

`Gauge` / `Bars` / `Plot` - a measurement is the one thing a class cannot carry, so
these write their own width and height. Nothing in them sets a colour, a size or a
radius.

`Combobox` - the choosing control, never a native select: an option carries a status
dot, a mark, a meta value and a check, none of which a native option can hold. The
native select's rules had no uses on any page and are retired. Open state is
controlled or held by the component.

**`Field` takes any control in the library, and picks the right HTML for it.** That
is what a `<label>` does in plain HTML, and a caller should not have to reach for a
different component per control. Three cases, and the control says which it is
through `fieldRole` on the component - the control is what knows, and stating it
there costs `Field` no import and no load order:

- a **value** you type or pick - TextField, NumberField, Combobox, Stepper,
  TokensField, DateField, FileDrop - takes a label above it, bound by a generated id.
- a **box** - Check, Radio, Switch - takes its label beside it, inside a `<label>`
  that wraps it, because the text is the thing you click. `Field` renders a `Choice`
  around it rather than stacking a bare box under a heading.
- a **set** of inputs - Segmented, Picker, RangeSlider - takes a legend, because a
  `<label>` can only point at one control. `Field` renders a `FieldGroup`, and the
  message describes the set rather than any one input in it.

Seven controls used to swallow the generated id: `Combobox`, `Stepper`,
`TokensField` and `FileDrop` spread it onto their root element instead of the
focusable one, so the label's `for` resolved to nothing and no error was raised - the
field's central promise, quietly broken in half the library. Each now puts it on the
element that takes focus: the trigger or the search input, the value input, the add
input, the file input. Found by building each combination in the playground and
measuring where `for` pointed, which is what it is for.

`Field` - owns two things the caller should not repeat. The input's padding follows
its slots, so passing `lead` / `trail` / `unit` is enough. The message's colour
travels to the input: a blocking message makes it `aria-invalid` and describes it,
a warning colours it and does not.

`Card` - the footer takes the actions rather than the caller building it: one fills
the width, a pair splits it into equal halves, a third is reported as a menu rather
than laid out.

`CardHeader` - a card's name is always in one. It is only a child of `Card`, which
renders it first wherever it was written; anywhere else, including nested inside a
card's content, it renders nothing and reports the call. It renders `.sp-card__head` and nothing else renders that
class. Every view a head has is a named slot with one place: `name`, then `meta` beside
it; at the right end `aside` (with `asideTone` default / note / danger), `control`,
`status`, `actions` (at most two, always the small outline button) and `onDismiss`, in
that order. It takes no children, so a head cannot be assembled by hand.

`ListItem` - one row for every list in the product. It was two components, one for
an editable set and one for everything else, until the two were compared: they
differed by one shade of ground and 2px of radius. What varies is what the row
carries - a handle, actions, a count, a chevron - not the row. A row that can be
acted on renders a button or a link and gets the element's own hover and focus; a
row that only states something stays a div.

## Still to do

- The remaining components: the record card, the palette, the viewer, the facet
  rail, the drill crumbs, the source view and the phone frame.
- The list's own responsive switch: which body it shows is a question about the
  list's width, so the container query belongs to the List rather than to a page.
  Still unbuilt - it needs your word on whether the list renders both bodies.
- Input types 14a is now stale in three places: it says a button takes
  `level (primary / secondary / ghost / destructive)`, a chip takes
  `tone (accent / neutral / amber)`, and a mark's sizes are `inline / row / form`.
  All three were settled differently since - variant and colour as separate axes,
  one colour vocabulary, sizes named as sizes - so that page needs a pass.
- The list's own responsive switch: which body it shows is a question about the
  list's width, so the container query belongs to the List rather than to a page.
- The line editor, which is a form rather than a row and kept its own name.
- A gap list: what the product does that this design has not drawn. Charts beyond
  the bar plot, the favourite tiles, pull-to-refresh. Each gap is a design decision
  that will otherwise be made in code.

`Icon` is imported from `./Icon.jsx`. The library's icons are Tabler outline, which
is what that component already reads.

`ChatFile` - one row for a file, in an answer and on Files alike. Its second line is
derived from `state` rather than passed, so a file that could not be made cannot read
as ready: `ready` shows the type and size, `making` the type and Being made with the
spinner in Download's place, `failed` the reason in the red ink, `gone` Deleted or
Removed after 30 days. The title is the question only; the time it was asked is in the
downloaded file's name, which the server sets. `onDelete` adds Delete, on Files only.

`ChatChart` - the frame and the name an answer's chart sits under. The chart is the
library's own `Bars`, or the app's Donut and Shares inside `ChatShares`; there is no
smaller chart.

`Bars` - a column that cannot be clicked may carry `label` and `readout`: the name a
screen reader reads, and the chart tooltip it shows on hover, focus or a tap. `open`
is the column a finger tapped. In an answer no column drills in, so this is how its
amounts are read.

`Bars` - a column may carry `from` and `to`, the first and last day it counts, and
`onSelect` reports `(key, from, to)`. One end without the other is reported: a period
is the pair, the same rule `RangePicker` holds to.

`SearchInput` is the only search field. There was a second export, `ListSearch`,
which was this control inside `.sp-picker__search` - and nothing else. Two names for
one control is a defect on its own: a developer reading the list could not tell which
to reach for, because at the call site they took the same props and rendered the same
field. It was worse than a coin toss, since React drew two nested boxes where the
design draws one. All 64 drawn search fields are that single box holding a lead and
an input, so the box belongs to the control, and the container sizes the field through
it without the field knowing which container it is in.

**One word per object, in the components and in the stylesheet.** The sidebar's
exports were `ShellMenu`, `ShellMenuBrand`, `ShellMenuGroup`, `ShellMenuGrip`,
`ShellMenuDivider` and `ShellMenuItem`, while the rules they render are
`.sp-sidebar`, `.sp-sidebar__brand` and `.sp-nav-item`. Two vocabularies for one
object means neither finds the other: searching `components.css` for `ShellMenu`
returns nothing, searching the exports for `sidebar` returns nothing, and a
developer has to already know they are the same thing. They are now `Sidebar`,
`SidebarBrand`, `SidebarGroup`, `SidebarGrip`, `SidebarDivider` and `NavItem`,
which is what the stylesheet calls them. `styles/check.js` asserts it.

**Nothing is named for a device.** `PhoneTopBar` and `PhoneSaveBar` named a screen
size, which promises one device and forbids the next, and neither matched the thing
the library actually switches on - `touch`, which is a prop and a class
(`.sp-touch`), not a phone. The top bar is one `TopBar` with `touch`; the save bar
is `SaveBar`; and `Phone.jsx` is `Touch.jsx`. `styles/check.js` asserts no export
name carries a device word.

**A group of controls is `FieldGroup`, and there is one of it.** It was `Choices`,
which named checkboxes and radios while nothing in it was choice-specific - it is a
legend over any set of controls, and the library already used it for a segmented
control and a pair of bounds. It is not `Fieldset` either: that names the tag it
renders rather than the job it does.

Folding the filter rail's groups into it was the larger half. `.sp-fieldset` and
`.sp-facet` were the same rule twice over - same reset, same axis, same 8px gap,
same `--t-12`/600 legend - separated only by `min-width: 0` and a head that carries
a count. One `.sp-field-group` now, at the field's 6px gap, with the count and the
Show-more as its own parts. A `Field` is still separate: it labels one control and
binds the label to it by id, which is what having one control rather than several
allows.
