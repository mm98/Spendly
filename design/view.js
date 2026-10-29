/* The view every page's tweaks share: theme and colour scheme. A change made in one
   page's tweaks is kept, and every page opened after it starts from that choice, so the
   whole design system is looked at in one configuration. A page's own saved tweak is
   only its starting point until something is chosen. */
window.SpView = (() => {
  const KEY = 'sp-view-v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  // the schemes there are; any other id (one since removed) reads as the default
  const SCHEMES = ['rust', 'mocha', 'ochre', 'olive', 'emerald', 'teal', 'ocean', 'slate', 'navy', 'cobalt', 'indigo', 'violet', 'plum', 'raspberry', 'oxblood', 'charcoal'];
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
  const pick = (p) => ({ theme: (p.theme ?? 'light') === 'dark' ? 'dark' : 'light', scheme: p.scheme ?? 'emerald' });
  return {
    // called with the previous props on update: a tweak that changed becomes the shared choice
    // a value arriving where there was none is the page's saved tweak loading, not a
    // choice; only a value replacing another is written, one key at a time
    sync(props, prev) {
      if (!prev) return;
      const v = read();
      let changed = false;
      for (const k of ['theme', 'scheme']) {
        if (prev[k] !== undefined && props[k] !== undefined && prev[k] !== props[k]) { v[k] = props[k]; changed = true; }
      }
      if (changed) write(v);
    },
    // a choice made inside the design (Settings 11a tiles) is the shared choice at once
    choose(k, val) {
      const v = read(); v[k] = val; write(v);
      const el = document.querySelector('.sp');
      if (el && (k === 'theme' || k === 'scheme')) el.setAttribute('data-' + k, val);
    },
    current(props) { const v = { ...pick(props || {}), ...read() }; if (!SCHEMES.includes(v.scheme)) v.scheme = 'emerald'; return v; },
    apply(props, prev, opts) {
      this.sync(props, prev);
      const el = document.querySelector('.sp');
      if (!el) return;
      const v = this.current(props);
      if (!opts || opts.theme !== false) el.setAttribute('data-theme', v.theme);
      el.setAttribute('data-scheme', v.scheme);
    },
  };
})();
