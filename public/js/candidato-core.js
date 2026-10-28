
/* Funciones generales del candidato */

window.LNC = (() => {
  const prefix = "linknodin-v3-";

  const get = (key, defaultValue) => {
    try {
      const value = JSON.parse(
        localStorage.getItem(prefix + key)
      );
      return value ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const set = (key, value) => {
    localStorage.setItem(
      prefix + key,
      JSON.stringify(value)
    );

    window.dispatchEvent(
      new CustomEvent("ld:activity-updated")
    );
  };

  const session = () => get("session", null);

  const user = () => {
    const current = session();

    if (current?.role !== "candidato") {
      return null;
    }

    return get("accounts", []).find(
      account =>
        account.email === current.email &&
        account.role === "candidato"
    );
  };

  const email = () => user()?.email || "";

  const profile = () =>
    get("candidate-profile-" + email(), {});

  const applications = () =>
    get("applications-" + email(), []);

  const details = () =>
    get("candidate-application-details-" + email(), {});

  const safe = value =>
    String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
    );

  const jobs = () => [
    {
      id: "demo-ui",
      title: "Diseñador UI/UX",
      company: "Súper Selectos",
      city: "San Salvador",
      modality: "Remoto"
    },
    {
      id: "demo-web",
      title: "Desarrollador Web",
      company: "Banco Agrícola",
      city: "Santa Ana",
      modality: "Presencial"
    },
    {
      id: "demo-data",
      title: "Analista de datos",
      company: "ADOC",
      city: "San Miguel",
      modality: "Híbrido"
    },
    {
      id: "demo-admin",
      title: "Asistente administrativo",
      company: "Grupo Central",
      city: "San Salvador",
      modality: "Presencial"
    },
    ...get("jobs", []).filter(
      job => job && job.id && job.title
    )
  ];

  function notice(message, type = "success") {
    document.querySelector(".lnc-toast")?.remove();

    const toast = document.createElement("div");

    toast.className = "lnc-toast " + type;
    toast.setAttribute("role", "status");
    toast.textContent = message;

    document.body.append(toast);

    setTimeout(() => toast.remove(), 4400);
  }

  function confirmModal(message, accept) {
    const overlay = document.createElement("div");

    overlay.className =
      "ld-modal-backdrop lnc-overlay";

    overlay.innerHTML = `
      <section class="ld-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lnc-confirm-heading">

        <h2 id="lnc-confirm-heading">
          Confirmar acción
        </h2>

        <p></p>

        <div class="ld-modal-buttons">
          <button class="btn"
            type="button" data-no>
            Cancelar
          </button>

          <button class="btn btn-primary"
            type="button" data-yes>
            Confirmar
          </button>
        </div>
      </section>
    `;

    overlay.querySelector("p").textContent = message;

    document.body.append(overlay);

    const cancel = () => {
      overlay.remove();
      document.removeEventListener("keydown", escape);
    };

    const escape = event => {
      if (event.key === "Escape") {
        cancel();
      }
    };

    document.addEventListener("keydown", escape);

    overlay.querySelector("[data-no]").onclick = cancel;

    overlay.querySelector("[data-yes]").onclick = () => {
      cancel();
      accept();
    };

    overlay.querySelector("[data-no]").focus();
  }

  const formatDate = value =>
    value
      ? new Date(value).toLocaleDateString("es-SV")
      : "Sin fecha";

  return {
    get,
    set,
    user,
    email,
    profile,
    applications,
    details,
    jobs,
    safe,
    notice,
    confirmModal,
    formatDate
  };
})();


/* Activar estilos solo en las vistas del candidato */
(() => {
  const path = window.location.pathname;

  const candidatePages = [
    "/doc/candidato/candidato.html",
    "/doc/candidato/postulaciones.html",
    "/doc/candidato/postular.html",
    "/doc/candidato/registro-candidato.html",
    "/doc/general/perfil.html"
  ];

  if (candidatePages.some(page => path.endsWith(page))) {
    document.body.classList.add("lnc-candidate-ui");
  }
})();

