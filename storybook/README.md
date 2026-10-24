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
| `npm run check` | Fails when a component file has no story. CI runs this. |

## The toolbar

- **Theme** switches light and dark, the way the app's own setting does.
- **Viewport** switches Phone (an iPhone 15, 393 wide) and Desktop (1440 wide). Below 640 wide the
  components get the phone shape, exactly as in the app: menus become sheets from the bottom,
  dialogs become sheets, and so on.

A story that only exists on one size holds the viewport at that size: the order table and the
desktop shell at Desktop, the phone shell and the phone date sheet at Phone.

## Where things are

| File | What it is |
|---|---|
| `.storybook/main.js` | Where the stories are, and how the app's React and files are reached. |
| `.storybook/preview.jsx` | The app's styles, the theme and phone switches, and a router for links. |
| `stories/*.stories.jsx` | The stories. Each file is named after the component file it shows. |
| `scripts/check-stories.mjs` | The check that every component file has a story. |

## Adding or changing a story

A story file is named after the component file it shows: `Button.jsx` is shown by
`stories/Button.stories.jsx`. A small file can be shown inside a related one (`Pill.jsx` is in
`Chip.stories.jsx`, `Well.jsx` in `Card.stories.jsx`, `Attachments.jsx` in `FileDrop.stories.jsx`).

```jsx
import { useState } from 'react'
import { Segmented } from '../../react/src/components/Segmented.jsx'

export default {
	title: 'Controls/Segmented',
	component: Segmented
}

export const Two = {
	render: () => {
		const [value, setValue] = useState('list')
		return <Segmented name="view" value={value} onChange={setValue}
			options={[{ value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' }]} />
	}
}
```

- **Show the states that matter**: the resting form, each variant, disabled, an error, empty and
  loading where the component has them.
- **Use realistic content**: Danish vendor names, amounts in kroner, long names that have to be cut.
  A list story has more rows than one page, so paging shows.
- **Keep it working**: a control that changes something holds its value with `useState`, so it can
  be tried.
- **Pass only real props.** The components report a wrong prop in the browser console. Open the
  console while you look at a new story, and fix every message.
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
