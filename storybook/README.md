# Storybook

The components in `react/src/components`, one by one, drawn by the app's own code with the app's own
styles. Nothing here is copied: a story imports the real component, so a change to a component shows
here at once.

It has its own packages, and the app does not import anything from it. The Docker image builds it
and the server serves it at `/storybook`, only to someone signed in.

## Running it

`react/` has to be installed first, since the stories use its React, its router and its styles.

```bash
cd react && npm install
cd ../storybook && npm install && npm run dev
```

Open http://localhost:6006.

| Command | What it does |
|---|---|
| `npm run dev` | Storybook on port 6006, updating as files change. |
| `npm run build` | The whole catalogue as static files in `dist/`. CI runs this. |
| `npm run check` | Fails when a component file has no story, or a story file names no component. CI runs this. |
| `npm test` | Opens every story in Chromium and runs its tests (below). CI runs this. |
| `npm run design:check` | Fails when a component file is not the same code as its copy in `design/react_handoff`. CI runs this. |
| `npm run props:check` | Fails when a page gives a component's prop the wrong kind of value. CI runs this. |

`npm test` needs Playwright's Chromium once: `npx playwright install chromium`.

## The toolbar

- **Theme** switches light and dark, the way the app's own setting does.
- **Viewport** switches Phone (an iPhone 15, 393 wide) and Desktop (1440 wide). Below 640 wide the
  components get the phone shape, exactly as in the app: menus become sheets from the bottom,
  dialogs become sheets, and so on.

A story that only exists on one size holds the viewport at that size: the order table and the
desktop shell at Desktop, the phone shell and the phone date sheet at Phone.

## The panels

- **Controls** changes a story's props while you look. Each prop's kind comes from the type comment
  above its component (a number box, a switch, a text box, or a choice of the values the component
  accepts). A prop that holds drawn parts has no control, since there is nothing to type into it.
  Controls and the props table show only what changes how the part looks. Plain HTML attributes
  (`id`, `name`, `role`, `aria-*`, `data-*` and the like), handles on an element and handlers are
  left out of both; a handler's calls still show in Actions. `name` stays where the part draws it
  as text: the list is `DRAWN_NAME` in `.storybook/types.js`. What a part around a control hands it
  (a Field's slot flags, a List's cell wiring) is left out too: the list is `HANDED` there.
- **An icon or a key the app always draws the same way** into a prop that takes any part (Field
  `lead` and `kbd`, a row's `chevron`, the custom colour's icon) gets a plain control: a choice of
  the icons, or a text box for the key. Storybook draws the `<Icon>` or `<Kbd>` from it, so the
  component itself is not changed. The list is `DRAWN_PARTS` in `.storybook/types.js`.
- **Actions** logs every call a story's handlers get: a click, a change, a pick.
- **Interactions** replays a story's `play` steps one by one, and shows where one failed.
- **Accessibility** lists what [axe](https://github.com/dequelabs/axe-core) finds in the story.
- **Docs**, at the top of each component's group, puts its stories on one page with a table of
  its props and their types, written from the comments in the component.

## The tests

Every story is a test, run in Chromium by Vitest. It fails when the story does not render, when its
`play` steps fail, when it logs an error (the components report a wrong prop that way), or when the
accessibility check finds a fault.

`tests/every-choice.test.jsx` draws every story once more for each value of each control that offers
a list of values, and once with each text box emptied. It fails when one crashes the story or makes
it log an error or a warning. It also checks that
the Docs code panel can write the story out: a story that draws something on the page's body uses
`OverThePage` from `stories/controls.js`, never a bare `createPortal()`. A story marked `knownAccessibilityFaults` has faults that are
written in `later.md`: they show as warnings and do not fail. Remove the mark when they are fixed.

After a merge to main, CI also sends the built Storybook to [Chromatic](https://www.chromatic.com),
which takes a picture of each story the change reaches and compares it with the last one approved
there. CI does not wait for the pictures: it writes the link in the run's summary, and Chromatic
puts its result on the commit in GitHub.
A change in a picture is approved or turned down on chromatic.com. It never fails CI.

## The whole pages

A part can look right in its own story and still be drawn wrong by the page that sets it up.
`pages/Pages.stories.jsx` draws the app's main pages with the app's own routes and shell, each in
one state: the order with a line open, the delete question, the budget being edited, and so on.
Chromatic takes each one on a phone and a computer, light and dark.

They need no server. `pages/answers.json` holds what the server answered for each page, kept from
a demo account by `scripts/record-pages.mjs`, and a page story gives those answers back and sets
the clock to the moment they were kept, so the pictures are the same on every run.

- `pages/states.js` lists the states: the address, and the buttons pressed to reach the state, by
  the name a screen reader reads.
- A new state is added there, and then the answers are kept again:
  `NODE_PATH=/opt/node22/lib/node_modules node scripts/record-pages.mjs` (it starts the API and the
  app with `react/scripts/session.mjs`).
- When a page starts to ask the server for something new, its story warns "No answer kept" and draws
  the page's error state. Keep the answers again.
- Keeping the answers again moves the dates in every page picture. Approve those in Chromatic.

## Against Claude Design

`design/react_handoff` is Claude Design's copy of every component. `npm run design:check` compares
each one with `react/src/components`, with the comments left out, since the build may change those.
`npm run props:check` reads each component's type comment and checks every place in `react/src`
that draws it: a switch must get true or false, a choice one of its words, and so on. Both write
what they find to the CI run's summary.

What already differs and waits for an answer is listed in `design-differences.json`, and is
reported on every run without failing it. A new difference fails, and so does one that is listed
but gone, so the list stays true. Each failure says the line to add, if the difference is to wait.

## Where things are

| File | What it is |
|---|---|
| `.storybook/main.js` | Where the stories are, the add-ons, and how the app's React and files are reached. |
| `.storybook/preview.jsx` | The app's styles, the theme and phone switches, a router for links, and the error check. |
| `.storybook/variants.js` | The allowed values of each prop, read from the components. |
| `.storybook/types.js` | The control for a prop that holds drawn parts, a locale, or one allowed value, and for a prop with no type comment; which props are wiring and stay hidden. |
| `tests/` | Tests over all the stories at once. |
| `stories/*.stories.jsx` | The stories. Each file is named after the component file it shows. |
| `stories/controls.js` | What stories share: a value held for a control, the icon picker, the faults mark. |
| `scripts/check-stories.mjs` | The check that every component file has a story, and every story file a component. |
| `scripts/check-design-copy.mjs` | The check that each component is the same code as Claude Design's copy. |
| `scripts/check-prop-use.mjs` | The check that each page gives each component's props the right kind of value. |
| `design-differences.json` | What differs from Claude Design today, waiting for an answer. |
| `pages/` | The whole pages: their states, the kept answers, and what gives the answers back. |
| `scripts/record-pages.mjs` | Keeps the answers the pages need, from the running app. |
| `vitest.config.js` | How `npm test` runs the stories. |

## Adding or changing a story

A story file is named after the component file it shows: `Button.jsx` is shown by
`stories/Button.stories.jsx`. A small file can be shown inside a related one (`Pill.jsx` is in
`Chip.stories.jsx`, `Well.jsx` in `Card.stories.jsx`, `Attachments.jsx` in `FileDrop.stories.jsx`).

```jsx
import { expect, fn, userEvent } from 'storybook/test'
import { Segmented } from '../../react/src/components/Segmented.jsx'
import { useHeld } from './controls.js'

export default {
	title: 'Controls/Segmented',
	component: Segmented,
	args: { onChange: fn() },
	render: ({ onChange, ...args }) => {
		const [value, setValue] = useHeld(args, 'value')
		return <Segmented {...args} value={value} onChange={next => { setValue(next); onChange(next) }} />
	}
}

export const Two = {
	args: { name: 'view', value: 'list', options: [{ value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }] },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByText('Cards'))
		await expect(args.onChange).toHaveBeenCalledWith('cards')
	}
}
```

- **Name the component** in the default export, and the file's other parts in `subcomponents`, so
  the Docs page has their props. A story about one of those parts names it in
  `parameters.variantsOf`, so its controls and props table are that part's, not the file's main one.
- **Every prop the story shows is an arg**, so Controls can change it. Words are text args, not
  elements: the story puts them in place. A prop that takes an element gets `control: false`.
- **Every handler is `fn()`**, so Actions logs it and a `play` step can check it.
- **A value the reader changes** is held with `useHeld(args, 'value')`: it starts at the arg, and
  starts again when the arg is changed in Controls.
- **A control that does something gets a `play` step** that uses it the way a reader would, and
  checks what happened.
- **A new prop gets a type comment** in its component: `@param {number} [props.maxMb]`, and for a
  fixed set `@param {keyof typeof VARIANT} [props.variant]`, so the set is the component's own. An
  icon is `{import('./Icon.jsx').IconName}`. A prop the component reads without a fallback is
  required: no brackets around its name.
- **Never type a list of allowed values.** They come from the component. A prop whose values are
  not checked with `pick()` in the component gets its options in the story.
- **Show the states that matter**: the resting form, each variant, disabled, an error, empty and
  loading where the component has them.
- **Use realistic content**: Danish vendor names, amounts in kroner, long names that have to be cut.
  A list story has more rows than one page, so paging shows.
- **Pass only real props.** The components report a wrong prop in the browser console, and
  `npm test` fails on it.
- **Look at it four ways** before you are done: light and dark, Phone and Desktop.

## Groups

| Group | What is in it |
|---|---|
| Controls | Buttons, chips, pills, marks, segmented controls |
| Fields | Fields, inputs, choices, combobox, dates, files, stepper |
| Layout | Cards, wells, email lines |
| Lists | Lists, list items, the line editor |
| Overlays | Menus, popovers, dialogs, toasts, alerts |
| Data | Gauges, bars, donuts, figures, sums |
| States | Empty, loading, did not load |
| Shell | The desktop shell and the phone shell |
| Ask | The conversation, files and help |
