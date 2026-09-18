// Fihan OS — comportamentos compartilhados do shell (sidebar mobile, logout).
// Incluído em toda página autenticada (dashboard, leads, e as que vierem depois).
(function () {
  const toggle = document.querySelector('[data-nav-toggle]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('admin-nav-open');
    });
  }

  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/admin-logout', { method: 'POST' });
      } catch (err) {
        console.error('falha ao sair:', err);
      }
      window.location.href = '/admin/login';
    });
  }
})();
