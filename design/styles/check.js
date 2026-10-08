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

  /* A page's Go to tweak lists its sections by badge. It is typed by hand, so a section
     added or renumbered left the menu pointing at the old numbers. */
  for (const f of pages) {
    const t = await readFile(f);
    const m = t.match(/&quot;jumpTo&quot;: \{[^}]*?options&quot;: \[([^\]]*)\]/);
    if (!m) continue;
    const opts = [...m[1].matchAll(/&quot;([^&]*)&quot;/g)].map(x => x[1]).filter(o => o !== 'top');
    const ids = [...t.matchAll(/class="doc-badge" id="([^"]+)"/g)].map(x => x[1]);
    const optIds = opts.map(o => o.split(' ')[0]);
    for (const i of optIds) if (!ids.includes(i)) fail('the Go to menu matches the page', f, i + ' is in the menu but not on the page');
    for (const i of ids) if (i !== 'r0' && !optIds.includes(i)) fail('the Go to menu matches the page', f, i + ' is on the page but not in the menu');
    if (optIds.join() !== ids.filter(i => optIds.includes(i)).join()) fail('the Go to menu matches the page', f, 'menu order differs from page order');
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
    const b = css.slice(0, at);
    const l = Math.max(b.lastIndexOf('@media'), b.lastIndexOf('@container'), b.lastIndexOf('@supports'), b.lastIndexOf('@keyframes'));
    if (l < 0) return null;
    const between = css.slice(l, at);
    return (between.match(/\{/g) || []).length - (between.match(/\}/g) || []).length > 0
      ? css.slice(l, css.indexOf('{', l)).replace(/\s+/g, ' ').trim() : null;
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
    // byte-identical duplicates are dead weight
    const seen = {};
    for (const r of rules) (seen[r.sel + '||' + r.body] ||= []).push(r.at);
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
    // a title with its second line is one block: sp-stack sp-gap-6, truncating unless
    // the stack is a card body whose lines are prose
    // the boundary matters: sp-stacked contains sp-stack, and without it every
    // stacked pair in the system falls into this rule
    for (const m of s.matchAll(/class="(sp-stack(?![\w-])[^"]*)"(\s*>\s*<(?:span|div)[^>]*class="sp-(?:title|heading)\b)/g)) {
      const cls = m[1].split(/\s+/);
      if (!cls.includes('sp-gap-6')) fail('a stacked pair is gap 6', p, m[1]);
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
      const lines = [...inner.matchAll(/<(span|div)[^>]*class="(sp-[\w-]+)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)];
      const second = lines[1];
      const secondText = second ? second[3].replace(/<[^>]+>/g, '').trim() : '';
      const notAPair = !second || !/^sp-(subtitle|meta)$/.test(second[2]) || /[.!?]$/.test(secondText);
      const isCardBody = notAPair || CONTROL.test(inner) || /class="sp-(field__help|combobox|period)\b/.test(inner);
      if (!isCardBody && !cls.includes('sp-truncate')) fail('a stacked pair truncates', p, m[1]);
      if (isCardBody && cls.includes('sp-truncate')) fail('a card body does not truncate', p, m[1] + ' clips prose');
    }

    // the sidebar's foot is the divider, then Settings, Dark mode and the account (9a),
    // in the rail too: the divider sits above Settings, never between Settings and Dark mode
    for (const m of s.matchAll(/(<[^>]*>)\s*<a class="sp-nav-item"(?:(?!<\/a>)[\s\S])*?(?:<span>Settings<\/span>|aria-label="Settings")/g)) {
      if (!/^<hr class="sp-sidebar__divider"/.test(m[1])) fail('the sidebar divider sits above Settings', p, 'Settings follows ' + m[1].slice(0, 40));
    }

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
    for (const f of jsx) {
      const s = await readFile('react_handoff/' + f);
      const marks = [...s.matchAll(/export function (\w+)\(/g)];
      marks.forEach((m, i) => {
        const from = m.index;
        const body = s.slice(from, i + 1 < marks.length ? marks[i + 1].index : s.length);
        /* The component's own return is the one at function-body indentation. The
           last return in the file was wrong: List's body ends with the footer's
           markup, so it reported .sp-subtitle as List's root. */
        const own = body.match(/\n\treturn \(?/);
        const tail = own ? body.slice(own.index) : '';
        // a component whose own root is a tree, not a single class, is not comparable
        const treeRoot = /^\s*return \(?\s*<[A-Z]/.test(tail);
        const cls = treeRoot ? null : (tail.match(/className=\{?(?:join\()?["'`]([\w-]+)/) || [])[1];
        exports.push({ f, n: m[1], body, cls });
      });
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
      if (!own && kids.length && !decides)
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
    const head = /\n\.sp-card > \.sp-row-flex:first-child:has\(> \.sp-section-label:first-child\),\n\.sp-card > \.sp-section-label:first-child \{[^}]*flex-wrap: nowrap[^}]*height: var\(--card-header-h\)[^}]*border-bottom: 1px solid transparent/.test(comp);
    if (/sp-btn--text[^{]*\{[^}]*margin-block: calc\(var\(--btn-h-small\)/.test(comp)) fail('no head link rule is left', 'components.css', 'the text link head rule is back');
    if (!head) fail('a card head is the list toolbar height', 'components.css', 'no --card-header-h rule on the card head');
    if (!/--btn-h-small: 34px;/.test(tok)) fail('the small button height is a token', 'tokens.css', 'no --btn-h-small');
    const raw = comp.replace(/\/\*[\s\S]*?\*\//g, '').match(/(?:height|margin[a-z-]*|padding[a-z-]*|gap|inset):[^;]*\b34px/g) || [];
    for (const r of raw) fail('the small button height is written with --btn-h-small', 'components.css', r);
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
