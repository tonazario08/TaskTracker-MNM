import { api } from '../../src/services/api.js';

(() => {
  const search = document.getElementById('project-search');
  const filters = Array.from(document.querySelectorAll('.project-filter'));
  const grid = document.getElementById('projects-grid');
  const createButtons = Array.from(document.querySelectorAll('button')).filter((btn) => btn.textContent.includes('New Project'));
  let activeFilter = 'all';
  let projects = [];

  function statusClass(status) {
    return status === 'Archived' ? 'archived' : 'active';
  }

  function cardColor(color) {
    return color || '#4A90E2';
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

    grid.innerHTML = filtered.map((project) => `
      <div data-status="${statusClass(project.status)}" class="project-card bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col group hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow">
        <div class="h-1 w-full" style="background:${cardColor(project.color)}"></div>
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex justify-between items-start mb-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg" style="background:${cardColor(project.color)}20;color:${cardColor(project.color)}">${(project.name || 'P').slice(0,2).toUpperCase()}</div>
            <button class="delete-project text-on-surface-variant hover:bg-surface-container p-1 rounded-full transition-colors" data-id="${project.id}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <h3 class="font-h3 text-h3 text-on-surface mb-1">${project.name}</h3>
          <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2 mb-5 flex-1">${project.description || 'No description'}</p>
          <div class="mb-5">
            <div class="flex justify-between items-center mb-2">
              <span class="font-badge text-badge text-on-surface-variant">Progress</span>
              <span class="font-badge text-badge text-primary-container font-medium">${project.progress || 0}%</span>
            </div>
            <div class="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div class="h-full bg-primary-container rounded-full" style="width: ${project.progress || 0}%"></div>
            </div>
          </div>
          <button class="w-full h-9 rounded-lg border border-surface-variant font-body-md text-sm font-medium text-primary-container hover:bg-surface-container-low transition-colors">View Project</button>
        </div>
      </div>
    `).join('');
  }

  async function loadProjects() {
    try {
      projects = await api.projects();
      render();
    } catch (err) {
      alert(err.message || 'Khong the tai projects');
    }
  }

  async function createProject() {
    const name = window.prompt('Nhap ten project moi');
    if (!name) return;
    try {
      await api.createProject({ name, status: 'Planning' });
      await loadProjects();
    } catch (err) {
      alert(err.message || 'Khong the tao project');
    }
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

  grid?.addEventListener('click', async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const deleteBtn = target.closest('.delete-project');
    if (!deleteBtn) return;
    const id = deleteBtn.getAttribute('data-id');
    if (!id) return;
    if (!window.confirm('Xoa project nay?')) return;
    try {
      await api.deleteProject(id);
      await loadProjects();
    } catch (err) {
      alert(err.message || 'Khong the xoa project');
    }
  });

  loadProjects();
})();
