const tabs = [...document.querySelectorAll(".feed-tab")];
const postCards = [...document.querySelectorAll(".post-card")];
const searchToggle = document.querySelector("#search-toggle");
const searchPanel = document.querySelector("#profile-search");
const searchInput = document.querySelector("#post-search");
const searchClose = document.querySelector("#search-close");
const emptyMessage = document.querySelector("#search-empty");
const dashboardContent = document.querySelector(".dashboard-content");
const viewButtons = [...document.querySelectorAll("[data-dashboard-view]")];
const hashViews = {
  "#profile": "overview",
  "#skills": "skills",
  "#projects": "projects",
  "#schedule": "schedule",
  "#interests": "interests",
  "#favorite-games": "interests",
  "#about": "about",
};

let activeFilter = "all";
let highlightNavigationTimer;
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

function activateView(view, shouldScroll = true) {
  dashboardContent.dataset.activeView = view;
  document.body.dataset.activeView = view;
  const targetHash = view === "overview" ? "#profile" : `#${view}`;
  if (window.location.hash !== targetHash) {
    window.history.replaceState(null, "", targetHash);
  }
  viewButtons.forEach((button) => {
    const isSelected = button.dataset.dashboardView === view;
    button.classList.toggle("is-current", isSelected);
    if (isSelected) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  setFeedFilter(view === "skills" ? "skill" : "all");
  if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
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

activateView(hashViews[window.location.hash] || "overview", false);

viewButtons.forEach((button) => {
  button.addEventListener("click", () => activateView(button.dataset.dashboardView));
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;

    const view = target.dataset.navView || (target.id === "profile" ? "overview" : null);
    if (!view) return;

    event.preventDefault();
    if (link.classList.contains("highlight-item")) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        activateView(view);
        return;
      }

      window.clearTimeout(highlightNavigationTimer);
      document.querySelectorAll(".highlight-item.is-activating").forEach((item) => {
        item.classList.remove("is-activating");
      });
      link.classList.add("is-activating");
      highlightNavigationTimer = window.setTimeout(() => {
        link.classList.remove("is-activating");
        activateView(view);
      }, 520);
      return;
    }

    activateView(view);
  });
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setFeedFilter(tab.dataset.filter);
  });
});

if (searchToggle) {
  searchToggle.addEventListener("click", () => {
    if (dashboardContent.dataset.activeView !== "overview") activateView("overview", false);
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
