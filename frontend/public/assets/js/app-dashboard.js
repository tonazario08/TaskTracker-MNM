
const LABELS = {
  dashboard: 'T?ng quan',
  projects: 'D? án',
  tasks: 'Công vi?c',
  kanban: 'Kanban',
  calendar: 'L?ch',
  workspace: 'Ti?n ích',
  team: 'Ð?i nhóm',
  notifications: 'Thông báo',
  search: 'T?m ki?m',
  reports: 'Báo cáo',
  profile: 'H? sõ',
  settings: 'Cài ð?t',
  help: 'Tr? giúp'
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
let workspace = { name: 'Không gian c?a tôi' };
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
  if (value.includes('duy')) return 'Ðang duy?t';
  if (value.includes('hoan') || value.includes('done')) return 'Hoàn thành';
  if (value.includes('dang') && value.includes('lam')) return 'Ðang làm';
  if (value.includes('progress')) return 'Ðang làm';
  return 'C?n làm';
}

function statusClass(status) {
  const value = normalizeStatus(status);
  if (value === 'Hoàn thành') return 'done';
  if (value === 'Ðang làm') return 'progress';
  if (value === 'Ðang duy?t') return 'review';
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
  if (!value) return 'Chýa ð?t h?n';
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
  const project = escapeHtml(task.project || 'Vi?c cá nhân');
  const priority = escapeHtml(task.priority || 'Trung b?nh');
  return '\n    <div class="row task-row">\n      <button class="row-main" data-open-task="' + task.id + '">\n        <div>\n          <strong>' + escapeHtml(task.title) + '</strong>\n          <div class="meta">' + project + ' Â· ' + formatDate(task.date || task.due) + (checklist.length ? ' Â· Checklist ' + doneCount + '/' + checklist.length : '') + '</div>\n        </div>\n        <div class="row-badges">\n          <span class="pill ' + statusClass(task.status) + '">' + normalizeStatus(task.status) + '</span>\n          <span class="pill">' + priority + '</span>\n        </div>\n      </button>\n      <button class="icon-button danger" data-del-task="' + task.id + '" aria-label="Xóa cong viec">' + icon('delete') + '</button>\n    </div>';
}

function renderTaskRows(rows) {
  if (!rows.length) return '<div class="empty">Chýa có công vi?c nào.</div>';
  return rows.map(taskRow).join('');
}

function renderProjectCards(rows) {
  if (!rows.length) return '<div class="empty">Chýa có d? án nào.</div>';
  return rows.map((project) => '\n    <article class="card">\n      <div class="card-top">\n        <span class="pill">' + escapeHtml(project.status || 'Dang hoat dong') + '</span>\n        <button class="icon-button danger" data-del-project="' + escapeHtml(project.name) + '" aria-label="Xóa du an">' + icon('delete') + '</button>\n      </div>\n      <h3>' + escapeHtml(project.name) + '</h3>\n      <p class="subtle">' + (project.tasks || 0) + ' cong viec dang lien ket.</p>\n      <div class="progress"><span style="width:' + (project.progress || 0) + '%"></span></div>\n      <p class="meta">Hoàn thành ' + (project.progress || 0) + '%</p>\n      <div class="toolbar" style="margin-top:12px">\n        <button class="btn" data-project-task="' + escapeHtml(project.name) + '">' + icon('add_task') + 'Them cong viec</button>\n      </div>\n    </article>').join('');
}

function pomodoroCard() {
  return '\n    <aside class="card pomodoro">\n      <h2>Pomodoro</h2>\n      <p class="subtle">25 phut tap trung, nghi ngan roi tiep tuc.</p>\n      <div id="pomodoro-time" class="timer">25:00</div>\n      <div class="actions">\n        <button class="btn primary" id="pomodoro-start">' + icon('play_arrow') + 'Bat dau</button>\n        <button class="btn" id="pomodoro-reset">' + icon('restart_alt') + 'Dat lai</button>\n      </div>\n    </aside>';
}

function dashboardPage() {
  const activeTasks = tasks.filter((task) => normalizeStatus(task.status) !== 'Hoàn thành');
  return pageHero('dashboard', 'Không gian làm vi?c cá nhân cho nh?ng vi?c b?n ðang quan tâm.', '<button class="btn primary" data-new-task>' + icon('add') + 'T?o công vi?c</button>') +
    '<section class="grid stats">' +
      statCard('T?ng công vi?c', tasks.length, 'list_alt') +
      statCard('Hoàn thành', tasks.filter((task) => normalizeStatus(task.status) === 'Hoàn thành').length, 'task_alt') +
      statCard('D? án', projects.length, 'folder') +
      statCard('Thông báo', notifications.filter((item) => item[0] === 'unread').length, 'notifications') +
    '</section>' +
    '<section class="grid two">' +
      '<div class="card"><h2>S?p ð?n h?n</h2><div class="list">' + renderTaskRows(activeTasks.slice(0, 5)) + '</div></div>' +
      '<div class="card"><h2>Nhanh</h2><div class="list">' +
        '<a class="row" href="/projects"><strong>D? án</strong><span>' + projects.length + '</span></a>' +
        '<a class="row" href="/tasks"><strong>Công vi?c</strong><span>' + tasks.length + '</span></a>' +
        '<a class="row" href="/notifications"><strong>Thông báo</strong><span>' + notifications.length + '</span></a>' +
      '</div></div>' +
    '</section>';
}

function projectsPage() {
  return pageHero('projects', 'T?o d? án rieng de nhom cong viec theo hoc tap, cong viec, gia dinh hoac muc tieu.', '<button class="btn primary" data-new-project>' + icon('add') + 'T?o d? án</button>') +
    '<div class="toolbar"><input id="project-filter" placeholder="L?c d? án"></div>' +
    '<section class="grid three" id="project-grid">' + renderProjectCards(projects) + '</section>';
}

function tasksPage() {
  return pageHero('tasks', 'Qu?n l? công vi?c, l?c nhanh và xu?t d? li?u cá nhân c?a b?n.', '<button class="btn primary" data-new-task>' + icon('add') + 'T?o công vi?c</button><a class="btn" href="/kanban">' + icon('view_kanban') + 'B?ng</a><a class="btn" href="/calendar">' + icon('calendar_month') + 'L?ch</a>') +
    '<div class="toolbar">' +
      '<input id="task-filter" placeholder="Tim theo ten, du an, nhan">' +
      '<select id="task-status-filter"><option value="">Tat ca trang thai</option><option value="C?n làm">C?n làm</option><option value="Ðang làm">Ðang làm</option><option value="Ðang duy?t">Ðang duy?t</option><option value="Hoàn thành">Hoàn thành</option></select>' +
      '<select id="task-priority-filter"><option value="">Tat ca uu tien</option><option value="Thap">Thap</option><option value="Trung b?nh">Trung b?nh</option><option value="Cao">Cao</option></select>' +
      '<button class="btn" data-export-xls>' + icon('download') + 'Xu?t Excel</button>' +
      '<button class="btn" data-export-ics>' + icon('event') + 'Xu?t ICS</button>' +
      '<label class="btn"><input id="import-csv" type="file" accept=".csv" hidden>Nh?p CSV</label>' +
    '</div>' +
    '<section class="grid two productivity-grid">' +
      '<div class="card"><h2>Danh sách công vi?c</h2><div id="task-list" class="list">' + renderTaskRows(tasks) + '</div></div>' +
      pomodoroCard() +
    '</section>';
}

function kanbanPage() {
  const columns = ['C?n làm', 'Ðang làm', 'Ðang duy?t', 'Hoàn thành'];
  return pageHero('kanban', 'Keo tha cong viec giua cac cot trang thai de theo doi tien do.', '<button class="btn primary" data-new-task>' + icon('add') + 'T?o công vi?c</button>') +
    '<section class="board">' + columns.map((column) => {
      const items = tasks.filter((task) => normalizeStatus(task.status) === column);
      return '<div class="column"><h3>' + column + ' <span class="pill">' + items.length + '</span></h3><div class="kanban-list" data-column="' + column + '">' + (items.map(taskRow).join('') || '<div class="empty">Chýa có công vi?c.</div>') + '</div></div>';
    }).join('') + '</section>';
}

function calendarPage() {
  const now = new Date();
  return pageHero('calendar', 'Xem cong viec theo ngay, tuan hoac thang voi lich thoi gian thuc.', '<button class="btn primary" data-new-task>' + icon('add') + 'T?o công vi?c</button>') +
    '<div class="card" style="margin-bottom:16px"><strong>Hôm nay:</strong> ' + now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) + ' <span class="pill">' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</span></div>' +
    '<section class="card calendar-card"><div id="calendar-view"></div></section>';
}

function scheduleTable() {
  const days = ['Thu 2', 'Thu 3', 'Thu 4', 'Thu 5', 'Thu 6', 'Thu 7', 'CN'];
  const slots = ['Sang', 'Chieu', 'Toi'];
  return '<table class="schedule-table"><thead><tr><th>Buoi</th>' + days.map((day) => '<th>' + day + '</th>').join('') + '</tr></thead><tbody>' + slots.map((slot) => '<tr><th>' + slot + '</th>' + days.map(() => '<td contenteditable="true"></td>').join('') + '</tr>').join('') + '</tbody></table>';
}

function workspacePage() {
  return pageHero('workspace', 'Bo tien ich ca nhan: ve diagram, thiet ke thoi khoa bieu va dem ngay.', '<button class="btn primary" data-download-diagram>' + icon('download') + 'T?i diagram</button>') +
    '<section class="grid two utility-grid">' +
      '<div class="card utility-card"><h2>V? diagram</h2><p class="subtle">Phác th?o sõ ð? tý duy ho?c lu?ng công vi?c r?i t?i v? PNG.</p><div class="toolbar"><input id="diagram-color" type="color" value="#0f766e"><button class="btn" data-clear-diagram>' + icon('delete') + 'Xóa</button></div><canvas id="diagram-canvas" width="900" height="460" class="draw-canvas"></canvas></div>' +
      '<div class="card utility-card"><h2>Thi?t k? th?i khóa bi?u</h2><p class="subtle">Ði?n nhanh môn h?c ho?c công vi?c vào t?ng bu?i và t?i v?.</p><div class="toolbar"><input id="schedule-title" value="Th?i khóa bi?u c?a tôi"><button class="btn" data-download-schedule>' + icon('download') + 'T?i ?nh</button></div><div id="schedule-board" class="schedule-board">' + scheduleTable() + '</div></div>' +
    '</section>' +
    '<section class="card countdown-card"><h2>Ð?m ngày</h2><div class="form-grid"><div class="field"><label>Tiêu ð?</label><input id="count-title"></div><div class="field"><label>Ngày c?n ð?m</label><input id="count-date" type="date"></div><div class="field"><label>?nh trang trí</label><input id="count-image" type="file" accept="image/*"></div></div><div id="count-preview" class="count-preview theme-mint"><div class="count-overlay"><h3>Ch?n ngày ð? b?t ð?u</h3><strong>0 ngày</strong><p>Kho?ng cách s? hi?n th? ? ðây.</p></div></div><div class="actions"><button class="btn primary" data-update-count>' + icon('auto_awesome') + 'C?p nh?t</button><button class="btn" data-download-count>' + icon('download') + 'T?i ?nh</button></div></section>';
}

function teamPage() {
  const rows = team.length ? team.map((member) => '<article class="card row"><div><strong>' + escapeHtml(member.person) + '</strong><div class="meta">' + escapeHtml(member.group) + ' Â· ' + escapeHtml(member.task) + (member.due ? ' Â· ' + escapeHtml(member.due) : '') + '</div></div><button class="icon-button danger" data-del-member="' + escapeHtml(member.person) + '">' + icon('delete') + '</button></article>').join('') : '<div class="empty">Chýa có thành viên nào.</div>';
  return pageHero('team', 'Qu?n l? nhóm, ngý?i ph? trách, công vi?c và ngày h?n.', '<button class="btn primary" data-new-member>' + icon('group_add') + 'Thêm nhóm</button>') + '<section class="list">' + rows + '</section>';
}

function searchPage() {
  return pageHero('search', 'T?m ki?m trong công vi?c, d? án, thành viên và các khu v?c chính.', '') + '<section class="card"><div class="toolbar"><input id="search-input" placeholder="T?m m?i th?"></div><div id="search-results" class="list"></div></section>';
}

function notificationsPage() {
  const inbox = notifications.map((item, index) => {
    const state = item[0] === 'read' ? 'read' : 'unread';
    const title = item[1] || 'Thong bao';
    const message = item[2] || 'Ban co mot cap nhat moi.';
    const time = item[3] || 'Vua xong';
    const tone = /qua han|khan|gap|urgent|loi/i.test(title + ' ' + message)
      ? 'danger'
      : /hoan thanh|xong|thanh cong|duyet/i.test(title + ' ' + message)
        ? 'success'
        : /binh luan|nhac|sap den han|deadline|hop/i.test(title + ' ' + message)
          ? 'warning'
          : 'info';
    return { index, state, title, message, time, tone };
  });

  const unreadCount = inbox.filter((item) => item.state === 'unread').length;
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' });
  const summaryItems = [
    ['Chua doc', unreadCount, 'mark_email_unread'],
    ['Tong hop thu', inbox.length, 'inbox'],
    ['Can chu y', inbox.filter((item) => item.tone === 'danger' || item.tone === 'warning').length, 'priority_high']
  ];

  const highlights = inbox.slice(0, 3).map((item) =>
    '<article class="notice-highlight notice-highlight-' + item.tone + '">' +
      '<div class="notice-highlight-icon">' + icon(item.tone === 'danger' ? 'warning' : item.tone === 'success' ? 'task_alt' : item.tone === 'warning' ? 'schedule' : 'campaign') + '</div>' +
      '<div><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.message) + '</p><span>' + escapeHtml(item.time) + '</span></div>' +
    '</article>'
  ).join('');

  const grouped = {
    unread: inbox.filter((item) => item.state === 'unread'),
    read: inbox.filter((item) => item.state === 'read')
  };

  const renderGroup = (items, emptyText) => {
    if (!items.length) {
      return '<div class="empty">' + emptyText + '</div>';
    }
    return items.map((item) =>
      '<article class="card notice-card notice-' + item.state + ' notice-tone-' + item.tone + '">' +
        '<div class="notice-card-head">' +
          '<div class="notice-badge notice-badge-' + item.tone + '">' + icon(item.tone === 'danger' ? 'error' : item.tone === 'success' ? 'check_circle' : item.tone === 'warning' ? 'notifications_active' : 'notifications') + '</div>' +
          '<div class="notice-card-copy">' +
            '<div class="notice-card-topline"><span class="pill">' + (item.state === 'unread' ? 'Moi' : 'Da xem') + '</span><span class="meta">' + escapeHtml(item.time) + '</span></div>' +
            '<h3>' + escapeHtml(item.title) + '</h3>' +
          '</div>' +
        '</div>' +
        '<p class="notice-card-message">' + escapeHtml(item.message) + '</p>' +
        '<div class="notice-card-actions">' +
          '<button class="btn" data-notice-copy="' + item.index + '">' + icon('content_copy') + 'Sao chep</button>' +
          (item.state === 'unread' ? '<button class="btn primary" data-notice-read="' + item.index + '">' + icon('done') + 'Danh dau da doc</button>' : '<span class="meta">Luu trong hop thu hoat dong</span>') +
        '</div>' +
      '</article>'
    ).join('');
  };

  return pageHero('notifications', 'Theo doi nhac han, cap nhat cong viec, binh luan va trang thai moi trong workspace.', '<button class="btn" data-read-all>' + icon('done_all') + 'Danh dau da doc</button>') +
    '<section class="grid stats">' +
      summaryItems.map((item) => statCard(item[0], item[1], item[2])).join('') +
      statCard('Hom nay', today, 'today') +
    '</section>' +
    '<section class="grid two notifications-layout">' +
      '<div class="card notifications-sidebar">' +
        '<div class="card-top"><h2>Uu tien hom nay</h2><span class="pill">' + unreadCount + ' moi</span></div>' +
        '<p class="subtle">Nhung tin hieu quan trong nhat duoc gom lai de ban xu ly nhanh ma khong bi troi thong tin.</p>' +
        '<div class="notice-highlight-list">' + (highlights || '<div class="empty">Chua co diem noi bat nao.</div>') + '</div>' +
      '</div>' +
      '<div class="card notifications-sidebar">' +
        '<div class="card-top"><h2>Bo loc nhanh</h2><span class="pill">Realtime</span></div>' +
        '<div class="notifications-filter-grid">' +
          '<button class="filter-chip active" type="button">Tat ca</button>' +
          '<button class="filter-chip" type="button">Nhac han</button>' +
          '<button class="filter-chip" type="button">Binh luan</button>' +
          '<button class="filter-chip" type="button">Du an</button>' +
          '<button class="filter-chip" type="button">He thong</button>' +
          '<button class="filter-chip" type="button">Hoan thanh</button>' +
        '</div>' +
        '<p class="subtle">Trang nay da co day du bo cuc thong bao. Neu can, minh co the noi tiep bo loc nay voi API that.</p>' +
      '</div>' +
    '</section>' +
    '<section class="grid two notifications-inbox">' +
      '<div class="card"><div class="card-top"><h2>Chua doc</h2><span class="pill">' + grouped.unread.length + '</span></div><div class="list">' + renderGroup(grouped.unread, 'Khong co thong bao chua doc.') + '</div></div>' +
      '<div class="card"><div class="card-top"><h2>Lich su gan day</h2><span class="pill">' + grouped.read.length + '</span></div><div class="list">' + renderGroup(grouped.read, 'Chua co lich su thong bao.') + '</div></div>' +
    '</section>';
}
function reportsPage() {
  const overdue = tasks.filter((task) => task.date && new Date(task.date) < new Date(new Date().toDateString()) && normalizeStatus(task.status) !== 'Hoàn thành').length;
  return pageHero('reports', 'Theo d?i ti?n ð? công vi?c và hi?u su?t trong tài kho?n hi?n t?i.', '') +
    '<section class="grid stats">' +
      statCard('T?ng công vi?c', tasks.length, 'list_alt') +
      statCard('Hoàn thành', tasks.filter((task) => normalizeStatus(task.status) === 'Hoàn thành').length, 'task_alt') +
      statCard('Qua han', overdue, 'warning') +
      statCard('D? án', projects.length, 'folder') +
    '</section>';
}

function profilePage() {
  return pageHero('profile', 'Qu?n l? thông tin tài kho?n và d? li?u cá nhân cõ b?n.', '<button class="btn" id="logout-btn">' + icon('logout') + 'Ðãng xu?t</button>') +
    '<section class="grid two">' +
      '<div class="card"><h2>Tài kho?n</h2><div class="list"><div class="row"><strong>H? tên</strong><span>' + escapeHtml(currentUser?.name || 'Chýa c?p nh?t') + '</span></div><div class="row"><strong>Email</strong><span>' + escapeHtml(currentUser?.email || '') + '</span></div><div class="row"><strong>Vai tr?</strong><span>' + escapeHtml(currentUser?.role || 'user') + '</span></div></div></div>' +
      '<div class="card"><h2>Th?ng kê cá nhân</h2><div class="list"><div class="row"><strong>Công vi?c</strong><span>' + tasks.length + '</span></div><div class="row"><strong>D? án</strong><span>' + projects.length + '</span></div><div class="row"><strong>Thông báo</strong><span>' + notifications.length + '</span></div></div></div>' +
    '</section>';
}

function settingsPage() {
  return pageHero('settings', 'Tùy ch?nh giao di?n và không gian làm vi?c cá nhân.', '<button class="btn primary" data-save-settings>' + icon('save') + 'Lýu cài ð?t</button>') +
    '<section class="grid two">' +
      '<div class="card"><h2>Giao di?n</h2><div class="list"><label class="switch-row"><strong>Ch? ð? t?i</strong><input id="settings-theme" type="checkbox" ' + (preferences.theme === 'dark' ? 'checked' : '') + '></label><div class="field"><label>Tên không gian</label><input id="settings-workspace-name" value="' + escapeHtml(workspace.name || 'Không gian c?a tôi') + '"></div></div></div>' +
      '<div class="card"><h2>M?c ð?nh</h2><div class="list"><div class="row"><strong>Pomodoro</strong><span>25 phut</span></div><div class="row"><strong>Ð?nh d?ng l?ch</strong><span>Tháng hi?n t?i</span></div></div></div>' +
    '</section>';
}

function helpPage() {
  return pageHero('help', 'Hý?ng d?n nhanh de dung cac khu vuc chinh trong he thong.', '') +
    '<section class="grid two">' +
      '<div class="card"><h2>Hý?ng d?n nhanh</h2><div class="list"><div class="row"><strong>T?o công vi?c</strong><span>Dung nut xanh o moi trang</span></div><div class="row"><strong>Quan ly du an</strong><span>Vao trang D? án de tao va loc</span></div><div class="row"><strong>L?ch</strong><span>Xem han cong viec theo ngay thuc</span></div><div class="row"><strong>Ti?n ích</strong><span>V? diagram, thoi khoa bieu, dem ngay</span></div></div></div>' +
      '<div class="card"><h2>M?o s? d?ng</h2><div class="list"><div class="row"><strong>T?m ki?m</strong><span>Go ten cong viec, du an hoac thanh vien</span></div><div class="row"><strong>Kanban</strong><span>Keo tha task qua cac cot trang thai</span></div><div class="row"><strong>Xuat du lieu</strong><span>Dung Excel hoac ICS o trang Công vi?c</span></div></div></div>' +
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
  const names = ['Vi?c cá nhân', 'Hoc tap', 'Công vi?c', 'Gia dinh', ...projects.map((project) => project.name)];
  return [...new Set(names)].map((name) => '<option ' + (name === selected ? 'selected' : '') + '>' + escapeHtml(name) + '</option>').join('');
}

async function requestAiPlan(goal, category, dueDate) {
  try {
    const response = await fetch('/api/ai/plan-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: goal.trim(),
        category: category.trim(),
        dueDate: (dueDate || '').trim(),
        existingProjects: projects.map((project) => project.name)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || 'Không th? t?o g?i ? AI.');
      return null;
    }
    return data;
  } catch {
    showToast('Khong ket noi duoc AI Planner.');
    return null;
  }
}

function renderAiPreview(plan) {
  if (!plan) return '<div class="empty">Chua co goi y nao. Hay nhap muc tieu roi bam tao ke hoach.</div>';
  return '<section class="ai-preview">' +
    '<div class="ai-preview-head"><div><h4>' + escapeHtml(plan.title || 'Ke hoach AI') + '</h4><p class="subtle">' + escapeHtml(plan.description || '') + '</p></div><div class="ai-preview-meta"><span class="pill">' + escapeHtml(plan.project || 'Vi?c cá nhân') + '</span><span class="pill">' + escapeHtml(plan.priority || 'Trung b?nh') + '</span><span class="pill">' + escapeHtml(plan.status || 'C?n làm') + '</span></div></div>' +
    '<div><strong>Checklist ð? xu?t</strong><ol class="ai-preview-list">' + (Array.isArray(plan.checklist) ? plan.checklist.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') : '') + '</ol></div>' +
    '<div><strong>Task con t? chia</strong><ol class="ai-preview-list">' + (Array.isArray(plan.subtasks) ? plan.subtasks.map((item) => '<li>' + escapeHtml(item.title) + '</li>').join('') : '') + '</ol></div>' +
    '<p class="meta">' + escapeHtml(plan.notes || '') + '</p>' +
  '</section>';
}

function applyAiPlanToTaskForm(plan, options = {}) {
  const form = document.getElementById('modal-form');
  if (!form || !plan) return;
  form.elements.title.value = plan.title || '';
  form.elements.description.value = plan.description || '';
  if (form.elements.project) form.elements.project.value = plan.project || 'Vi?c cá nhân';
  if (form.elements.status) form.elements.status.value = plan.status || 'C?n làm';
  if (form.elements.priority) form.elements.priority.value = plan.priority || 'Trung b?nh';
  if (form.elements.checklist) form.elements.checklist.value = Array.isArray(plan.checklist) ? plan.checklist.join('\n') : '';
  if (form.elements.notes) form.elements.notes.value = plan.notes || '';
  if (options.addToCalendar && form.elements.date && !form.elements.date.value && document.getElementById('ai-planner-due-date')) {
    form.elements.date.value = document.getElementById('ai-planner-due-date').value || '';
  }
  form.dataset.aiSubtasks = JSON.stringify(Array.isArray(plan.subtasks) ? plan.subtasks : []);
  showToast('AI Planner ð? ði?n g?i ? vào bi?u m?u.');
}

function openAiPlannerModal(projectName = '') {
  let latestPlan = null;
  document.querySelector('.modal-backdrop')?.remove();
  const projectSuggestions = [...new Set(projects.map((project) => project.name).filter(Boolean))].slice(0, 6);
  document.body.insertAdjacentHTML('beforeend', '<div class="modal-backdrop"><div class="modal ai-planner-modal"><div class="modal-header"><div><h2>AI Planner</h2><p class="subtle">Bi?n m?c tiêu l?n thành k? ho?ch r? ràng, có checklist và task con.</p></div><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div><div class="ai-planner-shell"><section class="ai-planner-intro"><h3>T?o ke hoach thong minh</h3><p class="subtle">Nhap muc tieu theo cach tu nhien de AI goi y ke hoach day du.</p><div class="ai-planner-hint">Vi du: "On thi tieng Anh 7 ngay", "Hoàn thành bai thuyet trinh marketing", "Tang can trong 30 ngày".</div>' + (projectSuggestions.length ? '<div class="ai-planner-projects" style="margin-top:12px">' + projectSuggestions.map((name) => '<span class="ai-planner-chip">' + escapeHtml(name) + '</span>').join('') + '</div>' : '') + '</section><div class="field"><label>M?c tiêu</label><input id="ai-planner-goal" value="' + escapeHtml(projectName || '') + '" placeholder="Vi du: On thi tieng Anh 7 ngay"></div><div class="form-grid"><div class="field"><label>Nhóm vi?c</label><select id="ai-planner-category"><option value="hoc_tap">Hoc tap</option><option value="cong_viec">Công vi?c</option><option value="ca_nhan">Ca nhan</option><option value="suc_khoe">Suc khoe</option></select></div><div class="field"><label>H?n chót</label><input id="ai-planner-due-date" type="date"></div></div><label class="switch-row"><strong>Thêm th?ng vào l?ch</strong><input id="ai-planner-calendar" type="checkbox" checked></label><div class="ai-planner-actions"><button class="btn primary" type="button" id="ai-planner-generate">' + icon('auto_awesome') + 'T?o ke hoach</button><button class="btn" type="button" id="ai-planner-apply">' + icon('assignment_turned_in') + 'Dùng cho công vi?c hi?n t?i</button><button class="btn" type="button" id="ai-planner-create-task">' + icon('add_task') + 'T?o công vi?c moi tu AI</button></div><div id="ai-planner-preview">' + renderAiPreview(null) + '</div></div></div>');

  $$('[data-close]').forEach((button) => {
    button.onclick = () => document.querySelector('.modal-backdrop')?.remove();
  });

  const generate = async () => {
    const goal = document.getElementById('ai-planner-goal')?.value || '';
    const category = document.getElementById('ai-planner-category')?.value || 'ca_nhan';
    const dueDate = document.getElementById('ai-planner-due-date')?.value || '';
    if (!goal.trim()) {
      showToast('Hay nhap muc tieu de AI lap ke hoach.');
      return null;
    }
    const plan = await requestAiPlan(goal, category, dueDate);
    if (!plan) return null;
    latestPlan = plan;
    const preview = document.getElementById('ai-planner-preview');
    if (preview) preview.innerHTML = renderAiPreview(plan);
    return plan;
  };

  const generateButton = document.getElementById('ai-planner-generate');
  if (generateButton) generateButton.onclick = generate;

  const applyButton = document.getElementById('ai-planner-apply');
  if (applyButton) {
    applyButton.onclick = async () => {
      const plan = latestPlan || await generate();
      if (!plan) return;
      applyAiPlanToTaskForm(plan, { addToCalendar: document.getElementById('ai-planner-calendar')?.checked });
      document.querySelector('.modal-backdrop')?.remove();
    };
  }

  const createButton = document.getElementById('ai-planner-create-task');
  if (createButton) {
    createButton.onclick = async () => {
      const plan = latestPlan || await generate();
      if (!plan) return;
      document.querySelector('.modal-backdrop')?.remove();
      openTaskModal(plan.project || projectName || '');
      setTimeout(() => applyAiPlanToTaskForm(plan, { addToCalendar: document.getElementById('ai-planner-calendar')?.checked }), 0);
    };
  }
}

function openTaskModal(projectName = '') {
  openModal('<div class="modal-header"><h2>T?o công vi?c</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div>' +
    '<div class="toolbar" style="margin-bottom:12px"><button class="btn ai-planner-launch" type="button" id="ai-planner-fill">' + icon('auto_awesome') + 'L?p k? ho?ch v?i AI Planner</button></div>' +
    '<div class="field"><label>Tên công vi?c</label><input name="title" required></div>' +
    '<p class="meta" style="margin-top:-6px;margin-bottom:12px">Vi du: "On thi tieng Anh 7 ngay" hoac "Tang can trong 30 ngày".</p>' +
    '<div class="field"><label>Mô t?</label><textarea name="description"></textarea></div>' +
    '<div class="form-grid"><div class="field"><label>D? án</label><select name="project">' + buildProjectOptions(projectName) + '</select></div><div class="field"><label>Trang thai</label><select name="status"><option>C?n làm</option><option>Ðang làm</option><option>Ðang duy?t</option><option>Hoàn thành</option></select></div><div class="field"><label>Uu tien</label><select name="priority"><option>Thap</option><option selected>Trung b?nh</option><option>Cao</option></select></div><div class="field"><label>Ngày h?n</label><input name="date" type="date"></div></div>' +
    '<div class="field"><label>Checklist (moi dong la mot muc)</label><textarea name="checklist"></textarea></div>' +
    '<div class="field"><label>Ghi chú</label><textarea name="notes"></textarea></div>' +
    '<div class="modal-actions"><button class="btn" type="button" data-close>H?y</button><button class="btn primary">T?o</button></div>', (form) => {
      const now = Date.now();
      const task = {
        id: now,
        title: form.get('title'),
        description: form.get('description'),
        project: form.get('project'),
        status: form.get('status'),
        priority: form.get('priority'),
        label: 'Công vi?c',
        date: form.get('date'),
        due: form.get('date') || 'Chýa ð?t h?n',
        notes: form.get('notes'),
        owner: 'Ban',
        checklist: String(form.get('checklist') || '').split(/\r?\n/).filter(Boolean).map((line, index) => ({ id: now + '-' + index, label: line, done: false })),
        subtasks: (() => { try { return JSON.parse(document.getElementById('modal-form')?.dataset.aiSubtasks || '[]'); } catch { return []; } })(),
        activity: []
      };
      tasks.unshift(task);
      addTaskActivity(task, 'T?o công vi?c', 'Công vi?c duoc tao moi.');
      createNotification('unread', projectName ? 'Da them cong viec cho du an' : 'Da tao cong viec', task.title);
    });

  const aiButton = document.getElementById('ai-planner-fill');
  if (aiButton) {
    aiButton.onclick = () => openAiPlannerModal(projectName);
  }
}
function openProjectModal() {
  openModal('<div class="modal-header"><h2>T?o d? án</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div><div class="field"><label>Tên du an</label><input name="name" required></div><div class="field"><label>Trang thai</label><select name="status"><option>Dang hoat dong</option><option>Tam dung</option><option>Hoàn thành</option></select></div><div class="modal-actions"><button class="btn" type="button" data-close>H?y</button><button class="btn primary">T?o</button></div>', (form) => {
    projects.unshift({ name: form.get('name'), progress: 0, status: form.get('status'), tasks: 0 });
  });
}

function openMemberModal() {
  openModal('<div class="modal-header"><h2>Thêm nhóm</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div><div class="field"><label>Tên nguoi</label><input name="person" required></div><div class="field"><label>Nhom</label><input name="group" required></div><div class="field"><label>Công vi?c</label><input name="task" required></div><div class="field"><label>Ngày h?n</label><input name="due" type="date"></div><div class="modal-actions"><button class="btn" type="button" data-close>H?y</button><button class="btn primary">Them</button></div>', (form) => {
    team.unshift({ person: form.get('person'), group: form.get('group'), task: form.get('task'), due: form.get('due') });
    createNotification('unread', 'Da gan viec', form.get('person') + ' Â· ' + form.get('task'));
  });
}

function openTaskDetail(taskId) {
  const task = tasks.find((item) => String(item.id) === String(taskId));
  if (!task) return;
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const history = (task.activity || []).length
    ? task.activity.slice().reverse().map((activity) => '<div class="row"><div><strong>' + escapeHtml(activity.action) + '</strong><div class="meta">' + escapeHtml(activity.detail || '') + '</div></div><span class="meta">' + escapeHtml(activity.at || '') + '</span></div>').join('')
    : '<div class="empty">Chýa có l?ch s?.</div>';
  openModal('<div class="modal-header"><h2>Chi ti?t công vi?c</h2><button class="icon-button" type="button" data-close>' + icon('close') + '</button></div>' +
    '<div class="field"><label>Tên</label><input name="title" value="' + escapeHtml(task.title) + '"></div>' +
    '<div class="field"><label>Mô t?</label><textarea name="description">' + escapeHtml(task.description || '') + '</textarea></div>' +
    '<div class="form-grid"><div class="field"><label>Trang thai</label><select name="status"><option ' + (normalizeStatus(task.status) === 'C?n làm' ? 'selected' : '') + '>C?n làm</option><option ' + (normalizeStatus(task.status) === 'Ðang làm' ? 'selected' : '') + '>Ðang làm</option><option ' + (normalizeStatus(task.status) === 'Ðang duy?t' ? 'selected' : '') + '>Ðang duy?t</option><option ' + (normalizeStatus(task.status) === 'Hoàn thành' ? 'selected' : '') + '>Hoàn thành</option></select></div><div class="field"><label>Ngày h?n</label><input name="date" type="date" value="' + escapeHtml(task.date || '') + '"></div></div>' +
    '<div class="field"><label>Checklist (moi dong la mot muc, them [x] dau dong de danh dau hoan thanh)</label><textarea name="checklist">' + escapeHtml(checklist.map((item) => (item.done ? '[x] ' : '') + item.label).join('\n')) + '</textarea></div>' +
    '<div class="card" style="padding:12px;margin-top:12px"><h3 style="margin-top:0">L?ch s? ho?t ð?ng</h3><div class="list">' + history + '</div></div>' +
    '<div class="modal-actions"><button class="btn" type="button" data-close>H?y</button><button class="btn primary">Lýu</button></div>', (form) => {
      task.title = form.get('title');
      task.description = form.get('description');
      task.status = form.get('status');
      task.date = form.get('date');
      task.due = task.date || 'Chýa ð?t h?n';
      task.checklist = String(form.get('checklist') || '').split(/\r?\n/).filter(Boolean).map((line, index) => ({ id: task.id + '-' + index, label: line.replace(/^\s*\[x\]\s*/i, '').trim(), done: /^\s*\[x\]\s*/i.test(line) }));
      addTaskActivity(task, 'C?p nh?t', 'Da luu chi tiet cong viec.');
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
        addTaskActivity(task, 'Ð?i tr?ng thái', 'Chuy?n sang ' + task.status);
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
  const title = $('#count-title')?.value || 'Ngày ð?c bi?t';
  const dateValue = $('#count-date')?.value;
  const overlay = $('#count-preview .count-overlay');
  if (!overlay) return;
  if (!dateValue) {
    overlay.innerHTML = '<h3>Ch?n ngày ð? b?t ð?u</h3><strong>0 ngày</strong><p>Kho?ng cách s? hi?n th? ? ðây.</p>';
    return;
  }
  const today = new Date(new Date().toDateString());
  const target = new Date(dateValue);
  const diff = Math.round((target - today) / 86400000);
  const text = diff < 0 ? 'Da duoc ' + Math.abs(diff) + ' ngay' : diff > 0 ? 'Con ' + diff + ' ngay' : 'Chính là hôm nay';
  overlay.innerHTML = '<h3>' + escapeHtml(title) + '</h3><strong>' + text + '</strong><p>' + target.toLocaleDateString('vi-VN') + '</p>';
}

function importCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    String(reader.result || '').split(/\r?\n/).slice(1).filter(Boolean).forEach((line) => {
      const cols = line.split(',').map((item) => item.trim());
      if (!cols[0]) return;
      tasks.unshift({ id: Date.now() + Math.random(), title: cols[0], project: cols[1] || 'Vi?c cá nhân', status: cols[2] || 'C?n làm', priority: cols[3] || 'Trung b?nh', label: cols[4] || 'Công vi?c', date: cols[5] || '', due: cols[5] || 'Chýa ð?t h?n', notes: cols[6] || '', owner: 'Ban', checklist: [], activity: [] });
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
        ...projects.map((project) => ({ label: project.name, meta: project.status || 'Dang hoat dong', route: '/projects', type: 'project' })),
        ...team.map((member) => ({ label: member.person, meta: member.group + ' Â· ' + member.task, route: '/team', type: 'team' })),
        ...PRIMARY_NAV.concat(SECONDARY_NAV).map((item) => ({ label: item[2], meta: 'Dieu huong', route: '/' + item[0], type: 'page' }))
      ];
      results = local.filter((item) => (item.label + ' ' + item.meta).toLowerCase().includes(query));
    }
    resultBox.innerHTML = results.length ? results.map((item) => '<button class="row search-result" ' + (item.id ? 'data-open-task="' + item.id + '"' : '') + ' data-route="' + item.route + '"><div><strong>' + escapeHtml(item.label) + '</strong><div class="meta">' + escapeHtml(item.type) + ' Â· ' + escapeHtml(item.meta) + '</div></div>' + icon('arrow_forward') + '</button>').join('') : '<div class="empty">Khong tim thay ket qua.</div>';
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

  $('[data-notice-read]').forEach((button) => {
    button.onclick = async () => {
      const index = Number(button.dataset.noticeRead);
      if (!Number.isFinite(index) || !notifications[index]) return;
      notifications[index] = ['read', notifications[index][1], notifications[index][2], notifications[index][3]];
      await fetch('/api/notifications/read-all', { method: 'PATCH' }).catch(() => null);
      saveState();
      render();
    };
  });

  $('[data-notice-copy]').forEach((button) => {
    button.onclick = async () => {
      const index = Number(button.dataset.noticeCopy);
      if (!Number.isFinite(index) || !notifications[index]) return;
      const text = [notifications[index][1], notifications[index][2], notifications[index][3]].filter(Boolean).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        showToast('Ð? sao chép thông báo');
      } catch {
        showToast('Không th? sao chép thông báo');
      }
    };
  });

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
      showToast('Ð? lýu cài ð?t');
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







