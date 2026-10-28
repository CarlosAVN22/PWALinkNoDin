(() => {
  'use strict';
  const prefix = 'linknodin-v3-';
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; }
    catch { return fallback; }
  };
  const save = (key, value) => localStorage.setItem(prefix + key, JSON.stringify(value));
  const session = read('session', null);
  const account = read('accounts', []).find(a => a.email === session?.email);
  const inbox = document.getElementById('ld-notif-inbox');
  if (!inbox) return;

  if (!account) {
    inbox.innerHTML = '<div class="ld-notif-optout">Inicia sesión para consultar y configurar tus notificaciones. <a href="/doc/general/login.html">Iniciar sesión</a></div>';
    return;
  }

  const key = 'alert-preferences-' + account.email;
  const demoKey = 'notification-tests-' + account.email;
  const defaults = { empleos: true, empresas: true, postulaciones: true, sistema: true, email: account.email };
  let preferences = { ...defaults, ...read(key, {}) };
  let selected = 'todos';

  const settings = document.createElement('section');
  settings.className = 'ld-alert-settings';
  settings.innerHTML = `
    <h2>Preferencias de alertas</h2>
    <p>Elige qué avisos deseas recibir en LinkNoDin.</p>
    <div class="ld-alert-options">
      <label><input type="checkbox" name="empleos"> Empleos</label>
      <label><input type="checkbox" name="empresas"> Empresas</label>
      <label><input type="checkbox" name="postulaciones"> Postulaciones</label>
      <label><input type="checkbox" name="sistema"> Sistema</label>
    </div>
    <form id="ld-alert-mail-form">
      <label for="ld-alert-email">Correo para futuras alertas</label>
      <div class="ld-alert-email-row">
        <input id="ld-alert-email" type="email" autocomplete="email" required maxlength="150" placeholder="correo@ejemplo.com">
        <button class="btn btn-primary btn-sm" type="submit">Guardar preferencias</button>
      </div>
      <small>Los avisos funcionan en este navegador. El envío automático al correo se habilitará cuando se conecte un servicio de correo o el servidor.</small>
      <p id="ld-alert-feedback" role="status" aria-live="polite"></p>
    </form>
    <h3>Filtrar notificaciones</h3>
    <div class="ld-alert-filters" aria-label="Filtros de notificaciones">
      <button class="btn btn-sm" type="button" data-filter="todos">Todas</button>
      <button class="btn btn-sm" type="button" data-filter="empleos">Empleos</button>
      <button class="btn btn-sm" type="button" data-filter="empresas">Empresas</button>
      <button class="btn btn-sm" type="button" data-filter="postulaciones">Postulaciones</button>
      <button class="btn btn-sm" type="button" data-filter="sistema">Sistema</button>
    </div>`;
  inbox.before(settings);

  for (const type of ['empleos','empresas','postulaciones','sistema']) {
    const cb = settings.querySelector(`[name="${type}"]`);
    cb.checked = preferences[type];
    cb.addEventListener('change', () => {
      preferences[type] = cb.checked;
      save(key, preferences);
      filterRows();
    });
  }
  settings.querySelector('#ld-alert-email').value = preferences.email;
  settings.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const email = settings.querySelector('#ld-alert-email');
    if (!email.reportValidity()) return;
    preferences.email = email.value.trim();
    save(key, preferences);
    settings.querySelector('#ld-alert-feedback').textContent = 'Preferencias guardadas en este navegador. Aún no se envían correos automáticos.';
  });
  settings.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    selected = btn.dataset.filter;
    filterRows();
  }));

  function category(row) {
    const meta = row.querySelector('small')?.textContent?.toLowerCase() || '';
    if (meta.includes('empleos')) return 'empleos';
    if (meta.includes('postulaciones')) return 'postulaciones';
    if (meta.includes('empresa')) return 'empresas';
    return 'sistema';
  }
  function filterRows() {
    settings.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('btn-primary', btn.dataset.filter === selected);
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === selected));
    });
    inbox.querySelectorAll('.ld-notif-list .ld-notif-item').forEach(row => {
      const type = category(row);
      row.hidden = !preferences[type] || (selected !== 'todos' && selected !== type);
    });
  }

  function newNotice(e) {
    const original = e.target.closest('[data-notif-test]');
    if (!original) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const companyAccount = account.role === 'empresa';
    const categoryName = companyAccount ? 'postulaciones' : 'empleos';
    if (!preferences[categoryName]) {
      settings.querySelector('#ld-alert-feedback').textContent = `Activa las alertas de ${companyAccount ? 'Empresas' : 'Empleos'} para recibir este aviso.`;
      return;
    }
    const current = read(demoKey, []);
    current.push({
      id: 'vacante-ejemplo-' + Date.now(), type: 'empleos',
      title: 'Nueva oportunidad de empleo',
      body: 'Se agregó una oportunidad de empleo de demostración. Consulta las vacantes disponibles.',
      url: '/doc/empleo/empleos.html', date: new Date().toISOString(), icon: ''
    });
    save(demoKey, current);
    window.dispatchEvent(new Event('ld:activity-updated'));
    settings.querySelector('#ld-alert-feedback').textContent = 'Nueva notificación agregada.';
  }
  inbox.addEventListener('click', newNotice, true);

  const observer = new MutationObserver(() => {
    const button = inbox.querySelector('[data-notif-test]');
    if (button) button.textContent = 'Nueva notificación';
    filterRows();
  });
  observer.observe(inbox, { childList: true });
  const testButton = inbox.querySelector('[data-notif-test]');
  if (testButton) testButton.textContent = 'Nueva notificación';
  filterRows();
})();
