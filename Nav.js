/* Liquid nav indicator
 * One continuous line along the bottom of the floating pill that rises into a
 * bump under the active tab. The bump is driven by a spring, so it overshoots
 * slightly and stretches while it travels. The tab you leave drops back into
 * the bar with a bounce.
 *
 * Self-contained: it only watches which .dashboard-nav-link has `.is-current`,
 * so it works no matter which script changes that class.
 */
(() => {
  const bar = document.querySelector('.dashboard-sidebar');
  const nav = bar && bar.querySelector('.dashboard-nav');
  if (!bar || !nav) return;

  const links = [...nav.querySelectorAll('.dashboard-nav-link')];
  if (!links.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- SVG line ------------------------------------------------------- */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'nav-liquid');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const line = document.createElementNS(NS, 'path');
  line.setAttribute('class', 'nav-liquid-line');
  svg.appendChild(line);
  bar.insertBefore(svg, bar.firstChild);

  /* ---- Spring state --------------------------------------------------- */
  const STIFFNESS = 170;   // higher = snappier
  const DAMPING = 15;      // lower = more overshoot (video has a soft bounce)
  // Reduced-motion users still get the bump gliding to the new tab, but with a
  // critically damped spring: no overshoot, no stretch, no bouncing icons.
  const CALM_STIFFNESS = 260;
  const CALM_DAMPING = 2 * Math.sqrt(CALM_STIFFNESS);
  let x = 0;               // current bump centre (px, in pill coordinates)
  let v = 0;               // velocity (px/s)
  let target = 0;
  let pitch = 90;          // width of one tab, scales the bump
  let raf = 0;
  let last = 0;
  let ready = false;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function measure(link) {
    const b = bar.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    pitch = r.width || pitch;
    return r.left - b.left - bar.clientLeft + r.width / 2;
  }

  function ensureAttached() {
    if (svg.parentNode !== bar) bar.insertBefore(svg, bar.firstChild);
  }

  function draw() {
    ensureAttached();
    const W = bar.clientWidth;
    const H = bar.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const base = H - 5;                       // resting line
    const speed = reduceMotion.matches ? 0 : clamp(Math.abs(v) / 1400, 0, 1);
    const top = 9 + speed * 6;                // bump flattens a little when fast
    const hw = pitch * 0.52;                  // half width at the base
    const tw = pitch * 0.11;                  // half width of the dome
    const trail = speed * pitch * 0.65;       // trailing side stretches
    const hwL = hw + (v > 0 ? trail : 0);
    const hwR = hw + (v < 0 ? trail : 0);

    const l = x - hwL, r = x + hwR;
    const a = x - tw, b = x + tw;
    const k = 0.6;                            // S-curve tension
    const d =
      `M-2 ${base}H${l.toFixed(2)}` +
      `C${(l + (a - l) * k).toFixed(2)} ${base} ${(a - (a - l) * k).toFixed(2)} ${top.toFixed(2)} ${a.toFixed(2)} ${top.toFixed(2)}` +
      `H${b.toFixed(2)}` +
      `C${(b + (r - b) * k).toFixed(2)} ${top.toFixed(2)} ${(r - (r - b) * k).toFixed(2)} ${base} ${r.toFixed(2)} ${base}` +
      `H${W + 2}`;
    line.setAttribute('d', d);
  }

  function tick(t) {
    const dt = Math.min((t - last) / 1000 || 0.016, 0.032);
    last = t;
    const calm = reduceMotion.matches;
    v += ((target - x) * (calm ? CALM_STIFFNESS : STIFFNESS) - v * (calm ? CALM_DAMPING : DAMPING)) * dt;
    x += v * dt;
    if (Math.abs(target - x) < 0.05 && Math.abs(v) < 4) {
      x = target; v = 0; draw(); raf = 0; return;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function snap() {
    const cur = links.find((l) => l.classList.contains('is-current'));
    if (!cur) return;
    target = x = measure(cur);
    v = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    draw();
    ready = true;
  }

  function glide() {
    if (!ready) return snap();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  /* ---- Icon animations ------------------------------------------------ */
  function play(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth;                      // restart the animation
    el.classList.add(cls);
    clearTimeout(el['_t' + cls]);
    el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  /* ---- React to the active tab changing ------------------------------- */
  let current = links.find((l) => l.classList.contains('is-current')) || null;

  function onChange() {
    const next = links.find((l) => l.classList.contains('is-current')) || null;
    if (!next || next === current) return;
    const prev = current;
    current = next;
    target = measure(next);
    if (!reduceMotion.matches && ready) {
      if (prev) play(prev, 'is-leaving', 900);
      play(next, 'is-entering', 700);
    }
    glide();
  }

  new MutationObserver(onChange).observe(nav, {
    attributes: true, attributeFilter: ['class'], subtree: true,
  });

  /* ---- Keep it alive and aligned ---------------------------------------- */
  // If another script rebuilds the sidebar and drops the line, put it back.
  new MutationObserver(() => { if (svg.parentNode !== bar) { ensureAttached(); draw(); } })
    .observe(bar, { childList: true });

  if ('ResizeObserver' in window) new ResizeObserver(snap).observe(bar);
  window.addEventListener('resize', snap);
  window.addEventListener('load', snap);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);

  snap();

  // Quick check from DevTools: window.navLiquid.state()
  window.navLiquid = {
    snap,
    state: () => ({
      attached: svg.parentNode === bar,
      size: [bar.clientWidth, bar.clientHeight],
      links: links.length,
      current: current && current.dataset.dashboardView,
      reducedMotion: reduceMotion.matches,
      d: line.getAttribute('d'),
    }),
  };
  console.info('[nav-liquid] ready', window.navLiquid.state());
})();