
(() => {
  const params = new URLSearchParams(location.search);
  document.addEventListener('click', ev => {
    const c = ev.target.closest('[data-copy]');
    if (c) { navigator.clipboard?.writeText(c.dataset.copy);
             c.textContent = 'Copied'; setTimeout(() => c.textContent = 'Copy citation', 1500); }
  });
  document.addEventListener('keydown', ev => {
    if (ev.target.matches('input,select,textarea')) return;
    const rel = {ArrowLeft: 'prev', ArrowRight: 'next'}[ev.key];
    const a = rel && document.querySelector(`a[rel=${rel}]`);
    if (a) location.href = a.href;
  });
  // the same prefix approximation of stemming as site.py's _highlighter
  const highlighter = q => {
    const terms = [...(q || '').matchAll(/"([^"]+)"|(\S+)/g)].map(m => m[1] || m[2]);
    const words = terms.flatMap(t => t.match(/\w+/g) || []).map(w => w.toLowerCase())
      .map(w => w.length <= 4 ? w : w.slice(0, Math.max(4, w.length - 2)))
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return words.length ? new RegExp('\\b(?:' + words.join('|') + ')\\w*', 'gi') : null;
  };
  const searchPage = document.getElementById('hits');
  if (searchPage) runSearch(params);
  const reader = document.querySelector('.reader');
  if (!reader) return;
  const scroller = reader.querySelector('.scroller'), canvas = reader.querySelector('.canvas');
  const pageW = +reader.dataset.w;
  let zoom = 1;
  const setZoom = z => {
    const keepX = (scroller.scrollLeft + scroller.clientWidth / 2) / canvas.offsetWidth;
    const keepY = (scroller.scrollTop + scroller.clientHeight / 2) / canvas.offsetHeight;
    zoom = Math.min(8, Math.max(1, z));
    canvas.style.width = (zoom * 100) + '%';
    scroller.scrollLeft = keepX * canvas.offsetWidth - scroller.clientWidth / 2;
    scroller.scrollTop = keepY * canvas.offsetHeight - scroller.clientHeight / 2;
  };
  reader.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    const d = +b.dataset.zoom; setZoom(d === 0 ? 1 : zoom * (d > 0 ? 1.5 : 1 / 1.5));
  }));
  document.getElementById('boxes').addEventListener('change', ev =>
    reader.classList.toggle('noboxes', !ev.target.checked));
  // drag to pan
  let drag = null;
  scroller.addEventListener('mousedown', ev => {
    if (ev.target.closest('rect')) return;
    drag = {x: ev.clientX, y: ev.clientY, l: scroller.scrollLeft, t: scroller.scrollTop};
  });
  addEventListener('mousemove', ev => { if (!drag) return;
    scroller.scrollLeft = drag.l - (ev.clientX - drag.x); scroller.scrollTop = drag.t - (ev.clientY - drag.y); });
  addEventListener('mouseup', () => drag = null);

  // static site: highlight ?q= in the browser (the local server does it in HTML)
  const textPane = reader.querySelector('.textpane');
  const rx = !reader.querySelector('.hit') && highlighter(params.get('q'));
  if (rx) textPane.querySelectorAll('.r').forEach(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    let hit = false;
    nodes.forEach(node => {
      const text = node.nodeValue; rx.lastIndex = 0;
      if (!rx.test(text)) return;
      hit = true; rx.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0;
      for (const m of text.matchAll(rx)) {
        frag.append(text.slice(last, m.index));
        const mark = document.createElement('mark'); mark.textContent = m[0]; frag.append(mark);
        last = m.index + m[0].length;
      }
      frag.append(text.slice(last)); node.replaceWith(frag);
    });
    if (hit) { el.classList.add('hit');
      reader.querySelector(`rect[data-r="${el.dataset.r}"]`)?.classList.add('hit'); }
  });

  // original / translation / both: the choice is remembered across pages
  const langs = textPane.querySelector('.langs');
  if (langs) {
    const setLang = l => {
      textPane.dataset.lang = l;
      langs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l));
      try { localStorage.setItem('paperpress-lang', l); } catch (e) {}
    };
    let saved = null; try { saved = localStorage.getItem('paperpress-lang'); } catch (e) {}
    setLang(['orig', 'tr', 'both'].includes(saved) ? saved : 'tr');
    langs.addEventListener('click', ev => { const b = ev.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
  }
  const showBox = (id, scrollText, smooth = true) => {
    const behavior = smooth ? 'smooth' : 'auto';
    reader.querySelectorAll('.sel').forEach(n => n.classList.remove('sel'));
    const rect = reader.querySelector(`rect[data-r="${id}"]`);
    const paras = [...reader.querySelectorAll(`.textpane [data-r="${id}"]`)];
    const para = paras.find(p => p.offsetParent !== null) || paras[0];
    rect?.classList.add('sel'); paras.forEach(p => p.classList.add('sel'));
    if (scrollText && para) {
      // set scrollTop directly: scrollIntoView would also try to scroll the
      // image pane and the window, and the two animations fight
      const top = para.getBoundingClientRect().top - textPane.getBoundingClientRect().top;
      textPane.scrollTo({top: textPane.scrollTop + top - textPane.clientHeight / 4, behavior});
    }
    if (rect) {
      if (zoom < 2) setZoom(2);
      const s = canvas.offsetWidth / pageW;
      const x = +rect.getAttribute('x'), y = +rect.getAttribute('y');
      const w = +rect.getAttribute('width'), h = +rect.getAttribute('height');
      // centre the box; tall boxes are shown from their top
      const cy = h * s > scroller.clientHeight ? y * s + scroller.clientHeight / 2 - 30
                                               : (y + h / 2) * s;
      scroller.scrollTo({left: (x + w / 2) * s - scroller.clientWidth / 2,
                         top: cy - scroller.clientHeight / 2, behavior});
    }
  };
  reader.addEventListener('click', ev => {
    const t = ev.target.closest('[data-r]');
    if (t) showBox(t.dataset.r, t.tagName === 'rect');
  });
  // jump to the requested region (?r=, from a contents link) or the first search
  // hit once the page has fully laid out (before the scan loads the canvas has
  // no height, so scroll positions get clamped). Instant, not smooth: smooth
  // scrolls started during page load get cut short.
  const firstHit = [...reader.querySelectorAll('.textpane .hit')].find(p => p.offsetParent !== null);
  const target = reader.dataset.select || params.get('r') || firstHit?.dataset.r;
  const jump = () => target && requestAnimationFrame(() => showBox(target, true, false));
  if (document.readyState === 'complete') jump(); else addEventListener('load', jump, {once: true});
})();

// static site search: Pagefind, in the browser
async function runSearch(params) {
  const cfg = window.PAPERPRESS;
  if (!cfg) return;                                   // local server renders results itself
  const q = params.get('q') || '';
  const form = document.querySelector('form.filters');
  for (const [k, v] of params) { const el = form.elements[k]; if (el) el.value = v; }
  if (!q) return;
  const count = document.getElementById('count'), list = document.getElementById('hits');
  const more = document.getElementById('more');
  count.textContent = 'Searching…';
  const pagefind = await import(cfg.pagefind);
  const filters = {};
  if (params.get('title')) filters.title = cfg.titles[params.get('title')];
  if (params.get('year')) filters.year = params.get('year');
  const sort = {oldest: {date: 'asc'}, newest: {date: 'desc'}}[params.get('sort')];
  const res = await pagefind.search(q, {filters, ...(sort ? {sort} : {})});
  const n = res.results.length;
  count.textContent = `${n.toLocaleString()} page${n === 1 ? '' : 's'} match${n === 1 ? 'es' : ''}`;
  let shown = 0;
  const showMore = async () => {
    const batch = await Promise.all(res.results.slice(shown, shown + 20).map(r => r.data()));
    for (const d of batch) {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = d.url + (d.url.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(q);
      a.textContent = d.meta.title;
      const p = document.createElement('p'); p.className = 'snippet'; p.innerHTML = d.excerpt;
      li.append(a, p); list.append(li);
    }
    shown += batch.length; more.hidden = shown >= n;
  };
  more.addEventListener('click', showMore);
  await showMore();
}
