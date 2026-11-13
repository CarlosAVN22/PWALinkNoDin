// Planes de demostración. No se procesan pagos ni datos bancarios.
(function () {
  'use strict';
  const PREFIX = 'linknodin-v3-';
  const parse = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(PREFIX + key)) ?? fallback; }
    catch { return fallback; }
  };
  const box = document.getElementById('ld-plans');
  if (!box) return;
  const summary = document.getElementById('ld-planes-summary');
  const overlay = document.getElementById('ld-planes-dialog');
  const cancel = document.getElementById('ld-planes-cancel');
  const confirm = document.getElementById('ld-planes-confirm');
  const detail = document.getElementById('ld-planes-dialog-text');
  const status = document.getElementById('ld-status');
  const session = () => parse('session', null);
  const account = () => {
    const active = session();
    if (!active) return null;
    return parse('accounts', []).find(u => u.email === active.email && u.role === active.role) || null;
  };
  let pending = null;
  let lastFocus = null;
  function render() {
    const user = account();
    if (!user) {
      summary.textContent = 'Para elegir un plan, inicia sesión con una cuenta de candidato o empresa. Puedes consultar ambos planes sin registrarte.';
      return;
    }
    summary.textContent = 'Plan seleccionado: ' + (user.plan || 'Gratuito') + '. La selección queda guardada en este navegador y puedes cambiarla cuando quieras.';
  }
  function closeDialog() {
    overlay.hidden = true;
    pending = null;
    if (lastFocus) lastFocus.focus();
  }
  function openDialog(value, button) {
    pending = value;
    lastFocus = button;
    detail.textContent = value === 'Premium'
      ? '¿Deseas activar Premium de demostración? Obtendrás acceso a los cursos del prototipo. No se realizará ningún cobro.'
      : '¿Deseas utilizar el plan Gratuito? Dejarás de acceder a los cursos Premium mientras este plan esté seleccionado.';
    overlay.hidden = false;
    cancel.focus();
  }
  // Captura el clic antes de los controladores antiguos, sin modificar el archivo compartido.
  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-choose-plan]');
    if (!button || !box.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const active = session();
    const user = account();
    if (!active) {
      location.href = '/doc/general/login.html?next=' + encodeURIComponent('/doc/general/planes.html');
      return;
    }
    if (!user || !['candidato', 'empresa'].includes(user.role)) {
      status.textContent = 'Solo las cuentas de candidato o empresa pueden seleccionar planes de prueba.';
      status.dataset.kind = 'error';
      return;
    }
    const value = button.dataset.choosePlan;
    if (value === (user.plan || 'Gratuito')) return;
    openDialog(value, button);
  }, true);
  cancel.addEventListener('click', closeDialog);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeDialog(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !overlay.hidden) closeDialog(); });
  confirm.addEventListener('click', () => {
    const user = account();
    if (!user || !pending) { closeDialog(); return; }
    const list = parse('accounts', []);
    const updated = list.map(item => item.email === user.email && item.role === user.role ? {...item, plan:pending} : item);
    localStorage.setItem(PREFIX + 'accounts', JSON.stringify(updated));
    const selection = pending;
    closeDialog();
    render();
    const title = document.getElementById('ld-plan-current');
    if (title) title.textContent = 'Plan activo de ' + (user.name || 'tu cuenta') + ': ' + selection + ' (demostración)';
    box.querySelectorAll('[data-choose-plan]').forEach(button => {
      button.disabled = button.dataset.choosePlan === selection;
      button.textContent = button.disabled ? 'Plan actual' : button.dataset.choosePlan === 'Premium' ? 'Activar Premium de prueba' : 'Continuar gratis';
    });
    status.textContent = 'Tu plan ' + selection + ' se guardó correctamente. No se realizó ningún pago.';
    status.dataset.kind = 'success';
  });
  render();
})();
