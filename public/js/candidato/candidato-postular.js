
/* Postulaciones del candidato */

document.addEventListener('DOMContentLoaded', () => {
  const C = window.LNC;

  const box = document.getElementById(
    'ld-apply-box'
  );

  if (!C?.user() || !box) return;

  const id = new URLSearchParams(
    location.search
  ).get('id') || 'demo-web';

  const job = C.findJob(id);

  if (!job) {
    C.notice(
      'La vacante ya no está disponible.',
      'error'
    );
    return;
  }

  if (
    box.querySelector('#lnc-application-form')
  ) return;

  // Retirar solo el botón anterior de esta pantalla.
  for (const button of box.querySelectorAll('button')) {
    if (
      /enviar postulación de prueba/i.test(
        button.textContent
      )
    ) {
      button.remove();
    }
  }

  box.querySelector('.ld-status')?.remove();

  const p = box.querySelector('p');

  if (p) {
    p.textContent =
      'Revisa tu información antes de registrar ' +
      'una solicitud de demostración.';
  }

  const profile = C.profile();
  const questions = Array.isArray(job.questions) ? job.questions.filter(question => String(question).trim()) : [];
  const questionFields = questions.map((question, index) => `
    <div class="field lnc-screening-question">
      <label for="lnc-question-${index}">${C.safe(question)} <span aria-hidden="true">*</span></label>
      <textarea id="lnc-question-${index}" name="respuesta-${index}" rows="3" maxlength="1000" required placeholder="Escribe tu respuesta"></textarea>
    </div>
  `).join('');

  const form = document.createElement('form');

  form.className = 'lnc-apply';
  form.id = 'lnc-application-form';

  form.innerHTML = `
    <div class="lnc-job-summary">
      <h3>Resumen de la vacante</h3>

      <p>
        <strong>
          ${C.safe(job.title)}
        </strong>
        ·
        ${C.safe(job.company || 'Empresa')}
      </p>

      <p>
        ${C.safe(job.city || 'Sin ubicación')}
        ·
        ${C.safe(
          job.modality || 'Modalidad no indicada'
        )}
      </p>
    </div>

    <div class="grid2">

      <div class="field">
        <label for="lnc-apply-name">
          Nombre
        </label>

        <input
          id="lnc-apply-name"
          readonly
          value="${C.safe(
            profile.nombre ||
            C.user().name ||
            ''
          )}">
      </div>

      <div class="field">
        <label for="lnc-apply-email">
          Correo
        </label>

        <input
          id="lnc-apply-email"
          readonly
          value="${C.safe(C.email())}">
      </div>

    </div>

    ${questions.length ? `<fieldset class="lnc-question-group"><legend>Preguntas de la empresa</legend><p class="lnc-muted">Responde todas las preguntas para poder enviar tu postulacion.</p>${questionFields}</fieldset>` : ''}

    <div class="field">
      <label for="lnc-letter">
        Mensaje de presentación (opcional)
      </label>

      <textarea
        id="lnc-letter"
        maxlength="1000"
        rows="5"
        placeholder="Explica por qué te interesa esta vacante">
      </textarea>

      <small id="lnc-letter-count">
        0 / 1000 caracteres
      </small>
    </div>

    <p class="lnc-muted" id="lnc-cv-hint"></p>

    <div class="lnc-actions">
      <button
        class="btn btn-primary"
        id="lnc-apply-submit"
        type="submit">
        Registrar postulación
      </button>

      <a
        class="btn btn-soft"
        href="/doc/general/perfil.html">
        Revisar mi perfil
      </a>

      <a
        class="btn"
        href="/doc/candidato/postulaciones.html">
        Mis postulaciones
      </a>
    </div>

    <p class="lnc-muted">
      Esta postulacion se guarda en este navegador y aparece en el panel de la empresa dentro de este prototipo.
    </p>
  `;

  box.append(form);

  form.querySelector('#lnc-cv-hint').textContent =
    profile.curriculum
      ? 'CV registrado en el perfil: ' +
        profile.curriculum +
        ' (solo su nombre, no el archivo).'
      : 'No has indicado un currículum. ' +
        'Puedes completar tu perfil antes de postularte.';

  const letter = form.querySelector('#lnc-letter');

  const submit = form.querySelector(
    '#lnc-apply-submit'
  );

  letter.addEventListener('input', () => {
    form.querySelector(
      '#lnc-letter-count'
    ).textContent =
      letter.value.length +
      ' / 1000 caracteres';
  });

  const exists = () =>
    C.applications().some(
      value => String(value) === String(id)
    );

  function check() {
    submit.disabled = exists();

    submit.textContent = exists()
      ? 'Ya te postulaste'
      : 'Registrar postulación';
  }

  check();

  form.addEventListener('submit', e => {
    e.preventDefault();

    if (exists()) {
      C.notice(
        'Esta postulación ya está registrada.',
        'error'
      );

      check();
      return;
    }

    const answers = questions.map((question, index) => ({
      question: String(question),
      answer: form.querySelector(`#lnc-question-${index}`)?.value.trim() || ''
    }));
    const unanswered = answers.findIndex(item => !item.answer);
    if (unanswered !== -1) {
      const input = form.querySelector(`#lnc-question-${unanswered}`);
      C.notice('Responde todas las preguntas de la empresa antes de postularte.', 'error');
      input?.focus();
      return;
    }

    C.confirmModal(
      '¿Registrar tu postulación de demostración a ' +
      job.title +
      '?',
      () => {
        if (exists()) return check();

        const now = new Date().toISOString();

        const d = C.details();

        d[id] = {
          ...(d[id] || {}),

          title: job.title,
          company: job.company || 'Empresa',
          candidateEmail: C.email(),
          candidateName: C.user().name,

          date: now,
          status: 'Recibida',

          message: letter.value.trim(),
          answers,

          history: [
            {
              date: now,
              status: 'Recibida'
            }
          ]
        };

        try {
          C.set(
            'candidate-application-details-' +
            C.email(),
            d
          );

          C.set(
            'applications-' + C.email(),
            [
              ...C.applications(),
              job.id
            ]
          );

          check();

          C.notice(
            'Postulación registrada. ' +
            'Puedes consultarla en Mis postulaciones.'
          );
        } catch {
          C.notice(
            'No se pudo guardar la postulación.',
            'error'
          );
        }
      }
    );
  });
});
