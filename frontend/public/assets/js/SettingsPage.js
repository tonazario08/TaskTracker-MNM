import { api } from '../../src/services/api.js';

(() => {
  const saveBtn = document.getElementById('save-settings-btn');
  const search = document.getElementById('settings-search');
  const sections = Array.from(document.querySelectorAll('section'));

  function filterSections() {
    const q = (search?.value || '').toLowerCase().trim();
    sections.forEach((section) => {
      const text = (section.textContent || '').toLowerCase();
      section.style.display = !q || text.includes(q) ? '' : 'none';
    });
  }

  function ensureSelectValue(select, value) {
    if (!select || !value) return;
    const hasOption = Array.from(select.options).some((option) => option.value === value);
    if (!hasOption) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }
    select.value = value;
  }

  async function loadProfile() {
    try {
      const user = await api.getMyProfile();
      const fullName = document.getElementById('full-name');
      const displayName = document.getElementById('display-name');
      const email = document.getElementById('email');
      const bio = document.getElementById('bio');
      const timezone = document.getElementById('timezone');
      const language = document.getElementById('language');

      if (fullName) fullName.value = user.name || '';
      if (displayName) displayName.value = user.title || user.name || '';
      if (email) email.value = user.email || '';
      if (bio) bio.value = user.bio || '';
      ensureSelectValue(timezone, user.timezone);
      ensureSelectValue(language, user.locale);
    } catch (err) {
      console.warn(err.message || 'Khong the tai profile');
    }
  }

  search?.addEventListener('input', filterSections);

  saveBtn?.addEventListener('click', async () => {
    const newPassword = document.getElementById('new-password')?.value || '';
    const confirm = document.getElementById('confirm-password')?.value || '';

    if (newPassword && newPassword !== confirm) {
      alert('Xac nhan mat khau khong khop.');
      return;
    }

    try {
      await api.updateMyProfile({
        name: document.getElementById('full-name')?.value?.trim(),
        title: document.getElementById('display-name')?.value?.trim(),
        email: document.getElementById('email')?.value?.trim(),
        bio: document.getElementById('bio')?.value?.trim(),
        timezone: document.getElementById('timezone')?.value,
        locale: document.getElementById('language')?.value,
        password: newPassword || undefined,
      });
      alert('Luu cai dat thanh cong.');
    } catch (err) {
      alert(err.message || 'Khong the luu cai dat');
    }
  });

  loadProfile();
})();
