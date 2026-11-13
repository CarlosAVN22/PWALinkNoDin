
import { supabase } from "/js/supabase-config.js";

const contenido = document.querySelector("main .content");
const estadisticas = contenido.querySelector(".stats");
const panel = contenido.querySelector(".panel");

const mensaje = document.createElement("p");
mensaje.className = "muted";
mensaje.setAttribute("role", "status");
contenido.prepend(mensaje);

// Evitar mostrar estadísticas del prototipo.
estadisticas.hidden = true;
panel.hidden = true;

function actualizarEstadistica(indice, nombre, cantidad) {
  const elemento = estadisticas.querySelectorAll(".stat")[indice];
  elemento.querySelector("small").textContent = nombre;
  elemento.querySelector("strong").textContent = cantidad;
}

function mostrarVacantes(vacantes) {
  panel.querySelector("h3").textContent = "Vacantes recientes";

  panel.querySelectorAll(".job").forEach(n => n.remove());

  if (!vacantes.length) {
    const p = document.createElement("p");
    p.textContent = "No hay vacantes disponibles por el momento.";
    panel.append(p);
    return;
  }

  for (const vacante of vacantes) {
    const fila = document.createElement("div");
    fila.className = "job";

    const principal = document.createElement("div");
    principal.className = "jobmain";

    const logo = document.createElement("div");
    logo.className = "logo";
    logo.textContent = (vacante.company || "E")[0];

    const datos = document.createElement("div");

    const titulo = document.createElement("h3");
    titulo.textContent = vacante.title;

    const empresa = document.createElement("small");
    empresa.textContent =
      `${vacante.company} · ${vacante.city || "El Salvador"}`;

    const modalidad = document.createElement("p");
    modalidad.textContent =
      vacante.modality || "Modalidad no especificada";

    datos.append(titulo, empresa, modalidad);
    principal.append(logo, datos);

    const enlace = document.createElement("a");
    enlace.className = "btn btn-primary";
    enlace.textContent = "Ver empleo";
    enlace.href =
      "/doc/empleo/detalle-empleo.html?id=" +
      encodeURIComponent(vacante.id);

    fila.append(principal, enlace);
    panel.append(fila);
  }
}

async function cargarDashboard() {
  mensaje.textContent = "Cargando datos reales...";

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Debes iniciar sesión.");
    }

    const base = ["localhost", "127.0.0.1"]
      .includes(location.hostname)
      ? `${location.protocol}//${location.hostname}:3001/api/v1`
      : `${location.origin}/api/v1`;

    const respuesta = await fetch(
      `${base}/candidate/dashboard`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(resultado.error || "Error del servidor.");
    }

    const datos = resultado.data;

    actualizarEstadistica(
      0, "Postulaciones enviadas", datos.postulaciones
    );
    actualizarEstadistica(
      1, "En revisión", datos.enRevision
    );
    actualizarEstadistica(
      2, "Empleos guardados", datos.guardados
    );
    actualizarEstadistica(
      3, "Vacantes recientes", datos.vacantes.length
    );

    mostrarVacantes(datos.vacantes);

    estadisticas.hidden = false;
    panel.hidden = false;
    mensaje.textContent = "";

  } catch (error) {
    console.error("Dashboard candidato:", error);
    mensaje.textContent =
      "No se pudo cargar el dashboard: " + error.message;
  }
}

cargarDashboard();
