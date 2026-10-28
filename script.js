const tabs = [...document.querySelectorAll(".feed-tab")];
const postCards = [...document.querySelectorAll(".post-card")];
const searchToggle = document.querySelector("#search-toggle");
const searchPanel = document.querySelector("#profile-search");
const searchInput = document.querySelector("#post-search");
const searchClose = document.querySelector("#search-close");
const emptyMessage = document.querySelector("#search-empty");
const navigationLinks = [...document.querySelectorAll("[data-dashboard-view]")];
const dashboardNav = document.querySelector(".dashboard-nav");
const dashboardContent = document.querySelector(".dashboard-content");
const routeViews = new Map([
  ["profile", "overview"],
  ["profile-highlights", "overview"],
  ["skills", "skills"],
  ["projects", "projects"],
  ["schedule", "schedule"],
  ["interests", "interests"],
  ["about", "about"],
]);
const galleryCards = [...document.querySelectorAll(".gallery-card")];
const galleryDialog = document.querySelector("#gallery-dialog");
const galleryDialogImage = document.querySelector("#gallery-dialog-image");
const galleryDialogCaption = document.querySelector("#gallery-dialog-caption");

let activeFilter = "all";
let navigationFrame;
let activeGalleryIndex = 0;
const scheduleWeek = document.querySelector(".schedule-week");

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

function setFeedFilter(filter) {
  activeFilter = filter;
  tabs.forEach((tab) => {
    const isSelected = tab.dataset.filter === filter;
    tab.classList.toggle("is-active", isSelected);
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    if (isSelected) {
      document.querySelector("#post-grid").setAttribute("aria-labelledby", tab.id);
    }
  });
  updatePosts();
}

function updateCurrentNavigation() {
  if (!dashboardContent || !dashboardNav) return;
  const currentView = dashboardContent.dataset.activeView;
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

function setActiveView(view, { scroll = true } = {}) {
  if (!dashboardContent || ![...routeViews.values()].includes(view)) return;
  dashboardContent.dataset.activeView = view;
  document.body.dataset.activeView = view;
  if (view !== "overview" && view !== "skills" && searchPanel && searchToggle) {
    searchPanel.hidden = true;
    searchToggle.setAttribute("aria-expanded", "false");
    if (searchInput) searchInput.value = "";
    updatePosts();
  }
  updateCurrentNavigation();
  if (scroll) {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  }
}

function syncViewFromLocation() {
  const view = routeViews.get(window.location.hash.slice(1)) || "overview";
  setActiveView(view, { scroll: false });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    const view = routeViews.get(hash.slice(1));
    if (!view) return;

    event.preventDefault();
    if (window.location.hash !== hash) history.pushState(null, "", hash);
    setActiveView(view);
  });
});

window.addEventListener("hashchange", syncViewFromLocation);
window.addEventListener("popstate", syncViewFromLocation);

function updatePosts() {
  if (!searchInput || !emptyMessage) return;
  const query = searchInput.value.trim().toLowerCase();
  let visiblePosts = 0;

  postCards.forEach((card) => {
    const matchesFilter = activeFilter === "all" || card.dataset.category.split(" ").includes(activeFilter);
    const matchesSearch = !query || card.dataset.search.includes(query);
    const isVisible = matchesFilter && matchesSearch;
    card.hidden = !isVisible;
    if (isVisible) visiblePosts += 1;
  });

  emptyMessage.hidden = visiblePosts > 0;
}

function scheduleNavigationUpdate() {
  if (navigationFrame) window.cancelAnimationFrame(navigationFrame);
  navigationFrame = window.requestAnimationFrame(updateCurrentNavigation);
}

window.addEventListener("resize", scheduleNavigationUpdate);
syncViewFromLocation();

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setFeedFilter(tab.dataset.filter);
  });
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = tabs[(tabs.indexOf(tab) + offset + tabs.length) % tabs.length];
    nextTab.focus();
    setFeedFilter(nextTab.dataset.filter);
  });
});
if (tabs.length) setFeedFilter("all");

if (searchToggle && searchPanel && searchInput) {
  searchToggle.addEventListener("click", () => {
    const isOpen = searchToggle.getAttribute("aria-expanded") === "true";
    searchToggle.setAttribute("aria-expanded", String(!isOpen));
    searchPanel.hidden = isOpen;
    if (isOpen) {
      searchInput.value = "";
      updatePosts();
    } else {
      searchInput.focus();
    }
  });
}

if (searchInput) searchInput.addEventListener("input", updatePosts);
if (searchClose && searchToggle && searchInput && searchPanel) {
  searchClose.addEventListener("click", () => {
    searchPanel.hidden = true;
    searchToggle.setAttribute("aria-expanded", "false");
    searchInput.value = "";
    updatePosts();
    searchToggle.focus();
  });
}

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
