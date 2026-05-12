import { api } from '../../src/services/api.js';

(() => {
  const search = document.getElementById('project-search');
  const filters = Array.from(document.querySelectorAll('.project-filter'));
  const grid = document.getElementById('projects-grid');
  const createButtons = Array.from(document.querySelectorAll('button')).filter((btn) => btn.textContent.includes('New Project'));
  const createProjectModal = document.getElementById('create-project-modal');
  const createProjectForm = document.getElementById('create-project-form');
  const createProjectClose = document.getElementById('create-project-close');
  const createProjectCancel = document.getElementById('create-project-cancel');
  const createProjectMessage = document.getElementById('create-project-message');
  const createProjectName = document.getElementById('create-project-name');
  const createProjectStatus = document.getElementById('create-project-status');
  const createProjectSubmit = document.getElementById('create-project-submit');
  const projectListState = document.getElementById('project-list-state');
  const deleteProjectModal = document.getElementById('delete-project-modal');
  const deleteProjectMessage = document.getElementById('delete-project-message');
  const deleteProjectName = document.getElementById('delete-project-name');
  const deleteProjectCancel = document.getElementById('delete-project-cancel');
  const deleteProjectConfirm = document.getElementById('delete-project-confirm');
  let activeFilter = 'all';
  let projects = [];
  let pendingDeleteProject = null;


  function showProjectListState(message, tone = 'info') {
    if (!projectListState) return;
    projectListState.textContent = message;
    projectListState.className = 'mb-6 rounded-xl border px-md py-sm text-sm';
    if (tone === 'error') {
      projectListState.classList.add('border-[#ef4444]/30', 'bg-[#fef2f2]', 'text-[#991b1b]');
    } else if (tone === 'success') {
      projectListState.classList.add('border-[#86efac]', 'bg-[#f0fdf4]', 'text-[#166534]');
    } else {
      projectListState.classList.add('border-surface-variant', 'bg-surface-container-low', 'text-on-surface-variant');
    }
  }

  function clearProjectListState() {
    if (!projectListState) return;
    projectListState.textContent = '';
    projectListState.className = 'hidden mb-6 rounded-xl border px-md py-sm text-sm';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(String(color || '')) ? String(color) : '#4A90E2';
  }

  function statusClass(status) {
    return status === 'Archived' ? 'archived' : 'active';
  }

  function showCreateProjectMessage(message, tone = 'error') {
    if (!createProjectMessage) return;
    createProjectMessage.textContent = message;
    createProjectMessage.className = 'rounded-lg border px-md py-sm text-sm';
    if (tone === 'error') {
      createProjectMessage.classList.add('border-[#ef4444]/30', 'bg-[#fef2f2]', 'text-[#991b1b]');
    } else {
      createProjectMessage.classList.add('border-[#86efac]', 'bg-[#f0fdf4]', 'text-[#166534]');
    }
  }

  function clearCreateProjectMessage() {
    if (!createProjectMessage) return;
    createProjectMessage.textContent = '';
    createProjectMessage.className = 'hidden rounded-lg border px-md py-sm text-sm';
  }

  function showDeleteProjectMessage(message) {
    if (!deleteProjectMessage) return;
    deleteProjectMessage.textContent = message;
    deleteProjectMessage.className = 'rounded-lg border border-[#ef4444]/30 bg-[#fef2f2] px-md py-sm text-sm text-[#991b1b]';
  }

  function clearDeleteProjectMessage() {
    if (!deleteProjectMessage) return;
    deleteProjectMessage.textContent = '';
    deleteProjectMessage.className = 'hidden rounded-lg border px-md py-sm text-sm';
  }

  function setCreateProjectBusy(isBusy) {
    if (createProjectSubmit) createProjectSubmit.disabled = isBusy;
    if (createProjectName) createProjectName.disabled = isBusy;
    if (createProjectStatus) createProjectStatus.disabled = isBusy;
  }

  function openCreateProjectModal() {
    if (!createProjectModal) return;
    createProjectForm?.reset();
    clearCreateProjectMessage();
    createProjectModal.classList.remove('hidden');
    createProjectModal.classList.add('flex');
    setCreateProjectBusy(false);
    createProjectName?.focus();
  }

  function closeCreateProjectModal() {
    if (!createProjectModal) return;
    createProjectModal.classList.add('hidden');
    createProjectModal.classList.remove('flex');
    clearCreateProjectMessage();
    createProjectForm?.reset();
  }

  function openDeleteProjectModal(project) {
    pendingDeleteProject = project;
    if (deleteProjectName) deleteProjectName.textContent = project?.name || 'this project';
    clearDeleteProjectMessage();
    deleteProjectModal?.classList.remove('hidden');
    deleteProjectModal?.classList.add('flex');
    if (deleteProjectConfirm) deleteProjectConfirm.disabled = false;
  }

  function closeDeleteProjectModal() {
    pendingDeleteProject = null;
    clearDeleteProjectMessage();
    deleteProjectModal?.classList.add('hidden');
    deleteProjectModal?.classList.remove('flex');
    if (deleteProjectConfirm) deleteProjectConfirm.disabled = false;
  }

  function render() {
    if (!grid) return;
    const q = (search?.value || '').toLowerCase().trim();
    const filtered = projects.filter((project) => {
      const statusOk = activeFilter === 'all' ? true : statusClass(project.status) === activeFilter;
      const text = `${project.name} ${project.description || ''}`.toLowerCase();
      const searchOk = !q || text.includes(q);
      return statusOk && searchOk;
    });

    if (!filtered.length) {
      grid.innerHTML = '';
      showProjectListState(projects.length ? 'No projects match the current filter.' : 'No projects yet. Create your first project to get started.');
      return;
    }

    clearProjectListState();
    grid.innerHTML = filtered.map((project) => {
      const color = safeColor(project.color);
      return `
        <div data-status="${statusClass(project.status)}" class="project-card bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col group hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow">
          <div class="h-1 w-full" style="background:${color}"></div>
          <div class="p-5 flex-1 flex flex-col">
            <div class="flex justify-between items-start mb-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg" style="background:${color}20;color:${color}">${escapeHtml((project.name || 'P').slice(0, 2).toUpperCase())}</div>
              <button class="delete-project text-on-surface-variant hover:bg-surface-container p-1 rounded-full transition-colors" data-id="${encodeURIComponent(project.id)}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
            <h3 class="font-h3 text-h3 text-on-surface mb-1">${escapeHtml(project.name)}</h3>
            <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-5 flex-1">${escapeHtml(project.description || 'No description')}</p>
            <div class="mb-5">
              <div class="flex justify-between items-center mb-2">
                <span class="font-badge text-badge text-on-surface-variant">Progress</span>
                <span class="font-badge text-badge text-primary-container font-medium">${escapeHtml(project.progress || 0)}%</span>
              </div>
              <div class="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div class="h-full bg-primary-container rounded-full" style="width: ${Number(project.progress || 0)}%"></div>
              </div>
            </div>
            <button class="w-full h-9 rounded-lg border border-surface-variant font-body-md text-sm font-medium text-primary-container hover:bg-surface-container-low transition-colors">View Project</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadProjects() {
    showProjectListState('Loading projects...');
    try {
      projects = await api.projects();
      render();
    } catch (err) {
      projects = [];
      grid.innerHTML = '';
      showProjectListState(err.message || 'Unable to load projects', 'error');
    }
  }

  async function createProject() {
    openCreateProjectModal();
  }

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter || 'all';
      filters.forEach((x) => x.classList.remove('text-primary-container', 'border-primary-container'));
      btn.classList.add('text-primary-container', 'border-primary-container');
      render();
    });
  });

  search?.addEventListener('input', render);
  createButtons.forEach((btn) => btn.addEventListener('click', createProject));
  createProjectClose?.addEventListener('click', closeCreateProjectModal);
  createProjectCancel?.addEventListener('click', closeCreateProjectModal);
  createProjectModal?.addEventListener('click', (e) => {
    if (e.target === createProjectModal) closeCreateProjectModal();
  });
  deleteProjectCancel?.addEventListener('click', closeDeleteProjectModal);
  deleteProjectModal?.addEventListener('click', (e) => {
    if (e.target === deleteProjectModal) closeDeleteProjectModal();
  });

  createProjectForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = createProjectName?.value?.trim() || '';
    const status = createProjectStatus?.value || 'Planning';

    if (!name) {
      showCreateProjectMessage('Project name is required.');
      return;
    }

    setCreateProjectBusy(true);
    clearCreateProjectMessage();

    try {
      await api.createProject({ name, status });
      closeCreateProjectModal();
      showProjectListState('Project created successfully.', 'success');
      await loadProjects();
    } catch (err) {
      showCreateProjectMessage(err.message || 'Unable to create project');
      setCreateProjectBusy(false);
    }
  });

  deleteProjectConfirm?.addEventListener('click', async () => {
    if (!pendingDeleteProject) return;
    if (deleteProjectConfirm) deleteProjectConfirm.disabled = true;
    clearDeleteProjectMessage();
    try {
      await api.deleteProject(pendingDeleteProject.id);
      closeDeleteProjectModal();
      showProjectListState('Project deleted successfully.', 'success');
      await loadProjects();
    } catch (err) {
      showDeleteProjectMessage(err.message || 'Unable to delete project');
      if (deleteProjectConfirm) deleteProjectConfirm.disabled = false;
    }
  });

  grid?.addEventListener('click', async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const deleteBtn = target.closest('.delete-project');
    if (!deleteBtn) return;
    const id = deleteBtn.getAttribute('data-id');
    if (!id) return;
    const project = projects.find((item) => item.id === decodeURIComponent(id));
    if (!project) return;
    openDeleteProjectModal(project);
  });

  loadProjects();
})();
