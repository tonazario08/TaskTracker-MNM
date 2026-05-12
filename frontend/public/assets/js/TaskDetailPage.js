import { api } from '../../src/services/api.js';

(() => {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');
  const closeBtn = document.getElementById('close-task-detail');
  const backdrop = document.getElementById('task-detail-backdrop');
  const markDone = document.getElementById('mark-done-btn');
  const statusBadge = document.getElementById('task-status-badge');
  const titleNode = document.getElementById('task-title');
  const descriptionBox = document.getElementById('task-description');
  const assigneeNode = document.getElementById('task-assignee');
  const assigneeAvatar = document.getElementById('assignee-avatar');
  const dueDateNode = document.getElementById('task-due-date');
  const projectNode = document.getElementById('task-project');
  const priorityNode = document.getElementById('task-priority');
  const priorityBadge = document.getElementById('task-priority-badge');
  const labelsNode = document.getElementById('task-labels');
  const subtasksNode = document.getElementById('subtasks-list');
  const commentsList = document.getElementById('comments-list');
  const commentInput = document.getElementById('comment-input');
  const commentSubmit = document.getElementById('comment-submit');
  const detailMessage = document.getElementById('task-detail-message');

  const openSubtaskModalBtn = document.getElementById('open-subtask-modal-btn');
  const subtaskModal = document.getElementById('subtask-modal');
  const closeSubtaskModalBtn = document.getElementById('close-subtask-modal-btn');
  const cancelSubtaskBtn = document.getElementById('cancel-subtask-btn');
  const subtaskForm = document.getElementById('subtask-form');

  const openLabelModalBtn = document.getElementById('open-label-modal-btn');
  const labelModal = document.getElementById('label-modal');
  const closeLabelModalBtn = document.getElementById('close-label-modal-btn');
  const cancelLabelBtn = document.getElementById('cancel-label-btn');
  const labelForm = document.getElementById('label-form');

  function backToList() { window.location.href = './TaskListPage.html'; }
  function formatDate(value) { if (!value) return 'No due date'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(); }
  function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  function showModal(modal) { modal?.classList.remove('hidden'); modal?.classList.add('flex'); }
  function hideModal(modal) { modal?.classList.add('hidden'); modal?.classList.remove('flex'); }

  function showDetailMessage(message, tone = 'error') {
    if (!detailMessage) return;
    detailMessage.textContent = message;
    detailMessage.className = 'mx-lg mt-lg rounded-xl border px-md py-sm text-sm';
    if (tone === 'error') {
      detailMessage.classList.add('border-[#ef4444]/30', 'bg-[#fef2f2]', 'text-[#991b1b]');
    } else {
      detailMessage.classList.add('border-[#86efac]', 'bg-[#f0fdf4]', 'text-[#166534]');
    }
  }

  function clearDetailMessage() {
    if (!detailMessage) return;
    detailMessage.textContent = '';
    detailMessage.className = 'hidden mx-lg mt-lg rounded-xl border px-md py-sm text-sm';
  }

  function priorityClass(priority) {
    if (priority === 'Urgent') return 'bg-[#fef2f2] text-[#b91c1c] border border-[#ef4444]/30';
    if (priority === 'High') return 'bg-[#fee2e2] text-[#991b1b] border border-[#f87171]/30';
    if (priority === 'Medium') return 'bg-[#fef3c7] text-[#92400e] border border-[#fbbf24]/30';
    return 'bg-surface-container-high text-on-surface border border-outline-variant';
  }

  function renderComments(comments) {
    if (!commentsList) return;
    commentsList.innerHTML = comments.length ? comments.map((c) => `<div class="flex gap-md"><div class="w-[32px] h-[32px] rounded-full bg-surface-container-high flex items-center justify-center font-badge text-badge text-on-surface-variant shrink-0 mt-xs">${escapeHtml((c.user_name || 'U').slice(0, 2).toUpperCase())}</div><div class="flex-1"><div class="flex items-baseline gap-sm mb-xs"><span class="font-body-md text-body-md text-on-background font-medium">${escapeHtml(c.user_name || 'Unknown')}</span><span class="font-badge text-badge text-outline">${new Date(c.created_at).toLocaleString()}</span></div><div class="font-body-md text-body-md text-on-surface-variant">${escapeHtml(c.content || '')}</div></div></div>`).join('') : '<div class="text-on-surface-variant text-sm">No comments yet.</div>';
  }

  function renderSubtasks(task) {
    if (!subtasksNode) return;
    const subtasks = task.subtasks || [];
    subtasksNode.innerHTML = subtasks.length ? subtasks.map((s) => `<div class="flex items-center gap-sm p-sm rounded-lg border border-surface-variant ${s.status === 'Done' ? 'opacity-60' : ''}"><span class="material-symbols-outlined ${s.status === 'Done' ? 'text-primary-container' : 'text-outline'}">${s.status === 'Done' ? 'check_circle' : 'radio_button_unchecked'}</span><div class="flex-1 min-w-0"><div class="font-body-md text-body-md text-on-background ${s.status === 'Done' ? 'line-through' : ''}">${escapeHtml(s.title)}</div><div class="text-xs text-on-surface-variant">${escapeHtml(s.assigneeName || 'Unassigned')} - ${escapeHtml(formatDate(s.dueDate))}</div></div></div>`).join('') : '<div class="text-on-surface-variant text-sm">No subtasks yet.</div>';
  }

  function renderLabels(task) {
    if (!labelsNode) return;
    const labels = task.labels || [];
    labelsNode.innerHTML = labels.length ? labels.map((l) => `<span class="px-sm py-[4px] font-badge text-badge rounded-[4px] border" style="background:${escapeHtml(l.color || '#E5E7EB')}20;color:${escapeHtml(l.color || '#374151')};border-color:${escapeHtml(l.color || '#D1D5DB')}66;">${escapeHtml(l.name)}</span>`).join('') : '<span class="px-sm py-[4px] bg-surface-container-high text-on-surface font-badge text-badge rounded-[4px] border border-outline-variant">No labels</span>';
  }

  function renderTask(task) {
    if (titleNode) titleNode.textContent = task.title || 'Task Detail';
    if (statusBadge) statusBadge.textContent = task.status || 'To Do';
    if (descriptionBox) descriptionBox.innerHTML = `<p>${escapeHtml(task.description || 'No description')}</p>`;
    if (assigneeNode) assigneeNode.textContent = task.assigneeName || 'Unassigned';
    if (assigneeAvatar) assigneeAvatar.textContent = (task.assigneeName || 'NA').slice(0, 2).toUpperCase();
    if (dueDateNode) dueDateNode.textContent = formatDate(task.dueDate);
    if (projectNode) projectNode.textContent = task.projectName || task.projectId || 'No project';
    if (priorityNode) priorityNode.textContent = task.priority || 'Medium';
    if (priorityBadge) priorityBadge.className = `inline-flex items-center gap-xs px-sm py-[4px] font-badge text-badge rounded-[4px] ${priorityClass(task.priority)}`;
    if (markDone) { markDone.disabled = task.status === 'Done'; markDone.classList.toggle('opacity-70', task.status === 'Done'); }
    renderSubtasks(task);
    renderLabels(task);
    renderComments(task.comments || []);
  }

  async function loadTask() {
    if (!taskId) return backToList();
    try {
      clearDetailMessage();
      renderTask(await api.getTask(taskId));
    } catch (err) {
      showDetailMessage(err.message || 'Unable to load task details.');
      setTimeout(backToList, 1200);
    }
  }

  closeBtn?.addEventListener('click', backToList);
  backdrop?.addEventListener('click', (e) => { if (e.target === backdrop) backToList(); });
  markDone?.addEventListener('click', async () => {
    if (!taskId) return;
    try {
      await api.updateTask(taskId, { status: 'Done' });
      showDetailMessage('Task marked as done.', 'success');
      await loadTask();
    } catch (err) {
      showDetailMessage(err.message || 'Unable to update task.');
    }
  });
  commentSubmit?.addEventListener('click', async (e) => {
    e.preventDefault();
    const content = commentInput?.value?.trim();
    if (!content || !taskId) return;
    try {
      await api.createTaskComment(taskId, { content });
      if (commentInput) commentInput.value = '';
      showDetailMessage('Comment added.', 'success');
      await loadTask();
    } catch (err) {
      showDetailMessage(err.message || 'Unable to add comment.');
    }
  });

  openSubtaskModalBtn?.addEventListener('click', () => showModal(subtaskModal));
  closeSubtaskModalBtn?.addEventListener('click', () => hideModal(subtaskModal));
  cancelSubtaskBtn?.addEventListener('click', () => hideModal(subtaskModal));
  subtaskModal?.addEventListener('click', (e) => { if (e.target === subtaskModal) hideModal(subtaskModal); });

  openLabelModalBtn?.addEventListener('click', () => showModal(labelModal));
  closeLabelModalBtn?.addEventListener('click', () => hideModal(labelModal));
  cancelLabelBtn?.addEventListener('click', () => hideModal(labelModal));
  labelModal?.addEventListener('click', (e) => { if (e.target === labelModal) hideModal(labelModal); });

  subtaskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('subtask-title')?.value?.trim();
    const priority = document.getElementById('subtask-priority')?.value || 'Medium';
    if (!title || !taskId) return;
    try {
      await api.createSubtask(taskId, { title, priority, status: 'To Do' });
      subtaskForm.reset();
      hideModal(subtaskModal);
      showDetailMessage('Subtask created.', 'success');
      await loadTask();
    } catch (err) {
      showDetailMessage(err.message || 'Unable to create subtask.');
    }
  });

  labelForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('label-name')?.value?.trim();
    const color = document.getElementById('label-color')?.value || '#6B7280';
    if (!name || !taskId) return;
    try {
      await api.addTaskLabel(taskId, { name, color });
      labelForm.reset();
      hideModal(labelModal);
      showDetailMessage('Label added.', 'success');
      await loadTask();
    } catch (err) {
      showDetailMessage(err.message || 'Unable to add label.');
    }
  });

  loadTask();
})();
