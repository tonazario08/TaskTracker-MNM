(function () {
  const body = document.body;
  const sidebar = document.querySelector(".app-sidebar");
  const overlay = document.querySelector("[data-sidebar-overlay]");
  const dropdownButtons = document.querySelectorAll("[data-dropdown-button]");
  const tabGroups = document.querySelectorAll("[data-tabs]");

  function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    body.classList.remove("overflow-hidden");
  }

  function openSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.add("is-open");
    overlay.classList.add("is-visible");
    body.classList.add("overflow-hidden");
  }

  document.querySelectorAll("[data-sidebar-open]").forEach((button) => {
    button.addEventListener("click", openSidebar);
  });

  document.querySelectorAll("[data-sidebar-close]").forEach((button) => {
    button.addEventListener("click", closeSidebar);
  });

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  function closeAllDropdowns() {
    document.querySelectorAll("[data-dropdown-panel]").forEach((panel) => panel.classList.remove("is-open"));
    document.querySelectorAll("[data-dropdown-button]").forEach((button) => {
      button.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  dropdownButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      const key = this.dataset.dropdownButton;
      const panel = document.querySelector(`[data-dropdown-panel="${key}"]`);
      const shouldOpen = panel && !panel.classList.contains("is-open");
      closeAllDropdowns();
      if (shouldOpen && panel) {
        panel.classList.add("is-open");
        this.classList.add("is-open");
        this.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", closeAllDropdowns);

  function setTab(group, key) {
    group.querySelectorAll("[data-tab-button]").forEach((button) => {
      const active = button.dataset.tabButton === key;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    group.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.tabPanel === key);
    });
  }

  tabGroups.forEach((group) => {
    const initial = group.dataset.tabsDefault || group.querySelector("[data-tab-button]")?.dataset.tabButton;
    if (initial) setTab(group, initial);

    group.querySelectorAll("[data-tab-button]").forEach((button) => {
      button.addEventListener("click", () => setTab(group, button.dataset.tabButton));
    });
  });

  function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function openModal(modal) {
    document.querySelectorAll(".app-modal.is-open").forEach(closeModal);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    closeAllDropdowns();
    closeSidebar();
  }

  document.querySelectorAll("[data-modal-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.getElementById(button.dataset.modalOpen);
      if (modal) openModal(modal);
    });
  });

  document.querySelectorAll(".app-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-modal-close]")) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
      closeAllDropdowns();
      document.querySelectorAll(".app-modal.is-open").forEach(closeModal);
    }
  });
})();
