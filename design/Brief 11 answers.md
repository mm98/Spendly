# Brief 11 answers

1. The notice that asks, on a phone: drawn in States and confirmations 6d at 361px, both notices. The rule is in components.css under `.sp-toast--asks`; drop the app.css workaround. It is a grid, not the wrap from the brief:
   - the mark sits level with the title, not centred on the whole block;
   - the words take the first row;
   - the two buttons share the row under them in equal halves, starting at the words' left edge, at touch height.
   The markup is the desktop markup.
2. Order statistics 4d: both notes now say one page (Rows per page).

## Added: what changed, in "A newer version is available"
- The notice carries a short list of what changed under its words, on desktop and on a phone: `<ul class="sp-toast__changes">`, at most three lines, from the newer version's release notes. A version with no notes shows the notice without the list.
- It stays a section notice at the bottom, until Update or Wait for later.
