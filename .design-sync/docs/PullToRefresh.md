---
category: Feedback
---
The drag-down-to-reload gesture, wrapped around the app shell. Mount it once, around everything;
it is not a per-page or per-card component and it has nothing to configure.

```jsx
<PullToRefresh>
	<AppShell />
</PullToRefresh>
```

## Why it exists

A web app opened from a phone's home screen has no browser chrome left to pull down for a
reload. This puts the standard mobile gesture back: drag past the top of the content, a spinner
appears and turns with the drag, and letting go reloads the document.

## What it decides for you

- **Nothing happens until the finger has moved 8px**, so scrolling back to the top is never
  intercepted.
- **A sideways or upward drag is dropped**, untouched, and scrolls exactly as it always did.
- **The page only reloads if the pull passed 60px and was held for at least half a second**, so
  a fast flick through the same distance scrolls instead of throwing the page away.
- **The content trails the finger at half speed** and eases back when released.
- Once it commits, the spinner keeps turning until the new document replaces this one — it never
  shows "done" early.

## What it renders

`children`, inside a `.pull-shell` wrapper, plus one spinner that is invisible at rest. At rest
that is the whole of it: the wrapper adds no box, no padding and no background, and the shell
inside it looks exactly as it would unwrapped. Everything else about the component is motion
under a finger, so there is no still state of it to design against.

The shift is handed to the stylesheet as a custom property rather than applied as a transform on
a box around the shell, because a transform makes its element the anchor for every fixed
descendant — and the phone tab bar is one.

## Props

- `children` — everything the gesture moves. In the app, the whole shell.

There is no `onRefresh`: the gesture reloads the document. Do not wrap a scrolling region or a
single card in it; the gesture reads the page's own scroll position, so a second copy inside the
first would fight it.
