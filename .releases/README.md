# Release notes

Settings > This build shows what changed in each version, in the reader's words. Every change that
reaches the app adds one file here, named `{yyyyMMdd}.{HHmm} - {Title}.md`: the date and time it is
written (UTC), so the folder lists the notes in order, then a short title of the change
(`20261026.1343 - Bookmark title charset.md`). No colon in the time, and none of `\ / : * ? " < > |` in
the title, since Windows cannot hold a file with them. The file belongs to the version the change
gets when it is merged, so no version number is written in it.

## What a file holds

Up to three changes. Each is a line starting `- ` that says what changed, and under it, indented two
spaces, one short sentence that says why it was made:

```
- You can sort your vendors by how much you spent.
  You wanted to see where most of the money goes.
- Photos of receipts upload faster on a slow connection.
  On a phone outside, a photo could take so long that it looked stuck.
```

Settings > This build shows the change and its reason together. The newer-version notice shows only
the change.

A change the reader cannot see (a speed-up nobody notices, a check, a tidy-up) holds this one line,
with no reason:

```
No change you can see.
```

## How to write a change

- Say what the reader can now do, or what they now see. Not how it was done.
- Use the words on the screen: the page's name, the button's label.
- Plain, short, literal sentences. The reader may not be a native English speaker.
- No file names, no code words, no "bug", "server", "API" or "component". A fixed fault says what
  works now: "The order list keeps your place when you go back."
- At most 100 characters, plain hyphens only.

## How to write a reason

- Say why the change was made, from the reader's side: what was hard, slow, missing or confusing
  before, or what they asked for. "You asked for it" alone is not a reason.
- Only what is true and known. Do not promise what the change will do for every reader.
- The same plain words as the change: no code words, no file names, plain hyphens only.
- One sentence, at most 120 characters.

`node scripts/check-release-notes.mjs` checks the file against these rules, and CI runs it when a
change lands on main. `node scripts/release-notes.mjs` prints what the image will carry.
