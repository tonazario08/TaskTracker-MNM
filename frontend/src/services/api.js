const API_BASE = 'http://localhost:8080/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

export const api = {
  health: () => request('/health'),
  me: () => request('/auth/me'),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  getMyProfile: () => request('/users/me'),
  updateMyProfile: (payload) => request('/users/me', { method: 'PUT', body: JSON.stringify(payload) }),

  tasks: () => request('/tasks'),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (payload) => request('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  createSubtask: (id, payload) => request(`/tasks/${id}/subtasks`, { method: 'POST', body: JSON.stringify(payload) }),
  addTaskLabel: (id, payload) => request(`/tasks/${id}/labels`, { method: 'POST', body: JSON.stringify(payload) }),
  getTaskComments: (id) => request(`/tasks/${id}/comments`),
  createTaskComment: (id, payload) => request(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),

  projects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) => request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};
