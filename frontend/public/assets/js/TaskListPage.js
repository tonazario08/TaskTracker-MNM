import { api } from '../../src/services/api.js';

(() => {
  const bulk = document.getElementById('bulk-actions');
  const closeBtn = document.getElementById('bulk-close');
  const selectAll = document.getElementById('select-all');
  const tbody = document.getElementById('task-table-body');
  const newTaskButtons = Array.from(document.querySelectorAll('button')).filter((btn) => btn.textContent.includes('New Task'));
  const countBadge = document.querySelector('span.bg-surface-container-high');

  if (!tbody) return;

  const rowChecks = () => Array.from(tbody.querySelectorAll('input[type="checkbox"]'));

  function priorityClass(priority) {
    if (priority === 'Urgent') return 'bg-[#fef2f2] text-[#b91c1c] border border-[#ef4444]/30';
    if (priority === 'High') return 'bg-[#fee2e2] text-[#991b1b] border border-[#f87171]/30';
    if (priority === 'Medium') return 'bg-[#fef3c7] text-[#92400e] border border-[#fbbf24]/30';
    return 'bg-[#f3f4f6] text-[#374151] border border-[#d1d5db]/30';
  }

  function statusClass(status) {
    if (status === 'Done') return 'bg-[#dcfce7] text-[#166534]';
    if (status === 'In Review') return 'bg-[#e0e7ff] text-[#3730a3]';
    return 'bg-surface-container-highest text-on-surface';
  }

  function renderTasks(tasks) {
    tbody.innerHTML = tasks.map((task) => `
      <tr class="hover:bg-surface-container-low transition-colors group" data-task-id="${task.id}">
        <td class="py-md px-md"><input class="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4" type="checkbox"/></td>
        <td class="py-md px-md cursor-pointer task-open">
          <div class="font-medium text-primary">${task.title || ''}</div>
          <div class="text-xs text-on-surface-variant mt-1">${task.description || ''}</div>
        </td>
        <td class="py-md px-md">${task.projectName || '-'}</td>
        <td class="py-md px-md">${task.assigneeName || '-'}</td>
        <td class="py-md px-md text-on-surface-variant">${task.dueDate || '-'}</td>
        <td class="py-md px-md"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityClass(task.priority)}">${task.priority || 'Medium'}</span></td>
        <td class="py-md px-md"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusClass(task.status)}">${task.status || 'To Do'}</span></td>
      </tr>
    `).join('');

    if (countBadge) countBadge.textContent = String(tasks.length);
    updateBulk();
  }

  function updateBulk() {
    const selected = rowChecks().filter((c) => c.checked).length;
    if (!bulk) return;
    bulk.style.display = selected > 0 ? 'flex' : 'none';
    const label = bulk.querySelector('.font-medium');
    if (label) label.textContent = `${selected} tasks selected`;
  }

  async function loadTasks() {
    try {
      const tasks = await api.tasks();
      renderTasks(tasks);
    } catch (err) {
      alert(err.message || 'Khong the tai danh sach task');
    }
  }

  async function createTask() {
    const title = window.prompt('Nhap ten task moi');
    if (!title) return;
    try {
      await api.createTask({ title, priority: 'Medium', status: 'To Do' });
      await loadTasks();
    } catch (err) {
      alert(err.message || 'Khong the tao task');
    }
  }

  selectAll?.addEventListener('change', () => {
    rowChecks().forEach((c) => { c.checked = selectAll.checked; });
    updateBulk();
  });

  tbody.addEventListener('change', (e) => {
    if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'checkbox') return;
    const checks = rowChecks();
    if (selectAll) selectAll.checked = checks.length > 0 && checks.every((c) => c.checked);
    updateBulk();
  });

  tbody.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const row = target.closest('tr[data-task-id]');
    if (!row) return;
    if (target.closest('input[type="checkbox"]')) return;
    const id = row.getAttribute('data-task-id');
    if (id) window.location.href = `./TaskDetailPage.html?id=${encodeURIComponent(id)}`;
  });

  closeBtn?.addEventListener('click', () => {
    rowChecks().forEach((c) => { c.checked = false; });
    if (selectAll) selectAll.checked = false;
    updateBulk();
  });

  newTaskButtons.forEach((btn) => btn.addEventListener('click', createTask));

  loadTasks();
})();
