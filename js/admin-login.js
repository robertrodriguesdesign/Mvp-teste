(function () {
  const form = document.querySelector('[data-login-form]');
  const errorEl = document.querySelector('[data-login-error]');
  if (!form || !errorEl) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.admin-login__submit');
    const data = new FormData(form);

    submitBtn.disabled = true;
    errorEl.textContent = '';

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: data.get('user'), pass: data.get('pass') }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        errorEl.textContent = error || 'Não foi possível entrar agora.';
        return;
      }
      window.location.href = '/admin';
    } catch (err) {
      console.error('falha no login:', err);
      errorEl.textContent = 'Não foi possível entrar agora. Tente novamente.';
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
