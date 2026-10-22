const themeToggle = document.querySelector(".theme-toggle");
const storedTheme = localStorage.getItem("hci-theme");
const initialTheme = storedTheme === "dark" ? "dark" : "light";

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-light-src][data-dark-src]").forEach((image) => {
    image.src = theme === "dark" ? image.dataset.darkSrc : image.dataset.lightSrc;
  });
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} mode`;
  themeToggle.setAttribute("aria-label", label);
  themeToggle.title = label;
}

setTheme(initialTheme);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("hci-theme", nextTheme);
  setTheme(nextTheme);
});

const auraBackground = document.querySelector(".aura-bg");
const supportsPointerAura = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");

if (auraBackground && supportsPointerAura.matches) {
  let animationFrame = 0;

  window.addEventListener("pointermove", (event) => {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(() => {
      const bounds = auraBackground.getBoundingClientRect();
      auraBackground.style.setProperty("--aura-cursor-x", `${event.clientX - bounds.left}px`);
      auraBackground.style.setProperty("--aura-cursor-y", `${event.clientY - bounds.top}px`);
      auraBackground.style.setProperty("--aura-cursor-opacity", "1");
      animationFrame = 0;
    });
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    auraBackground.style.setProperty("--aura-cursor-opacity", "0");
  });
}
