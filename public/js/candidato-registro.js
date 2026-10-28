
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById(
    "ld-register"
  );

  if (!form) return;

  const fields = [
    ...form.querySelectorAll("input")
  ];

  if (fields.length < 4) return;

  // Nombre completo
  fields[0].minLength = 3;
  fields[0].maxLength = 90;

  // Correo electrónico
  fields[1].type = "email";
  fields[1].autocomplete = "email";

  // Contraseña
  fields[2].minLength = 6;
  fields[2].autocomplete = "new-password";

  // Confirmar contraseña
  fields[3].minLength = 6;
  fields[3].autocomplete = "new-password";

  // Mensaje informativo
  const note = document.createElement("p");

  note.className = "lnc-muted";

  note.textContent =
    "Cuenta de prueba: evita usar contraseñas reales. " +
    "La información se guardará en tu navegador.";

  form.querySelector("button").before(note);

  // Validar contraseñas
  form.addEventListener(
    "submit",
    event => {
      if (
        fields[2].value !== fields[3].value
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();

        document.getElementById(
          "ld-status"
        ).textContent =
          "Las contraseñas no coinciden.";

        window.LNC.notice(
          "Comprueba las contraseñas.",
          "error"
        );
      }
    },
    true
  );
});
