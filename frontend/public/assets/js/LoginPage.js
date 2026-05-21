import { api } from '../../src/services/api.js';

(() => {
  const form = document.getElementById('login-form');
  const password = document.getElementById('password');
  const toggleBtn = document.querySelector('button[aria-label="Toggle password visibility"]');
  const icon = toggleBtn ? toggleBtn.querySelector('[data-icon]') : null;

  if (toggleBtn && password) {
    toggleBtn.addEventListener('click', () => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      if (icon) icon.textContent = show ? 'visibility_off' : 'visibility';
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email')?.value?.trim();
    const pwd = document.getElementById('password')?.value || '';
    if (!email || !pwd) return;

    try {
      await api.login({ email, password: pwd });
      window.location.href = '/tasks';
    } catch (err) {
      alert(err.message || 'Dang nhap that bai. Vui long kiem tra thong tin.');
    }
  });
})();
