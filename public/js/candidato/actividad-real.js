
import { supabase } from "/js/supabase-config.js";

const $ = id => document.getElementById(id);

function elemento(tipo, texto = "", clase = "") {
  const e = document.createElement(tipo);
  e.textContent = texto;
  if (clase) e.className = clase;
  return e;
}

async function api(ruta, metodo = "GET", cuerpo) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = data.session?.access_token;
  if (!token) throw new Error("Debes iniciar sesión.");

  const configurada = document.querySelector(
    'meta[name="lnd-api-base-url"]'
  )?.content.trim();

  const base = configurada || (
    ["localhost", "127.0.0.1"].includes(location.hostname)
      ? `${location.protocol}//${location.hostname}:3001/api/v1`
      : `${location.origin}/api/v1`
  );

  const opciones = {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  };

  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(
    `${base.replace(/\/+$/, "")}/candidate${ruta}`,
    opciones
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      resultado.error || `Error HTTP ${respuesta.status}`
    );
  }

  return resultado.data;
}

function enlace(texto, ruta) {
  const a = elemento("a", texto, "btn btn-primary");
  a.href = ruta;
  return a;
}

function urlVacante(id) {
  return "/doc/empleo/detalle-empleo.html?id=" + encodeURIComponent(id);
}

// EMPLEOS GUARDADOS

async function iniciarGuardados() {
  const lista = $("em-listado");
  if (!lista) return;

  const aviso = $("em-resumen");
  const buscar = $("em-busqueda");
  const filtro = $("em-filtro");

  const nota = document.querySelector(
    "main .content .ld-em-muted"
  );

  if (nota) {
    nota.textContent =
      "Tus vacantes se guardan en tu cuenta de LinkNoDin.";
  }

  let guardados = [];
  let vacantes = [];

  function mostrar() {
    lista.replaceChildren();

    const ids = new Set(guardados.map(v => v.id));
    const todos = filtro.value === "todos";
    const origen = todos ? vacantes : guardados;

    const busqueda = buscar.value.trim().toLowerCase();

    const visibles = origen.filter(v =>
      [v.title, v.company, v.city]
        .join(" ")
        .toLowerCase()
        .includes(busqueda)
    );

    aviso.textContent =
      `${guardados.length} empleos guardados en tu cuenta.`;

    if (!visibles.length) {
      lista.append(
        elemento("p", "No hay vacantes que coincidan.", "muted")
      );
      return;
    }

    for (const vacante of visibles) {
      const tarjeta = elemento("article", "", "panel ln-integ-card");

      tarjeta.append(
        elemento("h3", vacante.title),
        elemento(
          "p",
          `${vacante.company} · ${vacante.city || "El Salvador"}`,
          "muted"
        )
      );

      const acciones = elemento("div", "", "ln-integ-actions");

      if (vacante.status === "active") {
        acciones.append(
          enlace("Ver vacante", urlVacante(vacante.id))
        );
      } else {
        acciones.append(
          elemento("p", "Vacante no disponible", "muted")
        );
      }

      const guardada = ids.has(vacante.id);

      const boton = elemento(
        "button",
        guardada ? "Quitar guardado" : "Guardar",
        "btn"
      );
      boton.type = "button";

      boton.addEventListener("click", async () => {
        boton.disabled = true;

        try {
          await api(
            `/saved/${vacante.id}`,
            guardada ? "DELETE" : "POST"
          );
          await cargar();
        } catch (error) {
          aviso.textContent = error.message;
          boton.disabled = false;
        }
      });

      acciones.append(boton);
      tarjeta.append(acciones);
      lista.append(tarjeta);
    }
  }

  async function cargar() {
    aviso.textContent = "Cargando guardados...";
    lista.replaceChildren();

    try {
      [guardados, vacantes] = await Promise.all([
        api("/saved"),
        api("/jobs")
      ]);
      mostrar();
    } catch (error) {
      aviso.textContent = "Error: " + error.message;
    }
  }

  buscar.addEventListener("input", mostrar);
  filtro.addEventListener("change", mostrar);

  await cargar();
}

// MIS POSTULACIONES

async function iniciarPostulaciones() {
  if (!location.pathname.endsWith(
    "/candidato/postulaciones.html"
  )) return;

  const panel = document.querySelector("main .content .panel");
  if (!panel) return;

  panel.replaceChildren();

  panel.append(
    elemento("h2", "Seguimiento de solicitudes")
  );

  const aviso = elemento("p", "Cargando postulaciones...", "muted");
  const lista = elemento("div");

  panel.append(aviso, lista);

  try {
    const solicitudes = await api("/applications");
    aviso.textContent = "";

    if (!solicitudes.length) {
      lista.append(elemento(
        "p",
        "Todavía no has enviado postulaciones.",
        "muted"
      ));
      return;
    }

    const estados = {
      received: "Recibida",
      reviewing: "En revisión",
      interview: "Entrevista",
      selected: "Seleccionada",
      rejected: "No seleccionada"
    };

    for (const solicitud of solicitudes) {
      const tarjeta = elemento(
        "article", "", "ln-integ-card"
      );

      const fecha = solicitud.applied_at
        ? new Date(solicitud.applied_at)
            .toLocaleDateString("es-SV")
        : "Sin fecha";

      tarjeta.append(
        elemento("h3", solicitud.title),
        elemento("p", "Empresa: " + solicitud.company),
        elemento("p", "Fecha: " + fecha),
        elemento(
          "p",
          "Estado: " +
          (estados[solicitud.status] || solicitud.status)
        ),
        enlace("Ver vacante", urlVacante(solicitud.job_id))
      );

      lista.append(tarjeta);
    }
  } catch (error) {
    aviso.textContent =
      "No se pudieron cargar las postulaciones: " +
      error.message;
  }
}

// ENVIAR POSTULACIÓN

async function iniciarPostular() {
  const caja = $("ld-apply-box");
  if (!caja) return;

  caja.replaceChildren(
    elemento("p", "Cargando vacante...")
  );

  const id = Number(
    new URLSearchParams(location.search).get("id")
  );

  if (!Number.isSafeInteger(id) || id <= 0) {
    caja.replaceChildren(
      elemento("p", "Selecciona una vacante desde Empleos.")
    );
    return;
  }

  try {
    const { job, questions } = await api(`/jobs/${id}`);

    const titulo = elemento(
      "h1",
      "Postularse a " + job.title,
      "page-title"
    );

    const empresa = elemento(
      "p",
      job.company + " · " + (job.city || "El Salvador"),
      "muted"
    );

    const formulario = elemento("form");
    const cartaLabel = elemento(
      "label",
      "Carta de presentación (opcional)"
    );

    const carta = elemento("textarea");
    carta.rows = 5;
    carta.maxLength = 4000;
    carta.placeholder = "Cuéntale a la empresa por qué te interesa.";

    formulario.append(cartaLabel, carta);

    const respuestas = [];

    for (const pregunta of questions) {
      const label = elemento(
        "label",
        pregunta.question +
        (pregunta.is_required ? " *" : "")
      );

      const textarea = elemento("textarea");
      textarea.rows = 3;
      textarea.maxLength = 1000;
      textarea.required = pregunta.is_required;

      formulario.append(label, textarea);

      respuestas.push({
        job_question_id: pregunta.id,
        input: textarea
      });
    }

    const enviar = elemento(
      "button",
      "Enviar postulación",
      "btn btn-primary"
    );
    enviar.type = "submit";

    const aviso = elemento("p", "", "ld-status");
    aviso.setAttribute("role", "status");

    formulario.append(enviar, aviso);
    caja.replaceChildren(titulo, empresa, formulario);

    formulario.addEventListener("submit", async event => {
      event.preventDefault();

      if (!formulario.reportValidity()) return;

      enviar.disabled = true;
      aviso.textContent = "Enviando postulación...";

      try {
        await api("/applications", "POST", {
          jobId: id,
          coverLetter: carta.value.trim(),
          answers: respuestas.map(r => ({
            job_question_id: r.job_question_id,
            answer: r.input.value.trim()
          }))
        });

        aviso.textContent =
          "Tu postulación se envió correctamente.";

        formulario.append(
          enlace(
            "Ver mis postulaciones",
            "/doc/candidato/postulaciones.html"
          )
        );

      } catch (error) {
        aviso.textContent =
          "No se pudo enviar: " + error.message;
        enviar.disabled = false;
      }
    });

  } catch (error) {
    caja.replaceChildren(
      elemento(
        "p",
        "No se pudo cargar la vacante: " + error.message
      )
    );
  }
}

async function iniciar() {
  await iniciarGuardados();
  await iniciarPostulaciones();
  await iniciarPostular();
}

iniciar().catch(error => {
  console.error("Actividad del candidato:", error);

  const aviso = $("em-resumen") ||
    document.querySelector("main .content .panel") ||
    $("ld-apply-box");

  if (aviso) {
    aviso.prepend(
      elemento("p", "Error: " + error.message)
    );
  }
});
