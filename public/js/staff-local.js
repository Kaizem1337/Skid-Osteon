document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.querySelector('[data-auth-form]');
  if (authForm) authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const error = authForm.querySelector('[role="alert"]');
    const button = authForm.querySelector('button[type="submit"]');
    const setup = authForm.dataset.authForm === 'setup';
    const payload = Object.fromEntries(new FormData(authForm));
    if (setup && payload.password !== payload.confirm) {
      error.textContent = 'The passwords do not match.';
      error.hidden = false;
      return;
    }
    error.hidden = true;
    button.disabled = true;
    try {
      const response = await fetch(setup ? '/api/staff/setup' : '/api/staff/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not sign in.');
      location.assign('/staff?view=unread');
    } catch (reason) {
      error.textContent = reason.message;
      error.hidden = false;
      button.disabled = false;
    }
  });

  document.querySelector('[data-signout]')?.addEventListener('click', async () => {
    await fetch('/api/staff/logout', { method: 'POST' });
    location.assign('/staff/login');
  });

  document.querySelectorAll('[data-request] [data-action]').forEach(button => {
    button.addEventListener('click', async () => {
      const group = button.closest('[data-request]');
      const id = group.dataset.request;
      const version = Number(group.dataset.version);
      const action = button.dataset.action;
      if (action === 'DELETE' && !confirm('Permanently delete this request and its staff history? This cannot be undone.')) return;
      const error = group.querySelector('[role="alert"]');
      group.querySelectorAll('button').forEach(item => { item.disabled = true; });
      try {
        const response = await fetch(`/api/staff/requests/${id}`, {
          method: action === 'DELETE' ? 'DELETE' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, version })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not update the request.');
        if (action === 'DELETE' && location.pathname.includes('/requests/')) location.assign('/staff?view=trash');
        else location.reload();
      } catch (reason) {
        error.textContent = reason.message;
        error.hidden = false;
        group.querySelectorAll('button').forEach(item => { item.disabled = false; });
      }
    });
  });

  document.querySelector('[data-status-form]')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    const message = form.querySelector('[role="status"]');
    button.disabled = true;
    try {
      const response = await fetch(`/api/staff/requests/${form.dataset.request}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: form.elements.status.value, version: Number(form.dataset.version) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update the status.');
      location.reload();
    } catch (reason) {
      message.textContent = reason.message;
      button.disabled = false;
    }
  });
});
