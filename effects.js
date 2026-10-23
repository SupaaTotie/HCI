/* Dashboard polish: cursor-reactive cards, animated counters,
   skill rings + radar, and the typing role line. Plain JS, no libraries. */
(() => {
  const content = document.querySelector(".dashboard-content");
  if (!content) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const view = () => content.dataset.activeView;
  const isShown = (el) => !!el && el.getClientRects().length > 0;

  /* ---------- 1. cursor-reactive cards (3D tilt + soft light) ---------- */
  function initTilt() {
    if (!finePointer.matches || reduceMotion.matches) return;
    const groups = [
      { selector: ".profile-stats > span", max: 7 },
      { selector: ".project-card", max: 5 },
      { selector: ".gallery-card", max: 8, glowColor: "rgba(65, 240, 224, .24)" },
      { selector: ".skill-panel", max: 2.5 },
    ];
    groups.forEach(({ selector, max, glowColor }) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add("tilt-card");
        const glow = document.createElement("span");
        if (!glowColor) {
          glow.className = "tilt-glow";
        } else {
          glow.className = "tilt-glow gallery-tilt-glow";
          glow.style.setProperty("--tilt-glow-color", glowColor);
        }
        glow.setAttribute("aria-hidden", "true");
        el.append(glow);

        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          el.style.setProperty("--tilt-ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
          el.style.setProperty("--tilt-rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
          el.style.setProperty("--glow-x", `${(x * 100).toFixed(1)}%`);
          el.style.setProperty("--glow-y", `${(y * 100).toFixed(1)}%`);
          el.classList.add("is-tilting");
        });
        el.addEventListener("pointerleave", () => {
          el.classList.remove("is-tilting");
          el.style.removeProperty("--tilt-rx");
          el.style.removeProperty("--tilt-ry");
        });
      });
    });
  }

  /* ---------- 2. animated counters ---------- */
  const counters = [...document.querySelectorAll(".profile-stats strong")]
    .filter((el) => /^\d+$/.test(el.textContent.trim()))
    .map((el) => ({ el, target: parseInt(el.textContent.trim(), 10) }));
  let countRaf = 0;

  function runCounters() {
    if (!counters.length) return;
    cancelAnimationFrame(countRaf);
    if (reduceMotion.matches || !counters.some((c) => isShown(c.el))) {
      counters.forEach((c) => { c.el.textContent = c.target; });
      return;
    }
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      counters.forEach((c) => { c.el.textContent = Math.round(c.target * eased); });
      if (t < 1) countRaf = requestAnimationFrame(tick);
    };
    counters.forEach((c) => { c.el.textContent = 0; });
    countRaf = requestAnimationFrame(tick);
  }

  /* ---------- 3. skill rings + radar ---------- */
  const panel = document.querySelector(".skill-panel");
  const SVG = "http://www.w3.org/2000/svg";
  const svgEl = (name, attrs = {}) => {
    const node = document.createElementNS(SVG, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  function buildSkills() {
    if (!panel) return;
    const items = [...panel.querySelectorAll(".skill-ring")].map((li) => ({
      li,
      name: li.querySelector(".skill-ring-name").textContent.trim(),
      level: Math.max(0, Math.min(100, Number(li.dataset.level) || 0)),
      accent: li.dataset.accent || "#2d9b82",
    }));

    // rings
    const R = 34, C = 2 * Math.PI * R;
    items.forEach(({ li, level, accent, name }) => {
      const svg = svgEl("svg", { viewBox: "0 0 88 88", class: "skill-ring-svg", role: "img", "aria-label": `${name}: ${level} out of 100` });
      svg.append(svgEl("circle", { class: "skill-ring-track", cx: 44, cy: 44, r: R }));
      const arc = svgEl("circle", { class: "skill-ring-arc", cx: 44, cy: 44, r: R, stroke: accent, "stroke-dasharray": C.toFixed(2), "stroke-dashoffset": C.toFixed(2), transform: "rotate(-90 44 44)" });
      arc.style.setProperty("--ring-offset", (C * (1 - level / 100)).toFixed(2));
      svg.append(arc);
      const num = document.createElement("strong");
      num.className = "skill-ring-value";
      num.textContent = `${level}%`;
      li.prepend(svg);
      svg.after(num);
      li.style.setProperty("--ring-accent", accent);
    });

    // radar
    const holder = panel.querySelector(".skill-radar");
    const size = 300, cx = size / 2, cy = size / 2, radius = 96, n = items.length;
    const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const point = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
    const poly = (r) => items.map((_, i) => point(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");

    const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, class: "radar-svg", focusable: "false" });
    [0.25, 0.5, 0.75, 1].forEach((f) => svg.append(svgEl("polygon", { class: "radar-grid", points: poly(radius * f) })));
    items.forEach((_, i) => {
      const [x, y] = point(i, radius);
      svg.append(svgEl("line", { class: "radar-axis", x1: cx, y1: cy, x2: x.toFixed(1), y2: y.toFixed(1) }));
    });
    const shape = svgEl("g", { class: "radar-shape" });
    shape.style.transformOrigin = `${cx}px ${cy}px`;
    shape.append(svgEl("polygon", { class: "radar-fill", points: items.map((it, i) => point(i, radius * it.level / 100).map((v) => v.toFixed(1)).join(",")).join(" ") }));
    items.forEach((it, i) => {
      const [x, y] = point(i, radius * it.level / 100);
      shape.append(svgEl("circle", { class: "radar-dot", cx: x.toFixed(1), cy: y.toFixed(1), r: 3.6, fill: it.accent }));
    });
    svg.append(shape);
    items.forEach((it, i) => {
      const [x, y] = point(i, radius + 18);
      const t = svgEl("text", { class: "radar-label", x: x.toFixed(1), y: y.toFixed(1), "text-anchor": Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end", "dominant-baseline": Math.abs(y - cy) < 6 ? "middle" : y > cy ? "hanging" : "auto" });
      t.textContent = it.name.replace("Cisco networking", "Networking").replace("Project management", "Project mgmt");
      svg.append(t);
    });
    holder.append(svg);
  }

  function syncSkills() {
    if (!panel) return;
    const on = view() === "skills";
    if (on && !panel.classList.contains("is-in")) {
      // let the browser paint the starting state first so the transition plays
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("is-in")));
    } else if (!on) {
      panel.classList.remove("is-in");
    }
  }

  /* ---------- 4. typing role line ---------- */
  const rotator = document.querySelector(".overview-rotator");
  const wordEl = rotator && rotator.querySelector(".rotator-word");
  const words = rotator ? rotator.dataset.words.split("|") : [];
  let typingTimer = 0, typing = false;

  function typeLoop() {
    typing = true;
    let w = 0, i = 0, deleting = false;
    const tick = () => {
      if (!isShown(rotator)) { typing = false; return; }   // paused while another view is open
      const word = words[w];
      if (!deleting) {
        i++;
        wordEl.textContent = word.slice(0, i);
        if (i === word.length) { deleting = true; typingTimer = setTimeout(tick, 1500); return; }
        typingTimer = setTimeout(tick, 70 + Math.random() * 50);
      } else {
        i--;
        wordEl.textContent = word.slice(0, i);
        if (i === 0) { deleting = false; w = (w + 1) % words.length; typingTimer = setTimeout(tick, 350); return; }
        typingTimer = setTimeout(tick, 34);
      }
    };
    wordEl.textContent = "";
    tick();
  }

  function syncTyping() {
    if (!rotator || reduceMotion.matches) return;   // reduced motion: keeps the static "A → B → C" text
    if (isShown(rotator) && !typing) { clearTimeout(typingTimer); typeLoop(); }
  }

  /* ---------- wire up ---------- */
  buildSkills();
  initTilt();

  let lastView = null;
  function onView() {
    if (view() === lastView) return;
    lastView = view();
    runCounters();
    syncSkills();
    syncTyping();
  }
  new MutationObserver(onView).observe(content, { attributes: true, attributeFilter: ["data-active-view"] });
  onView();
})();