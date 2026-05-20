import { api } from '../../src/services/api.js';

(() => {
  const form = document.getElementById('register-form');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const terms = document.getElementById('terms');

  function passwordScore(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score;
  }

  function updateStrength() {
    if (!password) return;
    const bars = Array.from(document.querySelectorAll('.h-1.rounded-full.w-full'));
    const label = document.querySelector('span.font-badge.text-badge.text-on-surface-variant.mt-xs');
    const score = passwordScore(password.value || '');
    bars.forEach((bar, idx) => {
      bar.classList.remove('bg-error', 'bg-yellow-400', 'bg-lime-500', 'bg-green-600', 'bg-surface-variant');
      bar.classList.add(idx < score ? (score <= 1 ? 'bg-error' : score === 2 ? 'bg-yellow-400' : score === 3 ? 'bg-lime-500' : 'bg-green-600') : 'bg-surface-variant');
    });
    if (label) label.textContent = score <= 1 ? 'Weak password' : score === 2 ? 'Fair password' : score === 3 ? 'Good password' : 'Strong password';
  }

  password?.addEventListener('input', updateStrength);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName')?.value?.trim();
    const email = document.getElementById('email')?.value?.trim();
    const pwd = password?.value || '';
    const confirm = confirmPassword?.value || '';

    if (!fullName || !email || !pwd) return alert('Vui long nhap day du thong tin.');
    if (pwd !== confirm) return alert('Mat khau xac nhan khong khop.');
    if (!terms?.checked) return alert('Ban can dong y dieu khoan.');

    try {
      await api.register({ name: fullName, email, password: pwd });
      window.location.href = '/tasks';
    } catch (_err) {
      alert('Dang ky that bai. Vui long thu lai.');
    }
  });

  updateStrength();
})();
