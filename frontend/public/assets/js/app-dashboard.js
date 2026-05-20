
const LABELS = {
  dashboard: 'Tổng quan',
  projects: 'Dự án',
  tasks: 'Công việc',
  kanban: 'Kanban',
  calendar: 'Lịch',
  workspace: 'Tiện ích',
  team: 'Đội nhóm',
  notifications: 'Thông báo',
  search: 'Tìm kiếm',
  reports: 'Báo cáo',
  profile: 'Hồ sơ',
  settings: 'Cài đặt',
  help: 'Trợ giúp'
};

const PRIMARY_NAV = [
  ['dashboard', 'dashboard', LABELS.dashboard],
  ['projects', 'folder', LABELS.projects],
  ['tasks', 'check_circle', LABELS.tasks],
  ['kanban', 'view_kanban', LABELS.kanban],
  ['calendar', 'calendar_month', LABELS.calendar],
  ['workspace', 'widgets', LABELS.workspace],
  ['team', 'groups', LABELS.team],
  ['notifications', 'notifications', LABELS.notifications]
];

const SECONDARY_NAV = [
  ['search', 'search', LABELS.search],
  ['reports', 'monitoring', LABELS.reports],
  ['profile', 'account_circle', LABELS.profile],
  ['settings', 'settings', LABELS.settings],
  ['help', 'help', LABELS.help]
];

let currentUser = null;
let storagePrefix = 'tasktracker.guest';
let currentRoute = 'dashboard';
let tasks = [];
let projects = [];
let team = [];
let notifications = [];
let workspace = { name: 'Không gian của tôi' };
let preferences = { theme: 'light' };
let pomodoroTime = 1500;
let pomodoroTimer = null;
let calendarInstance = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const icon = (name) => '<span class="material-symbols-outlined">' + name + '</span>';

const storage = {
  get(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function getStorageKey(name) {
  return storagePrefix + '.' + name;
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value.includes('duy')) return 'Đang duyệt';
  if (value.includes('hoàn') || value.includes('hoan') || value.includes('done')) return 'Hoàn thành';
  if ((value.includes('đang') || value.includes('dang')) && value.includes('làm')) return 'Đang làm';
  if (value.includes('progress')) return 'Đang làm';
  return 'Cần làm';
}

function statusClass(status) {
  const value = normalizeStatus(status);
  if (value === 'Hoàn thành') return 'done';
  if (value === 'Đang làm') return 'progress';
  if (value === 'Đang duyệt') return 'review';
  return 'todo';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function routeLabel(route) {
  return LABELS[route] || route;
}

function syncProjectMetrics() {
  projects = projects.map((project) => {
    const linkedTasks = tasks.filter((task) => String(task.project || '') === String(project.name || ''));
    const done = linkedTasks.filter((task) => normalizeStatus(task.status) === 'Hoàn thành').length;
    return {
      ...project,
      tasks: linkedTasks.length,
      progress: linkedTasks.length ? Math.round((done * 100) / linkedTasks.length) : 0
    };
  });
}

function saveState() {
  syncProjectMetrics();
  storage.set(getStorageKey('tasks'), tasks);
  storage.set(getStorageKey('projects'), projects);
  storage.set(getStorageKey('team'), team);
  storage.set(getStorageKey('notifications'), notifications);
  storage.set(getStorageKey('workspace'), workspace);
  storage.set(getStorageKey('preferences'), preferences);

  fetch('/api/app-data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks, projects, team, notifications, workspace, preferences })
  }).catch(() => null);
}

async function postJson(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

function showToast(message) {
  const element = $('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 1800);
}

function formatDate(value) {
  if (!value) return 'Chưa đặt hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}

function renderNavigation() {
  const buildLink = ([route, symbol, label]) => '\n    <a class="nav-link ' + (currentRoute === route ? 'active' : '') + '" href="/' + route + '">\n      ' + icon(symbol) + '\n      <span>' + label + '</span>\n    </a>';
  $('#primary-nav').innerHTML = PRIMARY_NAV.map(buildLink).join('');
  $('#secondary-nav').innerHTML = SECONDARY_NAV.map(buildLink).join('');
  $('#breadcrumb-current').textContent = routeLabel(currentRoute);
  $('.brand small').textContent = workspace.name || 'Không gian chính';
  $('.avatar').textContent = (currentUser?.name || currentUser?.email || 'TT').slice(0, 2).toUpperCase();
  document.documentElement.dataset.theme = preferences.theme || 'light';
}

function pageHero(route, subtitle, actions = '') {
  return '\n    <section class="page-hero">\n      <div>\n        <p class="eyebrow">TASKTRACKER</p>\n        <h1>' + routeLabel(route) + '</h1>\n        <p>' + subtitle + '</p>\n      </div>\n      <div class="actions">' + actions + '</div>\n    </section>';
}

function statCard(label, value, symbol) {
  return '\n    <article class="card stat">\n      <div>\n        <span class="subtle">' + label + '</span>\n        <b>' + value + '</b>\n      </div>\n      ' + icon(symbol) + '\n    </article>';
}

function taskRow(task) {
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const doneCount = checklist.filter((item) => item.done).length;
  const project = escapeHtml(task.project || 'Việc cá nhân');
  const priority = escapeHtml(task.priority || 'Trung bình');
  return '\n    <div class="row task-row">\n      <button class="row-main" data-open-task="' + task.id + '">\n        <div>\n          <strong>' + escapeHtml(task.title) + '</strong>\n          <div class="meta">' + project + ' · ' + formatDate(task.date || task.due) + (checklist.length ? ' · Checklist ' + doneCount + '/' + checklist.length : '') + '</div>\n        </div>\n        <div class="row-badges">\n          <span class="pill ' + statusClass(task.status) + '">' + normalizeStatus(task.status) + '</span>\n          <span class="pill">' + priority + '</span>\n        </div>\n      </button>\n      <button class="icon-button danger" data-del-task="' + task.id + '" aria-label="Xóa công việc">' + icon('delete') + '</button>\n    </div>';
}

function renderTaskRows(rows) {
  if (!rows.length) return '<div class="empty">Chưa có công việc nào.</div>';
  return rows.map(taskRow).join('');
}

function renderProjectCards(rows) {
  if (!rows.length) return '<div class="empty">Chưa có dự án nào.</div>';
  return rows.map((project) => '\n    <article class="card">\n      <div class="card-top">\n        <span class="pill">' + escapeHtml(project.status || 'Đang hoạt động') + '</span>\n        <button class="icon-button danger" data-del-project="' + escapeHtml(project.name) + '" aria-label="Xóa dự án">' + icon('delete') + '</button>\n      </div>\n      <h3>' + escapeHtml(project.name) + '</h3>\n      <p class="subtle">' + (project.tasks || 0) + ' công việc đang liên kết.</p>\n      <div class="progress"><span style="width:' + (project.progress || 0) + '%"></span></div>\n      <p class="meta">Hoàn thành ' + (project.progress || 0) + '%</p>\n      <div class="toolbar" style="margin-top:12px">\n        <button class="btn" data-project-task="' + escapeHtml(project.name) + '">' + icon('add_task') + 'Thêm công việc</button>\n      </div>\n    </article>').join('');
}

function pomodoroCard() {
  return '\n    <aside class="card pomodoro">\n      <h2>Pomodoro</h2>\n      <p class="subtle">25 phút tập trung, nghỉ ngắn rồi tiếp tục.</p>\n      <div id="pomodoro-time" class="timer">25:00</div>\n      <div class="actions">\n        <button class="btn primary" id="pomodoro-start">' + icon('play_arrow') + 'Bắt đầu</button>\n        <button class="btn" id="pomodoro-reset">' + icon('restart_alt') + 'Đặt lại</button>\n      </div>\n    </aside>';
}

function dashboardPage() {
  const activeTasks = tasks.filter((task) => normalizeStatus(task.status) !== 'Hoàn thành');
  return pageHero('dashboard', 'Không gian làm việc cá nhân cho những việc bạn đang quan tâm.', '<button class="btn primary" data-new-task>' + icon('add') + 'Tạo công việc</button>') +
    '<section class="grid stats">' +
      statCard('Tổng công việc', tasks.length, 'list_alt') +
      statCard('Hoàn thành', tasks.filter((task) => normalizeStatus(task.status) === 'Hoàn thành').length, 'task_alt') +
      statCard('Dự án', projects.length, 'folder') +
      statCard('Thông báo', notifications.filter((item) => item[0] === 'unread').length, 'notifications') +
    '</section>' +
    '<section class="grid two">' +
      '<div class="card"><h2>Sắp đến hạn</h2><div class="list">' + renderTaskRows(activeTasks.slice(0, 5)) + '</div></div>' +
      '<div class="card"><h2>Nhanh</h2><div class="list">' +
        '<a class="row" href="/projects"><strong>Dự án</strong><span>' + projects.length + '</span></a>' +
        '<a class="row" href="/tasks"><strong>Công việc</strong><span>' + tasks.length + '</span></a>' +
        '<a class="row" href="/notifications"><strong>Thông báo</strong><span>' + notifications.length + '</span></a>' +
      '</div></div>' +
    '</section>';
}

function projectsPage() {
  return pageHero('projects', 'Tạo dự án riêng để nhóm công việc theo học tập, công việc, gia đình hoặc mục tiêu.', '<button class="btn primary" data-new-project>' + icon('add') + 'Tạo dự án</button>') +
    '<div class="toolbar"><input id="project-filter" placeholder="Lọc dự án"></div>' +
    '<section class="grid three" id="project-grid">' + renderProjectCards(projects) + '</section>';
}

function tasksPage() {
  return pageHero('tasks', 'Quản lý công việc, lọc nhanh và xuất dữ liệu cá nhân của bạn.', '<button class="btn primary" data-new-task>' + icon('add') + 'Tạo công việc</button><a class="btn" href="/kanban">' + icon('view_kanban') + 'Bảng</a><a class="btn" href="/calendar">' + icon('calendar_month') + 'Lịch</a>') +
    '<div class="toolbar">' +
      '<input id="task-filter" placeholder="Tìm theo tên, dự án, nhãn">' +
      '<select id="task-status-filter"><option value="">Tất cả trạng thái</option><option value="Cần làm">Cần làm</option><option value="Đang làm">Đang làm</option><option value="Đang duyệt">Đang duyệt</option><option value="Hoàn thành">Hoàn thành</option></select>' +
      '<select id="task-priority-filter"><option value="">Tất cả ưu tiên</option><option value="Thấp">Thấp</option><option value="Trung bình">Trung bình</option><option value="Cao">Cao</option></select>' +
      '<button class="btn" data-export-xls>' + icon('download') + 'Xuất Excel</button>' +
      '<button class="btn" data-export-ics>' + icon('event') + 'Xuất ICS</button>' +
      '<label class="btn"><input id="import-csv" type="file" accept=".csv" hidden>Nhập CSV</label>' +
    '</div>' +
    '<section class="grid two productivity-grid">' +
      '<div class="card"><h2>Danh sách công việc</h2><div id="task-list" class="list">' + renderTaskRows(tasks) + '</div></div>' +
      pomodoroCard() +
    '</section>';
}

function kanbanPage() {
  const columns = ['Cần làm', 'Đang làm', 'Đang duyệt', 'Hoàn thành'];
  return pageHero('kanban', 'Kéo thả công việc giữa các cột trạng thái để theo dõi tiến độ.', '<button class="btn primary" data-new-task>' + icon('add') + 'Tạo công việc</button>') +
    '<section class="board">' + columns.map((column) => {
      const items = tasks.filter((task) => normalizeStatus(task.status) === column);
      return '<div class="column"><h3>' + column + ' <span class="pill">' + items.length + '</span></h3><div class="kanban-list" data-column="' + column + '">' + (items.map(taskRow).join('') || '<div class="empty">Chưa có công việc.</div>') + '</div></div>';
    }).join('') + '</section>';
}

function calendarPage() {
  const now = new Date();
  return pageHero('calendar', 'Xem công việc theo ngày, tuần hoặc tháng với lịch thời gian thực.', '<button class="btn primary" data-new-task>' + icon('add') + 'Tạo công việc</button>') +
    '<div class="card" style="margin-bottom:16px"><strong>Hôm nay:</strong> ' + now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' <span class="pill">' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</span></div>' +
    '<section class="card calendar-card"><div id="calendar-view"></div></section>';
}

function scheduleTable() {
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
  const slots = ['Sáng', 'Chiều', 'Tối'];
  return '<table class="schedule-table"><thead><tr><th>Buổi</th>' + days.map((day) => '<th>' + day + '</th>').join('') + '</tr></thead><tbody>' + slots.map((slot) => '<tr><th>' + slot + '</th>' + days.map(() => '<td contenteditable="true"></td>').join('') + '</tr>').join('') + '</tbody></table>';
}

function workspacePage() {
  return pageHero('workspace', 'Bộ tiện ích cá nhân: vẽ diagram, thiết kế thời khóa biểu và đếm ngày.', '<button class="btn primary" data-download-diagram>' + icon('download') + 'Tải diagram</button>') +
    '<section class="grid two utility-grid">' +
      '<div class="card utility-card"><h2>Vẽ diagram</h2><p class="subtle">Phác thảo sơ đồ tư duy hoặc luồng công việc rồi tải về PNG.</p><div class="toolbar"><input id="diagram-color" type="color" value="#0f766e"><button class="btn" data-clear-diagram>' + icon('delete') + 'Xóa</button></div><canvas id="diagram-canvas" width="900" height="460" class="draw-canvas"></canvas></div>' +
      '<div class="card utility-card"><h2>Thiết kế thời khóa biểu</h2><p class="subtle">Điền nhanh môn học hoặc công việc vào từng buổi và tải về.</p><div class="toolbar"><input id="schedule-title" value="Thời khóa biểu của tôi"><button class="btn" data-download-schedule>' + icon('download') + 'Tải ảnh</button></div><div id="schedule-board" class="schedule-board">' + scheduleTable() + '</div></div>' +
    '</section>' +
    '<section class="card countdown-card"><h2>Đếm ngày</h2><div class="form-grid"><div class="field"><label>Tiêu đề</label><input id="count-title"></div><div class="field"><label>Ngày cần đếm</label><input id="count-date" type="date"></div><div class="field"><label>Ảnh trang trí</label><input id="count-image" type="file" accept="image/*"></div></div><div id="count-preview" class="count-preview theme-mint"><div class="count-overlay"><h3>Chọn ngày để bắt đầu</h3><strong>0 ngày</strong><p>Khoảng cách sẽ hiển thị ở đây.</p></div></div><div class="actions"><button class="btn primary" data-update-count>' + icon('auto_awesome') + 'Cập nhật</button><button class="btn" data-download-count>' + icon('download') + 'Tải ảnh</button></div></section>';
}

function teamPage() {
  const rows = team.length ? team.map((member) => '<article class="card row"><div><strong>' + escapeHtml(member.person) + '</strong><div class="meta">' + escapeHtml(member.group) + ' · ' + escapeHtml(member.task) + (member.due ? ' · ' + escapeHtml(member.due) : '') + '</div></div><button class="icon-button danger" data-del-member="' + escapeHtml(member.person) + '">' + icon('delete') + '</button></article>').join('') : '<div class="empty">Chưa có thành viên nào.</div>';
  return pageHero('team', 'Quản lý nhóm, người phụ trách, công việc và ngày hạn.', '<button class="btn primary" data-new-member>' + icon('group_add') + 'Thêm nhóm</button>') + '<section class="list">' + rows + '</section>';
}

function searchPage() {
  return pageHero('search', 'Tìm kiếm trong công việc, dự án, thành viên và các khu vực chính.', '') + '<section class="card"><div class="toolbar"><input id="search-input" placeholder="Tìm mọi thứ"></div><div id="search-results" class="list"></div></section>';
}

function notificationsPage() {
  const rows = notifications.length ? notifications.map((item) => '<article class="card notice ' + item[0] + '"><h3>' + escapeHtml(item[1]) + '</h3><p>' + escapeHtml(item[2]) + '</p><p class="meta">' + escapeHtml(item[3]) + '</p></article>').join('') : '<div class="empty">Bạn chưa có thông báo nào.</div>';
  return pageHero('notifications', 'Xem cập nhật chưa đọc, nhắc hạn và hoạt động mới.', '<button class="btn" data-read-all>' + icon('done_all') + 'Đánh dấu đã đọc</button>') + '<section class="list">' + rows + '</section>';
}

function reportsPage() {
  const overdue = tasks.filter((task) => task.date && new Date(task.date) < new Date(new Date().toDateString()) && normalizeStatus(task.status) !== 'Hoàn thành').length;
  return pageHero('reports', 'Theo dõi tiến độ công việc và hiệu suất trong tài khoản hiện tại.', '') +
    '<section class="grid stats">' +
      statCard('Tổng công việc', tasks.length, 'list_alt') +
      statCard('Hoàn thành', tasks.filter((task) => normalizeStatus(task.status) === 'Hoàn thành').length, 'task_alt') +
      statCard('Quá hạn', overdue, 'warning') +
      statCard('Dự án', projects.length, 'folder') +
    '</section>';
}

function profilePage() {
  return pageHero('profile', 'Quản lý thông tin tài khoản và dữ liệu cá nhân cơ bản.', '<button class="btn" id="logout-btn">' + icon('logout') + 'Đăng xuất</button>') +
    '<section class="grid two">' +
      '<div class="card"><h2>Tài khoản</h2><div class="list"><div class="row"><strong>Họ tên</strong><span>' + escapeHtml(currentUser?.name || 'Chưa cập nhật') + '</span></div><div class="row"><strong>Email</strong><span>' + escapeHtml(currentUser?.email || '') + '</span></div><div class="row"><strong>Vai trò</strong><span>' + escapeHtml(currentUser?.role || 'user') + '</span></div></div></div>' +
      '<div class="card"><h2>Thống kê cá nhân</h2><div class="list"><div class="row"><strong>Công việc</strong><span>' + tasks.length + '</span></div><div class="row"><strong>Dự án</strong><span>' + projects.length + '</span></div><div class="row"><strong>Thông báo</strong><span>' + notifications.length + '</span></div></div></div>' +
    '</section>';
}

function settingsPage() {
  return pageHero('settings', 'Tùy chỉnh giao diện và không gian làm việc cá nhân.', '<button class="btn primary" data-save-settings>' + icon('save') + 'Lưu cài đặt</button>') +
    '<section class="grid two">' +
      '<div class="card"><h2>Giao diện</h2><div class="list"><label class="switch-row"><strong>Chế độ tối</strong><input id="settings-theme" type="checkbox" ' + (preferences.theme === 'dark' ? 'checked' : '') + '></label><div class="field"><label>Tên không gian</label><input id="settings-workspace-name" value="' + escapeHtml(workspace.name || 'Không gian của tôi') + '"></div></div></div>' +
      '<div class="card"><h2>Mặc định</h2><div class="list"><div class="row"><strong>Pomodoro</strong><span>25 phút</span></div><div class="row"><strong>Định dạng lịch</strong><span>Tháng hiện tại</span></div></div></div>' +
    '</section>';
}

function helpPage() {
  return pageHero('help', 'Hướng dẫn nhanh để dùng các khu vực chính trong hệ thống.', '') +
    '<section class="grid two">' +
      '<div class="card"><h2>Hướng dẫn nhanh</h2><div class="list"><div class="row"><strong>Tạo công việc</strong><span>Dùng nút xanh ở mỗi trang</span></div><div class="row"><strong>Quản lý dự án</strong><span>Vào trang Dự án để tạo và lọc</span></div><div class="row"><strong>Lịch</strong><span>Xem hạn công việc theo ngày thực</span></div><div class="row"><strong>Tiện ích</strong><span>Vẽ diagram, thời khóa biểu, đếm ngày</span></div></div></div>' +
      '<div class="card"><h2>Mẹo sử dụng</h2><div class="list"><div class="row"><strong>Tìm kiếm</strong><span>Gõ tên công việc, dự án hoặc thành viên</span></div><div class="row"><strong>Kanban</strong><span>Kéo thả task qua các cột trạng thái</span></div><div class="row"><strong>Xuất dữ liệu</strong><span>Dùng Excel hoặc ICS ở trang Công việc</span></div></div></div>' +
    '</section>';
}

const pages = { dashboard: dashboardPage, projects: projectsPage, tasks: tasksPage, kanban: kanbanPage, calendar: calendarPage, workspace: workspacePage, team: teamPage, notifications: notificationsPage, search: searchPage, reports: reportsPage, profile: profilePage, settings: settingsPage, help: helpPage };

function render() {
  currentRoute = location.pathname.slice(1) || 'dashboard';
  if (currentRoute === 'analytics') currentRoute = 'reports';
  renderNavigation();
  $('#app-content').innerHTML = (pages[currentRoute] || dashboardPage)();
  wirePage();
  renderNavigation();
}

function openModal(content, onSubmit) {
  document.querySelector('.modal-backdrop')?.remove();
  document.body.insertAdjacentHTML('beforeend', '<div class="modal-backdrop"><form class="modal" id="modal-form">' + content + '</form></div>');
  $$('[data-close]').forEach((button) => {
    button.onclick = () => document.querySelector('.modal-backdrop')?.remove();
  });
  $('#modal-form').onsubmit = (event) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
    document.querySelector('.modal-backdrop')?.remove();
    saveState();
    render();
  };
}

function createNotification(type, title, message) {
  notifications.unshift([type, title, message, new Date().toLocaleString('vi-VN')]);
  postJson('/api/notifications', { type, title, message });
}

function addTaskActivity(task, action, detail) {
  task.activity = Array.isArray(task.activity) ? task.activity : [];
  task.activity.push({ at: new Date().toLocaleString('vi-VN'), action, detail });
  postJson('/api/activity', { entityType: 'task', entityId: task.id, action, detail });
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportExcel() {
  const table = '\ufeff<table>' + tasks.map((task) => '<tr><td>' + escapeHtml(task.title) + '</td><td>' + escapeHtml(task.project || '') + '</td><td>' + normalizeStatus(task.status) + '</td><td>' + escapeHtml(task.priority || '') + '</td><td>' + escapeHtml(task.date || '') + '</td></tr>').join('') + '</table>';
  downloadFile('tasks.xls', table, 'application/vnd.ms-excel');
}

function exportIcs() {
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TaskTracker//VN//EN'];
  tasks.filter((task) => task.date).forEach((task) => {
    body.push('BEGIN:VEVENT');
    body.push('SUMMARY:' + String(task.title || '').replace(/\n/g, ' '));
    body.push('DTSTART;VALUE=DATE:' + String(task.date).replace(/-/g, ''));
    body.push('END:VEVENT');
  });
  body.push('END:VCALENDAR');
  downloadFile('tasks.ics', body.join('\n'), 'text/calendar;charset=utf-8');
}

function buildProjectOptions(selected = '') {
  const names = ['Việc cá nhân', 'Học tập', 'Công việc', 'Gia đình', ...projects.map((project) => project.name)];
  return [...new Set(names)].map((name) => '<option ' + (name === selected ? 'selected' : '') + '>' + escapeHtml(name) + '</option>').join('');
}

function openTaskModal(projectName = '') {
  openModal('<div class="modal-header"><h2>Tạo công việc</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div>' +
    '<div class="field"><label>Tên công việc</label><input name="title" required></div>' +
    '<div class="field"><label>Mô tả</label><textarea name="description"></textarea></div>' +
    '<div class="form-grid"><div class="field"><label>Dự án</label><select name="project">' + buildProjectOptions(projectName) + '</select></div><div class="field"><label>Trạng thái</label><select name="status"><option>Cần làm</option><option>Đang làm</option><option>Đang duyệt</option><option>Hoàn thành</option></select></div><div class="field"><label>Ưu tiên</label><select name="priority"><option>Thấp</option><option selected>Trung bình</option><option>Cao</option></select></div><div class="field"><label>Ngày hạn</label><input name="date" type="date"></div></div>' +
    '<div class="field"><label>Checklist (mỗi dòng là một mục)</label><textarea name="checklist"></textarea></div>' +
    '<div class="field"><label>Ghi chú</label><textarea name="notes"></textarea></div>' +
    '<div class="modal-actions"><button class="btn" type="button" data-close>Hủy</button><button class="btn primary">Tạo</button></div>', (form) => {
      const now = Date.now();
      const task = {
        id: now,
        title: form.get('title'),
        description: form.get('description'),
        project: form.get('project'),
        status: form.get('status'),
        priority: form.get('priority'),
        label: 'Công việc',
        date: form.get('date'),
        due: form.get('date') || 'Chưa đặt hạn',
        notes: form.get('notes'),
        owner: 'Bạn',
        checklist: String(form.get('checklist') || '').split(/\r?\n/).filter(Boolean).map((line, index) => ({ id: now + '-' + index, label: line, done: false })),
        activity: []
      };
      tasks.unshift(task);
      addTaskActivity(task, 'Tạo công việc', 'Công việc được tạo mới.');
      createNotification('unread', projectName ? 'Đã thêm công việc cho dự án' : 'Đã tạo công việc', task.title);
    });
}

function openProjectModal() {
  openModal('<div class="modal-header"><h2>Tạo dự án</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div><div class="field"><label>Tên dự án</label><input name="name" required></div><div class="field"><label>Trạng thái</label><select name="status"><option>Đang hoạt động</option><option>Tạm dừng</option><option>Hoàn thành</option></select></div><div class="modal-actions"><button class="btn" type="button" data-close>Hủy</button><button class="btn primary">Tạo</button></div>', (form) => {
    projects.unshift({ name: form.get('name'), progress: 0, status: form.get('status'), tasks: 0 });
  });
}

function openMemberModal() {
  openModal('<div class="modal-header"><h2>Thêm nhóm</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div><div class="field"><label>Tên người</label><input name="person" required></div><div class="field"><label>Nhóm</label><input name="group" required></div><div class="field"><label>Công việc</label><input name="task" required></div><div class="field"><label>Ngày hạn</label><input name="due" type="date"></div><div class="modal-actions"><button class="btn" type="button" data-close>Hủy</button><button class="btn primary">Thêm</button></div>', (form) => {
    team.unshift({ person: form.get('person'), group: form.get('group'), task: form.get('task'), due: form.get('due') });
    createNotification('unread', 'Đã gán việc', form.get('person') + ' · ' + form.get('task'));
  });
}

function openTaskDetail(taskId) {
  const task = tasks.find((item) => String(item.id) === String(taskId));
  if (!task) return;
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const history = (task.activity || []).length
    ? task.activity.slice().reverse().map((activity) => '<div class="row"><div><strong>' + escapeHtml(activity.action) + '</strong><div class="meta">' + escapeHtml(activity.detail || '') + '</div></div><span class="meta">' + escapeHtml(activity.at || '') + '</span></div>').join('')
    : '<div class="empty">Chưa có lịch sử.</div>';
  openModal('<div class="modal-header"><h2>Chi tiết công việc</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div>' +
    '<div class="field"><label>Tên</label><input name="title" value="' + escapeHtml(task.title) + '"></div>' +
    '<div class="field"><label>Mô tả</label><textarea name="description">' + escapeHtml(task.description || '') + '</textarea></div>' +
    '<div class="form-grid"><div class="field"><label>Trạng thái</label><select name="status"><option ' + (normalizeStatus(task.status) === 'Cần làm' ? 'selected' : '') + '>Cần làm</option><option ' + (normalizeStatus(task.status) === 'Đang làm' ? 'selected' : '') + '>Đang làm</option><option ' + (normalizeStatus(task.status) === 'Đang duyệt' ? 'selected' : '') + '>Đang duyệt</option><option ' + (normalizeStatus(task.status) === 'Hoàn thành' ? 'selected' : '') + '>Hoàn thành</option></select></div><div class="field"><label>Ngày hạn</label><input name="date" type="date" value="' + escapeHtml(task.date || '') + '"></div></div>' +
    '<div class="field"><label>Checklist (mỗi dòng là một mục, thêm [x] đầu dòng để đánh dấu hoàn thành)</label><textarea name="checklist">' + escapeHtml(checklist.map((item) => (item.done ? '[x] ' : '') + item.label).join('\n')) + '</textarea></div>' +
    '<div class="card" style="padding:12px;margin-top:12px"><h3 style="margin-top:0">Lịch sử hoạt động</h3><div class="list">' + history + '</div></div>' +
    '<div class="modal-actions"><button class="btn" type="button" data-close>Hủy</button><button class="btn primary">Lưu</button></div>', (form) => {
      task.title = form.get('title');
      task.description = form.get('description');
      task.status = form.get('status');
      task.date = form.get('date');
      task.due = task.date || 'Chưa đặt hạn';
      task.checklist = String(form.get('checklist') || '').split(/\r?\n/).filter(Boolean).map((line, index) => ({ id: task.id + '-' + index, label: line.replace(/^\s*\[x\]\s*/i, '').trim(), done: /^\s*\[x\]\s*/i.test(line) }));
      addTaskActivity(task, 'Cập nhật', 'Đã lưu chi tiết công việc.');
    });
}

function setupKanban() {
  if (!window.Sortable) return;
  $$('.kanban-list').forEach((list) => {
    if (list.dataset.sortableReady === 'true') return;
    list.dataset.sortableReady = 'true';
    new Sortable(list, {
      group: 'tasks',
      animation: 150,
      onEnd(event) {
        const button = event.item.querySelector('[data-open-task]');
        const task = tasks.find((item) => String(item.id) === String(button?.dataset.openTask));
        if (!task) return;
        task.status = event.to.dataset.column;
        addTaskActivity(task, 'Đổi trạng thái', 'Chuyển sang ' + task.status);
        saveState();
        render();
      }
    });
  });
}

function renderCalendar() {
  const element = document.getElementById('calendar-view');
  if (!element || !window.FullCalendar) return;
  if (calendarInstance) {
    calendarInstance.destroy();
    calendarInstance = null;
  }
  calendarInstance = new FullCalendar.Calendar(element, {
    initialView: 'dayGridMonth',
    locale: 'vi',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    events: tasks.filter((task) => task.date).map((task) => ({ title: task.title, start: task.date }))
  });
  calendarInstance.render();
}

function setupDiagram() {
  const canvas = document.getElementById('diagram-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  let drawing = false;
  canvas.onpointerdown = (event) => {
    drawing = true;
    context.beginPath();
    context.moveTo(event.offsetX, event.offsetY);
  };
  canvas.onpointermove = (event) => {
    if (!drawing) return;
    context.strokeStyle = $('#diagram-color')?.value || '#0f766e';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineTo(event.offsetX, event.offsetY);
    context.stroke();
  };
  canvas.onpointerup = () => { drawing = false; };
  canvas.onpointerleave = () => { drawing = false; };
}

function downloadCanvas(canvas, filename) {
  if (!canvas) return;
  const anchor = document.createElement('a');
  anchor.download = filename;
  anchor.href = canvas.toDataURL('image/png');
  anchor.click();
}

function updateCountdown() {
  const title = $('#count-title')?.value || 'Ngày đặc biệt';
  const dateValue = $('#count-date')?.value;
  const overlay = $('#count-preview .count-overlay');
  if (!overlay) return;
  if (!dateValue) {
    overlay.innerHTML = '<h3>Chọn ngày để bắt đầu</h3><strong>0 ngày</strong><p>Khoảng cách sẽ hiển thị ở đây.</p>';
    return;
  }
  const today = new Date(new Date().toDateString());
  const target = new Date(dateValue);
  const diff = Math.round((target - today) / 86400000);
  const text = diff < 0 ? 'Đã được ' + Math.abs(diff) + ' ngày' : diff > 0 ? 'Còn ' + diff + ' ngày' : 'Chính là hôm nay';
  overlay.innerHTML = '<h3>' + escapeHtml(title) + '</h3><strong>' + text + '</strong><p>' + target.toLocaleDateString('vi-VN') + '</p>';
}

function importCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    String(reader.result || '').split(/\r?\n/).slice(1).filter(Boolean).forEach((line) => {
      const cols = line.split(',').map((item) => item.trim());
      if (!cols[0]) return;
      tasks.unshift({ id: Date.now() + Math.random(), title: cols[0], project: cols[1] || 'Việc cá nhân', status: cols[2] || 'Cần làm', priority: cols[3] || 'Trung bình', label: cols[4] || 'Công việc', date: cols[5] || '', due: cols[5] || 'Chưa đặt hạn', notes: cols[6] || '', owner: 'Bạn', checklist: [], activity: [] });
    });
    saveState();
    render();
  };
  reader.readAsText(file);
}

function applyTaskFilters() {
  const query = ($('#task-filter')?.value || '').toLowerCase();
  const status = $('#task-status-filter')?.value || '';
  const priority = $('#task-priority-filter')?.value || '';
  let rows = tasks.filter((task) => (task.title + ' ' + (task.project || '') + ' ' + (task.label || '') + ' ' + (task.status || '')).toLowerCase().includes(query));
  if (status) rows = rows.filter((task) => normalizeStatus(task.status) === status);
  if (priority) rows = rows.filter((task) => String(task.priority || '') === priority);
  const list = $('#task-list');
  if (!list) return;
  list.innerHTML = renderTaskRows(rows);
  bindActionButtons();
}

function runGlobalSearch() {
  const input = $('#search-input');
  const resultBox = $('#search-results');
  if (!input || !resultBox) return;
  const searchNow = async () => {
    const query = input.value.trim().toLowerCase();
    let results = [];
    if (query) {
      try {
        const response = await fetch('/api/search?q=' + encodeURIComponent(query));
        if (response.ok) {
          const data = await response.json();
          results = data.results || [];
        }
      } catch {
        results = [];
      }
    }
    if (!results.length) {
      const local = [
        ...tasks.map((task) => ({ label: task.title, meta: normalizeStatus(task.status), route: '/tasks', id: task.id, type: 'task' })),
        ...projects.map((project) => ({ label: project.name, meta: project.status || 'Đang hoạt động', route: '/projects', type: 'project' })),
        ...team.map((member) => ({ label: member.person, meta: member.group + ' · ' + member.task, route: '/team', type: 'team' })),
        ...PRIMARY_NAV.concat(SECONDARY_NAV).map((item) => ({ label: item[2], meta: 'Điều hướng', route: '/' + item[0], type: 'page' }))
      ];
      results = local.filter((item) => (item.label + ' ' + item.meta).toLowerCase().includes(query));
    }
    resultBox.innerHTML = results.length ? results.map((item) => '<button class="row search-result" ' + (item.id ? 'data-open-task="' + item.id + '"' : '') + ' data-route="' + item.route + '"><div><strong>' + escapeHtml(item.label) + '</strong><div class="meta">' + escapeHtml(item.type) + ' · ' + escapeHtml(item.meta) + '</div></div>' + icon('arrow_forward') + '</button>').join('') : '<div class="empty">Không tìm thấy kết quả.</div>';
    $$('.search-result').forEach((button) => {
      button.onclick = () => {

        if (button.dataset.openTask) {
          openTaskDetail(button.dataset.openTask);
          return;
        }
        location.href = button.dataset.route;
      };
    });
  };
  input.oninput = searchNow;
  searchNow();
}

function bindActionButtons() {
  $$('[data-open-task]').forEach((button) => {
    button.onclick = () => openTaskDetail(button.dataset.openTask);
  });
  $$('[data-del-task]').forEach((button) => {
    button.onclick = () => {
      tasks = tasks.filter((task) => String(task.id) !== String(button.dataset.delTask));
      saveState();
      render();
    };
  });
  $$('[data-del-project]').forEach((button) => {
    button.onclick = () => {
      projects = projects.filter((project) => project.name !== button.dataset.delProject);
      tasks = tasks.filter((task) => task.project !== button.dataset.delProject);
      saveState();
      render();
    };
  });
  $$('[data-project-task]').forEach((button) => {
    button.onclick = () => openTaskModal(button.dataset.projectTask);
  });
  $$('[data-del-member]').forEach((button) => {
    button.onclick = () => {
      team = team.filter((member) => member.person !== button.dataset.delMember);
      saveState();
      render();
    };
  });
}

function wirePage() {
  $$('[data-new-task]').forEach((button) => { button.onclick = () => openTaskModal(''); });
  $$('[data-new-project]').forEach((button) => { button.onclick = openProjectModal; });
  $$('[data-new-member]').forEach((button) => { button.onclick = openMemberModal; });
  bindActionButtons();

  const importInput = $('#import-csv');
  if (importInput) importInput.onchange = (event) => { const file = event.target.files?.[0]; if (file) importCsv(file); };

  const taskFilter = $('#task-filter');
  const statusFilter = $('#task-status-filter');
  const priorityFilter = $('#task-priority-filter');
  if (taskFilter) taskFilter.oninput = applyTaskFilters;
  if (statusFilter) statusFilter.onchange = applyTaskFilters;
  if (priorityFilter) priorityFilter.onchange = applyTaskFilters;

  const projectFilter = $('#project-filter');
  if (projectFilter) {
    projectFilter.oninput = () => {
      const query = projectFilter.value.toLowerCase();
      const grid = $('#project-grid');
      if (!grid) return;
      grid.innerHTML = renderProjectCards(projects.filter((project) => String(project.name).toLowerCase().includes(query)));
      bindActionButtons();
    };
  }

  runGlobalSearch();

  const markRead = $('[data-read-all]');
  if (markRead) {
    markRead.onclick = async () => {
      notifications = notifications.map((item) => ['read', item[1], item[2], item[3]]);
      await fetch('/api/notifications/read-all', { method: 'PATCH' }).catch(() => null);
      saveState();
      render();
    };
  }

  const exportXlsButton = $('[data-export-xls]');
  if (exportXlsButton) exportXlsButton.onclick = exportExcel;
  const exportIcsButton = $('[data-export-ics]');
  if (exportIcsButton) exportIcsButton.onclick = exportIcs;

  const diagramDownload = $('[data-download-diagram]');
  if (diagramDownload) diagramDownload.onclick = () => downloadCanvas($('#diagram-canvas'), 'diagram.png');

  const clearDiagram = $('[data-clear-diagram]');
  if (clearDiagram) {
    clearDiagram.onclick = () => {
      const canvas = $('#diagram-canvas');
      if (!canvas) return;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    };
  }

  const downloadSchedule = $('[data-download-schedule]');
  if (downloadSchedule) downloadSchedule.onclick = () => downloadFile('thoi-khoa-bieu.html', '<meta charset="utf-8">' + ($('#schedule-board')?.innerHTML || ''), 'text/html;charset=utf-8');

  const updateCountButton = $('[data-update-count]');
  if (updateCountButton) updateCountButton.onclick = updateCountdown;

  const downloadCountButton = $('[data-download-count]');
  if (downloadCountButton) downloadCountButton.onclick = () => downloadFile('dem-ngay.html', '<meta charset="utf-8">' + ($('#count-preview')?.outerHTML || ''), 'text/html;charset=utf-8');

  const imageInput = $('#count-image');
  if (imageInput) {
    imageInput.onchange = () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { $('#count-preview').style.backgroundImage = 'url(' + reader.result + ')'; };
      reader.readAsDataURL(file);
    };
  }

  const themeToggle = $('#theme-toggle-topbar');
  if (themeToggle) {
    themeToggle.onclick = () => {
      preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark';
      saveState();
      renderNavigation();
    };
  }

  const saveSettingsButton = $('[data-save-settings]');
  if (saveSettingsButton) {
    saveSettingsButton.onclick = () => {
      const themeCheckbox = $('#settings-theme');
      const workspaceName = $('#settings-workspace-name');
      if (themeCheckbox) preferences.theme = themeCheckbox.checked ? 'dark' : 'light';
      if (workspaceName) workspace.name = workspaceName.value || workspace.name;
      saveState();
      renderNavigation();
      showToast('Đã lưu cài đặt');
      render();
    };
  }

  const logoutButton = $('#logout-btn');
  if (logoutButton) {
    logoutButton.onclick = async () => {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      location.href = '/login';
    };
  }

  const pomodoroLabel = $('#pomodoro-time');
  if (pomodoroLabel) {
    const updatePomodoro = () => { pomodoroLabel.textContent = String(Math.floor(pomodoroTime / 60)).padStart(2, '0') + ':' + String(pomodoroTime % 60).padStart(2, '0'); };
    updatePomodoro();
    const startButton = $('#pomodoro-start');
    if (startButton) {
      startButton.onclick = () => {
        clearInterval(pomodoroTimer);
        pomodoroTimer = setInterval(() => {
          pomodoroTime = Math.max(0, pomodoroTime - 1);
          updatePomodoro();
        }, 1000);
      };
    }
    const resetButton = $('#pomodoro-reset');
    if (resetButton) {
      resetButton.onclick = () => {
        clearInterval(pomodoroTimer);
        pomodoroTime = 1500;
        updatePomodoro();
      };
    }
  }

  renderCalendar();
  setupKanban();
  setupDiagram();
}

async function boot() {
  try {
    const authResponse = await fetch('/api/auth/me');
    if (!authResponse.ok) {
      location.href = '/login';
      return;
    }
    currentUser = await authResponse.json();
  } catch {
    location.href = '/login';
    return;
  }

  storagePrefix = 'tasktracker.user.' + (currentUser.id || currentUser.email);
  tasks = storage.get(getStorageKey('tasks'), []);
  projects = storage.get(getStorageKey('projects'), []);
  team = storage.get(getStorageKey('team'), []);
  notifications = storage.get(getStorageKey('notifications'), []);
  workspace = storage.get(getStorageKey('workspace'), workspace);
  preferences = storage.get(getStorageKey('preferences'), preferences);

  try {
    const response = await fetch('/api/app-data');
    if (response.ok) {
      const data = await response.json();
      tasks = data.tasks || tasks;
      projects = data.projects || projects;
      team = data.team || team;
      notifications = data.notifications || notifications;
      workspace = data.workspace || workspace;
      preferences = data.preferences || preferences;
    }
  } catch {}

  try {
    const response = await fetch('/api/notifications');
    if (response.ok) {
      const data = await response.json();
      notifications = data.map((item) => [item.is_read ? 'read' : 'unread', item.title, item.message, new Date(item.created_at).toLocaleString('vi-VN')]);
    }
  } catch {}

  syncProjectMetrics();
  render();
}

boot();
