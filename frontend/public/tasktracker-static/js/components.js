(function () {
  const body = document.body;
  const currentPage = body.dataset.page || "dashboard";
  const base = body.dataset.base || ".";

  const routes = {
    dashboard: `${base}/index.html`,
    projects: `${base}/pages/projects.html`,
    tasks: `${base}/pages/tasks.html`,
    reports: `${base}/pages/reports.html`,
    settings: `${base}/pages/settings.html`,
  };

  const labels = {
    dashboard: "Tổng quan",
    projects: "Dự án",
    tasks: "Công việc",
    reports: "Báo cáo",
    settings: "Cài đặt",
  };

  const navItems = [
    { key: "dashboard", icon: "dashboard", label: "Tổng quan" },
    { key: "projects", icon: "folder_open", label: "Dự án" },
    { key: "tasks", icon: "task", label: "Công việc" },
    { key: "reports", icon: "analytics", label: "Báo cáo" },
    { key: "settings", icon: "settings", label: "Cài đặt" },
  ];

  function renderLinks(className) {
    return navItems
      .map((item) => {
        const active = item.key === currentPage ? " is-active" : "";
        return `
          <a class="${className}${active}" href="${routes[item.key]}">
            <span class="material-symbols-outlined">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `;
      })
      .join("");
  }

  const sidebar = document.querySelector('[data-shell="sidebar"]');
  if (sidebar) {
    sidebar.className = "app-sidebar";
    sidebar.innerHTML = `
      <div class="app-sidebar__brand">
        <div class="app-sidebar__logo">TT</div>
        <div>
          <div class="app-sidebar__name">TaskTracker</div>
          <div class="app-sidebar__meta">Không gian làm việc thống nhất</div>
        </div>
        <button class="app-shell-close" type="button" data-sidebar-close aria-label="Đóng menu">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <button class="app-sidebar__cta" type="button" data-modal-open="task-modal">
        <span class="material-symbols-outlined">add</span>
        <span>Tạo công việc</span>
      </button>
      <nav class="app-sidebar__nav" aria-label="Điều hướng chính">
        ${renderLinks("app-shell-link")}
      </nav>
      <div class="app-sidebar__footer">
        <a class="app-shell-link" href="${routes.settings}">
          <span class="material-symbols-outlined">tune</span>
          <span>Tùy chọn</span>
        </a>
        <a class="app-shell-link" href="${routes.reports}">
          <span class="material-symbols-outlined">download</span>
          <span>Trung tâm xuất báo cáo</span>
        </a>
      </div>
    `;
  }

  const topbar = document.querySelector('[data-shell="topbar"]');
  if (topbar) {
    topbar.className = "app-topbar";
    topbar.innerHTML = `
      <div class="app-topbar__left">
        <button class="app-icon-button" type="button" data-sidebar-open aria-label="Mở menu">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <div>
          <div class="app-topbar__title">${labels[currentPage]}</div>
          <div class="app-topbar__crumb">TaskTracker / ${labels[currentPage]}</div>
        </div>
      </div>
      <div class="app-topbar__right">
        <label class="app-topbar__search" aria-label="Tìm kiếm">
          <span class="material-symbols-outlined">search</span>
          <input type="text" placeholder="Tìm công việc, dự án hoặc thành viên" />
        </label>
        <div style="position:relative">
          <button class="app-icon-button" type="button" data-dropdown-button="notifications" aria-expanded="false" aria-label="Thông báo">
            <span class="material-symbols-outlined">notifications</span>
            <span class="app-icon-button__dot"></span>
          </button>
          <div class="app-dropdown" data-dropdown-panel="notifications">
            <p class="app-dropdown__title">Thông báo</p>
            <div class="app-dropdown__list">
              <div class="app-dropdown__item">
                <strong>Hôm nay đến hạn duyệt ngân sách</strong>
                <span>Chiến dịch marketing cần được phê duyệt trước 4:00 PM.</span>
              </div>
              <div class="app-dropdown__item">
                <strong>Sarah đã bình luận về đợt ra mắt Q4</strong>
                <span>Yêu cầu cập nhật trạng thái cho luồng onboarding.</span>
              </div>
            </div>
          </div>
        </div>
        <div style="position:relative">
          <button class="app-avatar-button" type="button" data-dropdown-button="profile" aria-expanded="false" aria-label="Menu hồ sơ">
            <span class="app-avatar">AL</span>
            <span class="app-avatar-button__meta">
              <strong>Alex Lee</strong>
              <span>Trưởng nhóm sản phẩm</span>
            </span>
            <span class="material-symbols-outlined">expand_more</span>
          </button>
          <div class="app-dropdown" data-dropdown-panel="profile">
            <p class="app-dropdown__title">Hồ sơ</p>
            <a class="app-dropdown__link" href="${routes.settings}">
              <span class="material-symbols-outlined">person</span>
              <span>Cài đặt tài khoản</span>
            </a>
            <a class="app-dropdown__link" href="${routes.reports}">
              <span class="material-symbols-outlined">insights</span>
              <span>Tổng kết tuần</span>
            </a>
            <button class="app-dropdown__link" type="button" data-modal-open="task-modal">
              <span class="material-symbols-outlined">add_task</span>
              <span>Tạo nhanh công việc</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const footer = document.querySelector('[data-shell="footer"]');
  if (footer) {
    footer.className = "app-footer";
    footer.innerHTML = `
      <div>Không gian làm việc tĩnh của TaskTracker. Khung dùng chung nằm trong <code>js/components.js</code> và tương tác nằm trong <code>js/app.js</code>.</div>
    `;
  }

  const bottomNav = document.querySelector('[data-shell="bottomnav"]');
  if (bottomNav) {
    bottomNav.className = "app-bottom-nav";
    bottomNav.innerHTML = renderLinks("");
  }

  const overlay = document.querySelector('[data-shell="overlay"]');
  if (overlay) {
    overlay.className = "app-mobile-overlay";
    overlay.setAttribute("data-sidebar-overlay", "");
  }

  const modalRoot = document.querySelector('[data-shell="modal-root"]');
  if (modalRoot) {
    modalRoot.innerHTML = `
      <div class="app-modal" id="task-modal" aria-hidden="true">
        <div class="app-modal__dialog">
          <div class="app-modal__header">
            <h2 class="app-modal__title">Tạo công việc</h2>
            <button class="app-modal__close" type="button" data-modal-close aria-label="Đóng">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="app-modal__body">
            <form class="app-form-grid">
              <div class="app-field">
                <label for="task-title">Tên công việc</label>
                <input id="task-title" type="text" placeholder="Chuẩn bị checklist ra mắt bản beta" />
              </div>
              <div class="app-form-grid app-form-grid--two">
                <div class="app-field">
                  <label for="task-project">Dự án</label>
                  <select id="task-project">
                    <option>Thiết kế lại website</option>
                    <option>Chiến dịch Q4</option>
                    <option>Ra mắt ứng dụng di động</option>
                  </select>
                </div>
                <div class="app-field">
                  <label for="task-priority">Độ ưu tiên</label>
                  <select id="task-priority">
                    <option>Cao</option>
                    <option selected>Trung bình</option>
                    <option>Thấp</option>
                  </select>
                </div>
              </div>
              <div class="app-field">
                <label for="task-notes">Ghi chú</label>
                <textarea id="task-notes" rows="4" placeholder="Thêm mô tả ngắn, người phụ trách hoặc hạn hoàn thành."></textarea>
              </div>
            </form>
          </div>
          <div class="app-modal__footer">
            <button class="app-button app-button--ghost" type="button" data-modal-close>Hủy</button>
            <button class="app-button app-button--primary" type="button" data-modal-close>
              <span class="material-symbols-outlined">check</span>
              <span>Lưu công việc</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
})();
