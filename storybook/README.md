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
  accepts, or of the icons). A prop typed `ReactNode` takes words, so it gets a text box; one typed
  `ReactElement` holds only other parts, so it has no control.
  Controls and the props table show only what changes how the part looks. Plain HTML attributes
  (`id`, `name`, `role`, `aria-*`, `data-*` and the like), handles on an element and handlers are
  left out of both; a handler's calls still show in Actions. `name` stays where the part draws it
  as text: the list is `DRAWN_NAME` in `.storybook/types.js`. What a part around a control hands it
  (a Field's slot flags, a List's cell wiring) is left out too: the list is `HANDED` there.
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
there. A change in a picture is approved or turned down on chromatic.com. It never fails CI.

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
  required: no brackets around its name. Type a prop as narrowly as its callers use it: words are
  `string`, an on/off is `boolean`, words that may hold bold text are `ReactNode`, and only other
  parts are `ReactElement`. Each prop ends with one line that says what it does to the part.
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
