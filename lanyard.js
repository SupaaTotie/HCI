/* Hanging ID card on a lanyard.
   Verlet-rope physics: the strap hangs from the top of the page, the card swings,
   and you can grab it, drag it around and let go. Click (without dragging) opens
   the full-size photo dialog. Shown on the Dashboard (overview) view only. */
(() => {
  const content = document.querySelector(".dashboard-content");
  const slot = document.querySelector(".profile-avatar-wrap");
  const photo = document.querySelector(".profile-avatar img");
  const photoDialog = document.querySelector("#profile-photo-dialog");
  const expandedPhoto = photoDialog && photoDialog.querySelector(".profile-photo-expanded");
  if (!content || !slot || !photo) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cardPhotos = ["assets/id-card-photo.png", "assets/id-card-photo-2.png"];

  /* ---------- DOM ---------- */
  const layer = document.createElement("div");
  layer.className = "lanyard";
  layer.hidden = true;
  layer.innerHTML = `
    <div class="lanyard-card" role="button" tabindex="0"
         aria-label="Open full-size profile photo. Drag to swing the ID card.">
      <img class="lanyard-photo is-active" src="${cardPhotos[0]}" alt="" draggable="false">
      <img class="lanyard-photo" src="${cardPhotos[1]}" alt="" aria-hidden="true" draggable="false">
      <span class="lanyard-slot" aria-hidden="true"></span>
      <span class="lanyard-caption" aria-hidden="true">
        <span class="lanyard-label">STUDENT PROFILE</span>
        <strong>Roel Hugo</strong>
        <span class="lanyard-meta">IT STUDENT · CEBU</span>
      </span>
    </div>
    <canvas class="lanyard-strap" aria-hidden="true"></canvas>`;
  document.body.append(layer);
  document.documentElement.classList.add("has-lanyard");

  const card = layer.querySelector(".lanyard-card");
  const cardPhotoImages = [...card.querySelectorAll(".lanyard-photo")];
  const canvas = layer.querySelector(".lanyard-strap");
  const ctx = canvas.getContext("2d");

  /* ---------- physics state ---------- */
  const GRAVITY = 3600;          // px / s²
  const STEP = 1 / 120;          // fixed physics step
  const DAMPING = 0.9965;        // per step
  const ITERATIONS = 12;
  const SLOT_OFFSET = 11;        // clip point sits this far below the card's top edge
  const STRAP_WIDTH = 14;
  const LABELS = ["ROEL", "•", "STUDENT", "•"];

  let pts = [];                  // {x, y, px, py, inv}
  let links = [];                // {a, b, rest}
  let clip = 0;                  // index of the clip point (end of strap)
  let seg = 24;
  let cardW = 172, cardH = 240;
  let anchorX = 0, strapLen = 260;
  let viewW = document.documentElement.clientWidth, viewH = document.documentElement.clientHeight, dpr = 1;
  let running = false, last = 0, acc = 0, calm = 0;
  let drag = null;
  let hasDroppedIn = false;
  let activePhoto = 0;
  let carouselTimer = 0;

  function showPhoto(index) {
    activePhoto = index;
    cardPhotoImages.forEach((image, photoIndex) => {
      image.classList.toggle("is-active", photoIndex === index);
    });
    if (expandedPhoto) expandedPhoto.src = cardPhotos[index];
  }

  function startCarousel() {
    window.clearInterval(carouselTimer);
    carouselTimer = window.setInterval(() => {
      showPhoto((activePhoto + 1) % cardPhotos.length);
    }, 3000);
  }

  function stopCarousel() {
    window.clearInterval(carouselTimer);
    carouselTimer = 0;
  }

  function anchorY() { return -14 - window.scrollY; }

  /* ---------- layout ---------- */
  function measure() {
    cardW = card.offsetWidth;
    cardH = card.offsetHeight;
    const r = slot.getBoundingClientRect();
    anchorX = r.left + r.width / 2;
    const centerDocY = r.top + window.scrollY + r.height / 2;
    // hang the card so it rests in the middle of the avatar slot
    strapLen = Math.max(90, centerDocY - cardH / 2 + SLOT_OFFSET + 14);
    // clientWidth/Height exclude the scrollbar, matching the fixed layer and getBoundingClientRect
    viewW = document.documentElement.clientWidth;
    viewH = document.documentElement.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);

    const wanted = Math.max(6, Math.round(strapLen / 24));
    if (wanted !== seg || !pts.length) build(wanted);
    else setRestLengths();
  }

  function build(count) {
    seg = count;
    const len = strapLen / seg;
    const ax = anchorX, ay = anchorY();
    const tilt = 0;
    const dx = Math.sin(tilt), dy = Math.cos(tilt);
    pts = [{ x: ax, y: ay, px: ax, py: ay, inv: 0 }];
    for (let i = 1; i <= seg; i++) {
      const x = ax + dx * len * i, y = ay + dy * len * i;
      pts.push({ x, y, px: x, py: y, inv: 1 });
    }
    clip = seg;
    const k = pts[clip];
    const cx = k.x + dx * (cardH / 2 - SLOT_OFFSET), cy = k.y + dy * (cardH / 2 - SLOT_OFFSET);
    pts.push({ x: cx, y: cy, px: cx, py: cy, inv: 0.4 });
    links = [];
    for (let i = 0; i < pts.length - 1; i++) links.push({ a: i, b: i + 1, rest: 0 });
    setRestLengths();
  }

  function setRestLengths() {
    const len = strapLen / seg;
    links.forEach((l, i) => { l.rest = i < clip ? len : cardH / 2 - SLOT_OFFSET; });
  }

  /* ---------- simulation ---------- */
  function step() {
    const ax = anchorX, ay = anchorY();
    const a = pts[0];
    a.x = a.px = ax; a.y = a.py = ay;

    const g = GRAVITY * STEP * STEP;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (drag && i === pts.length - 1) {
        // held by the pointer: ease toward it, keep a little velocity for the throw
        const nx = p.x + (drag.x - p.x) * 0.35;
        const ny = p.y + (drag.y - p.y) * 0.35;
        p.px = p.x; p.py = p.y; p.x = nx; p.y = ny;
        continue;
      }
      let vx = (p.x - p.px) * DAMPING;
      let vy = (p.y - p.py) * DAMPING;
      const sp = Math.hypot(vx, vy);
      if (sp > 60) { vx *= 60 / sp; vy *= 60 / sp; }
      p.px = p.x; p.py = p.y;
      p.x += vx;
      p.y += vy + g;
    }

    for (let n = 0; n < ITERATIONS; n++) {
      for (const l of links) {
        const p = pts[l.a], q = pts[l.b];
        const held = drag && l.b === pts.length - 1;
        const wp = p.inv, wq = held ? 0 : q.inv;
        const w = wp + wq;
        if (!w) continue;
        let dx = q.x - p.x, dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        const diff = (d - l.rest) / d / w;
        dx *= diff; dy *= diff;
        p.x += dx * wp; p.y += dy * wp;
        q.x -= dx * wq; q.y -= dy * wq;
      }
      keepOnScreen();
    }
  }

  function keepOnScreen() {
    const margin = 6;
    for (let i = clip; i < pts.length; i++) {
      const p = pts[i];
      p.x = Math.min(viewW - margin - (i > clip ? cardW / 2 : 0), Math.max(margin + (i > clip ? cardW / 2 : 0), p.x));
      p.y = Math.min(viewH - (i > clip ? cardH / 2 : 24), p.y);
    }
  }

  function energy() {
    let m = 0;
    for (let i = 1; i < pts.length; i++) m = Math.max(m, Math.hypot(pts[i].x - pts[i].px, pts[i].y - pts[i].py));
    return m;
  }

  /* ---------- rendering ---------- */
  function draw() {
    const k = pts[clip], c = pts[pts.length - 1];
    const phi = Math.atan2(-(c.x - k.x), c.y - k.y);
    card.style.transform =
      `translate(${k.x.toFixed(2)}px, ${k.y.toFixed(2)}px) rotate(${phi.toFixed(4)}rad) translate(-50%, ${-SLOT_OFFSET}px)`;   // -50% = always the card's own centre, whatever its size

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);

    // strap path, smoothed through the rope points
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < clip; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(k.x, k.y);
    };
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    path(); ctx.lineWidth = STRAP_WIDTH + 2; ctx.strokeStyle = "rgba(188, 207, 218, .42)"; ctx.stroke();
    path(); ctx.lineWidth = STRAP_WIDTH; ctx.strokeStyle = "#0a1019"; ctx.stroke();

    // printed text along the strap
    ctx.fillStyle = "rgba(219, 230, 237, .9)";
    ctx.font = '600 6px "DM Mono", Consolas, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < clip; i++) {
      const p = pts[i], q = pts[i + 1];
      const label = LABELS[i % LABELS.length];
      ctx.save();
      ctx.translate((p.x + q.x) / 2, (p.y + q.y) / 2);
      ctx.rotate(Math.atan2(q.y - p.y, q.x - p.x));
      ctx.fillText(label, 0, 0.5);
      ctx.restore();
    }

    // metal clip where the strap enters the card
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(phi);
    const grad = ctx.createLinearGradient(-7, 0, 7, 0);
    grad.addColorStop(0, "#8d9aa4"); grad.addColorStop(.5, "#eef3f6"); grad.addColorStop(1, "#7d8993");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(20, 30, 40, .55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-7, -9, 14, 12, 3);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function frame(now) {
    if (layer.hidden) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 8) { step(); acc -= STEP; steps++; }
    if (steps === 8) acc = 0;
    draw();

    calm = !drag && energy() < 0.012 ? calm + 1 : 0;
    if (calm > 90) { running = false; return; }   // fully at rest: stop the loop
    requestAnimationFrame(frame);
  }

  function wake() {
    calm = 0;
    if (running || layer.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  /* ---------- show / hide with the dashboard view ---------- */
  function sync() {
    const show = content.dataset.activeView === "overview";
    if (show === !layer.hidden) return;
    layer.hidden = !show;
    if (show) {
      if (!hasDroppedIn && !reduceMotion.matches) {
        layer.classList.add("is-dropping");
        layer.addEventListener("animationend", () => layer.classList.remove("is-dropping"), { once: true });
      }
      hasDroppedIn = true;
      startCarousel();
      requestAnimationFrame(() => { measure(); draw(); wake(); });
    } else {
      stopCarousel();
    }
  }
  new MutationObserver(sync).observe(content, { attributes: true, attributeFilter: ["data-active-view"] });

  let resizeTimer;
  const relayout = () => {
    if (layer.hidden) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { measure(); wake(); }, 60);
  };
  window.addEventListener("resize", relayout);
  if ("ResizeObserver" in window) { const ro = new ResizeObserver(relayout); ro.observe(slot); ro.observe(card); }
  window.addEventListener("scroll", wake, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  /* ---------- grab, drag, throw ---------- */
  function pointerTarget(e) {
    return { x: e.clientX + drag.ox, y: e.clientY + drag.oy };
  }

  card.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const c = pts[pts.length - 1];
    drag = { ox: c.x - e.clientX, oy: c.y - e.clientY, x: c.x, y: c.y, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
    card.setPointerCapture(e.pointerId);
    card.classList.add("is-grabbed");
    wake();
  });

  card.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const t = pointerTarget(e);
    drag.x = t.x; drag.y = t.y;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5) drag.moved = true;
  });

  function release(e, cancelled) {
    if (!drag) return;
    const wasClick = !cancelled && !drag.moved && performance.now() - drag.t < 500;
    drag = null;
    card.classList.remove("is-grabbed");
    if (card.hasPointerCapture(e.pointerId)) card.releasePointerCapture(e.pointerId);
    if (wasClick && photoDialog && !photoDialog.open) photoDialog.showModal();
    wake();
  }
  card.addEventListener("pointerup", (e) => release(e, false));
  card.addEventListener("pointercancel", (e) => release(e, true));
  card.addEventListener("lostpointercapture", (e) => release(e, true));

  card.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && photoDialog) {
      e.preventDefault();
      photoDialog.showModal();
    }
  });

  sync();
})();