import { api } from '../../src/services/api.js';

(async () => {
  const bulk = document.getElementById('bulk-actions');
  const closeBtn = document.getElementById('bulk-close');
  const selectAll = document.getElementById('select-all');
  const tbody = document.getElementById('task-table-body');
  const newTaskButtons = Array.from(document.querySelectorAll('button')).filter((btn) => btn.textContent.includes('New Task'));
  const countBadge = document.querySelector('span.bg-surface-container-high');
  const taskListState = document.getElementById('task-list-state');
  const taskListSummary = document.getElementById('task-list-summary');
  const createTaskModal = document.getElementById('create-task-modal');
  const createTaskForm = document.getElementById('create-task-form');
  const createTaskClose = document.getElementById('create-task-close');
  const createTaskCancel = document.getElementById('create-task-cancel');
  const createTaskMessage = document.getElementById('create-task-message');
  const createTaskTitle = document.getElementById('create-task-title');
  const createTaskProject = document.getElementById('create-task-project');
  const createTaskSubmit = document.getElementById('create-task-submit');
  const createTaskPriority = document.getElementById('create-task-priority');
  const createTaskStatus = document.getElementById('create-task-status');
  let projects = [];

  if (!tbody) return;

  const rowChecks = () => Array.from(tbody.querySelectorAll('input[type="checkbox"]'));

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  function showTaskListState(message, tone = 'info') {
    if (!taskListState) return;
    taskListState.textContent = message;
    taskListState.className = 'mb-md rounded-xl border px-md py-sm text-sm';
    if (tone === 'error') {
      taskListState.classList.add('border-[#ef4444]/30', 'bg-[#fef2f2]', 'text-[#991b1b]');
    } else if (tone === 'success') {
      taskListState.classList.add('border-[#86efac]', 'bg-[#f0fdf4]', 'text-[#166534]');
    } else {
      taskListState.classList.add('border-surface-variant', 'bg-surface-container-low', 'text-on-surface-variant');
    }
  }

  function clearTaskListState() {
    if (!taskListState) return;
    taskListState.textContent = '';
    taskListState.className = 'hidden mb-md rounded-xl border px-md py-sm text-sm';
  }

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

  function showCreateTaskMessage(message, tone = 'error') {
    if (!createTaskMessage) return;
    createTaskMessage.textContent = message;
    createTaskMessage.className = 'rounded-lg border px-md py-sm text-sm';
    if (tone === 'error') {
      createTaskMessage.classList.add('border-[#ef4444]/30', 'bg-[#fef2f2]', 'text-[#991b1b]');
    } else {
      createTaskMessage.classList.add('border-[#86efac]', 'bg-[#f0fdf4]', 'text-[#166534]');
    }
  }

  function clearCreateTaskMessage() {
    if (!createTaskMessage) return;
    createTaskMessage.textContent = '';
    createTaskMessage.className = 'hidden rounded-lg border px-md py-sm text-sm';
  }

  function setCreateTaskBusy(isBusy) {
    if (createTaskSubmit) createTaskSubmit.disabled = isBusy;
    if (createTaskTitle) createTaskTitle.disabled = isBusy;
    if (createTaskProject) createTaskProject.disabled = isBusy || projects.length === 0;
    if (createTaskPriority) createTaskPriority.disabled = isBusy;
    if (createTaskStatus) createTaskStatus.disabled = isBusy;
  }

  function populateProjectOptions() {
    if (!createTaskProject) return;

    if (!projects.length) {
      createTaskProject.innerHTML = '<option value="">No projects available</option>';
      createTaskProject.disabled = true;
      showCreateTaskMessage('Create a project first before adding tasks.');
      return;
    }

    createTaskProject.innerHTML = projects.map((project) => {
      return '<option value="' + escapeHtml(project.id) + '">' + escapeHtml(project.name) + '</option>';
    }).join('');
    createTaskProject.disabled = false;
  }

  function openCreateTaskModal() {
    if (!createTaskModal) return;
    createTaskForm?.reset();
    populateProjectOptions();
    clearCreateTaskMessage();
    if (!projects.length) {
      showCreateTaskMessage('Create a project first before adding tasks.');
    } else if (createTaskProject && projects[0]) {
      createTaskProject.value = projects[0].id;
    }
    createTaskModal.classList.remove('hidden');
    createTaskModal.classList.add('flex');
    setCreateTaskBusy(false);
    createTaskTitle?.focus();
  }

  function closeCreateTaskModal() {
    if (!createTaskModal) return;
    createTaskModal.classList.add('hidden');
    createTaskModal.classList.remove('flex');
    clearCreateTaskMessage();
    createTaskForm?.reset();
  }

  function renderTasks(tasks) {
    tbody.innerHTML = tasks.map((task) => '
      <tr class="hover:bg-surface-container-low transition-colors group" data-task-id="' + encodeURIComponent(task.id) + '">
        <td class="py-md px-md"><input class="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4" type="checkbox"/></td>
        <td class="py-md px-md cursor-pointer task-open">
          <div class="font-medium text-primary">' + escapeHtml(task.title) + '</div>
          <div class="text-xs text-on-surface-variant mt-1">' + escapeHtml(task.description || '') + '</div>
        </td>
        <td class="py-md px-md">' + escapeHtml(task.projectName || '-') + '</td>
        <td class="py-md px-md">' + escapeHtml(task.assigneeName || '-') + '</td>
        <td class="py-md px-md text-on-surface-variant">' + escapeHtml(task.dueDate || '-') + '</td>
        <td class="py-md px-md"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + priorityClass(task.priority) + '">' + escapeHtml(task.priority || 'Medium') + '</span></td>
        <td class="py-md px-md"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + statusClass(task.status) + '">' + escapeHtml(task.status || 'To Do') + '</span></td>
      </tr>
    ').join('');

    if (countBadge) countBadge.textContent = String(tasks.length);
    if (taskListSummary) taskListSummary.textContent = tasks.length ? ('Showing ' + tasks.length + ' task' + (tasks.length === 1 ? '' : 's')) : 'No tasks yet';
    if (!tasks.length) {
      showTaskListState('No tasks yet. Create your first task to get started.');
    } else {
      clearTaskListState();
    }
    updateBulk();
  }

  function updateBulk() {
    const selected = rowChecks().filter((c) => c.checked).length;
    if (!bulk) return;
    bulk.style.display = selected > 0 ? 'flex' : 'none';
    const label = bulk.querySelector('.font-medium');
    if (label) label.textContent = selected + ' tasks selected';
  }

  async function loadTasks() {
    showTaskListState('Loading tasks...');
    try {
      const tasks = await api.tasks();
      renderTasks(tasks);
    } catch (err) {
      showTaskListState(err.message || 'Unable to load tasks', 'error');
      if (taskListSummary) taskListSummary.textContent = 'Unable to load tasks';
      tbody.innerHTML = '';
    }
  }

  async function loadProjects() {
    try {
      projects = await api.projects();
      populateProjectOptions();
    } catch (err) {
      projects = [];
      populateProjectOptions();
      console.warn(err.message || 'Unable to load projects');
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
    if (id) window.location.href = '/tasks?id=' + id;
  });

  closeBtn?.addEventListener('click', () => {
    rowChecks().forEach((c) => { c.checked = false; });
    if (selectAll) selectAll.checked = false;
    updateBulk();
  });

  newTaskButtons.forEach((btn) => btn.addEventListener('click', openCreateTaskModal));
  createTaskClose?.addEventListener('click', closeCreateTaskModal);
  createTaskCancel?.addEventListener('click', closeCreateTaskModal);
  createTaskModal?.addEventListener('click', (e) => {
    if (e.target === createTaskModal) closeCreateTaskModal();
  });

  createTaskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = createTaskTitle?.value?.trim() || '';
    const projectId = createTaskProject?.value || '';
    const priority = createTaskPriority?.value || 'Medium';
    const status = createTaskStatus?.value || 'To Do';

    if (!title) {
      showCreateTaskMessage('Task title is required.');
      return;
    }
    if (!projectId) {
      showCreateTaskMessage('Choose a project before creating a task.');
      return;
    }

    setCreateTaskBusy(true);
    clearCreateTaskMessage();

    try {
      await api.createTask({ title, projectId, priority, status });
      closeCreateTaskModal();
      showTaskListState('Task created successfully.', 'success');
      await loadTasks();
    } catch (err) {
      showCreateTaskMessage(err.message || 'Unable to create task');
      setCreateTaskBusy(false);
    }
  });

  await loadProjects();
  await loadTasks();
})();
