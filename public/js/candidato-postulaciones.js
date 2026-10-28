
/* Seguimiento de postulaciones del candidato */

document.addEventListener('DOMContentLoaded', () => {
  const C = window.LNC;

  const panel = document.querySelector(
    '.content .panel'
  );

  if (!C?.user() || !panel) return;

  // Quitar tabla fija del prototipo
  panel.querySelector('.tablewrap')?.remove();

  if (
    panel.querySelector('#lnc-post-tools')
  ) return;

  const tools = document.createElement('section');

  tools.id = 'lnc-post-tools';

  tools.innerHTML = `
    <div
      class="lnc-post-summary"
      id="lnc-summary">
    </div>

    <div class="lnc-post-filters">

      <label>
        Buscar vacante o empresa
        <input
          id="lnc-search"
          type="search"
          placeholder="Buscar por nombre">
      </label>

      <label>
        Estado
        <select id="lnc-state">
          <option value="">Todos</option>
          <option>Recibida</option>
          <option>En revisión</option>
          <option>Entrevista</option>
          <option>Seleccionada</option>
          <option>Rechazada</option>
          <option>Retirada</option>
        </select>
      </label>

      <label>
        Orden
        <select id="lnc-order">
          <option value="recent">Más recientes</option>
          <option value="old">Más antiguas</option>
          <option value="name">Por nombre</option>
        </select>
      </label>

    </div>

    <div class="lnc-actions">
      <button
        type="button"
        class="btn btn-soft btn-sm"
        id="lnc-export">
        Exportar CSV
      </button>

      <a
        class="btn btn-primary btn-sm"
        href="/doc/empleo/empleos.html">
        Buscar empleos
      </a>
    </div>

    <div
      id="lnc-results"
      aria-live="polite">
    </div>
  `;

  panel.append(tools);

  const el = id =>
    tools.querySelector('#' + id);

  // Obtener las solicitudes existentes
  function records() {
    const details = C.details();

    return [
      ...new Set(
        C.applications().map(String)
      )
    ].map(id => {
      const data = details[id] || {};
      const job = C.findJob(id);

      return {
        id,

        title:
          data.title ||
          job?.title ||
          'Vacante no disponible',

        company:
          data.company ||
          job?.company ||
          'Empresa',

        date: data.date || '',

        status:
          data.status || 'Recibida',

        message:
          data.message || '',

        history:
          Array.isArray(data.history)
            ? data.history
            : []
      };
    });
  }

  // Filtrar y ordenar resultados
  function filtered() {
    const term = el('lnc-search')
      .value.trim()
      .toLocaleLowerCase('es');

    const status = el('lnc-state').value;

    const order = el('lnc-order').value;

    return records()
      .filter(r =>
        (!status || r.status === status) &&
        (
          r.title + ' ' + r.company
        )
          .toLocaleLowerCase('es')
          .includes(term)
      )
      .sort((a, b) => {
        if (order === 'name') {
          return a.title.localeCompare(
            b.title,
            'es'
          );
        }

        const da = Date.parse(a.date) || 0;
        const db = Date.parse(b.date) || 0;

        return order === 'old'
          ? da - db
          : db - da;
      });
  }

  // Modal de detalles
  function openDetails(r) {
    const overlay = document.createElement('div');

    overlay.className = 'lnc-dialog-backdrop';

    const history = r.history.length
      ? r.history
      : [
          {
            date: r.date,
            status: r.status
          }
        ];

    overlay.innerHTML = `
      <section
        class="lnc-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lnc-detail-title">

        <h3 id="lnc-detail-title">
          Detalle de postulación
        </h3>

        <dl class="lnc-detail-list">
          <dt>Vacante</dt>
          <dd>${C.safe(r.title)}</dd>

          <dt>Empresa</dt>
          <dd>${C.safe(r.company)}</dd>

          <dt>Fecha</dt>
          <dd>
            ${C.safe(C.formatDate(r.date))}
          </dd>

          <dt>Estado</dt>
          <dd>${C.safe(r.status)}</dd>

          <dt>Mensaje</dt>
          <dd class="lnc-wrap">
            ${C.safe(
              r.message ||
              'Sin mensaje de presentación'
            )}
          </dd>
        </dl>

        <h4>Historial registrado</h4>

        <ol class="lnc-history">
          ${history.map(h => `
            <li>
              ${C.safe(C.formatDate(h.date))}:
              ${C.safe(
                h.status || 'Sin estado'
              )}
            </li>
          `).join('')}
        </ol>

        <p class="lnc-muted">
          Solo se muestran movimientos guardados
          localmente. La empresa no actualiza
          estos estados todavía.
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
        escape
      );
    };

    const escape = e => {
      if (e.key === 'Escape') close();
    };

    overlay.querySelector(
      '[data-close]'
    ).onclick = close;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', escape);

    document.body.append(overlay);

    overlay.querySelector('[data-close]').focus();
  }

  // Actualizar estadísticas y tabla
  function render() {
    const all = records();
    const list = filtered();

    el('lnc-summary').innerHTML = [
      [
        all.length,
        'Solicitudes'
      ],
      [
        all.filter(
          r => r.status === 'En revisión'
        ).length,
        'En revisión'
      ],
      [
        all.filter(
          r => r.status === 'Entrevista'
        ).length,
        'Entrevistas'
      ],
      [
        all.filter(
          r => r.status === 'Retirada'
        ).length,
        'Retiradas'
      ]
    ].map(([n, label]) => `
      <div>
        <strong>${n}</strong>
        <small>${label}</small>
      </div>
    `).join('');

    const target = el('lnc-results');

    if (!list.length) {
      target.innerHTML = `
        <p class="lnc-empty">
          No hay postulaciones que coincidan
          con los filtros.
        </p>
      `;
      return;
    }

    target.innerHTML = `
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Vacante</th>
              <th>Empresa</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            ${list.map(r => `
              <tr>
                <td>${C.safe(r.title)}</td>

                <td>${C.safe(r.company)}</td>

                <td>
                  ${C.safe(
                    C.formatDate(r.date)
                  )}
                </td>

                <td>
                  <span class="pill">
                    ${C.safe(r.status)}
                  </span>
                </td>

                <td>
                  <div class="lnc-actions">

                    <button
                      type="button"
                      class="btn btn-soft btn-sm"
                      data-details="${C.safe(r.id)}">
                      Detalles
                    </button>

                    <a
                      class="btn btn-soft btn-sm"
                      href="/doc/empleo/detalle-empleo.html?id=${encodeURIComponent(r.id)}">
                      Ver oferta
                    </a>

                    ${
                      r.status === 'Retirada'
                        ? ''
                        : `
                          <button
                            type="button"
                            class="btn btn-sm"
                            data-withdraw="${C.safe(r.id)}">
                            Retirar
                          </button>
                        `
                    }

                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Búsqueda, filtros y ordenamiento
  el('lnc-search').addEventListener(
    'input',
    render
  );

  el('lnc-state').addEventListener(
    'change',
    render
  );

  el('lnc-order').addEventListener(
    'change',
    render
  );

  // Botones de detalles y retiro
  el('lnc-results').addEventListener(
    'click',
    e => {
      const detail = e.target.closest(
        '[data-details]'
      );

      if (detail) {
        const r = records().find(
          x => x.id === detail.dataset.details
        );

        if (r) openDetails(r);

        return;
      }

      const button = e.target.closest(
        '[data-withdraw]'
      );

      if (!button) return;

      const id = button.dataset.withdraw;

      C.confirmModal(
        '¿Quieres marcar esta postulación como retirada? ' +
        'Se conservará su historial.',
        () => {
          const all = C.details();
          const old = all[id] || {};

          if (old.status === 'Retirada') return;

          all[id] = {
            ...old,

            status: 'Retirada',

            history: [
              ...(
                Array.isArray(old.history)
                  ? old.history
                  : []
              ),
              {
                date: new Date().toISOString(),
                status: 'Retirada'
              }
            ]
          };

          try {
            C.set(
              'candidate-application-details-' +
              C.email(),
              all
            );

            C.notice(
              'Solicitud marcada como retirada.'
            );

            render();
          } catch {
            C.notice(
              'No se pudo actualizar la solicitud.',
              'error'
            );
          }
        }
      );
    }
  );

  // Exportar los resultados a CSV
  el('lnc-export').addEventListener(
    'click',
    () => {
      const rows = filtered();

      if (!rows.length) {
        C.notice(
          'No hay datos para exportar.',
          'error'
        );
        return;
      }

      // Evitar fórmulas ejecutables en Excel
      const cell = input => {
        let value = String(input ?? '');

        if (/^[\s]*[=+\-@]/.test(value)) {
          value = "'" + value;
        }

        return '"' +
          value.replace(/"/g, '""') +
          '"';
      };

      const data = [
        [
          'Vacante',
          'Empresa',
          'Fecha',
          'Estado',
          'Mensaje'
        ],
        ...rows.map(r => [
          r.title,
          r.company,
          C.formatDate(r.date),
          r.status,
          r.message
        ])
      ]
        .map(row => row.map(cell).join(','))
        .join('\r\n');

      const url = URL.createObjectURL(
        new Blob(
          ['\uFEFF' + data],
          {
            type: 'text/csv;charset=utf-8'
          }
        )
      );

      const a = document.createElement('a');

      a.href = url;
      a.download = 'mis-postulaciones.csv';
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  );

  window.addEventListener(
    'ld:activity-updated',
    render
  );

  render();
});
