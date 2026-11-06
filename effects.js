/* Dashboard polish: cursor-reactive cards, animated counters,
   and the typing role line. Plain JS, no libraries. */
(() => {
  const content = document.querySelector(".dashboard-content");
  if (!content) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const isShown = (el) => !!el && el.getClientRects().length > 0;

  /* ---------- 1. cursor-reactive cards (3D tilt + soft light) ---------- */
  function initTilt() {
    if (!finePointer.matches || reduceMotion.matches) return;
    const groups = [
      { selector: ".profile-stats > span", max: 7 },
    ];
    groups.forEach(({ selector, max }) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add("tilt-card");
        const glow = document.createElement("span");
        glow.className = "tilt-glow";
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

  /* ---------- 3. typing role line ---------- */
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
  initTilt();
  runCounters();
  syncTyping();
})();