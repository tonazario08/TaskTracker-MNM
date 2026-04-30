/* app.js — TaskTracker frontend logic */

let allTasks = [];
let allProjects = [];
let activeProjectId = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function showStatus(msg, duration = 2500) {
  const bar = document.getElementById('status-bar');
  bar.textContent = msg;
  bar.classList.add('show');
  setTimeout(() => bar.classList.remove('show'), duration);
}

// Bản đồ dịch trạng thái và độ ưu tiên
const PRIORITY_VI = { 'High': 'Cao', 'Medium': 'Trung bình', 'Low': 'Thấp' };
const STATUS_VI   = { 'To Do': 'Cần làm', 'In Progress': 'Đang làm', 'In Review': 'Đang xét duyệt', 'Done': 'Hoàn thành' };

function priorityBadgeClass(priority) {
  if (!priority) return '';
  const p = priority.toLowerCase();
  if (p === 'high') return 'badge-high';
  if (p === 'medium') return 'badge-medium';
  return 'badge-low';
}

function statusBadgeClass(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s === 'in progress') return 'badge-progress';
  if (s === 'in review') return 'badge-review';
  if (s === 'done') return 'badge-done';
  return 'badge-todo';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderProjects(projects) {
  const list = document.getElementById('project-list');
  const allItem = `
    <li class="project-item ${activeProjectId === null ? 'active' : ''}" data-id="all">
      <span class="dot"></span> Tất cả dự án
    </li>`;
  const items = projects.map(p => `
    <li class="project-item ${activeProjectId === p.id ? 'active' : ''}" data-id="${p.id}">
      <span class="dot"></span> ${p.name}
    </li>`).join('');
  list.innerHTML = allItem + items;

  // Populate project select in form
  const sel = document.getElementById('task-project');
  const prevVal = sel.value;
  sel.innerHTML = '<option value="">— Chọn dự án —</option>' +
    projects.map(p => `<option value="${p.id}" ${p.id === prevVal ? 'selected' : ''}>${p.name}</option>`).join('');

  list.querySelectorAll('.project-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      activeProjectId = id === 'all' ? null : id;
      const titleEl = document.getElementById('current-project-name');
      if (activeProjectId === null) {
        titleEl.textContent = 'Tất cả công việc';
      } else {
        const proj = projects.find(p => p.id === activeProjectId);
        titleEl.textContent = proj ? proj.name : 'Công việc';
      }
      renderTasks(allTasks);
      // Update active state
      list.querySelectorAll('.project-item').forEach(li => li.classList.remove('active'));
      el.classList.add('active');
    });
  });
}

function renderTasks(tasks) {
  const container = document.getElementById('task-list');
  const filtered = activeProjectId
    ? tasks.filter(t => t.projectId === activeProjectId)
    : tasks;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="state-msg">Chưa có công việc nào. Hãy thêm bên trên!</div>';
    return;
  }

  container.innerHTML = filtered.map(t => {
    const proj = allProjects.find(p => p.id === t.projectId);
    const statusLabel   = STATUS_VI[t.status]   || t.status;
    const priorityLabel = PRIORITY_VI[t.priority] || t.priority;
    return `
    <div class="task-card">
      <div>
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          <span class="badge ${statusBadgeClass(t.status)}">${statusLabel}</span>
          <span class="badge ${priorityBadgeClass(t.priority)}">${priorityLabel}</span>
          ${proj ? `<span class="badge" style="background:#f0eded;color:#44474a;">${proj.name}</span>` : ''}
          ${t.assignee ? `<span class="task-assignee">👤 ${t.assignee}</span>` : ''}
        </div>
      </div>
      <div class="task-due">${formatDate(t.dueDate)}</div>
    </div>`;
  }).join('');
}

// ── Fetch data ─────────────────────────────────────────────────────────────

async function loadProjects() {
  const res = await fetch('/api/projects');
  allProjects = await res.json();
  renderProjects(allProjects);
}

async function loadTasks() {
  const res = await fetch('/api/tasks');
  allTasks = await res.json();
  renderTasks(allTasks);
}

// ── Form submit ────────────────────────────────────────────────────────────

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    title:     form.title.value.trim(),
    projectId: form.projectId.value,
    priority:  form.priority.value,
    assignee:  form.assignee.value.trim(),
    dueDate:   form.dueDate.value,
  };

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Đang thêm…';

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Server error');
    const newTask = await res.json();
    allTasks.push(newTask);
    renderTasks(allTasks);
    form.reset();
    showStatus('✓ Đã thêm công việc thành công');
  } catch (err) {
    showStatus('✗ Không thể thêm công việc', 3000);
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Thêm công việc';
  }
});

// ── Init ───────────────────────────────────────────────────────────────────

(async () => {
  // Kiểm tra đăng nhập
  const meRes = await fetch('/api/auth/me');
  if (!meRes.ok) {
    window.location.replace('/app/login.html');
    return;
  }
  const me = await meRes.json();
  document.getElementById('user-name').textContent = `👤 ${me.name}`;

  // Đăng xuất
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.replace('/app/login.html');
  });

  try {
    await Promise.all([loadProjects(), loadTasks()]);
  } catch (err) {
    document.getElementById('task-list').innerHTML =
      '<div class="state-msg">⚠ Không thể kết nối tới máy chủ.</div>';
  }
})();
