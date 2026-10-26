# Release notes

Settings > This build shows what changed in each version, in the reader's words. Every change that
reaches the app adds one file here, named by the date and time it is written (UTC) and then its
branch without the type, so the folder lists the notes in order (`fix/bookmark-title-charset` adds
`2026-10-26-1343-bookmark-title-charset.md`). The file belongs to the version the change gets when it
is merged, so no version number is written in it.

## What a file holds

Up to three lines, each starting `- `, one change each:

```
- You can sort your vendors by how much you spent.
- Photos of receipts upload faster on a slow connection.
```

A change the reader cannot see (a speed-up nobody notices, a check, a tidy-up) holds this one line:

```
No change you can see.
```

## How to write a line

- Say what the reader can now do, or what they now see. Not how it was done.
- Use the words on the screen: the page's name, the button's label.
- Plain, short, literal sentences. The reader may not be a native English speaker.
- No file names, no code words, no "bug", "server", "API" or "component". A fixed fault says what
  works now: "The order list keeps your place when you go back."
- At most 100 characters, plain hyphens only.

`node scripts/check-release-notes.mjs` checks the file against these rules, and CI runs it when a
change lands on main. `node scripts/release-notes.mjs` prints what the image will carry.
