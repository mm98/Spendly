# Later

Things to deal with later: small faults that are known but not urgent, and things to remember or
look at again. Each one says where it is, what the reader sees, what was found and when. An entry
is removed in the change that settles it.

## Icon buttons in a card head are kept small on the phone, in the app only

Found 2026-10-17, on the phone, in the Totals box on the order page (Duplicate, Make invoice) and the
close button on Home's month summary. The design makes every icon button 48 pixels on touch, which
puts them 3 pixels from the box's top edge. The app keeps them at their desktop size, as Carsten
asked, with a rule in `app.css`. A note asking for this rule went to Claude Design. When `design/`
has it, the rule in `app.css` is removed.
