
document.addEventListener("DOMContentLoaded", () => {
  const C = window.LNC;
  const ICON_PATH = "/img/";

  if (!C) return;

  const candidate = C.user();

  if (!candidate) return;

  const content = document.querySelector(".content");
  const stats = content?.querySelector(".stats");

  if (!content || !stats) return;

  /* ==========================================
     1. ICONOS DE TODAS LAS NOTIFICACIONES
     ========================================== */

  const notificationPanel = document.getElementById(
    "ld-notif-dashboard"
  );

  function createNotificationIcon() {
    const img = document.createElement("img");

    img.src = ICON_PATH + "notificaciones.svg";
    img.alt = "";
    img.className = "lnc-notif-icon";
    img.setAttribute("aria-hidden", "true");

    return img;
  }

  function updateNotificationIcons() {
    if (!notificationPanel) return;

    // Cambiar los emojis que aparezcan en
    // cualquier texto del panel de notificaciones.
    const walker = document.createTreeWalker(
      notificationPanel,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(node => {
      const emojiRegex = /🔔|🔕|🛎️?/g;

      if (!emojiRegex.test(node.textContent)) return;

      const fragment = document.createDocumentFragment();

      const parts = node.textContent.split(
        /(🔔|🔕|🛎️?)/
      );

      parts.forEach(part => {
        if (/^(🔔|🔕|🛎️?)$/.test(part)) {
          fragment.append(createNotificationIcon());
        } else if (part) {
          fragment.append(
            document.createTextNode(part)
          );
        }
      });

      node.replaceWith(fragment);
    });

    // Agregar campanita SVG a los títulos.
    const headings = notificationPanel.querySelectorAll(
      "h2, h3, h4"
    );

    headings.forEach(heading => {
      if (
        /notificaciones/i.test(heading.textContent) &&
        !heading.querySelector(".lnc-notif-icon")
      ) {
        heading.prepend(createNotificationIcon());
      }
    });

    // Icono para cada elemento de una lista de
    // notificaciones, sin modificar sus botones.
    const items = notificationPanel.querySelectorAll(
      ".ld-notif-item, .ld-notification-item, " +
      ".notification-item, .notif-item"
    );

    items.forEach(item => {
      if (item.querySelector(".lnc-notif-icon")) {
        return;
      }

      const iconBox = document.createElement("span");

      iconBox.className = "lnc-notif-icon-wrap";
      iconBox.setAttribute("aria-hidden", "true");
      iconBox.append(createNotificationIcon());

      item.prepend(iconBox);
    });
  }

  // Ejecutar al cargar y también cuando el sistema
  // agregue nuevas notificaciones dinámicamente.
  if (notificationPanel) {
    let updating = false;

    const observer = new MutationObserver(() => {
      if (updating) return;

      updating = true;
      observer.disconnect();

      try {
        updateNotificationIcons();
      } finally {
        observer.observe(notificationPanel, {
          childList: true,
          subtree: true,
          characterData: true
        });

        updating = false;
      }
    });

    updateNotificationIcons();

    observer.observe(notificationPanel, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /* ==========================================
     2. ESTADÍSTICAS DEL CANDIDATO
     ========================================== */

  const apps = C.applications();
  const details = C.details();
  const profile = C.profile();

  const reviewing = apps.filter(id =>
    ["En revisión", "Entrevista"].includes(
      details[id]?.status
    )
  ).length;

  const saved = C.get(
    "saved-" + C.email(),
    C.get("savedJobs-" + C.email(), [])
  );

  const profileFields = [
    profile.phone,
    profile.city,
    profile.title,
    profile.skills,
    profile.summary,
    profile.education,
    profile.experience
  ];

  const completedFields = profileFields.filter(
    value => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return Boolean(
        typeof value === "string"
          ? value.trim()
          : value
      );
    }
  ).length;

  const completion = Math.round(
    (completedFields / profileFields.length) * 100
  );

  const values = [
    apps.length,
    reviewing,
    Array.isArray(saved) ? saved.length : 0,
    completion + "%"
  ];

  const labels = [
    "Postulaciones enviadas",
    "En revisión",
    "Empleos guardados",
    "Perfil completado"
  ];

  const icons = [
    "postulaciones.svg",
    "revision.svg",
    "guardados.svg",
    "perfil.svg"
  ];

  const statCards = stats.querySelectorAll(".stat");

  statCards.forEach((card, index) => {
    if (index >= values.length) return;

    const number = card.querySelector("strong");
    const label = card.querySelector("small");

    if (number) {
      number.textContent = values[index];
    }

    if (label) {
      label.textContent = labels[index];
    }

    if (!card.querySelector(".lnc-stat-icon")) {
      const iconBox = document.createElement("div");

      iconBox.className = "lnc-stat-icon";

      const img = document.createElement("img");

      img.src = ICON_PATH + icons[index];
      img.alt = "";
      img.setAttribute("aria-hidden", "true");

      iconBox.append(img);
      card.prepend(iconBox);
    }
  });

  /* ==========================================
     3. ORDEN DEL PANEL
     ========================================== */

  // Primero estadísticas.
  content.prepend(stats);

  // Después notificaciones.
  if (notificationPanel) {
    stats.after(notificationPanel);
  }

  /* ==========================================
     4. VACANTES RECOMENDADAS
     ========================================== */

  const recommended = Array.from(
    content.querySelectorAll(".panel")
  ).find(panel =>
    /vacantes recomendadas/i.test(
      panel.querySelector("h3")?.textContent || ""
    )
  );

  /* ==========================================
     5. BIENVENIDA DEL CANDIDATO
     ========================================== */

  const welcome = document.createElement("section");

  welcome.className = "panel lnc-section";

  const firstName =
    candidate.name?.split(" ")[0] || "candidato";

  welcome.innerHTML = `
    <h2>Bienvenido, ${C.safe(firstName)}</h2>

    <p>
      Consulta tus oportunidades laborales,
      mantén actualizado tu perfil y da seguimiento
      a tus postulaciones.
    </p>

    <div class="lnc-actions">
      <a class="btn btn-primary"
         href="/doc/empleo/empleos.html">
        Buscar empleos
      </a>

      <a class="btn btn-soft"
         href="/doc/general/perfil.html">
        Actualizar perfil
      </a>

      <a class="btn"
         href="/doc/candidato/postulaciones.html">
        Mis postulaciones
      </a>
    </div>
  `;

  // Presentación después de las notificaciones,
  // manteniendo estadísticas al inicio.
  if (notificationPanel) {
    notificationPanel.after(welcome);
  } else {
    stats.after(welcome);
  }

  /* ==========================================
     6. ACTIVIDAD RECIENTE
     ========================================== */

  const activity = document.createElement("section");

  activity.className = "panel lnc-section";

  activity.innerHTML = `
    <h3 class="lnc-title-icon">
      <img
        src="/img/actividad.svg"
        alt=""
        aria-hidden="true">

      Actividad reciente
    </h3>

    <div id="lnc-latest"></div>
  `;

  if (recommended) {
    recommended.after(activity);
  } else {
    welcome.after(activity);
  }

  const holder = activity.querySelector("#lnc-latest");

  if (!apps.length) {
    holder.innerHTML = `
      <p class="lnc-muted">
        Aún no tienes postulaciones registradas.
        Cuando solicites una vacante aparecerá aquí.
      </p>
    `;

    return;
  }

  const jobs = C.jobs();

  apps.slice(-3).reverse().forEach(id => {
    const job = jobs.find(item => item.id === id);

    const title =
      job?.title ||
      details[id]?.title ||
      "Vacante";

    const company =
      job?.company ||
      details[id]?.company ||
      "Empresa";

    const status =
      details[id]?.status || "Recibida";

    const item = document.createElement("div");

    item.className = "lnc-activity";

    item.innerHTML = `
      <div>
        <strong>${C.safe(title)}</strong>

        <small>
          ${C.safe(company)}
          ·
          ${C.safe(status)}
        </small>
      </div>

      <a class="btn btn-soft btn-sm"
         href="/doc/candidato/postulaciones.html">
        Ver seguimiento
      </a>
    `;

    holder.append(item);
  });
});
