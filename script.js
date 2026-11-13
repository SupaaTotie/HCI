const navigationLinks = [...document.querySelectorAll(".dashboard-nav-link[data-dashboard-view]")];
const dashboardNav = document.querySelector(".dashboard-nav");
const minecraftPlayTabs = [...document.querySelectorAll(".minecraft-play-tab[role='tab']")];
const navigationSections = navigationLinks
  .filter((link) => link.dataset.dashboardView !== "overview")
  .map((link) => ({
    view: link.dataset.dashboardView,
    section: document.getElementById(link.hash.slice(1)),
  }))
  .filter(({ section }) => section)
  .sort((a, b) => a.section.compareDocumentPosition(b.section) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
const galleryCards = [...document.querySelectorAll(".gallery-card")];
const galleryDialog = document.querySelector("#gallery-dialog");
const galleryDialogImage = document.querySelector("#gallery-dialog-image");
const galleryDialogCaption = document.querySelector("#gallery-dialog-caption");

let navigationFrame;
let activeGalleryIndex = 0;
const scheduleWeek = document.querySelector(".schedule-week");

function activateMinecraftPlayTab(tab, focus = false) {
  minecraftPlayTabs.forEach((item) => {
    const isSelected = item === tab;
    item.classList.toggle("is-active", isSelected);
    item.setAttribute("aria-selected", String(isSelected));
    item.tabIndex = isSelected ? 0 : -1;
    document.getElementById(item.getAttribute("aria-controls")).hidden = !isSelected;
  });
  if (focus) tab.focus();
}

minecraftPlayTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateMinecraftPlayTab(tab));
  tab.addEventListener("keydown", (event) => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % minecraftPlayTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + minecraftPlayTabs.length) % minecraftPlayTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = minecraftPlayTabs.length - 1;
    else return;

    event.preventDefault();
    activateMinecraftPlayTab(minecraftPlayTabs[nextIndex], true);
  });
});

function getMonday(date) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return monday;
}

function updateSchedule(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  const range = weekStart.getMonth() === weekEnd.getMonth()
    ? `${dateFormatter.format(weekStart)} – ${new Intl.DateTimeFormat(undefined, { day: "numeric", year: "numeric" }).format(weekEnd)}`
    : `${dateFormatter.format(weekStart)} – ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(weekEnd)}`;
  document.querySelector("#schedule-range").textContent = range;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduleWeek.querySelectorAll(".schedule-day").forEach((day) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + Number(day.dataset.scheduleDay));
    const isToday = date.getTime() === today.getTime();
    const dateLabel = day.querySelector("time");
    dateLabel.dateTime = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    dateLabel.textContent = String(date.getDate());
    day.classList.toggle("is-today", isToday);
    day.querySelector(".schedule-today-label").hidden = !isToday;
  });
}

if (scheduleWeek) {
  let displayedWeek = getMonday(new Date());
  updateSchedule(displayedWeek);

  document.querySelector("#schedule-prev").addEventListener("click", () => {
    displayedWeek.setDate(displayedWeek.getDate() - 7);
    updateSchedule(displayedWeek);
  });
  document.querySelector("#schedule-next").addEventListener("click", () => {
    displayedWeek.setDate(displayedWeek.getDate() + 7);
    updateSchedule(displayedWeek);
  });
  document.querySelector("#schedule-today").addEventListener("click", () => {
    displayedWeek = getMonday(new Date());
    updateSchedule(displayedWeek);
  });
}

function updateCurrentNavigation() {
  document.body.classList.toggle("is-title-screen-visible", window.scrollY <= 1);
  if (!dashboardNav) return;
  const activationLine = Math.min(160, window.innerHeight * 0.25);
  let currentView = "overview";
  navigationSections.forEach(({ view, section }) => {
    if (section.getBoundingClientRect().top <= activationLine) currentView = view;
  });

  navigationLinks.forEach((link) => {
    const isSelected = link.dataset.dashboardView === currentView;
    link.classList.toggle("is-current", isSelected);
    if (isSelected) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });

  const activeLink = dashboardNav.querySelector(".dashboard-nav-link.is-current");
  if (activeLink) {
    dashboardNav.style.setProperty("--indicator-x", `${activeLink.offsetLeft}px`);
    dashboardNav.style.setProperty("--indicator-width", `${activeLink.offsetWidth}px`);
    dashboardNav.style.setProperty("--indicator-underline-x", `${activeLink.offsetLeft + activeLink.offsetWidth * .22}px`);
    dashboardNav.style.setProperty("--indicator-underline-width", `${activeLink.offsetWidth * .56}px`);
  }
}

function scheduleNavigationUpdate() {
  if (navigationFrame) window.cancelAnimationFrame(navigationFrame);
  navigationFrame = window.requestAnimationFrame(updateCurrentNavigation);
}

window.addEventListener("resize", scheduleNavigationUpdate);
window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
window.addEventListener("hashchange", scheduleNavigationUpdate);
window.addEventListener("popstate", scheduleNavigationUpdate);
window.addEventListener("pageshow", scheduleNavigationUpdate);
updateCurrentNavigation();

function showGalleryPhoto(index) {
  if (!galleryDialog || !galleryDialogImage || !galleryDialogCaption || !galleryCards.length) return;
  activeGalleryIndex = (index + galleryCards.length) % galleryCards.length;
  const card = galleryCards[activeGalleryIndex];
  const image = card.querySelector(".gallery-photo");
  const caption = card.querySelector(".gallery-card-caption strong");
  galleryDialogImage.src = image.src;
  galleryDialogImage.alt = image.alt;
  galleryDialogCaption.textContent = `${caption.textContent} · ${activeGalleryIndex + 1} of ${galleryCards.length}`;
}

function openGalleryPhoto(card) {
  if (!galleryDialog) return;
  const index = galleryCards.indexOf(card);
  if (index < 0) return;
  showGalleryPhoto(index);
  galleryDialog.showModal();
}

galleryCards.forEach((card) => {
  card.addEventListener("click", () => openGalleryPhoto(card));
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openGalleryPhoto(card);
  });
});

document.querySelector(".gallery-dialog-prev")?.addEventListener("click", () => {
  showGalleryPhoto(activeGalleryIndex - 1);
});
document.querySelector(".gallery-dialog-next")?.addEventListener("click", () => {
  showGalleryPhoto(activeGalleryIndex + 1);
});

document.querySelectorAll("[data-dialog]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    document.getElementById(trigger.dataset.dialog)?.showModal();
  });
});

document.querySelectorAll(".dashboard-dialog").forEach((dialog) => {
  dialog.querySelectorAll(".dialog-close, .dialog-action:not(a)").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});
