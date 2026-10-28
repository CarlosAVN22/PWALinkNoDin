
/* Estadísticas y actividad del candidato */

document.addEventListener('DOMContentLoaded', () => {
  const C = window.LNC;
  const candidate = C?.user();

  const content = document.querySelector('.content');
  const stats = content?.querySelector('.stats');

  if (!candidate || !stats) return;

  const iconFiles = [
    'postulaciones.svg',
    'revision.svg',
    'guardados.svg',
    'perfil.svg'
  ];

  const labels = [
    'Postulaciones enviadas',
    'En revisión',
    'Empleos guardados',
    'Perfil completado'
  ];

  const cards = [
    ...stats.querySelectorAll('.stat')
  ];

  // Iconos de las estadísticas
  cards.slice(0, 4).forEach((card, i) => {
    if (!card.querySelector('.lnc-stat-icon')) {
      const wrap = document.createElement('div');

      wrap.className = 'lnc-stat-icon';

      const img = document.createElement('img');

      img.src = '/img/' + iconFiles[i];
      img.alt = '';

      img.setAttribute('aria-hidden', 'true');

      wrap.append(img);
      card.prepend(wrap);
    }
  });

  // Orden del panel
  const notifications = document.getElementById(
    'ld-notif-dashboard'
  );

  content.prepend(stats);

  if (notifications) {
    stats.after(notifications);
  }

  const recommended = [
    ...content.querySelectorAll('.panel')
  ].find(el =>
    /vacantes recomendadas/i.test(
      el.querySelector('h3')?.textContent || ''
    )
  );

  // Bienvenida
  const welcome = document.createElement('section');

  welcome.className = 'panel lnc-section';

  welcome.innerHTML = `
    <h2>
      Bienvenido,
      ${C.safe(
        candidate.name?.split(' ')[0] ||
        'candidato'
      )}
    </h2>

    <p>
      Consulta tus solicitudes, explora vacantes
      y mantén actualizado tu perfil.
    </p>

    <div class="lnc-actions">
      <a class="btn btn-primary"
         href="/doc/empleo/empleos.html">
        Buscar empleos
      </a>

      <a class="btn btn-soft"
         href="/doc/general/perfil.html">
        Mi perfil
      </a>

      <a class="btn"
         href="/doc/candidato/postulaciones.html">
        Mis postulaciones
      </a>
    </div>
  `;

  if (notifications) {
    notifications.after(welcome);
  } else {
    stats.after(welcome);
  }

  // Actividad reciente
  const recent = document.createElement('section');

  recent.className = 'panel lnc-section';

  recent.innerHTML = `
    <h3 class="lnc-title-icon">
      <img
        src="/img/actividad.svg"
        alt=""
        aria-hidden="true">
      Actividad reciente
    </h3>

    <div id="lnc-latest"></div>
  `;

  if (recommended) {
    recommended.after(recent);
  } else {
    welcome.after(recent);
  }

  function render() {
    const apps = C.applications();
    const details = C.details();

    const values = [
      apps.length,

      apps.filter(id =>
        ['En revisión', 'Entrevista'].includes(
          details[id]?.status
        )
      ).length,

      C.savedJobs().length,

      C.completion() + '%'
    ];

    cards.slice(0, 4).forEach((card, i) => {
      const value = card.querySelector('strong');
      const label = card.querySelector('small');

      if (value) {
        value.textContent = values[i];
      }

      if (label) {
        label.textContent = labels[i];
      }
    });

    const holder = recent.querySelector(
      '#lnc-latest'
    );

    holder.replaceChildren();

    if (!apps.length) {
      holder.innerHTML = `
        <p class="lnc-muted">
          Todavía no tienes postulaciones.
          Busca una vacante para comenzar.
        </p>
      `;

      return;
    }

    apps.slice(-3).reverse().forEach(id => {
      const job = C.findJob(id);
      const d = details[id] || {};

      const item = document.createElement('div');

      item.className = 'lnc-activity';

      item.innerHTML = `
        <div>
          <strong>
            ${C.safe(
              d.title ||
              job?.title ||
              'Vacante'
            )}
          </strong>

          <small>
            ${C.safe(
              d.company ||
              job?.company ||
              'Empresa'
            )}
            ·
            ${C.safe(
              d.status || 'Recibida'
            )}
          </small>
        </div>

        <a
          class="btn btn-soft btn-sm"
          href="/doc/candidato/postulaciones.html">
          Ver seguimiento
        </a>
      `;

      holder.append(item);
    });
  }

  // Cambiar iconos del panel de notificaciones
  // sin modificar notificaciones.js
  function decorateNotifications() {
    if (!notifications) return;

    notifications.querySelectorAll(
      '.ld-notif-item-icon'
    ).forEach(node => {
      if (node.querySelector('.lnc-notif-icon')) {
        return;
      }

      const img = document.createElement('img');

      img.src = '/img/notificaciones.svg';
      img.alt = '';
      img.className = 'lnc-notif-icon';

      img.setAttribute('aria-hidden', 'true');

      node.replaceChildren(img);
    });

    notifications.querySelectorAll(
      'h2,h3,h4'
    ).forEach(h => {
      if (
        !/notificaciones/i.test(h.textContent) ||
        h.querySelector('.lnc-notif-icon')
      ) {
        return;
      }

      const text = [...h.childNodes].find(
        n => n.nodeType === Node.TEXT_NODE
      );

      if (text) {
        text.textContent = text.textContent.replace(
          /🔔|🔕|🛎️?/gu,
          ''
        );
      }

      const img = document.createElement('img');

      img.src = '/img/notificaciones.svg';
      img.alt = '';
      img.className = 'lnc-notif-icon';

      img.setAttribute('aria-hidden', 'true');

      h.prepend(img);
    });

    // Icono del botón de notificación de prueba
    notifications.querySelectorAll(
      '[data-notif-test]'
    ).forEach(button => {
      if (
        button.querySelector('.lnc-notif-icon')
      ) {
        return;
      }

      const text = [...button.childNodes].find(
        n => n.nodeType === Node.TEXT_NODE
      );

      if (text) {
        text.textContent = text.textContent.replace(
          /🔔|🔕|🛎️?/gu,
          ''
        );
      }

      const img = document.createElement('img');

      img.src = '/img/notificaciones.svg';
      img.alt = '';
      img.className = 'lnc-notif-icon';

      img.setAttribute('aria-hidden', 'true');

      button.prepend(img);
    });
  }

  if (notifications) {
    const observer = new MutationObserver(() => {
      observer.disconnect();

      decorateNotifications();

      observer.observe(notifications, {
        childList: true,
        subtree: true
      });
    });

    decorateNotifications();

    observer.observe(notifications, {
      childList: true,
      subtree: true
    });
  }

  window.addEventListener(
    'ld:activity-updated',
    render
  );

  render();
});
