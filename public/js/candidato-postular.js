
document.addEventListener("DOMContentLoaded", () => {
  const C = window.LNC;

  const box = document.getElementById("ld-apply-box");

  if (!box || !C.user()) return;

  // Obtener el ID de la vacante
  const id =
    new URLSearchParams(location.search).get("id") ||
    "demo-web";

  const job = C.jobs().find(item => item.id === id);

  if (!job) {
    C.notice(
      "Esta vacante no está disponible.",
      "error"
    );
    return;
  }

  // Quitar el botón anterior de demostración
  box.querySelectorAll("button").forEach(button => {
    if (
      button.textContent.includes("Enviar postulación")
    ) {
      button.remove();
    }
  });

  const previous = box.querySelector(".ld-status");

  if (previous) previous.remove();

  const profile = C.profile();

  // Crear formulario de postulación
  const form = document.createElement("form");

  form.className = "lnc-apply";

  form.innerHTML = `
    <p>
      <strong>${C.safe(job.company)}</strong> ·
      ${C.safe(job.city)} ·
      ${C.safe(job.modality || "Modalidad por confirmar")}
    </p>

    <p class="lnc-muted">
      Esta solicitud es una simulación local.
      No se enviará a una empresa.
    </p>

    <div class="grid2">

      <div class="field">
        <label>Nombre completo</label>
        <input
          value="${C.safe(C.user().name)}"
          readonly>
      </div>

      <div class="field">
        <label>Correo electrónico</label>
        <input
          value="${C.safe(C.user().email)}"
          readonly>
      </div>

    </div>

    <div class="field">
      <label for="lnc-letter">
        Mensaje de presentación (opcional)
      </label>

      <textarea
        id="lnc-letter"
        maxlength="1000"
        rows="5"
        placeholder="Explica por qué te interesa la vacante">
      </textarea>
    </div>

    <p class="lnc-muted">
      ${
        profile.cvName
          ? "CV indicado en perfil: " +
            C.safe(profile.cvName) +
            " (archivo no enviado)"
          : "Todavía no has registrado un CV. " +
            "Puedes completar tu perfil antes de postularte."
      }
    </p>

    <div class="lnc-actions">

      <button type="submit"
        class="btn btn-primary">
        Confirmar postulación
      </button>

      <a class="btn btn-soft"
        href="/doc/general/perfil.html">
        Revisar mi perfil
      </a>

    </div>
  `;

  box.append(form);

  const submit = form.querySelector(
    'button[type="submit"]'
  );

  // Evitar solicitudes duplicadas
  if (C.applications().includes(id)) {
    submit.disabled = true;
    submit.textContent = "Ya te postulaste";

    C.notice(
      "Ya tienes una solicitud registrada para esta vacante."
    );
  }

  // Registrar una postulación
  form.addEventListener("submit", event => {
    event.preventDefault();

    if (C.applications().includes(id)) {
      C.notice(
        "Ya existe esta postulación.",
        "error"
      );
      return;
    }

    C.confirmModal(
      "¿Confirmas que deseas registrar " +
      "esta postulación de demostración?",
      () => {
        C.set(
          "applications-" + C.email(),
          [...C.applications(), id]
        );

        const details = C.details();

        details[id] = {
          title: job.title,
          company: job.company,
          date: new Date().toISOString(),
          status: "Recibida",
          message: form
            .querySelector("#lnc-letter")
            .value.trim()
        };

        C.set(
          "candidate-application-details-" +
          C.email(),
          details
        );

        submit.disabled = true;

        submit.textContent =
          "Postulación registrada";

        C.notice(
          "Postulación registrada. " +
          "Puedes consultarla en Mis postulaciones."
        );
      }
    );
  });
});
