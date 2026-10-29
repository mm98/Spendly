/* Spendly design-system checker.
   Everything this session learned, written as assertions instead of habits.

   Run it from a script step:

     const src = await readFile('styles/check.js');
     const check = eval(src);
     const findings = await check({ readFile, ls });
     log(findings.report);

   Every rule states what it asserts and why it exists. A rule earns its place by
   having caught a real defect; the comment names it. Add to this file rather than
   writing a one-off scan, or the next pass finds only what someone remembered.   */

(async function factory() { return async function check({ readFile, ls }) {
  const pages = (await ls('')).filter(f => f.endsWith('.dc.html'));
  /* Pages that are instruments rather than mockups. A mockup states the design and
     is held to it; a tool is chrome around the design, drawn so nobody mistakes it
     for a component. The accessibility and markup rules still apply to both - only
     the rules about where a look lives are relaxed, and only here. */
  const TOOLS = ['Playground'];
  const pageCssFiles = (await ls('styles/pages')).filter(f => f.endsWith('.css'));
  const src = {};
  for (const f of pages) src[f] = await readFile(f);
  const comp = await readFile('styles/components.css');
  const doc = await readFile('styles/doc.css');
  const tok = await readFile('styles/tokens.css');
  const pageCss = {};
  for (const f of pageCssFiles) pageCss[f] = await readFile('styles/pages/' + f);
  const allCss = comp + doc + Object.values(pageCss).join('\n');
  const findings = [];
  const fail = (rule, where, detail) => findings.push({ rule, where, detail });

  /* ---- 0. coverage ------------------------------------------------------- */

  /* Every page is in checks.html's PAGES list. That list is written by hand, so a
     new page (Budget, Bookmarks) was silently never checked in the browser until
     someone noticed. */
  {
    const html = await readFile('checks.html');
    const list = (html.match(/const PAGES = \[([\s\S]*?)\]/) || [, ''])[1];
    for (const f of pages) {
      const p = f.replace('.dc.html', '');
      if (!list.includes("'" + p + "'")) fail('every page is checked', p, 'missing from PAGES in checks.html');
    }
  }


  /* A rule for a child of the phone top bar reaches it inside the screen slot too.
     Caught: Back and the page menu were sized with `.sp-topbar--touch > .sp-icon-btn`,
     and a screen one level down puts them in `.sp-topbar__screen` (display: contents),
     which the child combinator does not reach through, so Back stayed 48px (24a). */
  {
    const bare = comp.replace(/\/\*[\s\S]*?\*\//g, '');
    const sels = [...bare.matchAll(/([^{}]+)\{/g)].flatMap(m => m[1].split(',').map(x => x.trim()));
    for (const sel of sels) {
      const m = sel.match(/\.sp-topbar--touch > (\.sp-icon-btn.*)$/);
      if (!m) continue;
      const twin = sel.replace('.sp-topbar--touch > ', '.sp-topbar--touch > .sp-topbar__screen > ');
      if (!sels.includes(twin)) fail('top bar rules reach the screen slot', 'components.css', sel + ' has no .sp-topbar__screen twin');
    }
  }

  /* Every region that scrolls shows the shared bar: thin, no track, the --scroll-thumb ink.
     Caught: the vendor combobox's list on Order create drew the browser's wide light bar
     with arrows, since .sp-combobox__panel scrolled at --list-max but was never named in
     the shared list; filter values and Ask's start and help had the same gap. A region
     that hides its bar (::-webkit-scrollbar { display: none }) is exempt. */
  {
    const bare = comp.replace(/\/\*[\s\S]*?\*\//g, '');
    const lists = [...bare.matchAll(/([^{}]+)\{\s*scrollbar-width:\s*thin;\s*scrollbar-color:\s*var\(--scroll-thumb\)/g)].map(m => m[1]).join(',');
    const thumbs = [...bare.matchAll(/([^{}]+)\{[^{}]*background:\s*var\(--scroll-thumb\)/g)].map(m => m[1]).join(',');
    for (const m of bare.matchAll(/([^{}]+)\{[^{}]*overflow(?:-[xy])?:\s*(?:auto|scroll)[^{}]*\}/g)) {
      const cls = (m[1].trim().match(/\.sp-[\w-]+(?![\s\S]*\.sp-)/) || [])[0]
      if (!cls) continue
      const name = cls.replace('.', '\\.')
      if (new RegExp(name + '::-webkit-scrollbar\\s*\\{\\s*display:\\s*none').test(bare)) continue
      const named = s => new RegExp(name + '(?![\\w-])').test(s)
      if (!named(lists) || !named(thumbs)) fail('every scrolling region shows the shared bar', 'components.css', cls + ' scrolls but is not in the shared scrollbar rules')
    }
  }

  /* An answer's figures table sizes its number and amount columns to their content.
     Caught: on a phone (393 wide) the fixed 152px and 90px columns took the whole
     bubble, the name column had no width, and amounts were cut at the right edge. */
  if (!/\.sp-chat__figures \.sp-table \{[^}]*table-layout: auto/.test(comp))
    fail('figures in an answer fit a phone', 'components.css', '.sp-chat__figures .sp-table is not table-layout: auto');

  /* A desktop top bar holds the search field and nothing else; a page's own controls sit
     in its controls bar. Caught: Ask's Saved questions, Email this chat and Clear
     were moved up into the top bar. */
  if (/\.sp-topbar\s*>\s*\.sp-(btn|combobox|segmented)/.test(comp))
    fail('nothing but search in the top bar', 'components.css', 'a rule lays out page controls in .sp-topbar');
  for (const f of pages) for (const m of src[f].matchAll(/<div class="sp-topbar">((?:(?!sp-topbar)[\s\S]){0,1500}?)<\/div>\s*<div class="sp-shell__body/g))
    if (/sp-btn|sp-combobox/.test(m[1])) fail('nothing but search in the top bar', f.replace('.dc.html',''), 'the desktop top bar carries page controls');

  /* A hover state shows only where a pointer can hover (iPhone touch brief, 1). Caught: a phone
     keeps :hover on the last thing tapped, so an order row opened and closed stayed grey. */
  for (const [name, css] of [['components.css', comp], ...Object.entries(pageCss)]) {
    let s = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (let k = s.indexOf('@media (hover: hover)'); k >= 0; k = s.indexOf('@media (hover: hover)')) {
      let j = s.indexOf('{', k), d = 0;
      for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) break; }
      s = s.slice(0, k) + s.slice(j + 1);
    }
    for (const m of s.matchAll(/([^{};]*:hover[^{};]*)\{/g)) fail('hover only where a pointer hovers', name, m[1].trim().slice(0, 80) + ' is outside @media (hover: hover)');
  }
  /* On touch a switch and its line are one label (iPhone touch brief, 2). Caught: a switch with
     a separate <label for> beside it, so only the 26px switch and the text took a tap. */
  for (const f of pages) if (/<input class="sp-switch"[^>]*>\s*<label[^>]*\sfor=/.test(src[f])) fail('a switch row is one label', f.replace('.dc.html', ''), 'a switch with a separate label[for]');

  /* An alert's mark centres on its title's line, not on the middle of title and note (Ask brief).
     Caught: the pinned questions-left alert's ! sat between its two lines. */
  if (!/\.sp-alert > \.sp-alert__mark \{[^}]*margin-top: calc\(\(1lh - var\(--mark-small\)\) \/ 2\)/.test(comp))
    fail('an alert mark sits on the title line', 'components.css', '.sp-alert > .sp-alert__mark is not placed on the title line');
  if (!/\.sp-toast:has\(> \.sp-toast__icon\) \{[^}]*align-items: flex-start/.test(comp) || !/\.sp-toast > \.sp-toast__icon \{[^}]*height: 1lh/.test(comp))
    fail('a toast icon sits on the first line', 'components.css', '.sp-toast does not place its icon on the first line');
  /* A combobox stretched across a touch toolbar keeps its chevron at the right edge. Caught: on
     Layout rules 15e (< 440px) the chevrons of Filters and Sort sat right after their labels. */
  if (!/\.sp-touch \.sp-controls > \.sp-combobox \.sp-combobox__chevron \{[^}]*margin-left: auto/.test(comp))
    fail('a stretched combobox keeps its chevron at the edge', 'components.css', '.sp-touch .sp-controls > .sp-combobox .sp-combobox__chevron has no margin-left: auto');
  /* A wrapped trail stays in the field's end row. Caught: Ask with no questions left, its button
     inside a tooltip span, dropped below the search field. */
  if (!/\.sp-field__trails > span\[data-tip\] > \.sp-field__trail \{[^}]*position: relative;[^}]*transform: none/.test(comp))
    fail('a wrapped trail sits in its row', 'components.css', '.sp-field__trails > span[data-tip] > .sp-field__trail is not placed in the row');
  /* A shortcut hint centres on the field's real height. Caught: on a phone (< 640px) the search
     field is the 48px touch height, and the ⌘K hint, pinned to the 36px desktop height, sat high. */
  if (!/\.sp-field__kbd \{[^}]*top: 50%;[^}]*transform: translateY\(-50%\)/.test(comp))
    fail('a shortcut hint is centred in its field', 'components.css', '.sp-field__kbd is not centred on the field height');
  /* A stepper keeps room for one digit, and its value is always .sp-stepper__value. Caught: on
     Layout rules 15b a stepper drawn with its own div value shrank until the digit was hidden. */
  if (!/\.sp-stepper__value \{[^}]*min-width: calc\(1ch/.test(comp))
    fail('a stepper shows its digit', 'components.css', '.sp-stepper__value has no one-digit minimum');
  for (const f of pages) for (const m of src[f].matchAll(/<div class="sp-stepper">([\s\S]*?)<\/div>/g))
    if (!/class="sp-stepper__value"/.test(m[1])) fail('a stepper shows its digit', f.replace('.dc.html', ''), 'a stepper without .sp-stepper__value');

  /* The saved questions' list on the empty page takes the column's width. Caught: centred in
     .sp-chat__start it took its widest content, so a long question was 880px in a 566px
     column and an iPhone 15 scrolled sideways by 521px. */
  if (!/\.sp-chat__examples \{[^}]*(align-self: stretch|width: 100%)/.test(comp))
    fail('a saved question is cut at the column', 'components.css', '.sp-chat__examples has no column width');

  /* An answer is one size, the page's body size: its text, its table cells and its amounts.
     Caught: compact 12px names and counts beside 14px amounts in one row, under 14px text. */
  if (!/\.sp-chat__figures \.sp-table td \{[^}]*font-size: var\(--t-13\)/.test(comp) || !/\.sp-chat__reply \.sp-amount \{[^}]*font-size: inherit/.test(comp))
    fail('an answer is one text size', 'components.css', '.sp-chat__figures cells or amounts are not the answer size');
  for (const m of comp.matchAll(/(\.sp-chat__(?:msg|question|reply))\s*\{([^}]*)\}/g))
    if (/font-size: var\(--t-14\)/.test(m[2])) fail('a conversation is the body size', 'components.css', m[1] + ' is --t-14, not the body --t-13');

  /* No column of an answer's figures table is cut; text wraps. Caught: a cut on
     :first-child turned a short first column (Type: "Pendel", "Væglampe") into "P..."
     while the longer text columns beside it were never cut. */
  for (const m of comp.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*\.sp-chat__figures[^{}]*)\{([^}]*)\}/g))
    if (/text-overflow|max-width:\s*0|overflow:\s*hidden/.test(m[2]) && /\b(td|th)\b|sp-col-/.test(m[1]))
      fail('figures in an answer are never cut', 'components.css', m[1].trim() + ' cuts a column');

  /* The chat field's placeholder stays on one line. Caught: on a phone "Ask about your
     orders, vendors and budget" wrapped and the empty field opened two lines high. */
  if (!/\.sp-textarea\.sp-chat__field:placeholder-shown \{[^}]*white-space: nowrap/.test(comp))
    fail('the chat placeholder is one line', 'components.css', 'no nowrap on the empty chat field');

  /* A saved question holds its text in .sp-truncate, under the 320px cap. Caught: a
     question kept as typed (up to 2000 characters) made one button wider than the
     column and scrolled the whole page sideways. */
  if (!/\.sp-chat__pick > \.sp-btn \{[^}]*max-width: 320px/.test(comp))
    fail('a saved question is capped', 'components.css', 'no fixed 320px cap on .sp-chat__pick > .sp-btn');
  /* An answer's figures frame scrolls sideways rather than hiding a column (later.md, 21 Oct). */
  if (!/\.sp-chat__figures \{[^}]*overflow-x: auto/.test(comp))
    fail('a wide answer table scrolls in its frame', 'components.css', '.sp-chat__figures does not scroll sideways');
  /* The tab bar's columns may shrink below a label, so the bar never passes the screen. */
  if (!/\.sp-tabbar \{[^}]*grid-auto-columns: minmax\(0, 1fr\)/.test(comp))
    fail('the tab bar fits the screen', 'components.css', '.sp-tabbar columns are not minmax(0, 1fr)');
  for (const f of pages) {
    for (const m of src[f].matchAll(/<span class="sp-chat__pick"><button type="button" class="sp-btn[^"]*"[^>]*>([\s\S]*?)<\/button>/g))
      if (!/^<span class="sp-truncate">/.test(m[1])) fail('a saved question is capped', f, 'saved question without .sp-truncate: ' + m[1].slice(0, 40));
    for (const m of src[f].matchAll(/<div class="sp-combobox sp-chat__saved-menu"[\s\S]*?<\/ul>/g))
      for (const o of m[0].matchAll(/<button type="button" class="sp-combobox__option"[^>]*>([\s\S]*?)<\/button>/g))
        if (!/^<span class="sp-truncate">/.test(o[1])) fail('a saved question is capped', f, 'Saved questions option without .sp-truncate');
    /* Saved questions never sit above a conversation (Ask 24b 8): the row above
       the field was retired for the select in the controls bar. */
    if (/class="sp-chat__saved"/.test(src[f])) fail('no saved row above the field', f, '.sp-chat__saved is retired');
  }

  /* A back control in a phone top bar is labelled Back. Caught: three in Mobile
     screens labelled "Action", read aloud as a generic action. */
  for (const f of pages) {
    for (const m of src[f].matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*><svg[^>]*><path d="M15 6l-6 6l6 6" \/><\/svg><\/button>\s*<div class="sp-stack sp-gap-6/g)) {
      if (m[1] !== 'Back') fail('Back is labelled Back', f, 'back control labelled "' + m[1] + '"');
    }
  }

  /* Status and Kind are selects. Statuses are custom per user (Settings), so they are
     never a fixed segmented set, and Kind is a closed list, never free text. Caught:
     Status drawn as a segmented control and Kind as a text input in Order create,
     Responsive reference and States and confirmations after 1d had moved to the
     combobox. Swept on the label text, not on a class. */
  for (const f of pages) {
    const t = src[f];
    for (const m of t.matchAll(/<(label|span)[^>]*class="sp-field__label"[^>]*>\s*(Status|Kind)\s*<\/\1>(?=([\s\S]{0,400}))/g)) {
      const after = m[3];
      if (!/^\s*<div class="sp-combobox/.test(after)) fail('Status and Kind are selects', f, m[2] + ' field is not followed by sp-combobox');
    }
  }

  /* Every page carries the same tweak bar, theme and scheme in the View section and
     nothing else: a page-only tweak (Touch only, Go to, a variant switch) is a second
     view of the solution that the other pages do not have. $preview is a size, not a tweak. */
  {
    const bars = {};
    for (const f of pages) {
      const m = src[f].match(/data-props="([^"]*)"/);
      if (!m) { fail('one tweak bar on every page', f, 'no tweak bar'); continue; }
      let p; try { p = JSON.parse(m[1].replace(/&quot;/g, '"')); } catch (e) { fail('one tweak bar on every page', f, 'props do not parse'); continue; }
      delete p.$preview;
      const keys = Object.keys(p).sort().join();
      if (keys !== 'scheme,theme') fail('one tweak bar on every page', f, 'tweaks are ' + keys);
      bars[f] = JSON.stringify(p.theme) + JSON.stringify(p.scheme);
    }
    const ref = Object.values(bars).sort((a, b) => Object.values(bars).filter(x => x === b).length - Object.values(bars).filter(x => x === a).length)[0];
    for (const [f, b] of Object.entries(bars)) if (b !== ref) fail('one tweak bar on every page', f, 'theme or scheme differs from the other pages');
  }

  /* The shortcut badge sits only on the top bar's search. ⌘K opens the search window,
     not a list's own search, so a badge in a list toolbar names a key the field does
     not answer to. Caught: Layout rules 15e drew it on all eight toolbar specimens. */
  for (const f of pages) {
    for (const m of src[f].matchAll(/<div class="sp-controls">[\s\S]{0,1200}?<\/div>/g)) {
      if (/sp-field__kbd|sp-input--search-kbd/.test(m[0])) fail('no shortcut badge in a list toolbar', f.replace('.dc.html',''), 'toolbar search carries the badge');
    }
  }

  /* ---- 1. markup integrity ------------------------------------------------ */

  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    for (const t of ['div','span','section','article','table','tr','td','th','button','label','menu','ul','li','fieldset']) {
      const d = (s.match(new RegExp('<' + t + '\\b', 'g')) || []).length - (s.match(new RegExp('</' + t + '>', 'g')) || []).length;
      if (d) fail('balanced markup', p, `<${t}> unbalanced by ${d}`);
    }
    /* Inline styles are a defect in a mockup page: the look belongs in the
       stylesheet, where one fix reaches every consumer. A tool is the exception -
       the playground's own chrome is deliberately not a design-system component, so
       giving it component rules would put a second card, a second field and a second
       panel into `components.css` for something the product never ships. Its chrome
       carries its styles inline, and the components it renders carry none. */
    if (!TOOLS.includes(p) && / style="/.test(s)) fail('no inline styles', p, `${(s.match(/ style="/g) || []).length} inline style(s)`);

    const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    for (const [id, n] of Object.entries(ids.reduce((a, i) => (a[i] = (a[i] || 0) + 1, a), {})))
      if (n > 1) fail('unique ids', p, `id "${id}" declared ${n}×`);
    for (const m of s.matchAll(/\s(for|aria-describedby|aria-labelledby|aria-controls)="([^"]+)"/g))
      /* a {{ hole }} is resolved at render, where checks.html reads the real reference */
      if (!m[2].includes('{{'))
      for (const ref of m[2].split(/\s+/))
        if (!ids.includes(ref)) fail('references resolve', p, `${m[1]}="${ref}" points at no id`);
  }

  /* ---- 2. every class resolves, every token is defined -------------------- */

  const defined = new Set([...(tok + allCss).matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    const classes = [...new Set([...s.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)))].filter(c => c && c !== 'sp');
    for (const c of classes)
      if (!new RegExp('\\.' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])').test(allCss))
        fail('classes resolve', p, `.${c} has no rule`);
    for (const v of new Set([...s.matchAll(/var\((--[\w-]+)/g)].map(m => m[1])))
      if (!defined.has(v)) fail('tokens defined', p, `${v} is not defined`);
  }
  /* A readout is a state of the plot's bars only: the plain bars have no rule for
     placing one, so in them it takes a place in the column and pushes the bars aside
     (brief 35). */
  for (const [f, s] of Object.entries(src)) {
    let i = s.indexOf('sp-bars__tip');
    while (i >= 0) {
      const open = Math.max(s.lastIndexOf('class="sp-bars ', i), s.lastIndexOf('class="sp-bars"', i));
      const cls = open >= 0 ? s.slice(open, s.indexOf('"', open + 7)) : '';
      if (!cls.includes('sp-bars--plot')) fail('a readout sits on the plot bars', f.replace('.dc.html', ''), 'a .sp-bars__tip inside plain .sp-bars');
      i = s.indexOf('sp-bars__tip', i + 12);
    }
  }
  /* a faded part is at full strength while a list or a menu inside it is open. Caught:
     11a's "Don't import" row faded its own field list and let the next rows draw over
     it (brief 37). Every fade on a part that can hold one carries its open-state reset. */
  for (const [fade, reset] of [
    ['.sp-muted {', '.sp-muted:has([data-open="true"]) {'],
    ['.sp-table tbody tr[data-void="true"] > td:not(.sp-col-status) {', '.sp-table tbody tr[data-void="true"]:has([data-open="true"]) > td:not(.sp-col-status) {'],
    ['.sp-record[data-void="true"] {', '.sp-record[data-void="true"]:has([data-open="true"]) {'],
  ]) {
    const i = comp.indexOf(reset);
    if (comp.includes(fade) && (i < 0 || !/^[^}]*opacity:\s*1\s*;/.test(comp.slice(i + reset.length))))
      fail('an open list is not faded', 'components.css', fade.slice(0, -2) + ' has no full-strength open state');
  }
  /* every fade is a named strength (brief 38). Caught: nine literal strengths, three of
     them for "disabled" (0.4, 0.45, 0.6), with nothing keeping them in step. A fade is
     any opacity strictly between 0 and 1, as a property or as filter: opacity(). */
  for (const [name, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)])
    for (const m of css.matchAll(/opacity(?::\s*|\(\s*)(0?\.\d+)/g))
      fail('every fade is a token', name, 'literal opacity ' + m[1]);
  {
    /* the scale is --fade-NN at NN/100; every other --fade-* is a meaning that names a
       step of it, never a number of its own */
    const fades = [...tok.matchAll(/(--fade-\d+):\s*([\d.]+)\s*;/g)].map(m => [m[1], +m[2]]);
    if (!fades.length) fail('every fade is a token', 'tokens.css', 'no --fade-NN scale');
    for (const [n, v] of fades) if (Math.round(v * 100) !== +n.slice(7)) fail('every fade is a token', 'tokens.css', n + ' is ' + v + ', not its name');
    for (const m of tok.matchAll(/(--fade-[a-z][\w-]*):\s*([^;]+);/g))
      if (!/^var\(--fade-\d+\)$/.test(m[2].trim())) fail('every fade is a token', 'tokens.css', m[1] + ' is not a step of the scale');
    for (const m of allCss.matchAll(/var\((--fade-\d+)\)/g)) fail('parts read a meaning, not the scale', 'styles', m[1] + ' used directly');
    const vals = [...new Set(fades.map(f => f[1]))].sort((a, b) => a - b);
    for (let i = 1; i < vals.length; i++)
      if (vals[i] - vals[i - 1] < 0.15) fail('fades are told apart', 'tokens.css', vals[i - 1] + ' and ' + vals[i] + ' are too close to read as two strengths');
    if (/--photo-fallback-opacity/.test(tok + allCss)) fail('every fade is a token', 'styles', '--photo-fallback-opacity is replaced by --fade-standin');
  }
  /* a note names the fade by its token, swept on text: a number in prose drifts from the
     token the next time it changes (Components c-menu still said 0.45) */
  for (const [f, s] of Object.entries(src))
    for (const m of s.matchAll(/(opacity\s+0?\.\d+|0?\.\d+\s+opacity|\d+%\s+opacity|var\(--photo-fallback-opacity\))/g))
      fail('notes name the fade token', f.replace('.dc.html', ''), m[1]);
  /* a tooltip is never held inside its container (15f, brief 36): nothing pins one there */
  for (const [f, s] of Object.entries(src)) if (s.includes('data-pin=')) fail('tooltips are not held in their container', f.replace('.dc.html', ''), 'data-pin on a readout');
  if (/\[data-pin/.test(comp)) fail('tooltips are not held in their container', 'components.css', 'a [data-pin] rule');
  // a fallback hides either a missing token or a value that should not exist. These
  // four are per-instance hooks something actually sets.
  const HOOKS = ['--swatch','--p','--a','--b'];
  for (const [name, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)])
    for (const m of new Set([...css.matchAll(/var\((--[\w-]+),\s*[^)]+\)/g)].map(m => m[0])))
      if (!HOOKS.some(h => m.startsWith('var(' + h + ','))) fail('no var() fallbacks', name, m);

  /* ---- 3. the cascade ----------------------------------------------------- */

  const parse = css => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({
    sel: m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '),
    body: m[2].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim(),
    at: m.index
  })).filter(r => r.sel && !r.sel.startsWith('@') && r.body);
  const scopeOf = (css, at) => {
    // the innermost at-rule still open at `at`, not merely the nearest one: a closed
    // @supports inside a @media block left the rules after it read as top level
    const b = css.slice(0, at);
    const opens = [...b.matchAll(/@(media|container|supports|keyframes)\b/g)].map(m => m.index).reverse();
    for (const l of opens) {
      const between = css.slice(l, at);
      if ((between.match(/\{/g) || []).length - (between.match(/\}/g) || []).length > 0)
        return css.slice(l, css.indexOf('{', l)).replace(/\s+/g, ' ').trim();
    }
    return null;
  };
  /* a single bar and a stacked bar are one shape: rounded at the top, square on the
     axis, at one radius. The stack was 6px all round while the bar was --r-marker
     at the top only, so switching Stacked and Total changed the bar (brief 24). */
  {
    const want = 'var(--r-marker) var(--r-marker) 0 0';
    for (const sel of ['.sp-bars__bar', '.sp-bars__stack']) {
      const r = parse(comp).find(x => x.sel === sel && !scopeOf(comp, x.at) && /border-radius\s*:/.test(x.body));
      const v = r && (r.body.match(/border-radius\s*:\s*([^;]+)/) || [])[1];
      if (!v || v.trim() !== want) fail('bars share one shape', 'components.css', `${sel} border-radius is ${v ? v.trim() : 'unset'}, want ${want}`);
    }
    /* the spark keeps its smaller radius but the same shape: top only (brief 25) */
    for (const [sel, w] of [['.sp-bars--spark .sp-bars__bar', '2px 2px 0 0']]) {
      const r = parse(comp).find(x => x.sel === sel && !scopeOf(comp, x.at) && /border-radius\s*:/.test(x.body));
      const v = r && (r.body.match(/border-radius\s*:\s*([^;]+)/) || [])[1];
      if (!v || v.trim() !== w) fail('bars share one shape', 'components.css', `${sel} border-radius is ${v ? v.trim() : 'unset'}, want ${w}`);
    }
  }
  /* a tail mark that is not a hit target is centred on the field's real height. The
     chevron was centred in a --control-h box from the top, so in a 48px touch field it
     sat 3px high (brief field-chevron-touch). The kbd hint shows on a computer only. */
  /* a list row aligned to its first line is the row's own variant, which carries the
     first-line offset for its icon; the sp-top utility left the icon 1-2px high
     (Auth and first run, wrong password and locked out) */
  for (const [f, s] of Object.entries(src))
    for (const m of s.matchAll(/class="sp-list-item\b[^"]*\bsp-top\b[^"]*"/g))
      fail('a top-aligned list row uses sp-list-item--top', f.replace('.dc.html', ''), m[0]);
  if (!/\.sp-list-item--top > svg \{[^}]*margin-top:\s*calc\(\(1lh - 16px\) \/ 2\)/.test(comp))
    fail('an icon in a top-aligned row centres on the first line', 'components.css', '.sp-list-item--top > svg has no first-line offset');
  if (!/\.sp-list-item\[data-color="danger"\] > svg \{[^}]*color:\s*var\(--red-ink\)/.test(comp))
    fail('a danger row icon takes the danger ink', 'components.css', '.sp-list-item[data-color="danger"] > svg is not --red-ink');
  for (const sel of ['.sp-field__chevron', '.sp-field__unit']) {
    const r = parse(comp).find(x => x.sel === sel && !scopeOf(comp, x.at));
    if (!r || !/top\s*:\s*50%/.test(r.body) || !/translateY\(-50%\)/.test(r.body) || /height\s*:\s*var\(--control-h\)/.test(r.body))
      fail('a field tail mark is centred on the field', 'components.css', `${sel} is not top: 50% with translateY(-50%)`);
  }
  /* A floating layer (the date field's calendar, the period picker's Custom range, a combobox
     panel, a menu) is on top of the whole page. An element holding one must not start its own
     stacking context, or the layer's z-index only counts inside it and the next card's chart
     draws over it: the selection slide set isolation on .sp-period__presets and the bars on
     Statistics covered the Custom range. Broad :has() containers count, since any of them may
     hold a layer. */
  /* A turned icon's child may be an svg path (a drawn page puts the svg in the slot itself), which
     turns about the svg's corner unless its box is its own: the sort control's chevron vanished
     when open. Every selector that rotates a `> *` also sets transform-box: fill-box. */
  {
    const turned = new Set(), boxed = new Set();
    for (const hit of comp.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sels = hit[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map(s => s.trim()).filter(s => /> \*$/.test(s));
      if (/transform\s*:\s*rotate\(/.test(hit[2])) sels.forEach(s => turned.add(s.replace(/\[aria-expanded="true"\]|\[data-open="true"\]|\[open\]/g, '')));
      if (/transform-box\s*:\s*fill-box/.test(hit[2])) sels.forEach(s => boxed.add(s));
    }
    for (const s of turned) if (!boxed.has(s)) fail('a turned icon turns about its own box', 'components.css', `${s} rotates without transform-box: fill-box`);
  }
  /* A narrow field is capped at --field-w for a full form column; in a half it fills the
     half. Without the release a narrow combobox in Settings ended 20px short of its note. */
  for (const cls of [...new Set([...comp.matchAll(/\.(sp-[\w-]+--narrow)\s*\{[^}]*max-width\s*:[^;}]*--field-w/g)].map(m => m[1]))])
    if (!new RegExp(`\\.sp-halves > \\.sp-field > \\.${cls}[^{]*\\{[^}]*max-width\\s*:\\s*none|\\.sp-halves > \\.sp-field > \\.${cls}\\s*,[^{]*\\{[^}]*max-width\\s*:\\s*none`).test(comp))
      fail('a narrow field fills a half', 'components.css', `.${cls} has no release in .sp-halves`);
  {
    // the host itself, not a part inside it: the last compound of the selector names it
    const HOSTS = /^(\.sp-period(__presets|__anchor)?|\.sp-field__wrap|\.sp-combobox|\.sp-anchor|\.sp-cell-menu|\.sp-record__menu|\.sp-controls)(?![\w-])/;
    const hostOf = m => /^:has\(/.test(m) ? true : HOSTS.test(m.replace(/\([^()]*\)/g, '').split(/\s*[\s>+~]\s*/).pop());
    const TRAPS = /(^|;)\s*(isolation\s*:\s*isolate|contain\s*:\s*(paint|strict|content)|filter\s*:\s*(?!none)|transform\s*:\s*(?!none)|will-change\s*:\s*(transform|opacity|filter))/;
    // read off the text, not a full parse: the checker runs close to its time budget
    for (const hit of comp.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const body = hit[2];
      if (!TRAPS.test(body)) continue;
      const sel = hit[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
      for (const m of sel.split(',').map(s => s.trim()))
        if (hostOf(m) && !/(::after|::before)$/.test(m)) fail('a floating layer is never trapped under a stacking context', 'components.css', `${m} sets ${body.match(TRAPS)[2]}`);
    }
  }
  for (const [name, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)]) {
    const rules = parse(css);
    // two rules for one selector at one scope, disagreeing on a property: the later
    // wins silently. This is how .sp-card--attention had two different ambers.
    /* A grouped selector sets each of its members, so it is split before comparing:
       `.sp-sort, .sp-pager` and a later `.sp-pager` disagreed on display and gap,
       and comparing selector text whole never saw the second definition. */
    const members = sel => {
      const out = []; let depth = 0, cur = '';
      for (const ch of sel) {
        if (ch === '(') depth++; else if (ch === ')') depth--;
        if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch;
      }
      out.push(cur.trim());
      return out.filter(Boolean);
    };
    const top = {};
    for (const r of rules) if (!scopeOf(css, r.at)) for (const m of members(r.sel)) (top[m] ||= []).push(r.body);
    for (const [sel, bodies] of Object.entries(top)) {
      if (bodies.length < 2) continue;
      const props = {};
      for (const b of bodies) for (const d of b.split(';')) {
        const [k, v] = d.split(':').map(x => (x || '').trim());
        if (k && v) (props[k] ||= []).push(v);
      }
      for (const [k, v] of Object.entries(props))
        if (v.length > 1 && new Set(v).size > 1) fail('one rule per selector per scope', name, `${sel} sets ${k}: ${v.join(' then ')}`);
    }
    // a base rule after its own query is dead: this killed .sp-cards' whole collapse.
    const byS = {};
    for (const r of rules) (byS[r.sel] ||= []).push({ ...r, scope: scopeOf(css, r.at) });
    for (const [sel, rs] of Object.entries(byS))
      for (const s of rs.filter(r => r.scope))
        for (const t of rs.filter(r => !r.scope && r.at > s.at)) {
          const overlap = s.body.split(';').map(d => d.split(':')[0].trim())
            .filter(k => t.body.split(';').map(d => d.split(':')[0].trim()).includes(k)).filter(Boolean);
          if (overlap.length) fail('at-rules come after their base', name, `${sel}: ${s.scope} sets ${overlap.join(', ')}, re-set later at top level`);
        }
    // byte-identical duplicates in one scope are dead weight; the same rule inside a media query
    // can be live, re-set after a shorthand there resets it
    const seen = {};
    for (const r of rules) (seen[r.sel + '||' + r.body + '||' + (scopeOf(css, r.at) || '')] ||= []).push(r.at);
    for (const [k, v] of Object.entries(seen)) if (v.length > 1) fail('no duplicate rules', name, k.split('||')[0] + ` declared ${v.length}× identically`);
    // The hand promises a click, so a table that only gets read declares itself:
    // .sp-table--static drops both the lit row and the pointer. This asserts the
    // opt-out keeps existing - a reference table whose rows light up is promising a
    // record that is not behind them.
    if (name.endsWith('components.css') && !/\.sp-table--static tbody tr:hover\s*\{[^}]*cursor:\s*default/.test(css))
      fail('the hand means a click', name, '.sp-table--static has lost its inert row hover');
  }
  // One name per role: two classes with the same full profile are one component
  // twice. Every stylesheet, and every prefix - reading only components.css and only
  // sp- classes is how .oc-frame sat as a byte copy of .doc-frame unseen.
  const profile = {};
  for (const [, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)])
    for (const r of parse(css))
      for (const part of r.sel.split(',').map(x => x.trim())) {
        const base = (part.match(/^\.([a-z][\w-]*)/) || [])[1];
        if (!base) continue;
        (profile[base] ||= []).push(part.slice(base.length + 1).trim() + '{' + r.body.split(';').map(x => x.trim()).filter(Boolean).sort().join(';') + '}');
      }
  const byProfile = {};
  for (const [cls, ps] of Object.entries(profile)) (byProfile[ps.sort().join('||')] ||= []).push(cls);
  // a class that owns children is a namespace, not an alias
  const owns = cls => new RegExp('\\.' + cls + '__').test(comp);
  // Accepted: different components that share one declaration by coincidence. Each
  // names a different role, so collapsing them would be the opposite mistake.
  const COINCIDENCE = [
    'sp-amount-secondary--positive == sp-field__help--positive',   // an amount's tone, and a field message's
    'sp-btn--block == sp-skeleton--line',                          // full width, for unrelated reasons
    'sp-pill--positive == sp-list-item--positive',                  // a pill's ground, and a row's
    'sp-strip-wrap == sp-anchor == sp-plot__area'                   // three things that position children
  ];
  // A match on one or two declarations is coincidence, not a shared role: every
  // width utility sets only a width. Three or more is a shape worth one name.
  for (const [prof, group] of Object.entries(byProfile)) {
    if (group.length < 2 || group.some(owns)) continue;
    const decls = (prof.match(/[a-z-]+:/g) || []).length;
    if (decls < 3) continue;
    const key = group.join(' == ');
    if (COINCIDENCE.includes(key)) continue;
    // documentation chrome (doc-) is kept out of the app's stylesheets on purpose, so a
    // doc class matching a product class is a deliberate copy, not a second name
    if (group.some(x => x.startsWith('doc-')) && group.some(x => !x.startsWith('doc-'))) continue;
    fail('one name per role', 'stylesheets', key);
  }

  /* The letters on a solid mark reach 4.5:1 in every scheme and theme. They are 13px
     bold, which is not large text. Caught: Emerald's and Terracotta's mid tone measured
     4.48 and 4.49 against white, and every dark scheme's primary and primary-3 marks
     2.5 to 4.1, since the ink rules were worked out by APCA and never measured. The
     ink each swatch takes is read from the .sp-mark--solid rules in source order, a
     theme-scoped rule applying only in its theme; the account mark is white on
     --shell-mark. */
  {
    const sch = await readFile('styles/schemes.css');
    const hex = h => { h = h.toLowerCase(); return h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h; };
    const lin = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const lum = h => { h = hex(h); const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const vars = body => Object.fromEntries([...(body || '').matchAll(/(--[\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map(m => [m[1], m[2]]));
    const bareTok = tok.replace(/\/\*[\s\S]*?\*\//g, '');
    const rootV = vars((bareTok.match(/:root\s*\{([^}]*)\}/) || [])[1]);
    const darkV = { ...rootV, ...vars((bareTok.match(/\[data-theme="dark"\]\s*\{([^}]*)\}/) || [])[1]) };
    const themes = { light: { tokens: rootV }, dark: { tokens: darkV } };
    for (const m of sch.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const s = m[1].match(/data-scheme="(\w+)"/); if (!s || !/--primary:/.test(m[2])) continue;
      const th = /dark/.test(m[1]) ? 'dark' : 'light';
      themes[th][s[1]] = { ...(th === 'dark' ? darkV : rootV), ...vars(m[2]) };
    }
    const SW = [...new Set([...comp.matchAll(/\.sp-mark--solid\[data-swatch="([\w-]+)"\]\s*\{\s*background/g)].map(m => m[1]))];
    const ink = { light: {}, dark: {} };
    for (const th of ['light', 'dark']) for (const sw of ['none', ...SW]) ink[th][sw] = 'surface';
    for (const m of comp.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const c = m[2].match(/(?:^|;)\s*color:\s*var\(--(surface|ink)\)/); if (!c) continue;
      for (const sel of m[1].split(',').map(x => x.trim())) {
        const t = sel.match(/^:where\(\[data-theme="(light|dark)"\]\)\s+\.sp-mark--solid(.*)$/) || (sel.startsWith('.sp-mark--solid') && [null, null, sel.slice(15)]);
        if (!t) continue;
        const rest = t[2]; const sw = rest === ':not([data-swatch])' || rest === '' ? 'none' : (rest.match(/^\[data-swatch="([\w-]+)"\]$/) || [])[1];
        if (!sw) continue;
        for (const th of t[1] ? [t[1]] : ['light', 'dark']) { if (rest === '') { for (const k of Object.keys(ink[th])) if (k === 'none') ink[th][k] = c[1]; } else ink[th][sw] = c[1]; }
      }
    }
    for (const th of ['light', 'dark']) for (const [name, v] of Object.entries(themes[th])) {
      for (const sw of ['none', ...SW]) {
        const fill = v['--' + (sw === 'none' ? 'primary' : sw)]; if (!fill) continue;
        const r = ratio(v['--' + ink[th][sw]], fill);
        if (r < 4.5) fail('mark letters reach 4.5:1', name + ' ' + th, (sw === 'none' ? 'a mark with no swatch' : sw) + ' ' + fill + ' with --' + ink[th][sw] + ': ' + r.toFixed(2));
      }
      if (v['--shell-mark'] && ratio('#ffffff', v['--shell-mark']) < 4.5) fail('mark letters reach 4.5:1', name + ' ' + th, '--shell-mark ' + v['--shell-mark'] + ' with white: ' + ratio('#ffffff', v['--shell-mark']).toFixed(2));
    }
  }

  /* ---- 4. labels and names ------------------------------------------------ */

  /* There are two reds, and which one a rule takes is decided by whether it is
     colouring text. `--red` is the graphic red - a border, a status dot, a swatch, an
     icon glyph. `--red-ink` is the text red, and it is the darker of the two: at 11px
     on the panel's own white, `--red` measures 2.83:1 and `--red-ink` 6.70:1, so the
     wrong one is both off-vocabulary and unreadable. The stylesheet was already
     consistent - nine text rules on `--red-ink`, `--red` only on `.sp-toast__icon` -
     and the playground still picked the graphic red for four pieces of text, which is
     what this assertion now catches. A glyph keeps `--red`, and says so in its name. */
  {
    const inks = [];
    for (const [name, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)])
      for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g))
        if (/(^|[;\s])color:\s*var\(--red\)/.test(m[2]) && !/__icon|__glyph|__dot/.test(m[1]))
          inks.push([name, m[1].trim().replace(/\s+/g, ' ').slice(0, 60)]);
    // a tool carries its styles inline, so its text colours are read from the markup
    for (const [f, s] of Object.entries(src))
      for (const m of s.matchAll(/color:\s*'?var\(--red\)'?/g))
        inks.push([f.replace('.dc.html', ''), 'an inline text colour']);
    for (const [where, what] of inks) fail('the text red is --red-ink', where, what);
  }

  /* A token named in a page's prose is a reference the reader will go looking for.
     These pages are read to build components, so a size table citing `--tile` after
     that token was renamed sends the reader after something that is not there. Every
     `--x` a page names has to be either a property a stylesheet declares or a variant
     suffix some class carries - those are the two things that notation means here.

     Comments are stripped from the CSS first: a removed name recorded in the past
     tense is history, not vocabulary, and counting it let `--page` pass while the
     only live thing matching it was the sentence saying it had been replaced. Prose
     is read with the tags off rather than only inside `<code>`, since four of the
     five stale `--tile` citations were wrapped and the fifth was not.

     Two things a page may legitimately name. `--shell-*` is a whole family, so a
     trailing star passes on any live member. And a name a sentence puts in the past
     tense - "it was .sp-savebar--page" - is being discussed rather than used, which
     is the one case where citing a dead name is the point. */
  {
    const bare = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const all = bare(tok + comp + doc + Object.values(pageCss).join('\n'));
    const declared = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
    const suffixes = new Set([...all.matchAll(/\.[\w-]*?(--[\w-]+)/g)].map(m => m[1]));
    const live = [...declared, ...suffixes];
    for (const [f, s] of Object.entries(src)) {
      const prose = s
        .replace(/<script[\s\S]*?<\/script>/g, ' ')
        .replace(/<style[\s\S]*?<\/style>/g, ' ')
        // a snippet well is setup text the user copies as written, so a command-line
        // flag in it (--header) is product copy, not a token citation
        .replace(/<div class="sp-well sp-well--snippet">[\s\S]*?<\/div>/g, ' ')
        .replace(/<[^>]*>/g, ' ');
      const said = new Set();
      for (const m of prose.matchAll(/(--[a-z][\w-]*)(\*?)/g)) {
        if (said.has(m[1])) continue;
        if (m[2] ? live.some(n => n.startsWith(m[1])) : (declared.has(m[1]) || suffixes.has(m[1]))) continue;
        // named in the past tense, so the sentence is about the rename itself. A
        // period that begins a class name is not a sentence end
        if (/\bwas\b(?:[^.]|\.(?=\w)){0,40}$/.test(prose.slice(Math.max(0, m.index - 60), m.index))) continue;
        said.add(m[1]);
        fail('a named token exists', f.replace('.dc.html', ''), `${m[1]} is cited but no stylesheet declares it`);
      }
    }
  }

  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    const ids = new Set([...s.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

    // a control is named by a bound label, a wrapping label, or an aria attribute
    for (const m of s.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
      if (/aria-label=|aria-labelledby=|type="hidden"/.test(m[2])) continue;
      const id = (m[2].match(/\sid="([^"]+)"/) || [])[1];
      if (id && s.includes('for="' + id + '"')) continue;
      const before = s.slice(0, m.index);
      if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) {
        const inner = s.slice(before.lastIndexOf('<label'), s.indexOf('</label>', m.index)).replace(/<[^>]*>/g, '').trim();
        if (inner.length > 1) continue;
      }
      fail('every control is named', p, m[0].replace(/\s+/g, ' ').slice(0, 90));
    }

    // A label naming a GROUP is a span bound with aria-labelledby: a <label> must
    // reference one labelable control, so it cannot name a set of radios. The group
    // carries no aria-label of its own either - that is the same name written twice,
    // and 13 of them had the visible text labelling nothing at all.
    const GROUP = /<(label|span)((?:[^>]*?))class="([^"]*sp-field__label[^"]*)"((?:[^>]*?))>((?:[^<]|<(?!\/?(?:span|label)\b))*?)<\/\1>(\s*)<div([^>]*)role="(group|radiogroup)"([^>]*)>/g;
    for (const m of s.matchAll(GROUP)) {
      const txt = m[5].replace(/<[^>]*>/g, '').trim().slice(0, 40);
      const id = (m[2] + m[4]).match(/\sid="([^"]+)"/)?.[1];
      const attrs = m[7] + m[9];
      const by = (attrs.match(/aria-labelledby="([^"]+)"/) || [])[1];
      if (m[1] === 'label') fail('a group label is a span', p, `"${txt}" is a <label>, which cannot name a group`);
      if (!id) fail('a visible label is bound', p, `"${txt}" names a group but carries no id`);
      else if (by !== id) fail('a visible label is bound', p, `"${txt}" has id ${id} but its group names ${by || 'nothing'}`);
      if (by && /aria-label="/.test(attrs)) fail('one name per control', p, `"${txt}" group carries both aria-label and aria-labelledby`);
    }

    // a token field holds an add input, so its label binds to it like any other
    for (const m of s.matchAll(/<span((?:[^>]*?))class="([^"]*sp-field__label[^"]*)"((?:[^>]*?))>((?:[^<]|<(?!\/?(?:span|label)\b))*?)<\/span>/g)) {
      const at = m.index + m[0].length;
      const tok = s.indexOf('<div class="sp-tokens', at);
      if (tok < 0 || tok - at > 400) continue;
      if (/<input class="sp-tokens__add"/.test(s.slice(tok, tok + 1800)))
        fail('a field label binds its control', p, `"${m[4].replace(/<[^>]*>/g,'').trim().slice(0,40)}" names a token field as a span, not a bound label`);
    }

    // a described choice's second line is .sp-meta, as c5 draws it; never .sp-field__help
    for (const m of s.matchAll(/<span class="sp-choice__text">\s*<strong>([^<]*)<\/strong>\s*<span class="([^"]*)"/g))
      if (!/^sp-meta$/.test(m[2].trim())) fail('a described choice uses sp-meta', p, `"${m[1].trim()}" describes itself on .${m[2]}`);

    // a field label naming ONE control is a bound <label>; a <span> is for a group only
    for (const m of s.matchAll(/<span([^>]*)class="([^"]*sp-field__label[^"]*)"([^>]*)>([^<]{0,44})<\/span>/g)) {
      const after = s.slice(m.index + m[0].length, m.index + m[0].length + 420);
      if (/role="(group|radiogroup)"|class="sp-options|class="sp-segmented|class="sp-choices|class="sp-tokens/.test(after)) continue;
      if (/<div class="sp-combobox/.test(after.slice(0, 40))) continue;   // handled below
      if (/<(input|select|textarea)\b/.test(after)) fail('a field label binds its control', p, `"${m[4].trim()}" is a span, not a bound label`);
    }

    // A combobox trigger is named once, by its visible label if it has one.
    // The label body may contain no span/label open or close tag: a back-referenced
    // close will otherwise run PAST its own </span> to a later one whose next sibling
    // is a combobox, so the match captures an unrelated label and then validates
    // itself against it. That bug bound a merge control to a "Colour" label, and the
    // checker could not see it because it shared the pattern.
    const PAIR = /<(label|span)((?:[^>]*?))class="([^"]*sp-field__label[^"]*)"((?:[^>]*?))>((?:[^<]|<(?!\/?(?:span|label)\b))*?)<\/\1>(\s*)<div class="sp-combobox/g;
    for (const m of s.matchAll(PAIR)) {
      const id = (m[2] + m[4]).match(/\sid="([^"]+)"/)?.[1];
      const after = s.slice(m.index + m[0].length);
      // a searchable combobox is an input, bound by the label's for= like any field; the
      // next trigger button belongs to a later combobox, and validating against it bound
      // the bank check's row picker to the column mapping below it
      const inputAt = after.search(/<input[^>]*role="combobox"/), buttonAt = after.search(/<button type="button" class="sp-combobox__trigger"/);
      if (inputAt > -1 && (buttonAt < 0 || inputAt < buttonAt)) continue;
      const trig = after.match(/<button type="button" class="sp-combobox__trigger"([^>]*)>/);
      if (!trig) continue;
      const by = (trig[1].match(/aria-labelledby="([^"]+)"/) || [])[1];
      const txt = m[5].replace(/<[^>]*>/g, '').trim().slice(0, 44);
      if (!id) fail('a visible label is bound', p, `"${txt}" labels a combobox but carries no id`);
      else if (by !== id) fail('a visible label is bound', p, `"${txt}" has id ${id} but its trigger names ${by || 'nothing'}`);
      if (by && !ids.has(by)) fail('a visible label is bound', p, `"${txt}" trigger names ${by}, which is no id on this page`);
      if (by && /aria-label="/.test(trig[1])) fail('one name per control', p, `"${txt}" carries both aria-label and aria-labelledby`);
    }
    for (const m of s.matchAll(/<button type="button" class="sp-combobox__trigger"([^>]*)>/g)) {
      const by = (m[1].match(/aria-labelledby="([^"]+)"/) || [])[1];
      if (by && !ids.has(by)) fail('references resolve', p, `aria-labelledby="${by}" points at no id`);
      if (!by && !/aria-label="/.test(m[1])) fail('every control is named', p, 'a combobox trigger has no name');
    }
  }

  /* ---- 4b. case -------------------------------------------------------- */

  // Uppercase belongs to labels that are not actions - a section eyebrow, a table
  // head, a notes label. An action reads in sentence case, because the committing
  // variant used to shout: 11px caps with letter-spacing on Save and Create copy,
  // for a commit the green fill already marks. Two ways to lose that: type the
  // label in capitals, or transform it in CSS. Both are checked, because the first
  // renders identically under the old rule and so hid for a whole pass.
  const ACRONYMS = ['PDF','CSV','DKK','VAT','CVR','XLS','JSON','ID','OK','EAN','MOMS'];
  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    for (const m of s.matchAll(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const label = m[2]
        .replace(/<svg[\s\S]*?<\/svg>/g, '')
        .replace(/<span[^>]*class="[^"]*sp-mark[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const letters = label.replace(/[^A-Za-zÆØÅæøå]/g, '');
      if (letters.length < 2) continue;
      if (letters !== letters.toUpperCase()) continue;
      if (ACRONYMS.includes(label.trim())) continue;
      fail('an action reads in sentence case', p, `<${m[1]}> label typed in capitals: "${label.slice(0, 40)}"`);
    }
  }
  for (const [name, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)])
    for (const r of parse(css)) {
      if (!/text-transform:\s*uppercase/.test(r.body)) continue;
      for (const part of r.sel.split(',').map(x => x.trim()))
        if (/btn|-link|-action|-tab\b|^a[\s.:\[]|\sa[\s.:\[]|\sa$/.test(part))
          fail('an action reads in sentence case', name, `${part} uppercases an action`);
    }

  /* ---- 4c. one axis per name ---------------------------------------------- */

  // A component has two axes: its variant, which is structure, and its colour,
  // which is values. They used to meet in a class name - .sp-well--destructive sat
  // beside .sp-well--quiet as if the two were peers, and the same three meanings
  // were spelled three ways across the system (destructive, problem, error).
  // The variant is the class; the colour is [data-color], one vocabulary for every
  // component: primary is the default and carries no attribute, then warning,
  // danger and success. `progress` is not a colour - it is [data-state], since a
  // pill in flight is not a pill in trouble.
  const COLORS = ['warning', 'danger', 'success'];
  const definedClasses = new Set(
    [...(comp + doc + Object.values(pageCss).join('\n')).matchAll(/\.((?:sp|doc|[a-z]{2})-[a-z][\w-]*)/g)].map(m => m[1])
  );
  const OLD = /(destructive|attention|problem|positive|error)/;
  const TAKES_COLOR = /sp-(btn|well|chip|pill|card|alert|list-item|input|line|toast|step|kbd|field__help|mark__text|toast__icon|nav-item__count|tile__kind|amount-secondary)\b/;

  for (const [name, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)])
    for (const m of css.matchAll(/\.sp-[\w-]*?--[\w-]*(?:destructive|attention|problem|positive|error)[\w-]*/g))
      fail('a colour is not a variant', name, `${m[0]} puts a colour in a class name; use [data-color]`);

  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    for (const m of s.matchAll(/class="[^"]*?(sp-[\w-]*?--[\w-]*(?:destructive|attention|problem|positive|error)[\w-]*)/g))
      fail('a colour is not a variant', p, `${m[1]} - use data-color`);
    for (const m of s.matchAll(/data-color="([^"]*)"/g))
      if (!COLORS.includes(m[1])) fail('a colour is one we define', p, `data-color="${m[1]}" is not ${COLORS.join(' | ')}`);
    // the attribute only means something on a component that reads the set
    for (const m of s.matchAll(/<[^>]*data-color="[^"]*"[^>]*>/g))
      if (!TAKES_COLOR.test(m[0])) fail('a colour needs a component', p, m[0].replace(/\s+/g, ' ').slice(0, 90));
    // Prose is checked as prose. The class sweeps above read class attributes, so a
    // rename leaves the documentation naming a class that no longer exists and the
    // run still comes up clean - which is exactly what happened to the colour split.
    // Every sp-* or doc-* class named inside a <code> or a specimen label has to
    // exist as a selector in the stylesheets, and no prose may name a colour word
    // as a variant.
    const prose = [...s.matchAll(/<code[^>]*>([^<]+)<\/code>/g), ...s.matchAll(/class="doc-specimen__label"[^>]*>([^<]+)</g)].map(m => m[1]);
    for (const text of prose) {
      for (const m of text.matchAll(/\.?((?:sp|doc)-[a-z][\w-]*)/g)) {
        const cls = m[1];
        if (/^sp-\d/.test(cls)) continue;                 // --sp-12 and the spacing scale are tokens
        if (!definedClasses.has(cls)) fail('the notes name a class that exists', p, cls);
      }
      for (const m of text.matchAll(/--(destructive|attention|problem|positive|error)\b/g))
        fail('a colour is not a variant', p, `the notes say ${m[0]}; the colour is an attribute`);
    }

    // the ink utilities carry the same vocabulary - sp-ink-2 and the rest of the
    // grey scale are a different axis and are not checked here
    for (const m of s.matchAll(/sp-ink-(destructive|attention|problem|positive|error)\b/g))
      fail('one colour vocabulary', p, `${m[0]} - the words are warning, danger, success`);
  }

  /* ---- 4h. mockup data names nobody real ---------------------------------- */

  // Sample copy reaches a handoff package and a shared screenshot, so an address at
  // a real domain is somebody's inbox. The reserved domains exist for this.
  // any subdomain of a reserved domain is fine - a long address is how the sidebar's
  // truncation gets shown, and verylongcompany.example.net is still nobody's inbox
  const MAIL = /[\w.+-]+@([\w.-]+\.[a-z]{2,})/gi;
  const RESERVED = /(^|\.)example\.(net|com|org)$/i;
  for (const [f, s] of Object.entries(src))
    for (const m of s.replace(/<!--[\s\S]*?-->/g, '').matchAll(MAIL))
      if (!RESERVED.test(m[1])) fail('mockup mail is example.net', f.replace('.dc.html', ''), m[0]);

  /* ---- 4g. a required field says so on its label ------------------------- */

  // The marker is the label's, and the control carries `required` - an asterisk
  // typed into a label's own text is a marker no screen reader can skip and no
  // stylesheet can restyle.
  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    for (const m of s.matchAll(/<label[^>]*class="[^"]*sp-field__label[^"]*"[^>]*>([^<]*\*)/g))
      fail('a required marker is an element', p, m[1].trim().slice(0, 40) + ' - use .sp-field__required');
  }

  /* ---- 4f. a well sits inside a surface ---------------------------------- */

  // Card, Well and ListItem are three boxes, and the boundary is one question: does
  // the thing stand on the page, sit inside a surface, or repeat? A well is the
  // middle one, so a well on the page ground is a card drawn wrongly. Asserted
  // rather than scoped into the CSS: scoping .sp-well to .sp-card would make the
  // component depend on its parent, and the first well in a dialog would silently
  // lose its styling.
  const VOID_TAGS = /^(img|input|br|hr|meta|link|source|path|circle|rect|use|col|area|track)$/;
  const SURFACES = /\b(sp-card|sp-list|sp-popover|sp-dialog|sp-sheet|sp-line-editor)\b/;
  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    const stack = [];
    for (const m of s.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) {
      const close = m[1], tag = m[2].toLowerCase(), attrs = m[3];
      if (close) {
        for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
        continue;
      }
      const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || '';
      if (/\bsp-well\b/.test(cls) && !stack.some(x => x.surface))
        fail('a well sits inside a surface', p, 'a well on the page ground is a card');
      if (attrs.trim().endsWith('/') || VOID_TAGS.test(tag)) continue;
      stack.push({ tag, surface: SURFACES.test(cls) });
    }
  }

  /* ---- 4e. the row is one component --------------------------------------- */

  // .sp-line and .sp-list-item were the same row - same layout, same padding, same
  // border strategy - differing by one shade of ground and 2px of radius. They are
  // merged into .sp-list-item; .sp-line-editor is a different thing (a form) and
  // keeps its name. A page or a stylesheet reaching for .sp-line is reaching for a
  // component that was retired.
  for (const [name, css] of [['components.css', comp], ['doc.css', doc], ...Object.entries(pageCss)])
    // comments stripped: a note explaining the merge names the retired class on purpose
    for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.sp-line(--|__|[\s:.\[,{])/g))
      fail('the row is one component', name, `${m[0]} - the row is .sp-list-item`);
  for (const [f, s] of Object.entries(src))
    for (const m of s.matchAll(/class="[^"]*sp-line(--|__|["\s])/g))
      fail('the row is one component', f.replace('.dc.html', ''), `${m[0].slice(7, 48)} - use sp-list-item`);

  /* ---- 4d. a size is a size ---------------------------------------------- */

  // The mark's sizes were named for where they sat - form, row, inline - and the
  // names went stale the first time a size was used somewhere else: the large mark
  // sits in a form AND at the head of a record page. Sizes are small, medium,
  // large; a place name in a size is a name that will lie.
  const PLACES = /(form|row|inline|hero|page|card|panel|list|cell|toolbar)/;
  for (const [name, css] of [['components.css', comp], ...Object.entries(pageCss)])
    for (const m of css.matchAll(/\.sp-mark--([a-z-]+)/g))
      if (PLACES.test(m[1]) && !['small', 'medium', 'large'].includes(m[1]))
        fail('a size is a size, not a place', name, `.sp-mark--${m[1]} names a place`);

  /* ---- 5a. a screen uses the system's layout, not its own -------------- */

  // A two-column screen body is .sp-shell__body--split with a .sp-panel rail, which
  // is a fixed 360. A page grid instead makes the rail proportional, so it changes
  // width with the artboard: Order create's was 403 at 1240 and 452 at 1400, against
  // every other record screen's 360.
  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    for (const m of s.matchAll(/<div class="([a-z]{2}-[\w-]+)"[^>]*>/g)) {
      const cls = m[1];
      const rule = Object.values(pageCss).join('\n').match(new RegExp('\\.' + cls + '\\s*\\{[^}]*\\}'));
      if (!rule) continue;
      const body = rule[0];
      if (!/display:\s*grid/.test(body)) continue;
      // asymmetric only: a main column beside a rail. A symmetric 1fr/1fr grid is a
      // pair of equals, which is .sp-fields, not a screen body.
      if (!/grid-template-columns:[^;]*(?:2fr[^;]*1fr|1fr[^;]*(?:max-content|\d+px))/.test(body)) continue;
      // The screen BODY only: a direct child of the frame, not a grid nested inside a
      // card or a well. Anything with an open card above it is content, not layout.
      const before = s.slice(0, m.index);
      const frameAt = before.lastIndexOf('doc-screen');
      if (frameAt < 0) continue;
      const inFrame = before.slice(frameAt);
      const opens = (inFrame.match(/<div class="sp-(card|well|lines|list)\b/g) || []).length;
      const closes = (inFrame.match(/<\/div>/g) || []).length;
      if (opens > 0 && closes < opens) continue;      // still inside a card
      if (/class="sp-card|class="sp-well/.test(inFrame.slice(-400))) continue;
      fail('a screen uses the split body', p, `.${cls} draws a two-column screen; use .sp-shell__body--split with a .sp-panel rail`);
    }
  }

  /* ---- 5. the patterns that repeat --------------------------------------- */

  const CONTROL = /class="sp-(tokens|input|select|textarea|field|gauge|segmented|stepper|switch|check|radio|btn|chip|options|option|tone|swatch|meter|bars|donut|table|list|lines|cards|note-row|choice|well|card)\b/;
  for (const [f, s] of Object.entries(src)) {
    const p = f.replace('.dc.html', '');
    /* A title with its second line is .sp-stacked (2px), never sp-stack sp-gap-6. A card
       body - a heading over prose, a control or several lines - is sp-stack sp-gap-6 and
       does not truncate. Caught: this rule used to require gap 6 for the pair, the pattern
       .sp-stacked replaced, so the Passkeys rows were drawn at 6 and passed.
       The boundary matters: sp-stacked contains sp-stack. */
    for (const m of s.matchAll(/class="(sp-stack(?![\w-])[^"]*)"(\s*>\s*<(?:span|div)[^>]*class="sp-(?:title|heading|strong|data)\b)/g)) {
      const cls = m[1].split(/\s+/);
      const tagStart = s.lastIndexOf('<', m.index);
      const isDiv = s.slice(tagStart, tagStart + 5) === '<div ';
      const open = isDiv ? '<div' : '<span', close = isDiv ? '</div>' : '</span>';
      let depth = 0, i = tagStart, end = -1;
      while (i < s.length) {
        const o = s.indexOf(open, i + 1), c = s.indexOf(close, i + 1);
        if (c < 0) break;
        if (o > -1 && o < c) { depth++; i = o; } else { if (!depth) { end = c; break; } depth--; i = c; }
      }
      const inner = s.slice(tagStart, end);
      /* A pair is a title or heading with one metadata line under it. A label over an
         object (a mark, a control, a specimen) is not one, nor is a heading over prose:
         a second line that is `sp-data`, or that ends a sentence, is a message and wraps. */
      const lines = [...inner.slice(inner.indexOf('>') + 1).matchAll(/<(span|div)[^>]*class="(sp-[\w-]+)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)];
      const second = lines[1];
      const secondText = second ? second[3].replace(/<[^>]+>/g, '').trim() : '';
      const notAPair = lines.length !== 2 || !/^sp-(subtitle|meta)$/.test(second[2]) || /[.!?]$/.test(secondText);
      const isCardBody = notAPair || CONTROL.test(inner) || /class="sp-(field__help|combobox|period)\b/.test(inner);
      if (!isCardBody) { fail('a title with its second line is sp-stacked', p, m[1] + ' holds a pair; use .sp-stacked (2px)'); continue; }
      if (/^sp-(title|heading)$/.test(lines[0] && lines[0][2]) && !cls.includes('sp-gap-6')) fail('a card body stack is gap 6', p, m[1]);
      if (cls.includes('sp-truncate')) fail('a card body does not truncate', p, m[1] + ' clips prose');
    }

    /* The first line of a pair is a text role (sp-title), not the weight utility.
       Caught: the Passkeys and Previous imports names were sp-strong, which inherits the
       page's 16px, so the pair stood apart even at the stack's 2px. */
    for (const m of s.matchAll(/class="sp-stacked[^"]*">\s*<(?:span|div)[^>]*class="sp-strong\b[^"]*"[^>]*>[^<]*<\/(?:span|div)>\s*<(?:span|div)[^>]*class="sp-(subtitle|meta)\b/g))
      fail('a pair starts with sp-title', p, 'sp-strong opens a pair');

    /* A button on the same line as an input is the input's height: the default button,
       never --small or --xsmall. Caught: the status rename row drew a 42px field beside
       34px Cancel and Save, and production copied it into the passkey rename. */
    for (const m of s.matchAll(/<div class="(?:sp-row-flex|sp-list-item)\b[^"]*"/g)) {
      let depth = 0, i = m.index, end = -1;
      while (i < s.length) {
        const o = s.indexOf('<div', i + 1), cl = s.indexOf('</div>', i + 1);
        if (cl < 0) break;
        if (o > -1 && o < cl) { depth++; i = o; } else { if (!depth) { end = cl; break; } depth--; i = cl; }
      }
      const inner = s.slice(m.index, end);
      if (/class="sp-(field|card|well|dialog|popover|menu|palette)\b/.test(inner)) continue;
      if (/<input class="sp-input\b/.test(inner) && /class="sp-btn\b[^"]*sp-btn--x?small\b/.test(inner))
        fail('a button beside an input matches its height', p, 'small button in a row with an sp-input');
    }

    // the sidebar's foot is the divider, then Ask, Settings and the account (9a, 24a);
    // the theme is set in Settings only, so no Dark mode row sits in the sidebar or the rail, in the rail too: the divider sits directly above Ask, and
    // Ask directly above Settings - never anything between them, and never
    // Settings without Ask above it
    for (const m of s.matchAll(/(<[^>]*>)\s*<a class="sp-nav-item"(?:(?!<\/a>)[\s\S])*?(?:<span>Settings<\/span>|aria-label="Settings")/g)) {
      const before = s.slice(0, m.index + m[1].length);
      const ask = before.lastIndexOf('<a class="sp-nav-item"');
      const askA = before.slice(ask);
      if (!/^<\/a>$/.test(m[1]) || !/Ask Spendly/.test(askA)) { fail('the sidebar foot is the divider, Ask, Settings', p, 'Settings follows ' + m[1].slice(0, 40)); continue; }
      if (!/<hr class="sp-sidebar__divider">\s*$/.test(s.slice(0, m.index + m[1].length - askA.length))) fail('the sidebar foot is the divider, Ask, Settings', p, 'Ask does not follow the divider');
    }

    if (/<(?:label|a) class="sp-nav-item"[^>]*>(?:(?!<\/(?:label|a)>)[\s\S])*?(?:aria-label="Dark mode"|<span>Dark mode<\/span>)/.test(s))
      fail('the theme is set in Settings only', p, 'a Dark mode row in the sidebar');

    // the Views card in edit mode is the at-rest list with two slots swapped (Order list 2g):
    // a different list component there changes the row height and shifts the rail
    for (const m of s.matchAll(/<span class="sp-section-label">Views<\/span>[\s\S]{0,200}?>Done<\/button>\s*<\/div>\s*<div class="([^"]*)"/g))
      if (m[1] !== 'sp-nav-list') fail('the Views card keeps its rows in edit mode', p, 'edit mode lists in .' + m[1]);

    // a region inside a page body that already has its inset takes the layout variant
    // alone: a second sp-shell__body adds the page's 16 inset twice
    for (const m of s.matchAll(/<div class="([^"]*\b(?:os-body|sp-shell__body)\b[^"]*)"/g)) {
      if (!/(^|\s)(os-body|sp-shell__body)(\s|$)/.test(m[1])) continue;
      let depth = 0, i = m.index, end = -1;
      while (i < s.length) {
        const o = s.indexOf('<div', i + 1), c = s.indexOf('</div>', i + 1);
        if (c < 0) break;
        if (o > -1 && o < c) { depth++; i = o; } else { if (!depth) { end = c; break; } depth--; i = c; }
      }
      const inner = s.slice(m.index + m[0].length, end);
      if (/<div class="sp-shell__body(\s|")/.test(inner)) fail('a body is not nested in a body', p, m[1]);
    }

    // a select-all box names its scope (c1): "Select all 25 orders on this page", never "Select all" alone
    for (const m of s.matchAll(/aria-label="(Select all[^"]*)"/g)) {
      if (!/\d/.test(m[1])) fail('a select-all box names its scope', p, m[1]);
    }

    // a saving is an amount, green unless zero, under the amount it belongs to
    for (const m of s.matchAll(/>([^<]{0,80})</g)) {
      const t = m[1].trim();
      if (/sav(ed|ing)/i.test(t) && /%/.test(t)) fail('a saving is never a percentage', p, `"${t}"`);
      if (/^saved\b/.test(t)) fail('a saving reads "Saved"', p, `"${t}"`);
    }
    if (/heic/i.test(s)) fail('HEIC is not offered and never named', p, 'HEIC present');
    if (/vs retail|compared to retail|of retail/i.test(s)) fail('a saving never says "vs retail"', p, 'phrase present');
    // a card headed Saved states amounts only: its figure and every pill under it
    for (const m of s.matchAll(/<span class="sp-section-label">Saved<\/span>([\s\S]*?)(?=<span class="sp-section-label"|<div class="sp-card|<\/section>)/g)) {
      for (const q of m[1].matchAll(/>([^<]*%[^<]*)</g)) fail('a saving is never a percentage', p, `Saved card shows "${q[1].trim()}"`);
      if (/sp-stat__figure(?![^"]*sp-ink-success)/.test(m[1].split('</div>')[0])) fail('a saving is green', p, 'Saved figure is not sp-ink-success');
    }
    // grey text after an amount in a row is the row meta column, so the amounts in a card line up
    for (const m of s.matchAll(/<div class="sp-row-flex[^"]*">((?:(?!<\/div>)[\s\S])*?)<span class="sp-amount[^"]*">([^<]*)<\/span>\s*<span class="(sp-meta[^"]*)">([^<]*)</g)) {
      if (!/\bsp-row-meta\b/.test(m[3])) fail('grey text after an amount is a sp-row-meta column', p, `"${m[2]}" then "${m[4]}"`);
    }
    for (const m of s.matchAll(/<span ([^>]*)>\s*(Saved [\d.,]+ kr\.)/g)) {
      const zero = /Saved 0,00/.test(m[2]);
      const green = /data-color="success"|stat__delta|sp-ink-success/.test(m[1]);
      if (zero && green) fail('a zero saving is grey', p, m[2]);
      if (!zero && !green) fail('a saving is green', p, `${m[2]} on [${m[1]}]`);
      if (zero && /sp-amount-secondary\b/.test(m[1]) === false && !green)
        fail('a saving is an amount', p, `${m[2]} is not on sp-amount-secondary`);
    }
    for (const m of s.matchAll(/class="sp-meta[^"]*"[^>]*>[^<]*<span class="sp-amount-secondary"[^>]*data-color="success">/g))
      fail('a saving sits under its amount', p, 'a saving is inside a meta line');

    // typographic tells
    for (const [ch, what] of [['\u2014','em dash'],['\u2013','en dash'],['\u2019','curly apostrophe'],['\u201C','curly quote'],['\u201D','curly quote'],['&'+'mdash;','mdash entity'],['&'+'ndash;','ndash entity'],['&'+'rsquo;','rsquo entity'],['&'+'ldquo;','ldquo entity'],['&rdquo;','rdquo entity']]) {
      const n = (s.split(ch).length - 1);
      if (n) fail('no typographic tells', p, `${n}× ${what}`);
    }
  }

  /* ---- 6. the spacing scale ---------------------------------------------- */

  const SCALE = ['--sp-2','--sp-4','--sp-6','--sp-8','--sp-10','--sp-12','--sp-14','--sp-16','--card-pad','--shell-pad','--shell-item-pad','--shell-gap','--phone-gutter','--pill-pad-x','--field-pad-x','--sidebar-block-extra'];
  for (const [name, css] of [['components.css', comp], ...Object.entries(pageCss)])
    for (const r of parse(css))
      for (const d of r.body.split(';')) {
        const [k, v] = d.split(':').map(x => (x || '').trim());
        if (!v) continue;
        if (!/^(gap|row-gap|column-gap)$/.test(k)) continue;
        const lits = (v.match(/(?<![\w-])\d+px/g) || []).filter(x => !['0px','1px','2px','3px'].includes(x));
        const off = (v.match(/--[\w-]+/g) || []).filter(t => !SCALE.includes(t));
        if (lits.length || off.length) fail('gaps are on the scale', name, `${r.sel} { ${k}: ${v} }`);
      }

  /* ---- 7. a page stylesheet holds only that page ------------------------- */

  // A .doc- rule is documentation chrome and belongs in doc.css; a .sp- rule is a
  // component and belongs in components.css. A page states its own classes only.
  // Referring to one to scope a page class - .doc-specimens > .rr-frame - is fine,
  // so only the rule's own subject counts.
  for (const [name, css] of Object.entries(pageCss))
    for (const r of parse(css))
      for (const sel of r.sel.split(',')) {
        const classes = [...sel.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
        if (!classes.length) continue;
        if (classes.some(c => !/^(sp|doc)-/.test(c))) continue;
        fail('a page stylesheet states only its own classes', name, `${sel.trim()} declares .${classes[0]}`);
      }

  /* Two exports that render the same root class are two names for one component.
     That is the defect `ListSearch` was: at a call site it and `SearchInput` took the
     same props and drew the same field, so the export list gave a developer no way to
     choose. A boolean prop separating them is not a second component - it is the
     prop. Read from the last `return` in each export, which is the component's own
     output rather than an early branch.

     The second half is vocabulary. A component named for an object the stylesheet
     calls something else means neither name finds the other: searching the CSS for
     `ShellMenu` returns nothing, searching the exports for `sidebar` returns nothing.
     One word per object, in both places. */
  {
    /* Every export parsed once: name, own body, root class. Three assertions read it,
       and reading the files once each is what keeps this inside the time budget. */
    const jsx = (await ls('react_handoff')).filter(f => f.endsWith('.jsx'));
    const exports = [];
    const reactSrc = {};
    for (const f of jsx) {
      const s = await readFile('react_handoff/' + f);
      reactSrc[f] = s;
      const marks = [...s.matchAll(/export function (\w+)\(/g)];
      marks.forEach((m, i) => {
        const from = m.index;
        const body = s.slice(from, i + 1 < marks.length ? marks[i + 1].index : s.length);
        /* The component's own return is the one at function-body indentation. The
           last return in the file was wrong: List's body ends with the footer's
           markup, so it reported .sp-subtitle as List's root. */
        const own = body.match(/\n\treturn \(?/);
        const tail = own ? body.slice(own.index).split(/\n\}/)[0] : '';
        // a component whose own root is a tree, not a single class, is not comparable
        const treeRoot = /^\s*return \(?\s*<[A-Z]/.test(tail);
        const cls = treeRoot ? null : (tail.match(/className=\{?(?:join\()?["'`]([\w-]+)/) || [])[1];
        const pre = s.slice(0, from), end = pre.lastIndexOf('*/'), start = pre.lastIndexOf('/**');
        const doc = start >= 0 && end > start && /^\s*$/.test(pre.slice(end + 2)) ? pre.slice(start, end) : '';
        exports.push({ f, n: m[1], body, cls, doc });
      });
    }
    /* Every export documents each prop it destructures with a JSDoc @param, in the app's
       form (`@param {object} props`, then `props.name`), since Storybook builds its props
       table from it. Caught: the app's components on main carried JSDoc on every export
       while 43 exports here had none, or a block that missed props or sat apart from
       the function. */
    for (const e of exports) {
      const open = e.body.match(/^export function \w+\(\s*\{/);
      if (!open) continue;
      let i = open[0].length, d = 1;
      while (d && i < e.body.length) { if (e.body[i] === '{') d++; else if (e.body[i] === '}') d--; i++; }
      let depth = 0, cur = '';
      const parts = [];
      for (const ch of e.body.slice(open[0].length, i - 1).replace(/\/\/[^\n]*/g, '')) {
        if ('{[('.includes(ch)) depth++;
        if ('}])'.includes(ch)) depth--;
        if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch;
      }
      parts.push(cur);
      const props = parts.map(p => p.trim()).filter(p => p && !p.startsWith('...')).map(p => p.match(/^['"]?([\w-]+)/)[1]);
      if (!props.length) continue;
      if (!/@param \{object\} props\b/.test(e.doc)) { fail('every component prop has JSDoc', e.f, `${e.n} has no @param {object} props block`); continue; }
      const missing = props.filter(p => !new RegExp(`@param \\{[^\\n]*\\}\\s+\\[?props(\\.${p}\\b|\\['${p}'\\])`).test(e.doc));
      if (missing.length) fail('every component prop has JSDoc', e.f, `${e.n} does not document ${missing.join(', ')}`);
    }

    /* One name for "take the room the control is given": `fullWidth`, a boolean, on every
       control that can take it. Caught: Button had fullWidth, Segmented a `fill` variant,
       FileDrop a `grow` prop and the Combobox a --grow class with no prop at all, so
       Budget.jsx passed a variant="grow" the component refused (Mobile screens 21a). */
    {
      const FULL = ['Button', 'Combobox', 'Field', 'TextField', 'PasswordField', 'NumberField', 'SearchInput', 'DateField', 'Segmented', 'FileDrop'];
      for (const n of FULL) {
        const e = exports.find(x => x.n === n);
        if (!e) { fail('one name for full width', 'react', n + ' is not exported'); continue; }
        if (!/\[props\.fullWidth\]/.test(e.doc)) fail('one name for full width', e.f, n + ' does not take fullWidth');
      }
      for (const e of exports)
        if (/@param \{boolean\} \[props\.(grow|fill|block)\]/.test(e.doc)) fail('one name for full width', e.f, e.n + ' takes its own name for fullWidth');
      for (const f of jsx)
        if (/VARIANT\s*=\s*\{[^}]*\b(grow|fill|block)\s*:/.test(reactSrc[f])) fail('one name for full width', f, 'a variant map carries grow, fill or block: that is fullWidth');
    }
    const roots = {};
    for (const e of exports) if (e.cls) (roots[e.cls] ||= []).push(e.n);
    for (const [cls, names] of Object.entries(roots))
      if (names.length > 1)
        fail('one component per root class', 'react', `.${cls} is rendered by ${names.join(' and ')}`);

    /* A component's name and the class it renders must share a word. Where they do
       not, neither name finds the other: searching `components.css` for `ShellMenu`
       returns nothing, searching the exports for `sidebar` returns nothing, and the
       reader has to already know they are the same object to look for either. The
       comparison is per word, since a compound name only has to match on one of
       them - `ShellContent` on `.sp-shell__body` is fine.

       Two exports name a slot and take a shared primitive for its look, which is the
       library working as intended rather than two vocabularies: a dialog's title is
       the system's heading, a slider's bar is the system's track, and a picker's
       cells are the system's options. Reuse is the
       rule those two follow, so they are named here rather than left to trip it. */
    const REUSED = { DialogTitle: 'sp-heading', RangeSlider: 'sp-track', Picker: 'sp-options' };
    for (const [cls, names] of Object.entries(roots))
      for (const n of names) {
        if (REUSED[n] === cls) continue;
        const words = n.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
        if (!words.some(w => cls.includes(w.replace(/s$/, '')))) fail('one word per object', 'react', `${n} renders .${cls}`);
      }

    /* A component that is only other components, arranged the same way every time,
       is not a component - it is a snippet with a name, and the name is the whole
       problem: it looks like a peer of the things it contains, so a developer reading
       the export list has two entries where one is a fixed arrangement of the other.
       `ListSearch` was exactly that, `SearchInput` in one box. Three tests together,
       because any one alone is wrong: the body renders no element of its own carrying
       a class, it does render other components, and it makes no decision. A component
       that adds a class, a state or a branch is doing work worth a name. */
    for (const e of exports) {
      const own = /<[a-z][\w]*[^>]*className=/.test(e.body);
      const kids = [...new Set([...e.body.matchAll(/<([A-Z]\w+)/g)].map(x => x[1]))].filter(k => k !== 'Icon');
      const decides = /useState|useEffect|useRef|\?|&&|pick\(|join\(/.test(e.body);
      /* A context provider shares a value with what is under it; it arranges nothing.
         Caught: MenuHostOf, the provider an Anchor or a record's menu wraps its menu in. */
      const provides = /useMemo\(/.test(e.body) && kids.every(k => /\.Provider$/.test(e.body.match(new RegExp('<' + k + '[\\w.]*'))[0]));
      if (!own && kids.length && !decides && !provides)
        fail('no component is only an arrangement', 'react', `${e.n} renders ${kids.join(' + ')} and nothing of its own`);
    }

    /* Nothing is named for a device. A device word promises one screen size and
       forbids the next, and it never matches what the library switches on anyway -
       `touch` is a prop and a class (`.sp-touch`), not a phone. `PhoneTopBar` and
       `PhoneSaveBar` both broke this, and the first was half of a duplicate too. */
    for (const e of exports)
      if (/phone|mobile|tablet|desktop|watch|ipad|android/i.test(e.n))
        fail('no component is named for a device', 'react', `${e.n} names a device`);
    for (const f of jsx)
      if (/phone|mobile|tablet|ipad|android/i.test(f))
        fail('no component is named for a device', 'react', `${f} names a device`);
  }

  /* A table that fills a flush card starts its first column on the card's own inset,
     the line the card's title starts on. The Budget year sheet took the compact
     table's 12px panel inset instead, and its row names sat 4px left of "Budget 2026"
     above them. Asserted on the stylesheet, since the rule is what every such table
     inherits. */
  if (!/\.sp-card--flush \.sp-table--compact td:first-child[^{]*\{[^}]*padding-left:\s*var\(--card-pad\)/.test(comp))
    fail('a table aligns with its card', 'components.css', 'a compact table in a flush card does not inset its first column by --card-pad');
  // and no page-level sticky or offset rule restates an inset as a raw step
  for (const [name, css] of Object.entries(pageCss))
    for (const m of css.matchAll(/position:\s*sticky;[^}]*left:\s*var\((--sp-\d+)\)/g))
      fail('a table aligns with its card', name, `a sticky label holds at ${m[1]}; the card's inset is --card-pad`);

  /* A row of stats whose stats have different line counts - one with a delta under its
     figure, one without - aligns them to their tops, or the shorter stat centres in the
     row and its label and figure drop below the others'. The Budget month card did this
     to "Left over" beside Income and Costs. */
  for (const [f, s] of Object.entries(src))
    for (const m of s.matchAll(/<div class="(sp-row-flex[^"]*)">\s*<div class="sp-stat">/g)) {
      if (m[1].split(/\s+/).includes('sp-top')) continue;
      let depth = 0, i = m.index, end = -1; const re = /<div\b|<\/div>/g; re.lastIndex = m.index; let t;
      while ((t = re.exec(s))) { depth += t[0] === '</div>' ? -1 : 1; if (!depth) { end = t.index; break; } }
      const lines = s.slice(m.index, end).split('<div class="sp-stat">').slice(1).map(x => (x.slice(0, x.indexOf('</div>')).match(/<span/g) || []).length);
      if (new Set(lines).size > 1) fail('a stat row aligns to the top', f.replace('.dc.html', ''), `stats of ${lines.join('/')} lines in a centred row`);
    }


  /* A faded photo is the vendor image standing in for a missing item photo: the photo
     drawn as it always is, faded. On anything that is not a photo the fade has no
     meaning. */
  for (const [f, s] of Object.entries(src)) {
    for (const m of s.matchAll(/class="([^"]*\bsp-mark--faded\b[^"]*)"/g))
      if (!m[1].split(/\s+/).includes('sp-mark--photo')) fail('a faded mark is a photo', f.replace('.dc.html', ''), m[1]);
    for (const m of s.matchAll(/class="([^"]*\bsp-record__photo--faded\b[^"]*)"/g))
      if (!m[1].split(/\s+/).includes('sp-record__photo')) fail('a faded band photo is a photo', f.replace('.dc.html', ''), m[1]);
  }


  /* An order's Categories field carries the Suggest categories bulb as its trail, on
     every page that draws one. It was added to Order create and missed on the saved
     state and on Order editing layouts 1d. The one exception is a field that already
     shows suggestions (a scanned order): the bulb shows there only when the scan
     found none. Filters (Bookmarks) are not an order's field and do not get it. */
  for (const [f, s] of Object.entries(src)) {
    if (f.startsWith('Bookmarks')) continue;
    for (const m of s.matchAll(/<label\s+class="sp-field__label" for="([^"]+)">Categories<\/label>/g)) {
      const i = s.indexOf(`id="${m[1]}"`, m.index);
      if (i < 0 || !/class="sp-tokens__add"/.test(s.slice(i - 80, i + 80))) continue;
      const tail = s.slice(i, i + 1600);
      const fieldEnd = tail.search(/<div class="sp-field">|<div class="sp-fields">|<div class="sp-card/);
      const field = fieldEnd < 0 ? tail : tail.slice(0, fieldEnd);
      if (/aria-label="Suggest categories"/.test(field) || /Suggested from the items/.test(field)) continue;
      fail('an order Categories field has the bulb', f.replace('.dc.html', ''), m[1]);
    }
  }


  /* A suggestion under a field ("+ Lighting", "+ New: Seating") carries sp-chip--suggestion,
     so on touch it is drawn at 36px with a 48px tap area. Caught: the suggestions under an
     order's Categories took the 48px touch height and stood taller than the field's chips. */
  for (const [f, s] of Object.entries(src))
    for (const m of s.matchAll(/<button[^>]*class="([^"]*\bsp-chip\b[^"]*)"[^>]*><span>\+ /g))
      if (!m[1].split(/\s+/).includes('sp-chip--suggestion')) fail('a suggestion chip is sp-chip--suggestion', f.replace('.dc.html', ''), m[1]);


  /* An order's details form lists its fields in one order on every page and in every
     action, create or edit: Vendor, Date, Kind, Status, Categories, Reference, Note,
     Discount, Shipping fee. Order create and Order editing layouts had drifted into
     three different orders. Checked on every card headed "Order details". */
  {
    const ORDER = ['Vendor', 'Date', 'Kind', 'Status', 'Categories', 'Reference', 'Note', 'Discount', 'Shipping fee'];
    for (const [f, s] of Object.entries(src)) {
      for (const m of s.matchAll(/sp-section-label">Order details</g)) {
        const card = s.lastIndexOf('<div class="sp-card">', m.index);
        const re = /<div\b[^>]*>|<\/div>/g; re.lastIndex = card; let d = 0, t, end = s.length;
        while ((t = re.exec(s))) { d += t[0] === '</div>' ? -1 : 1; if (!d) { end = t.index; break; } }
        const got = [...s.slice(card, end).matchAll(/class="sp-field__label"[^>]*>([^<]+)</g)].map(x => x[1].trim()).filter(x => ORDER.includes(x));
        const want = ORDER.filter(x => got.includes(x));
        if (got.join() !== want.join()) fail('order details fields in one order', f.replace('.dc.html', ''), got.join(', '));
      }
    }
  }


  /* A removed feature leaves nothing behind: no page, link, route or note still names
     the monthly letter. Its removal once left a /letters route row on Home. */
  for (const [f, s] of Object.entries(src)) {
    if (/\/letters\b|Monthly letter\.dc\.html|sp-letter/.test(s)) fail('removed feature leaves no trace', f.replace('.dc.html', ''), 'monthly letter');
  }

  /* What is left to check stays in view. A Drafts row read "file name · 1 line" on one
     cut line, so a long file name hid what was left. The count leads and the file
     name takes the cut (Brief 32). Swept on text: any one-line meta where a file name
     comes before more text. */
  for (const [f, s] of Object.entries(src)) {
    for (const m of s.matchAll(/class="sp-meta sp-truncate">([^<]*)</g)) {
      if (/\.(pdf|jpe?g|png|webp|gif|heic) · /i.test(m[1])) fail('what is left to check leads the file name', f.replace('.dc.html', ''), m[1]);
    }
  }

  /* A link in a card's head does not make the head taller on touch. On a phone the
     "All 4" link took the 48px button height, so Drafts and Recent orders had a 48px
     head and This month a 17px one (Brief 32). The link keeps the small button's box
     and takes the touch height as a hit area, under .sp-touch and below 640px alike.
     Brief 33: a 34px box still made the head 34px against the name's 17, so the box
     must also take no height in the row - a negative block margin of half the box. */
  {
    /* Brief 34: a card head is the toolbar's height, and the small height is a token, not a raw 34px */
    const head = /\n\.sp-card > \.sp-card__head:first-child \{[^}]*flex-wrap: nowrap[^}]*height: var\(--card-header-h\)[^}]*border-bottom: 1px solid transparent/.test(comp);
    if (/sp-btn--text[^{]*\{[^}]*margin-block: calc\(var\(--btn-h-small\)/.test(comp)) fail('no head link rule is left', 'components.css', 'the text link head rule is back');
    if (!head) fail('a card head is the list toolbar height', 'components.css', 'no --card-header-h rule on the card head');
    if (!/--btn-h-small: 34px;/.test(tok)) fail('the small button height is a token', 'tokens.css', 'no --btn-h-small');
    const raw = comp.replace(/\/\*[\s\S]*?\*\//g, '').match(/(?:height|margin[a-z-]*|padding[a-z-]*|gap|inset):[^;]*\b34px/g) || [];
    for (const r of raw) fail('the small button height is written with --btn-h-small', 'components.css', r);
  }

  /* Brief 36. The Showing bar is a card with a head, not a row of its own: as one row
     its path wrapped, the name drifted to the row's middle and "Open in orders" ran
     101px past a phone's edge. A head button on touch keeps its 34px box with the 48px
     area invisible, as the bookmark chip does. A part takes no page rule: the spread,
     the narrow field and the reading column are the design's own, and a row that opens
     something is the row's state, not a page's look. */
  {
    if (/sp-crumbs-bar/.test(allCss + Object.values(src).join(''))) fail('the Showing bar is a card with a head', 'pages', 'sp-crumbs-bar is back');
    for (const f of pages) for (const m of src[f].matchAll(/<span class="sp-section-label">Showing<\/span>/g)) {
      const before = src[f].slice(Math.max(0, m.index - 80), m.index);
      if (!/<div class="sp-card__head">\s*$/.test(before)) fail('the Showing bar is a card with a head', f, 'the name is not the first child of a head row');
      if (!/<div class="sp-card sp-card--path(?: [^"]*)?">\s*<div class="sp-card__head">\s*$/.test(src[f].slice(Math.max(0, m.index - 120), m.index))) fail('the Showing bar holds its path in the head line when it fits', f, 'no sp-card--path');
    }
    if (!/\.sp-touch \.sp-card > \.sp-card__head:first-child > \.sp-btn--small,\n\.sp-touch \.sp-list__toolbar > \.sp-btn--small \{ min-height: 0; height: var\(--btn-h-small\)/.test(comp)) fail('a head button keeps its 34px box on touch', 'components.css', 'no touch rule');
    if (!/\.sp-touch \.sp-list__toolbar > \.sp-btn--small::before \{ content: ""; position: absolute; inset: calc\(\(var\(--control-h-touch\) - var\(--btn-h-small\)\) \/ -2 - 1px\)/.test(comp)) fail('a head button keeps its 34px box on touch', 'components.css', 'no invisible touch area');
    for (const v of ['.sp-card--spread', '.sp-combobox--narrow', '.sp-segmented--narrow', '.sp-row-opens:hover', '.sp-row-opens:focus-visible'])
      if (!comp.includes(v + ' {')) fail('a part changes only through the design', 'components.css', v + ' missing');
    for (const [f, css] of Object.entries(pageCss))
      for (const sel of css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{/g) || [])
        if (/\.sp-card(--[\w-]+)?\b/.test(sel) && /justify-content|align-content/.test(css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel))))) fail('a part changes only through the design', f, sel.trim());
    for (const f of pages) for (const m of src[f].matchAll(/class="([^"]*)"/g)) {
      const c = m[1].split(/\s+/);
      if (c.some(x => /^sp-/.test(x)) && c.some(x => x === 'st-w280' || x === 'oc-narrow')) fail('a part takes no page rule', f, m[1]);
    }
    /* swept on the card's name, not on a class: every row under these names opens something */
    const OPENS = ['By status', 'Top vendors', 'Categories this month', 'DRAFTS', 'RECENT ORDERS'];
    for (const f of pages) for (const name of OPENS) for (const m of src[f].matchAll(new RegExp('<span class="sp-section-label">' + name + '</span>', 'g'))) {
      const cs = src[f].lastIndexOf('<div class="sp-card', m.index);
      const next = src[f].slice(m.index).search(/<div class="sp-card|<\/section>/);
      const seg = src[f].slice(m.index, m.index + (next < 0 ? 4000 : next));
      for (const r of seg.matchAll(/<div class="(?:sp-stack sp-gap-6|sp-row-flex sp-gap-12)">\s*<(?:div class="sp-(?:row-flex|mark)|span class="sp-mark)([\s\S]{0,400})/g))
        if (/sp-gauge|sp-mark--medium/.test(r[0]) && !/>Other \d/.test(r[0])) fail('a row that opens something is drawn as one', f, name + ' has a plain row');
    }
  }

  /* Every part of a head is centred on its line: .sp-segmented aligns itself to the start,
     and in a head that put the switch on the head's top edge (Spend by month, 4a). */
  if (!/\.sp-card > \.sp-card__head:first-child > \*,\n\.sp-list__toolbar > \* \{ align-self: center; \}/.test(comp)) fail('every part of a head is centred', 'components.css', 'no align-self rule on head parts');
  /* The start page lists each page's screen ids, and the docs name only what exists.
     The handoff shipped an index listing 14b-14g and 16c-16h, which no page has, and
     notes naming classes and tokens that were removed (sp-amount-secondary--positive,
     --caps). The status log is history and exempt; it says so at its head. */
  {
    const idx = await readFile('index.html');
    for (const m of idx.matchAll(/<a class="card" href="([^"#]+)[^"]*">[\s\S]*?<\/a>/g)) {
      const f = decodeURIComponent(m[1]); if (!src[f]) continue;
      const real = [...src[f].matchAll(/class="doc-badge"[^>]*>([^<]+)</g)].map(x => x[1].trim()).filter(x => /^\d+[a-z]$/.test(x));
      const listed = [...(m[0].match(/<div class="ids"[^>]*>([\s\S]*?)<\/div>/) || [, ''])[1].matchAll(/<span>([^<]+)<\/span>/g)].map(x => x[1].trim());
      if (listed.join() !== real.join()) fail('the start page lists each page\'s screens', 'index.html', f + ' lists ' + (listed.join(',') || 'none') + ', the page has ' + (real.join(',') || 'none'));
    }
    for (const w of ['DECISIONS.md', 'BEHAVIOUR.md', 'offline/', 'screenshots/']) if (idx.includes(w)) fail('the start page names only files that exist', 'index.html', w);
    { const n = Object.values(src).reduce((t, s) => t + [...s.matchAll(/class="doc-badge"[^>]*>\d+[a-z]</g)].length, 0); const said = (idx.match(/and (\d+) screens/) || [])[1]; if (String(n) !== said) fail('the start page counts the screens', 'index.html', 'says ' + said + ', the pages have ' + n); }
    /* the rules file is CLAUDE.md in the project and PROJECT-RULES.md in a handoff */
    const root = await ls('');
    const docs = [root.includes('CLAUDE.md') ? 'CLAUDE.md' : 'PROJECT-RULES.md', 'styles/CONVERSION-CHECKS.md', 'react_handoff/README.md'];
    const toks = new Set([...tok.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
    const hooks = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map(x => x[1]));
    for (const d of docs) {
      const s = await readFile(d);
      /* a line saying the name was removed or does not exist is a deliberate negative example */
      const neg = i => /never|deleted|does not exist|removed|retired|invented|were the same/i.test(s.slice(s.lastIndexOf('\n', i), s.indexOf('\n', i + 1) < 0 ? s.length : s.indexOf('\n', i + 1)));
      for (const m of s.matchAll(/`\.?(sp-[a-z][\w-]*[a-z0-9])`/g)) if (!neg(m.index) && !new RegExp('\\.' + m[1] + '(?![\\w-])').test(allCss)) fail('the docs name only classes that exist', d, m[1]);
      for (const m of s.matchAll(/`(--[a-z][\w-]*)`/g)) if (!toks.has(m[1]) && !hooks.has(m[1]) && !neg(m.index) && !/^--(outline|small|xsmall|commits|text|loose|link|toggle|path|spread|narrow|flush|row|shell|block|caps)$/.test(m[1])) fail('the docs name only tokens that exist', d, m[1]);
    }
  }
  /* Every typed field is 16px on touch, or iOS zooms in on focus (the bookmark category
     picker on a phone). The rule must exist and name every field that takes text. */
  {
    const m = comp.match(/\.sp-touch :is\(([^)]*)\)[^{]*\{ font-size: var\(--t-16\); \}/);
    const need = ['.sp-input', '.sp-textarea', '.sp-tokens__add', '.sp-palette__term', '.sp-stepper__value', '.sp-input.sp-input--cell'];
    if (!m) fail('a field on touch is 16px', 'components.css', 'no touch font-size rule for typed fields');
    else for (const n of need) if (!m[1].split(',').map(x => x.trim()).includes(n)) fail('a field on touch is 16px', 'components.css', n + ' is not in the touch rule');
  }
  /* A token field is a field's height with one line of values as when empty, and its first
     line does not move as values wrap (Brief 40): the padding is the field less the line
     less the border, the lines pack to the top, and the add input is a line tall. */
  {
    const base = comp.match(/\n\.sp-tokens \{[^}]*\}/);
    if (!base || !/padding: calc\(\(var\(--control-h\) - var\(--field-trail\)\) \/ 2 - 1px\) var\(--sp-10\)/.test(base[0])) fail('a token field keeps its height', 'components.css', '.sp-tokens padding does not leave room for the border');
    if (!base || !/align-content: flex-start/.test(base[0])) fail('a token field keeps its height', 'components.css', '.sp-tokens lines do not pack to the top');
    if (!/\.sp-touch \.sp-tokens \{ min-height: var\(--control-h-touch\); padding-block: calc\(\(var\(--control-h-touch\) - var\(--field-trail\)\) \/ 2 - 1px\); \}/.test(comp)) fail('a token field keeps its height', 'components.css', 'touch .sp-tokens padding does not match its height');
    const add = comp.match(/\n\.sp-tokens__add \{[^}]*\}/);
    if (!add || !/height: var\(--field-trail\)/.test(add[0])) fail('a token field keeps its height', 'components.css', '.sp-tokens__add is not a line tall');
  }
  /* A chart's loading bar is only ever a chart's child; a part held at its own box is
     sp-skeleton--fill. The app used the bar for fields and buttons, and they fell to 0px
     once the bar stood on the baseline. */
  if (!/\.sp-skeleton--fill \{[^}]*height: 100%[^}]*align-self: stretch/.test(comp)) fail('a loading shape fits its job', 'components.css', 'no sp-skeleton--fill');
  for (const f of pages) for (const m of src[f].matchAll(/<span class="sp-skeleton sp-skeleton--bar"/g)) if (!/<div class="sp-bars[^"]*">\s*(?:<span class="sp-skeleton sp-skeleton--bar"[^>]*><\/span>\s*)*$/.test(src[f].slice(Math.max(0, m.index - 1200), m.index))) fail('a loading shape fits its job', f, 'a chart loading bar outside .sp-bars');
  /* A chart's label is one line, centred under its bar even when wider than the column. */
  if (!/\.sp-bars__tick \{[^}]*align-self: center;[^}]*white-space: nowrap;/.test(comp)) fail('a chart label is centred under its bar', 'components.css', '.sp-bars__tick does not centre itself on one line');
  /* A chart's legend is under the chart it keys. Spend by month drew it between the head
     and the chart, Spend vs saving under it: two places for one part. Checked on markup:
     the element before a legend, in its card, is the chart. */
  for (const f of pages) for (const m of src[f].matchAll(/<div class="sp-legend[\s"]/g)) {
    const before = src[f].slice(Math.max(0, m.index - 4000), m.index);
    const card = before.lastIndexOf('<div class="sp-card');
    const scope = before.slice(card < 0 ? 0 : card);
    const lastChart = Math.max(scope.lastIndexOf('class="sp-plot"'), scope.lastIndexOf('class="sp-bars'), scope.lastIndexOf('class="sp-donut'));
    if (lastChart < 0) fail('a legend is under its chart', f, 'a legend with no chart before it in its card: ' + src[f].slice(m.index, m.index + 120).replace(/\s+/g, ' '));
  }
  /* A crumb is text only, and its text is its label. A path mixes periods, statuses and
     ranges with vendors and categories, and only the last two have a mark, so a mark on
     some crumbs is the inconsistency itself: Indbo Møbler had one in 4b and 4c, Decor
     beside it did not. */
  for (const f of pages) for (const m of src[f].matchAll(/<span class="sp-crumb">(?!<span class="sp-crumb__label")/g)) fail(/^<span class="sp-crumb"><span class="sp-mark/.test(src[f].slice(m.index, m.index + 50)) ? 'a crumb is text only' : 'a crumb carries its label', f, src[f].slice(m.index, m.index + 60));

  /* CardHeader. The head was a structural rule - a row helper whose first child is the
     name, or the name standing alone - so it had no name of its own, and code built from
     the design could not tell a head from any other row: 191 heads in two shapes and
     three gaps. It is one element now, .sp-card__head, and the React CardHeader renders
     it. A card that opens with its name and no head, a head carrying a row helper's
     classes, or a structural head selector coming back, is a finding. */
  {
    for (const f of pages) {
      const s = src[f];
      for (const m of s.matchAll(/class="sp-card(?:\s[^"]*)?"[^>]*>\s*(<span class="sp-section-label"|<div class="sp-row-flex[^"]*">\s*<span class="sp-section-label")/g))
        fail('a card name is in a CardHeader', f, m[1].slice(0, 60));
      for (const m of s.matchAll(/class="sp-card__head [^"]*"|class="[^"]+ sp-card__head"/g)) fail('a CardHeader takes no other class', f, m[0]);
      for (const m of s.matchAll(/<div class="sp-card__head">/g))
        if (!/<[a-z]+\b[^>]*\bclass="sp-card(?:\s[^"]*)?"[^>]*>\s*$/.test(s.slice(Math.max(0, m.index - 400), m.index))) fail('a CardHeader is only a card\'s first child', f, s.slice(m.index, m.index + 80));
      for (const m of s.matchAll(/<div class="sp-card__head">(?!\s*<span class="sp-section-label")/g)) fail('a CardHeader opens with the name', f, s.slice(m.index, m.index + 80));
    }
    if (/sp-row-flex:first-child|\.sp-card > \.sp-section-label/.test(comp)) fail('a CardHeader is a class, not a structure', 'components.css', 'a structural head selector is back');
    const card = await readFile('react_handoff/Card.jsx');
    if (!/export function CardHeader\(/.test(card) || !/className="sp-card__head"/.test(card)) fail('a CardHeader is a component', 'react_handoff/Card.jsx', 'no CardHeader rendering .sp-card__head');
    if (!/useContext\(HeadSlot\)/.test(card) || !/<HeadSlot\.Provider value=\{true\}>/.test(card)) fail('a CardHeader is only a child of Card', 'react_handoff/Card.jsx', 'CardHeader does not refuse to render outside Card');
  }

  /* A button on a field label's line is the xsmall size: a 34px button beside a 12px
     label pushed that field's input lower than the field beside it (20a, Forgot it?). */
  for (const f of pages) for (const m of src[f].matchAll(/<label class="sp-field__label"[^>]*>[^<]*<\/label>\s*(?:<div class="sp-grow"><\/div>\s*)?(?:<span class="[a-z]{2}-[\w-]+">\s*)?<button[^>]*class="([^"]*)"/g))
    if (/\bsp-btn\b/.test(m[1]) && !/\bsp-btn--xsmall\b/.test(m[1])) fail('a button beside a field label is xsmall', f, m[1]);

  /* A checkbox is the input. A drawn box (a div.sp-check holding a tick) has no state,
     no label and no keyboard - 20a's Stay signed in was one. */
  for (const f of pages) for (const m of src[f].matchAll(/<(div|span) class="sp-check"/g)) fail('a checkbox is the input', f, m[0]);
  /* An action is a link or a button. Green bold text standing in for one has no hover,
     no focus and no target - 20a-20d had nine. Swept on the ink, not on the words. */
  for (const f of pages) for (const m of src[f].matchAll(/<(div|span) class="(?:sp-title|sp-strong)(?: sp-center)? sp-ink-accent(?: sp-center)?"[^>]*>([^<]{1,40})</g)) if (!/^[\d.,]+\s*(px|kr\.)?$/.test(m[2].trim())) fail('an action is a link or a button', f, m[2]);
  for (const f of pages) for (const m of src[f].matchAll(/<(div|span) class="sp-(?:ink-accent sp-strong|strong sp-ink-accent)"[^>]*>([^<]{1,40})</g)) if (!/^[\d.,]+\s*(px|kr\.)?$/.test(m[2].trim())) fail('an action is a link or a button', f, m[2]);

  /* An email on one line keeps its domain: .sp-email-line, never .sp-truncate, which
     cuts the domain - the part that says which account it is. The phone's account card
     did. An email or a name inside a sentence is .sp-break, or a long one runs out of
     its card (20b, 20c). Swept on the text, not on a class. */
  if (/sp-nav-item__(sub--email|local|domain)/.test(comp + Object.values(src).join(''))) fail('an email on one line is .sp-email-line', 'pages', 'the old nav-only name is back');
  for (const f of pages) {
    const t = src[f].replace(/<script[\s\S]*?<\/script>/g, '');
    for (const m of t.matchAll(/class="[^"]*\bsp-truncate\b[^"]*"[^>]*>[^<]*@[\w-]+\./g)) fail('an email on one line is .sp-email-line', f, m[0].slice(0, 70));
    for (const m of t.matchAll(/<(b|strong|span|div)\b([^>]*)>([^<]*[\w.+-]+@[\w-]+\.[\w.-]+[^<]*)</g)) {
      const cls = (m[2].match(/class="([^"]*)"/) || [, ''])[1];
      if (/\bsp-break\b|sp-email-line__|^doc-|\bdoc-/.test(cls)) continue;
      const before = t.slice(0, m.index);
      if (!cls && /^<div class="doc-/.test(before.slice(before.lastIndexOf('<div')))) continue;
      fail('a typed value in a sentence is .sp-break', f, m[3].trim().slice(0, 50));
    }
  }

  /* A list row that holds a control is a setting, not a choice: it carries
     .sp-list-item--setting, or the checked-row tint (.sp-list-item:has(input:checked))
     paints it green for good, since a Segmented always has one option checked. The
     phone's Status email row did, and the two Each row is rows in 11b. A row with a
     data-color states its own ground, which already outranks the tint. Swept on the markup. */
  for (const f of pages) {
    const t = src[f].replace(/<script[\s\S]*?<\/script>/g, '');
    for (const m of t.matchAll(/class="sp-segmented\b/g)) {
      let depth = 0;
      const tags = [...t.slice(0, m.index).matchAll(/<(\/?)div\b([^>]*)>/g)].reverse();
      for (const g of tags) {
        if (g[1]) { depth++; continue; }
        if (depth) { depth--; continue; }
        const cls = (g[2].match(/class="([^"]*)"/) || [, ''])[1];
        if (/\bsp-list-item\b/.test(cls)) { if (!/\bsp-list-item--setting\b/.test(cls) && !/data-color=/.test(g[2])) fail('a list row holding a control is .sp-list-item--setting', f, cls); break; }
      }
    }
  }
  if (!/\.sp-list-item--setting:has\(input:checked\)/.test(comp)) fail('a list row holding a control is .sp-list-item--setting', 'styles/components.css', 'the variant is missing');

  /* The section nav is one component, .sp-section-nav (c35). Caught: Settings 11a drew it
     as page class .st-subnav with menu items, and the Section switcher drew a second one with
     light nav rows at another width, so the header lined up with the labels on one page and
     not the other. A nav of light rows is the section nav, the old name is gone, and no page
     or doc stylesheet restyles it. */
  {
    if (!/\.sp-section-nav \{/.test(comp)) fail('the section nav is .sp-section-nav', 'styles/components.css', 'the component is missing');
    for (const f of pages) {
      const t = src[f].replace(/<script[\s\S]*?<\/script>/g, '');
      if (/\bst-subnav\b/.test(t)) fail('the section nav is .sp-section-nav', f, 'uses the retired .st-subnav');
      for (const m of t.matchAll(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/g)) {
        if (!/sp-nav-item--light/.test(m[2])) continue;
        const cls = (m[1].match(/class="([^"]*)"/) || [, ''])[1];
        if (cls.trim() !== 'sp-section-nav') fail('the section nav is .sp-section-nav', f, 'a nav of light rows on class "' + cls + '"');
      }
    }
    const others = { 'styles/doc.css': doc };
    for (const [k, v] of Object.entries(pageCss)) others['styles/pages/' + k] = v;
    for (const [k, v] of Object.entries(others)) {
      if (/\bst-subnav\b/.test(v)) fail('the section nav is .sp-section-nav', k, 'styles the retired .st-subnav');
      if (/\.sp-section-nav\b/.test(v.replace(/\/\*[\s\S]*?\*\//g, ''))) fail('the section nav is .sp-section-nav', k, 'restyles .sp-section-nav outside components.css');
    }
  }

  /* A name uses the row's free space before it is cut. Caught: the AI assistants token row
     (Settings 11e, Mobile 7a) put a .sp-grow spacer after Stacked (sp-stacked--fill, flex: 1),
     so the spacer took half the free space and "Claude on my laptop" was cut beside empty room.
     No page puts a spacer right after a filling column, and the stylesheet hides one if left. */
  {
    if (!/\.sp-stacked--fill \+ \.sp-grow \{ display: none; \}/.test(comp)) fail('a filling text column has no spacer after it', 'styles/components.css', 'the .sp-stacked--fill + .sp-grow rule is missing');
    for (const f of pages) {
      const t = src[f].replace(/<script[\s\S]*?<\/script>/g, '');
      for (const m of t.matchAll(/<(span|div)\b[^>]*class="[^"]*\bsp-stacked--fill\b[^"]*"[^>]*>/g)) {
        const re = /<(\/?)(span|div)\b[^>]*>/g; re.lastIndex = m.index + m[0].length;
        let depth = 1, x;
        while (depth && (x = re.exec(t))) depth += x[1] ? -1 : 1;
        if (!x) continue;
        const next = t.slice(re.lastIndex).match(/^\s*<span class="sp-grow"><\/span>/);
        if (next) fail('a filling text column has no spacer after it', f, 'a .sp-grow spacer right after sp-stacked--fill');
      }
    }
  }

  /* ---- report ------------------------------------------------------------ */

  const byRule = {};
  for (const x of findings) (byRule[x.rule] ||= []).push(x);
  const lines = [`${findings.length} finding(s) across ${pages.length} pages`];
  for (const [rule, list] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
    lines.push('', `${rule} - ${list.length}`);
    for (const x of list.slice(0, 12)) lines.push(`   ${x.where}: ${x.detail}`);
    if (list.length > 12) lines.push(`   … and ${list.length - 12} more`);
  }
  return { findings, report: lines.join('\n') };
}; })()
