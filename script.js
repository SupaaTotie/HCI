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
  "#interests": "interests",
  "#favorite-games": "interests",
  "#about": "about",
};

let activeFilter = "all";
let highlightNavigationTimer;

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



