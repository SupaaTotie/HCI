const tabs = [...document.querySelectorAll(".feed-tab")];
const postCards = [...document.querySelectorAll(".post-card")];
const searchToggle = document.querySelector("#search-toggle");
const searchPanel = document.querySelector("#profile-search");
const searchInput = document.querySelector("#post-search");
const searchClose = document.querySelector("#search-close");
const emptyMessage = document.querySelector("#search-empty");
const navigationLinks = [...document.querySelectorAll("[data-dashboard-view]")];
const navigationSections = [
  ["overview", document.querySelector("#profile")],
  ["interests", document.querySelector("#interests")],
  ["skills", document.querySelector("#skills")],
  ["projects", document.querySelector("#projects")],
  ["schedule", document.querySelector("#schedule")],
  ["about", document.querySelector("#about")],
];

let activeFilter = "all";
let navigationFrame;
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
    if (isSelected) {
      document.querySelector("#post-grid").setAttribute("aria-labelledby", tab.id);
    }
  });
  updatePosts();
}

function updateCurrentNavigation() {
  const activationLine = window.innerHeight * 0.35;
  let currentView = "overview";

  navigationSections.forEach(([view, section]) => {
    if (section && section.getBoundingClientRect().top <= activationLine) currentView = view;
  });

  navigationLinks.forEach((link) => {
    const isSelected = link.dataset.dashboardView === currentView;
    link.classList.toggle("is-current", isSelected);
    if (isSelected) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

function updatePosts() {
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

window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
window.addEventListener("resize", scheduleNavigationUpdate);
window.addEventListener("hashchange", scheduleNavigationUpdate);
scheduleNavigationUpdate();

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setFeedFilter(tab.dataset.filter);
  });
});

if (searchToggle) {
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

searchInput.addEventListener("input", updatePosts);
if (searchClose && searchToggle) {
  searchClose.addEventListener("click", () => {
    searchPanel.hidden = true;
    searchToggle.setAttribute("aria-expanded", "false");
    searchInput.value = "";
    updatePosts();
    searchToggle.focus();
  });
}

document.querySelectorAll("[data-dialog]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    document.querySelector(`#${trigger.dataset.dialog}`).showModal();
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
