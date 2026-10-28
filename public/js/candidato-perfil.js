
document.addEventListener("DOMContentLoaded", () => {
  const C = window.LNC;

  const form = document.querySelector(
    ".content form.demo-form"
  );

  if (!form || !C.user()) return;

  form.id = "lnc-profile-form";

  const inputs = [...form.querySelectorAll("input")];

  const fields = {
    name: inputs[0],
    email: inputs[1],
    phone: inputs[2],
    city: inputs[3],
    title: inputs[4],
    experience: inputs[5],
    skills: form.querySelector("textarea")
  };

  fields.email.type = "email";
  fields.email.readOnly = true;

  fields.email.title =
    "El correo de la cuenta no se modifica desde este formulario";

  // Campos adicionales del perfil
  const extra = document.createElement("div");

  extra.innerHTML = `
    <div class="grid2">

      <div class="field">
        <label for="lnc-education">
          Formación académica
        </label>

        <input
          id="lnc-education"
          maxlength="140"
          placeholder="Ej. Ingeniería en Software">
      </div>

      <div class="field">
        <label for="lnc-availability">
          Disponibilidad
        </label>

        <select id="lnc-availability">
          <option value="">Seleccionar</option>
          <option>Inmediata</option>
          <option>15 días</option>
          <option>30 días</option>
        </select>
      </div>

    </div>

    <div class="field">
      <label for="lnc-summary">
        Resumen profesional
      </label>

      <textarea
        id="lnc-summary"
        rows="4"
        maxlength="800"
        placeholder="Cuéntales a las empresas qué sabes hacer">
      </textarea>
    </div>

    <div class="field">
      <label for="lnc-portfolio">
        Portafolio o LinkedIn (URL)
      </label>

      <input
        id="lnc-portfolio"
        type="url"
        placeholder="https://...">
    </div>

    <p id="lnc-cv-name" class="lnc-muted"></p>
  `;

  const button = form.querySelector(
    'button[type="submit"]'
  );

  button.before(extra);

  const file = form.querySelector(
    'input[type="file"]'
  );

  file.removeAttribute("required");

  // Cargar los datos guardados
  const data = C.profile();

  Object.entries(fields).forEach(([key, element]) => {
    if (!element) return;

    if (key === "name") {
      element.value = C.user().name;
    } else if (key === "email") {
      element.value = C.user().email;
    } else {
      element.value = data[key] || "";
    }
  });

  [
    "education",
    "availability",
    "summary",
    "portfolio"
  ].forEach(key => {
    extra.querySelector("#lnc-" + key).value =
      data[key] || "";
  });

  const cvName = extra.querySelector("#lnc-cv-name");

  if (data.cvName) {
    cvName.textContent =
      "Currículum seleccionado: " +
      data.cvName +
      " (referencia local; el archivo no se subió)";
  }

  // Guardar los cambios
  form.addEventListener("submit", event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (
      file.files[0] &&
      !/\.(pdf|doc|docx)$/i.test(file.files[0].name)
    ) {
      C.notice(
        "Solo se admiten archivos PDF, DOC o DOCX.",
        "error"
      );
      return;
    }

    const saved = {};

    Object.entries(fields).forEach(([key, element]) => {
      saved[key] = element.value.trim();
    });

    [
      "education",
      "availability",
      "summary",
      "portfolio"
    ].forEach(key => {
      saved[key] = extra
        .querySelector("#lnc-" + key)
        .value.trim();
    });

    saved.cvName =
      file.files[0]?.name || data.cvName || "";

    C.set(
      "candidate-profile-" + C.email(),
      saved
    );

    C.notice("Perfil guardado en este navegador.");

    cvName.textContent = saved.cvName
      ? "Currículum seleccionado: " +
        saved.cvName +
        " (no se subió ningún archivo)"
      : "";
  });
});
