
/* LinkNoDin: utilidades exclusivas del candidato. */

window.LNC = (() => {
  'use strict';

  const PREFIX = 'linknodin-v3-';

  function get(key, fallback) {
    try {
      return JSON.parse(
        localStorage.getItem(PREFIX + key)
      ) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify(value)
    );

    window.dispatchEvent(
      new Event('ld:activity-updated')
    );
  }

  const session = () => get('session', null);

  function user() {
    const s = session();

    if (s?.role !== 'candidato') return null;

    return get('accounts', []).find(
      a =>
        a.role === 'candidato' &&
        a.email === s.email
    ) || null;
  }

  const email = () => user()?.email || '';

  const applications = () => {
    const value = get('applications-' + email(), []);

    return Array.isArray(value) ? value : [];
  };

  const details = () =>
    get(
      'candidate-application-details-' + email(),
      {}
    );

  // Perfil utilizado por la versión nueva de main.
  const profile = () =>
    get(
      'perfil-candidato:' + email().toLowerCase(),
      {}
    );

  const extraProfile = () =>
    get(
      'candidate-extra-' + email().toLowerCase(),
      {}
    );

  // Mis guardados utiliza una clave independiente.
  const savedJobs = () => {
    try {
      const value = JSON.parse(
        localStorage.getItem(
          'linknodin-empleo-guardados-' +
          email().toLowerCase()
        )
      );

      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const safe = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c]
    );

  const jobs = () => [
    {
      id: 'demo-ui',
      title: 'Diseñador UI/UX',
      company: 'Súper Selectos',
      city: 'San Salvador',
      modality: 'Remoto'
    },
    {
      id: 'demo-web',
      title: 'Desarrollador Web',
      company: 'Banco Agrícola',
      city: 'Santa Ana',
      modality: 'Presencial'
    },
    {
      id: 'demo-data',
      title: 'Analista de datos',
      company: 'ADOC',
      city: 'San Miguel',
      modality: 'Híbrido'
    },
    {
      id: 'demo-admin',
      title: 'Asistente administrativo',
      company: 'Grupo Central',
      city: 'San Salvador',
      modality: 'Presencial'
    },
    ...get('jobs', []).filter(
      j => j?.id && j?.title && j?.city
    )
  ];

  const findJob = id =>
    jobs().find(
      j => String(j.id) === String(id)
    );

  // Mismo cálculo que utiliza el perfil general.
  function completion(p = profile()) {
    const keys = [
      'nombre',
      'telefono',
      'ubicacion',
      'profesion',
      'estudios',
      'habilidades',
      'resumen'
    ];

    const count =
      keys.filter(
        k => String(p[k] || '').trim()
      ).length +
      (p.curriculum ? 1 : 0) +
      (Number(p.experiencia) > 0 ? 1 : 0);

    return Math.round(100 * count / 9);
  }

  function formatDate(value) {
    if (
      !value ||
      Number.isNaN(Date.parse(value))
    ) {
      return 'Sin fecha';
    }

    return new Date(value)
      .toLocaleDateString('es-SV');
  }

  function notice(message, type = 'success') {
    document.querySelector('.lnc-toast')?.remove();

    const toast = document.createElement('div');

    toast.className =
      'lnc-toast' +
      (type === 'error' ? ' error' : '');

    toast.setAttribute('role', 'status');
    toast.textContent = message;

    document.body.append(toast);

    setTimeout(() => toast.remove(), 4500);
  }

  function confirmModal(message, onConfirm) {
    const background = document.createElement('div');

    background.className = 'lnc-dialog-backdrop';

    background.innerHTML = `
      <section
        class="lnc-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lnc-confirm-title">

        <h3 id="lnc-confirm-title">
          Confirmar acción
        </h3>

        <p></p>

        <div class="lnc-actions">
          <button
            class="btn"
            type="button"
            data-cancel>
            Cancelar
          </button>

          <button
            class="btn btn-primary"
            type="button"
            data-confirm>
            Confirmar
          </button>
        </div>
      </section>
    `;

    background.querySelector('p').textContent =
      message;

    const close = () => {
      background.remove();

      document.removeEventListener(
        'keydown',
        onKey
      );
    };

    const onKey = e => {
      if (e.key === 'Escape') close();
    };

    background.querySelector(
      '[data-cancel]'
    ).onclick = close;

    background.querySelector(
      '[data-confirm]'
    ).onclick = () => {
      close();
      onConfirm();
    };

    background.addEventListener('click', e => {
      if (e.target === background) close();
    });

    document.addEventListener('keydown', onKey);
    document.body.append(background);

    background.querySelector('[data-cancel]').focus();
  }

  return {
    get,
    set,
    user,
    email,
    profile,
    extraProfile,
    savedJobs,
    applications,
    details,
    jobs,
    findJob,
    safe,
    completion,
    formatDate,
    notice,
    confirmModal
  };
})();

// Activar estilos solo en páginas del candidato.
if (
  /\/(?:candidato\/(?:candidato|postulaciones|postular|registro-candidato)|general\/perfil)\.html$/
    .test(location.pathname)
) {
  document.body.classList.add(
    'lnc-candidate-ui'
  );
}
