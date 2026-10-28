
document.addEventListener("DOMContentLoaded", () => {
  const C = window.LNC;

  const panel = document.querySelector(
    ".content .panel"
  );

  if (!panel || !C.user()) return;

  // Retirar tabla estática de demostración
  const table = panel.querySelector("table");

  if (table) table.remove();

  const oldWrapper = panel.querySelector(".tablewrap");

  if (oldWrapper) oldWrapper.remove();

  // Buscador y filtros
  const tools = document.createElement("div");

  tools.className = "lnc-filters";

  tools.innerHTML = `
    <input
      id="lnc-search"
      aria-label="Buscar por vacante o empresa"
      placeholder="Buscar vacante o empresa">

    <select
      id="lnc-status"
      aria-label="Filtrar por estado">

      <option value="">Todos los estados</option>
      <option>Recibida</option>
      <option>En revisión</option>
      <option>Entrevista</option>
      <option>Seleccionada</option>
      <option>Rechazada</option>
      <option>Retirada</option>

    </select>
  `;

  const results = document.createElement("div");

  panel.append(tools, results);

  // Mostrar postulaciones
  const render = () => {
    const search = tools
      .querySelector("#lnc-search")
      .value.toLowerCase().trim();

    const filter = tools
      .querySelector("#lnc-status")
      .value;

    const details = C.details();

    const rows = C.applications()
      .map(id => {
        const job = C.jobs().find(
          item => item.id === id
        );

        return {
          id,
          title:
            job?.title ||
            details[id]?.title ||
            "Vacante no disponible",

          company:
            job?.company ||
            details[id]?.company ||
            "Empresa",

          status:
            details[id]?.status || "Recibida",

          date:
            details[id]?.date || ""
        };
      })
      .filter(item => {
        const text = (
          item.title + " " + item.company
        ).toLowerCase();

        return (
          text.includes(search) &&
          (!filter || item.status === filter)
        );
      });

    results.replaceChildren();

    if (!rows.length) {
      results.innerHTML = `
        <p class="lnc-empty">
          No hay postulaciones para mostrar.
          <a href="/doc/empleo/empleos.html">
            Explorar empleos
          </a>
        </p>
      `;
      return;
    }

    const wrapper = document.createElement("div");

    wrapper.className = "tablewrap";

    const newTable = document.createElement("table");

    newTable.innerHTML = `
      <thead>
        <tr>
          <th>Vacante</th>
          <th>Empresa</th>
          <th>Fecha</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
    `;

    const body = document.createElement("tbody");

    rows.forEach(item => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${C.safe(item.title)}</td>

        <td>${C.safe(item.company)}</td>

        <td>
          ${C.safe(C.formatDate(item.date))}
        </td>

        <td>
          <span class="pill">
            ${C.safe(item.status)}
          </span>
        </td>

        <td>
          <div class="lnc-actions">

            <a class="btn btn-soft btn-sm"
              href="/doc/empleo/detalle-empleo.html?id=${encodeURIComponent(item.id)}">
              Ver oferta
            </a>

            ${
              item.status !== "Retirada"
                ? `<button type="button"
                    class="btn btn-sm"
                    data-withdraw="${C.safe(item.id)}">
                    Retirar
                   </button>`
                : ""
            }

          </div>
        </td>
      `;

      body.append(row);
    });

    newTable.append(body);
    wrapper.append(newTable);
    results.append(wrapper);

    // Confirmación para retirar una solicitud
    results
      .querySelectorAll("[data-withdraw]")
      .forEach(button => {
        button.addEventListener("click", () => {
          C.confirmModal(
            "¿Quieres retirar esta postulación? " +
            "La solicitud quedará marcada como retirada " +
            "en este prototipo.",
            () => {
              const all = C.details();

              all[button.dataset.withdraw] = {
                ...all[button.dataset.withdraw],
                status: "Retirada"
              };

              C.set(
                "candidate-application-details-" +
                C.email(),
                all
              );

              C.notice("Postulación retirada.");

              render();
            }
          );
        });
      });
  };

  tools
    .querySelector("#lnc-search")
    .addEventListener("input", render);

  tools
    .querySelector("#lnc-status")
    .addEventListener("change", render);

  render();
});
