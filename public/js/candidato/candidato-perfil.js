
/* Complemento del perfil del candidato */

document.addEventListener('DOMContentLoaded', () => {
  const C = window.LNC;

  const form = document.getElementById(
    'perfil-form'
  );

  if (
    !C?.user() ||
    !form ||
    form.querySelector('#lnc-disponibilidad')
  ) return;

  // Recuperar información del prototipo anterior
  // solamente cuando el campo actual esté vacío.
  const legacy = C.get(
    'candidate-profile-' + C.email(),
    {}
  );

  const mapping = {
    'perfil-telefono': 'phone',
    'perfil-ubicacion': 'city',
    'perfil-profesion': 'title',
    'perfil-estudios': 'education',
    'perfil-habilidades': 'skills',
    'perfil-resumen': 'summary'
  };

  let recovered = false;

  for (const [id, name] of Object.entries(mapping)) {
    const el = document.getElementById(id);

    if (
      el &&
      !el.value.trim() &&
      legacy[name]
    ) {
      el.value = String(legacy[name]);
      recovered = true;
    }
  }

  if (recovered) {
    form.dispatchEvent(
      new Event('input', { bubbles: true })
    );
  }

  const extra = C.extraProfile();

  const block = document.createElement('section');

  block.className = 'lnc-perfil-extra';

  block.innerHTML = `
    <h3>Información adicional</h3>

    <div class="grid2">

      <div class="field">
        <label for="lnc-disponibilidad">
          Disponibilidad laboral
        </label>

        <select id="lnc-disponibilidad">
          <option value="">Sin indicar</option>
          <option>Inmediata</option>
          <option>En 15 días</option>
          <option>En 30 días</option>
          <option>A convenir</option>
        </select>
      </div>

      <div class="field">
        <label for="lnc-portafolio">
          Portafolio o LinkedIn
        </label>

        <input
          id="lnc-portafolio"
          type="url"
          placeholder="https://ejemplo.com"
          maxlength="250">
      </div>

    </div>

    <p class="lnc-muted">
      Los datos se guardan solo en este navegador.
    </p>

    <button
      type="button"
      class="btn btn-soft btn-sm"
      id="lnc-preview-profile">
      Vista previa de mi perfil
    </button>
  `;

  const saveButton = form.querySelector(
    'button[type="submit"]'
  );

  if (!saveButton) return;

  saveButton.before(block);

  const availability = block.querySelector(
    '#lnc-disponibilidad'
  );

  const portfolio = block.querySelector(
    '#lnc-portafolio'
  );

  availability.value =
    extra.disponibilidad ||
    legacy.availability ||
    '';

  portfolio.value =
    extra.portafolio ||
    legacy.portfolio ||
    '';

  // El archivo general/perfil.js continúa
  // administrando el guardado principal.
  form.addEventListener('submit', () => {
    if (!form.checkValidity()) return;

    try {
      C.set(
        'candidate-extra-' +
        C.email().toLowerCase(),
        {
          disponibilidad: availability.value,
          portafolio: portfolio.value.trim()
        }
      );
    } catch {
      C.notice(
        'No se pudo guardar la información adicional.',
        'error'
      );
    }
  });

  // Vista previa sin modificar los datos
  block.querySelector(
    '#lnc-preview-profile'
  ).addEventListener('click', () => {

    const val = id =>
      document.getElementById(
        'perfil-' + id
      )?.value.trim() || 'Sin indicar';

    const overlay = document.createElement('div');

    overlay.className = 'lnc-dialog-backdrop';

    overlay.innerHTML = `
      <section
        class="lnc-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lnc-preview-title">

        <h3 id="lnc-preview-title">
          Vista previa del perfil
        </h3>

        <dl class="lnc-detail-list">
          <dt>Nombre</dt>
          <dd>${C.safe(val('nombre'))}</dd>

          <dt>Profesión</dt>
          <dd>${C.safe(val('profesion'))}</dd>

          <dt>Ubicación</dt>
          <dd>${C.safe(val('ubicacion'))}</dd>

          <dt>Estudios</dt>
          <dd>${C.safe(val('estudios'))}</dd>

          <dt>Experiencia</dt>
          <dd>
            ${C.safe(val('experiencia'))} años
          </dd>

          <dt>Habilidades</dt>
          <dd class="lnc-wrap">
            ${C.safe(val('habilidades'))}
          </dd>

          <dt>Resumen</dt>
          <dd class="lnc-wrap">
            ${C.safe(val('resumen'))}
          </dd>

          <dt>Disponibilidad</dt>
          <dd>
            ${C.safe(
              availability.value || 'Sin indicar'
            )}
          </dd>

          <dt>Portafolio</dt>
          <dd class="lnc-wrap">
            ${C.safe(
              portfolio.value || 'Sin indicar'
            )}
          </dd>
        </dl>

        <p class="lnc-muted">
          Vista previa local:
          no se publica en Internet.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          data-close>
          Cerrar
        </button>
      </section>
    `;

    const close = () => {
      overlay.remove();

      document.removeEventListener(
        'keydown',
        onKey
      );
    };

    const onKey = e => {
      if (e.key === 'Escape') close();
    };

    overlay.querySelector(
      '[data-close]'
    ).onclick = close;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', onKey);

    document.body.append(overlay);

    overlay.querySelector(
      '[data-close]'
    ).focus();
  });
});
