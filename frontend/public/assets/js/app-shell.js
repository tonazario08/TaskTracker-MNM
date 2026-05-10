import { api } from '../../../src/services/api.js';

(async () => {
  const status = document.getElementById('app-status');
  const actions = document.getElementById('app-actions');
  const primaryLink = document.getElementById('primary-link');
  const screenLinks = document.getElementById('screen-links');

  try {
    const user = await api.me();
    if (status) status.textContent = `Xin chao, ${user.name}. Ban da dang nhap.`;
    if (primaryLink) {
      primaryLink.href = '../src/pages/TaskListPage.html';
      primaryLink.textContent = 'Vao Task List';
    }
  } catch (_err) {
    if (status) status.textContent = 'Ban chua dang nhap. Hay vao Login hoac Register de ket noi frontend voi backend.';
    if (primaryLink) {
      primaryLink.href = '../src/pages/LoginPage.html';
      primaryLink.textContent = 'Di den Login';
    }
  }

  if (actions) actions.style.display = 'block';
  if (screenLinks) screenLinks.style.display = 'block';
})();
