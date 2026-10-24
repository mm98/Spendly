---
category: Ask
---
The frame a set of files shares, one row per file with a rule between rows: in an answer, on the Files page, and (as chat rows) on Chats.

## Props

- `children`: `ChatFile` rows.

## Parts

- `ChatFile`: one file. Its second line comes from `state`, so a file that could not be made never reads as ready.
  - `title`: the file's name, e.g. `Orders at Bilka in 2026.xlsx`.
  - `kind`: the format's name as the server sends it, e.g. `Excel`, `CSV`, `Word`, `PDF`.
  - `size`: e.g. `18 KB`.
  - `state`: `'ready'` (default, kind and size, with Download) | `'making'` (kind and Being made, a spinner in Download's place) | `'failed'` (Could not be made and the `reason`, in red) | `'gone'` (kind and Deleted or Removed after 30 days)
  - `reason`: why a `failed` file could not be made.
  - `gone`: `'deleted'` | `'expired'`.
  - `href`: the download; a ready file shows Download.
  - `keptUntil`: Files page only, a date added as Kept until.
  - `chatTo`: Files page only, adds Open chat.
  - `onDelete`: Files page only, adds Delete.
  - `to`: links the title (a kept chat on Chats).
  - `icon`: the mark's icon. Default `'file-text'`; `'message-circle'` for a chat.
  - `meta`: a chat row's own second line, in place of a file's.

## Rules

- Takes no `className` or `style` (nor does `ChatFile`).
- A file names its `kind` (unless it is a chat row with `meta`).
- A `failed` file says why in `reason`.
- `gone` is `'deleted'` or `'expired'`.
- A `ready` file needs its `href` (or `to`).

## Example

```jsx
<ChatFiles>
	<ChatFile title="Orders at Bilka in 2026.xlsx" kind="Excel" size="18 KB" href={url} />
	<ChatFile title="All orders.xlsx" kind="Excel" state="failed" reason="too many orders for one file. Ask for one year at a time." />
</ChatFiles>
```
