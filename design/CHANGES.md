# The section nav: one component, as the Section switcher draws it

## Fixed from handoff_section_nav

**The problem.** The heading sat 2px right of the row labels: `.sp-section-nav__head` was inset 10, and the rows are inset 8 (`--shell-item-pad`). CHANGES.md and the c35 note stated 10 as the rows' inset.

**What changed.** `.sp-section-nav__head { padding: 0 var(--sp-8) var(--sp-10); }`, so the heading starts where the labels do. The c35 note and this file state 8.

**Where.** `styles/components.css`, `.sp-section-nav__head`. `Components c35`, the Fixed note.

## 1. The section nav is a component, Section nav (c35)

**The problem.** Settings' section nav was a page class, `.st-subnav` in `styles/pages/settings.css`, drawn in 11a with menu items (`sp-menu__item`) at 208 wide, so its heading did not line up with the row labels. The Section switcher exploration drew a second version with light nav rows (c22) at 224, through a page override (`.st-subnav.ss-vnav`). Two drawings of one nav, and in the app `Settings.jsx` keeps its own local `SectionNav`.

**What changed.** One component, `.sp-section-nav`, as the switcher drew it:
- a column 224 wide, so Money, dates and times does not wrap;
- the heading (`sp-section-label sp-section-nav__head`) at the rows' 8px start inset (`--shell-item-pad`), so it lines up with their labels;
- `sp-nav-list` of `sp-nav-item--light` rows, label only, with `sp-menu__sep--divider` before Import;
- the `--line-3` divider on its right, and the column stays in place while the pane scrolls.

The element is a `nav` labelled by its heading, "Settings", as the app has it. The behaviour is unchanged: below 900 the nav is a select above the cards, and on a phone the sections are a list.

**Where.**
- `Components c35` (new), and `c22`'s lede, which now links to it.
- `Settings and import 11a` and `Section switcher 25c-25e` use the same markup.
- `styles/components.css`: `.sp-section-nav` and `.sp-section-nav__head`, unlayered, after `.sp-nav-list`. `styles/pages/settings.css`: `.st-subnav` and `.st-subnav__head` are removed. `styles/pages/section-switcher.css`: `.st-subnav.ss-vnav` is removed.
- `react_handoff/Shell.jsx`: `SectionNav({ label, children })` renders the nav, its heading and the list. `react_handoff/Overlays.jsx`: `MenuSeparator` takes `variant`, `menu` (the `li`, as now) or `divider` (a `span` with `sp-menu__sep--divider`), so one component renders `.sp-menu__sep`.
- App: `react/src/pages/Settings.jsx`, the local `SectionNav`, which becomes:

      <SectionNav label="Settings">
        {SECTIONS.map(s => (
          <Fragment key={s.key}>
            {s.key === TOOLS ? <MenuSeparator variant="divider" /> : null}
            <NavItem variant="light" to={`/settings/${s.key}`} current={s.key === current}>{s.label}</NavItem>
          </Fragment>
        ))}
      </SectionNav>

  `react/src/styles/pages/settings.css`: `.st-subnav` moves to `.sp-section-nav` in `react/src/styles/components.css`, unlayered. The width becomes 224. The app's placement rules stay with it: the sticky `top` under the top bar, the window `height`, the negative margins, `overflow-y: auto`, and `.sp-shell__body > :not(:first-child) > .sp-section-nav { margin-top: 0; }`. The drawing has no window, so it shows the column without them. The heading's `sp-stack sp-gap-8` wrapper goes: the heading takes `sp-section-nav__head` (`padding: 0 var(--sp-8) var(--sp-10)`), whose 8px start inset lines it up with the rows' labels.

**What is still open.** Nothing.

## 2. Section switcher: no unsaved dot and no error count on the nav rows

**The problem.** The Section switcher exploration drew two marks on the nav rows that nobody asked for: a green dot for unsaved changes (`.ss-dot`) and a red error count (`.ss-flag`).

**What changed.** Both are removed, with their rules and notes. Unsaved changes are still kept when another section opens, and Save with errors still opens the first section that has one.

**Where.** `Section switcher 25a` notes and `25c`. `styles/pages/section-switcher.css`. Nothing in the app.

**What is still open.** Nothing.

## 3. check.js asserts the section nav

**The problem.** Nothing stopped a second section nav.

**What changed.** A new rule, "the section nav is .sp-section-nav", fails when:
- `components.css` lacks the component;
- a page uses `.st-subnav`;
- a `nav` of light rows sits on any other class;
- `doc.css` or a page stylesheet styles `.sp-section-nav` or `.st-subnav`.

**Where.** `styles/check.js`.

**What is still open.** Nothing.

## Files

- `README.md` - the design's overview, unchanged.
- `CHANGES.md` - this note.
- `Components.dc.html` - c35 Section nav, and c22's lede.
- `Settings and import.dc.html` - 11a on the component.
- `Section switcher.dc.html` - on the component, without the dot and the count.
- `styles/components.css` - `.sp-section-nav`.
- `styles/pages/settings.css` - `.st-subnav` removed.
- `styles/pages/section-switcher.css` - `.ss-dot`, `.ss-flag` and `.ss-vnav` removed.
- `styles/check.js` - the new assertion.
- `react_handoff/Shell.jsx` - `SectionNav`.
- `react_handoff/Overlays.jsx` - `MenuSeparator`'s `variant`.
- `react_handoff/README.md` - lists `SectionNav`.
- `styles/tokens.css`, `styles/doc.css`, `support.js`, `components.js`, `icons.js` - what the pages load to open from this folder.

## styles/check.js

0 finding(s) across 28 pages.
