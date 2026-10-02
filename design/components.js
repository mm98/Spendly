/* Spendly component behaviour.
   The other half of components.css: what the components DO. Load it on any page
   that uses them - it wires whatever is in the document and re-wires what appears
   later, so a page writes markup only. One implementation, like the CSS.

   Covers: Sidebar (c11) collapse and expand by its grip, and its hover peek - both
   opt-in via data-collapsible, since the collapse is an experiment (9i) · Combobox (c5) open, pick and close · Menu (c9) open, close, Escape ·
   List (c1) selection, select-all, the bulk bar taking the toolbar's place ·
   RangeInput (c3) drag, keys and its entry fields · Card (c10) collapsing header ·
   Attachment strip (c16) paging · the mixed state a static mockup declares in markup. */
(function () {
  if (window.__spComponents) return;
  window.__spComponents = true;

  const closest = (el, sel) => (el && el.closest ? el.closest(sel) : null);

  /* ---------- mixed state, declared in markup ---------- */
  function applyMixed(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input[data-indeterminate="true"]').forEach((el) => { el.indeterminate = true; });
  }

  /* ---------- combobox ---------- */
  function setOpen(box, open) {
    box.setAttribute('data-open', open ? 'true' : 'false');
    const t = box.querySelector('.sp-combobox__trigger, input[role="combobox"]');
    if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function pick(box, option) {
    const labelSpan = Array.prototype.find.call(
      option.querySelectorAll(':scope > span'),
      (s) => !s.classList.contains('sp-combobox__dot') && !s.classList.contains('sp-combobox__meta') && !s.classList.contains('sp-grow') && !s.classList.contains('sp-mark')
    );
    const label = labelSpan ? labelSpan.textContent : option.textContent.trim();
    box.querySelectorAll('.sp-combobox__option').forEach((o) => {
      const chosen = o === option;
      if (chosen) o.setAttribute('aria-selected', 'true');
      else o.removeAttribute('aria-selected');
      if (o.parentElement) {
        if (chosen) o.parentElement.setAttribute('aria-selected', 'true');
        else o.parentElement.removeAttribute('aria-selected');
      }
      const tick = o.querySelector('.sp-combobox__check');
      if (tick) tick.remove();
      const spacer = o.querySelector('.sp-grow');
      if (spacer && !o.querySelector('.sp-combobox__meta')) spacer.remove();
    });
    if (!option.querySelector('.sp-combobox__check')) {
      const grow = document.createElement('span');
      grow.className = 'sp-grow';
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tick.setAttribute('class', 'sp-combobox__check');
      tick.setAttribute('width', '13');
      tick.setAttribute('height', '13');
      tick.setAttribute('viewBox', '0 0 16 16');
      tick.setAttribute('fill', 'none');
      tick.setAttribute('stroke', 'currentColor');
      tick.setAttribute('stroke-width', '1.9');
      tick.setAttribute('stroke-linecap', 'round');
      tick.innerHTML = '<path d="M3.4 8.4l3 3 6.2-6.6"></path>';
      option.appendChild(grow);
      option.appendChild(tick);
    }
    const trigger = box.querySelector('.sp-combobox__trigger');
    if (trigger) {
      const slots = trigger.querySelectorAll(':scope > span');
      const target = Array.prototype.find.call(
        slots,
        (s) => !s.classList.contains('sp-grow') && !s.classList.contains('sp-combobox__chevron') && !s.classList.contains('sp-mark') && !s.classList.contains('sp-combobox__dot')
      );
      if (target) target.textContent = label;
      const dot = option.querySelector('.sp-combobox__dot');
      const triggerDot = trigger.querySelector('.sp-combobox__dot');
      if (dot && triggerDot) triggerDot.setAttribute('data-dot', dot.getAttribute('data-dot') || '');
    }
    const input = box.querySelector('input[role="combobox"]');
    if (input) input.value = label;
  }

  /* ---------- menu ---------- */
  function setMenu(holder, open) {
    holder.setAttribute('data-menu-open', open ? 'true' : 'false');
    holder.setAttribute('data-open', open ? 'true' : 'false');
    const t = holder.querySelector('[aria-haspopup="menu"]');
    if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('click', (e) => {
    const box = closest(e.target, '.sp-combobox');
    const trigger = closest(e.target, '.sp-combobox__trigger, .sp-combobox input[role="combobox"]');
    document.querySelectorAll('.sp-combobox[data-open="true"]').forEach((other) => {
      if (other !== box) setOpen(other, false);
    });
    if (!box) return;
    if (trigger) {
      setOpen(box, box.getAttribute('data-open') !== 'true');
      return;
    }
    const option = closest(e.target, '.sp-combobox__option');
    if (option) {
      pick(box, option);
      setOpen(box, false);
    }
  });

  document.addEventListener('click', (e) => {
    const trigger = closest(e.target, '[aria-haspopup="menu"]');
    document.querySelectorAll('[data-menu-open="true"]').forEach((holder) => {
      if (!trigger || holder !== trigger.parentElement) setMenu(holder, false);
    });
    if (trigger && trigger.parentElement) {
      const holder = trigger.parentElement;
      setMenu(holder, holder.getAttribute('data-menu-open') !== 'true');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.sp-combobox[data-open="true"]').forEach((box) => setOpen(box, false));
    document.querySelectorAll('[data-menu-open="true"]').forEach((holder) => setMenu(holder, false));
  });

  /* ---------- card: a header that collapses its body ---------- */
  document.addEventListener('click', (e) => {
    const head = closest(e.target, '.sp-card__header--toggle');
    if (!head) return;
    head.setAttribute('aria-expanded', head.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  });

  /* ---------- list selection ---------- */
  const lists = () => document.querySelectorAll('.sp-list .sp-table, .sp-list .sp-cards');

  function syncList(table) {
    const list = table.closest('.sp-list');
    const cards = table.classList.contains('sp-cards');
    const boxes = [...table.querySelectorAll(cards ? 'input.sp-check' : 'tbody input.sp-check')];
    const on = boxes.filter((b) => b.checked);
    boxes.forEach((b) => {
      const row = b.closest('tr, .sp-record');
      if (!row) return;
      if (b.checked) row.setAttribute('aria-selected', 'true');
      else row.removeAttribute('aria-selected');
    });
    const head = table.querySelector('thead input.sp-check') || (list && list.querySelector('.sp-list__toolbar input.sp-check'));
    if (head) {
      head.checked = on.length === boxes.length && boxes.length > 0;
      head.indeterminate = on.length > 0 && on.length < boxes.length;
    }
    table.classList.toggle('sp-table--all-selected', boxes.length > 0 && on.length === boxes.length);
    const bar = list && list.querySelector('.sp-bulkbar');
    const summary = list && list.querySelector('.sp-list__toolbar');
    const count = bar && bar.querySelector('.sp-bulkbar__count');
    if (count) {
      count.textContent = on.length === boxes.length
        ? on.length + ' selected'
        : on.length + ' of ' + (table.dataset.total || boxes.length) + ' selected';
    }
    const barBox = bar && bar.querySelector('input.sp-check');
    if (barBox) {
      barBox.checked = on.length === boxes.length && boxes.length > 0;
      barBox.indeterminate = on.length > 0 && on.length < boxes.length;
    }
    if (bar) bar.hidden = on.length === 0;
    if (bar && summary) summary.hidden = on.length > 0;
  }

  const syncAll = () => lists().forEach(syncList);

  document.addEventListener('change', (e) => {
    const box = closest(e.target, 'input.sp-check');
    if (!box) return;
    const table = box.closest('.sp-table, .sp-cards') || (box.closest('.sp-list') || document).querySelector('.sp-table, .sp-cards');
    if (!table) return;
    const inHead = box.closest('thead') || box.closest('.sp-bulkbar') || box.closest('.sp-list__toolbar');
    if (inHead) {
      table.querySelectorAll(table.classList.contains('sp-cards') ? 'input.sp-check' : 'tbody input.sp-check').forEach((b) => { b.checked = box.checked; });
    }
    syncList(table);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    lists().forEach((t) => {
      t.querySelectorAll('input.sp-check').forEach((b) => { b.checked = false; });
      syncList(t);
    });
  });

  /* ---------- range input ---------- */
  const fmt = (n) => n.toLocaleString('da-DK');
  const parseNum = (s) => Number(String(s).replace(/[^0-9]/g, '')) || 0;

  function trackState(track) {
    const handles = [...track.querySelectorAll('.sp-track__handle')];
    const host = track.closest('.sp-field, .sp-facet') || track.parentElement;
    const fields = [...host.querySelectorAll('.sp-bounds .sp-input')];
    const min = Number(handles[0].getAttribute('aria-valuemin')) || 0;
    const max = Number(handles[0].getAttribute('aria-valuemax')) || 100;
    const step = Number(track.getAttribute('data-step')) || (max - min) / 100;
    return { handles, fields, min, max, step, span: track.querySelector('.sp-track__span'), readout: host.querySelector('[data-range-readout]') };
  }

  function paintTrack(track) {
    const s = trackState(track);
    if (!s.handles.length) return;
    const pct = s.handles.map((h) => ((Number(h.getAttribute('aria-valuenow')) - s.min) / (s.max - s.min)) * 100);
    s.handles.forEach((h, i) => { h.style.setProperty('--p', String(pct[i])); });
    if (s.span) { s.span.style.setProperty('--a', String(pct[0])); s.span.style.setProperty('--b', String(pct[1])); }
    s.fields.forEach((f, i) => { if (document.activeElement !== f && s.handles[i]) f.value = fmt(Number(s.handles[i].getAttribute('aria-valuenow'))); });
    if (s.readout) {
      const unit = s.readout.getAttribute('data-range-readout');
      s.readout.textContent = s.handles.map((h) => fmt(Number(h.getAttribute('aria-valuenow')))).join(' - ') + (unit ? ' ' + unit : '');
    }
  }

  function setTrackValue(track, index, value) {
    const s = trackState(track);
    let v = Math.round(Math.min(s.max, Math.max(s.min, value)) / s.step) * s.step;
    if (s.handles.length > 1) {
      const other = Number(s.handles[index ? 0 : 1].getAttribute('aria-valuenow'));
      v = index === 0 ? Math.min(v, other) : Math.max(v, other);
    }
    s.handles[index].setAttribute('aria-valuenow', String(Math.round(v)));
    paintTrack(track);
  }

  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const handle = closest(e.target, '.sp-track__handle');
    if (!handle) return;
    const track = handle.closest('.sp-track');
    drag = { track, index: [...track.querySelectorAll('.sp-track__handle')].indexOf(handle) };
    handle.focus();
    e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const box = drag.track.getBoundingClientRect();
    const s = trackState(drag.track);
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setTrackValue(drag.track, drag.index, s.min + ratio * (s.max - s.min));
  });
  document.addEventListener('pointerup', () => { drag = null; });
  document.addEventListener('keydown', (e) => {
    const handle = closest(e.target, '.sp-track__handle');
    if (!handle) return;
    const track = handle.closest('.sp-track');
    const s = trackState(track);
    const index = s.handles.indexOf(handle);
    const now = Number(handle.getAttribute('aria-valuenow'));
    const map = { ArrowLeft: now - s.step, ArrowDown: now - s.step, ArrowRight: now + s.step, ArrowUp: now + s.step, Home: s.min, End: s.max };
    if (!(e.key in map)) return;
    setTrackValue(track, index, map[e.key]);
    e.preventDefault();
  });
  document.addEventListener('change', (e) => {
    const field = closest(e.target, '.sp-bounds .sp-input');
    if (!field) return;
    const host = field.closest('.sp-field, .sp-facet');
    const track = host && host.querySelector('.sp-track');
    if (!track) return;
    const fields = [...host.querySelectorAll('.sp-bounds .sp-input')];
    setTrackValue(track, fields.indexOf(field), parseNum(field.value));
  });

  /* ---------- attachment strip ---------- */
  document.addEventListener('click', (e) => {
    const btn = closest(e.target, '.sp-strip-nav');
    if (!btn) return;
    const strip = btn.parentElement.querySelector('.sp-strip');
    if (!strip) return;
    const dist = Math.max(120, Math.round(strip.clientWidth * 0.8));
    strip.scrollBy({ left: btn.dataset.strip === 'prev' ? -dist : dist, behavior: 'smooth' });
  });

  /* A strip's overflow is a layout fact, not a DOM one, so measuring once at init
     reads scrollWidth === clientWidth before the tiles have sized and latches both
     chevrons off for good. Each strip watches its own box and its content instead. */
  const stripRO = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => syncStrips())
    : null;

  function syncStrips() {
    document.querySelectorAll('.sp-strip-wrap').forEach((wrap) => {
      const strip = wrap.querySelector('.sp-strip');
      if (!strip) return;
      if (stripRO && !strip.dataset.spObserved) {
        strip.dataset.spObserved = '1';
        stripRO.observe(strip);
        Array.prototype.forEach.call(strip.children, (c) => stripRO.observe(c));
      }
      const max = strip.scrollWidth - strip.clientWidth;
      wrap.querySelectorAll('.sp-strip-nav').forEach((b) => {
        b.disabled = b.dataset.strip === 'prev' ? strip.scrollLeft <= 1 : strip.scrollLeft >= max - 1;
        b.style.display = max <= 1 ? 'none' : '';
      });
    });
  }
  document.addEventListener('scroll', syncStrips, true);
  window.addEventListener('resize', syncStrips);

  /* ---------- keep up with markup that arrives later ---------- */
  function refresh() {
    applyMixed(document);
    document.querySelectorAll('.sp-sidebar').forEach(wirePeek);
    document.querySelectorAll('.sp-track').forEach(paintTrack);
    syncAll();
    syncStrips();
  }

  /* The sidebar's slide (c11): the labels come and go with the column, whichever
     control moved it - the grip or the hover peek. Opening runs the words in as the
     column widens; closing runs them out first and gives the width back after, since
     a label that is already gone has nothing to animate. */
  function slideOpen(side) {
    if (!side) return;
    side.classList.remove('sp-sidebar--slide-out');
    side.classList.add('sp-sidebar--slide-in');
    clearTimeout(side.__spIn);
    side.__spIn = setTimeout(function () { side.classList.remove('sp-sidebar--slide-in'); }, 220);
  }
  function slideShut(side, done) {
    if (!side) { done(); return; }
    side.classList.remove('sp-sidebar--slide-in');
    side.classList.add('sp-sidebar--slide-out');
    clearTimeout(side.__spOut);
    side.__spOut = setTimeout(function () {
      side.classList.remove('sp-sidebar--slide-out');
      done();
    }, 140);
  }

  /* The sidebar's grip (c11): one click collapses the sidebar it belongs to, the next
     expands it. In a shell the column width changes with it; a sidebar drawn on its
     own carries the rail state itself. Delegated, so it works for a sidebar that
     appears later too. */
  document.addEventListener('click', function (e) {
    const grip = e.target.closest && e.target.closest('.sp-sidebar__grip');
    if (!grip) return;
    e.preventDefault();
    const side = grip.closest('.sp-sidebar');
    const shell = grip.closest('.sp-shell');
    if (!side && !shell) return;
    if (side && !side.hasAttribute('data-collapsible')) return;
    if (side) side.classList.remove('sp-sidebar--peek');
    const railed = shell
      ? shell.classList.contains('sp-shell--collapsed')
      : side.classList.contains('sp-sidebar--rail');
    const mark = function (collapsed) {
      grip.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      grip.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    };
    if (railed) {
      if (shell) shell.classList.remove('sp-shell--collapsed');
      else side.classList.remove('sp-sidebar--rail');
      slideOpen(side);
      mark(false);
    } else {
      slideShut(side, function () {
        if (shell) shell.classList.add('sp-shell--collapsed');
        else side.classList.add('sp-sidebar--rail');
        mark(true);
      });
    }
  });

  /* Hover peek (c11): while the sidebar is collapsed, pointing at it opens it over the
     page and leaving it closes it again. Both edges are delayed - 180ms in so crossing
     the rail on the way somewhere else does not open it, 500ms out so a pointer that
     dips outside for a moment does not close it. A sidebar the user expanded by the
     grip is not peeking and is left alone. */
  function wirePeek(side) {
    // opt-in only: the collapse is an experiment drawn in one place, so a sidebar
    // that does not ask for it never gains the behaviour
    if (!side.hasAttribute('data-collapsible')) return;
    if (side.__spPeek) return;
    side.__spPeek = true;
    let openT = null, closeT = null;
    const railed = () => {
      if (side.classList.contains('sp-sidebar--rail')) return true;
      const shell = side.closest('.sp-shell');
      return !!shell && shell.classList.contains('sp-shell--collapsed');
    };
    let outT = null;
    side.addEventListener('pointerenter', function () {
      clearTimeout(closeT);
      clearTimeout(side.__spOut);
      side.classList.remove('sp-sidebar--slide-out');
      if (!railed() || side.classList.contains('sp-sidebar--peek')) return;
      openT = setTimeout(function () {
        if (!railed()) return;
        side.classList.add('sp-sidebar--peek');
        slideOpen(side);
      }, 180);
    });
    side.addEventListener('pointerleave', function () {
      clearTimeout(openT);
      closeT = setTimeout(function () {
        if (!side.classList.contains('sp-sidebar--peek')) return;
        slideShut(side, function () { side.classList.remove('sp-sidebar--peek'); });
      }, 500);
    });
  }

  function start() {
    refresh();
    let queued = null;
    new MutationObserver(() => {
      if (queued) return;
      queued = setTimeout(() => { queued = null; refresh(); }, 60);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
