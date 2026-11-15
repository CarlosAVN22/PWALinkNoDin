
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

  const tipo = respuesta.headers.get("content-type") || "";
  if (!tipo.includes("application/json")) {
    throw new Error(`La API respondió con ${tipo || "un formato inesperado"} (${respuesta.status}). Reinicia npm run dev:api y vuelve a cargar.`);
  }
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
  if (!location.pathname.endsWith("/candidato/postulaciones.html")) return;
  const panel=document.querySelector("main .content .panel");
  if(!panel)return;
  panel.replaceChildren(elemento("h2","Seguimiento de solicitudes"));
  const aviso=elemento("p","Cargando postulaciones...","muted"),lista=elemento("div","","ln-application-list");
  panel.append(aviso,lista);
  try {
    const solicitudes=await api("/applications");aviso.textContent="";
    if(!solicitudes.length){lista.append(elemento("p","Todav\u00eda no has enviado postulaciones.","muted"));return;}
    const estados={received:"Recibida",reviewing:"En revisi\u00f3n",preselected:"Preseleccionada",interview_scheduled:"Entrevista programada",interview_completed:"Entrevista realizada",offer:"Oferta laboral",hired:"Contratada",rejected:"No seleccionada",withdrawn:"Retirada",interview:"Entrevista",selected:"Seleccionada"};
    for(const solicitud of solicitudes){
      const card=elemento("article","","ln-integ-card ln-application-card");
      const head=elemento("div","","ln-application-card-head"),title=elemento("h3",solicitud.title),badge=elemento("span",estados[solicitud.status]||solicitud.status,"ln-application-status");
      const company=elemento("p",solicitud.company||"Empresa","ln-application-company-name");
      const applied=solicitud.applied_at?new Date(solicitud.applied_at).toLocaleDateString("es-SV"):"Sin fecha";
      const meta=elemento("p",`Enviada el ${applied}`,"ln-application-date");
      const top=elemento("div","","ln-application-card-top");top.append(elemento("div","",""));top.firstChild.append(title,company,meta);head.append(top,badge);
      const actions=elemento("div","","ln-application-card-actions");actions.append(enlace("Ver vacante",urlVacante(solicitud.job_id)));
      const followup=elemento("details","","ln-application-followup"),summary=elemento("summary","Ver estado y conversaci\u00f3n"),content=elemento("div","","ln-application-followup-content");
      const history=elemento("section","","ln-application-history"),messages=elemento("section","","ln-application-messages"),feedback=elemento("p","","ln-application-feedback");
      const thread=elemento("div","","ln-application-thread");
      const form=elemento("form","","ln-application-composer"),reply=document.createElement("textarea"),send=elemento("button","Enviar mensaje","btn btn-primary");
      reply.rows=2;reply.maxLength=4000;reply.placeholder="Escribe un mensaje para la empresa";reply.setAttribute("aria-label","Mensaje para la empresa");send.type="submit";form.append(reply,send);
      let loaded=false;
      const refresh=async()=>{
        feedback.textContent="";
        try{
          const [events,conversation]=await Promise.all([api(`/applications/${solicitud.id}/history`),api(`/applications/${solicitud.id}/messages`)]);
          history.replaceChildren(elemento("h4","Etapas del proceso"));
          if(!events.length)history.append(elemento("p","A\u00fan no hay cambios de etapa."));
          for(const event of events){const item=elemento("div","","ln-application-history-item");item.append(elemento("strong",estados[event.status]||event.status),elemento("time",event.changed_at?new Date(event.changed_at).toLocaleString("es-SV"):""));if(event.note)item.append(elemento("p",event.note));history.append(item);}
          messages.replaceChildren(elemento("h4","Mensajes"));thread.replaceChildren();
          if(!conversation.length)thread.append(elemento("p","Todav\u00eda no hay mensajes. Puedes escribirle a la empresa aqu\u00ed.","ln-application-empty"));
          for(const message of conversation){const bubble=elemento("article","",`ln-application-message${message.is_mine?" is-mine":""}`);bubble.append(elemento("strong",message.is_mine?"T\u00fa":message.name||"Empresa"),elemento("p",message.body),elemento("time",new Date(message.created_at).toLocaleString("es-SV")));thread.append(bubble);}
          messages.append(thread);loaded=true;
        }catch(error){feedback.textContent=error.message||"No se pudo cargar el seguimiento.";}
      };
      followup.addEventListener("toggle",()=>{if(followup.open&&!loaded)refresh();});
      form.addEventListener("submit",async event=>{event.preventDefault();if(!reply.value.trim())return;send.disabled=true;feedback.textContent="";try{await api(`/applications/${solicitud.id}/messages`,"POST",{body:reply.value});reply.value="";await refresh();}catch(error){feedback.textContent=error.message||"No se pudo enviar el mensaje.";}finally{send.disabled=false;}});
      content.append(history,messages,form,feedback);followup.append(summary,content);
      card.append(head,actions,followup);lista.append(card);
    }
  }catch(error){aviso.textContent="No se pudieron cargar las postulaciones: "+error.message;}
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
    const applications = await api("/applications");
    const previousApplication = applications.find(application => Number(application.job_id) === id);
    if (previousApplication) {
      const notice = elemento("section", "", "ln-application-already-applied");
      notice.setAttribute("role", "status");
      notice.append(
        elemento("span", "POSTULACIÓN REGISTRADA", "ln-application-eyebrow"),
        elemento("h1", "Ya te postulaste a esta vacante", "ln-application-title"),
        elemento("p", "No necesitas volver a completar las preguntas. Tu solicitud ya fue enviada y puedes consultar su estado o conversar con la empresa desde Mis postulaciones.", "ln-application-help")
      );
      const actions = elemento("div", "", "ln-application-actions");
      const tracking = enlace("Ver mis postulaciones", "/doc/candidato/postulaciones.html");
      const job = enlace("Volver a la vacante", `/doc/empleo/detalle-empleo.html?id=${id}`);
      job.classList.remove("btn-primary");
      actions.append(tracking, job);
      notice.append(actions);
      if (previousApplication.applied_at) {
        notice.append(elemento("small", `Enviada el ${new Date(previousApplication.applied_at).toLocaleDateString("es-SV")}`, "ln-application-help"));
      }
      caja.replaceChildren(notice);
      return;
    }

    const { job, questions } = await api(`/jobs/${id}`);

    const titulo = elemento(
      "h1",
      "Postularse a " + job.title,
      "page-title ln-application-title"
    );

    const empresa = elemento(
      "p",
      job.company + " · " + (job.city || "El Salvador"),
      "muted ln-application-company"
    );

    const formulario = elemento("form", "", "ln-application-form");
    formulario.setAttribute("aria-label", "Formulario de postulación");
    const cartaGroup=elemento("div","","ln-application-letter");
    const cartaLabel=elemento("label","Carta de presentación");
    cartaLabel.htmlFor="ln-application-letter";
    cartaLabel.append(elemento("span","Opcional","ln-application-optional"));
    const carta=elemento("textarea");
    carta.id="ln-application-letter";
    carta.name="coverLetter";
    carta.rows=5;
    carta.maxLength=4000;
    carta.placeholder="Cuéntale a la empresa por qué te interesa esta vacante.";
    cartaGroup.append(cartaLabel,carta,elemento("small","Máximo 4,000 caracteres.","ln-application-help"));
    formulario.append(cartaGroup);

    const respuestas = [];
    if(questions.length){
      const questionSection=elemento("section","","ln-application-questions");
      questionSection.append(elemento("h2","Preguntas de la empresa"),elemento("p","Responde cada pregunta para completar tu postulación.","ln-application-help"));
      questions.forEach((pregunta,index)=>{
        const group=elemento("div","","ln-application-question");
        const textarea=elemento("textarea");
        textarea.id=`ln-application-answer-${pregunta.id}`;
        textarea.name=`answer-${pregunta.id}`;
        textarea.rows=4;
        textarea.maxLength=1000;
        textarea.required=pregunta.is_required;
        textarea.placeholder="Escribe tu respuesta";
        const label=elemento("label",pregunta.question);
        label.htmlFor=textarea.id;
        if(pregunta.is_required)label.append(elemento("span","Obligatoria","ln-application-required"));
        group.append(elemento("span",`Pregunta ${index+1}`,"ln-application-question-number"),label,textarea);
        questionSection.append(group);
        respuestas.push({job_question_id:pregunta.id,input:textarea});
      });
      formulario.append(questionSection);
    }

    const enviar = elemento(
      "button",
      "Enviar postulación",
      "btn btn-primary"
    );
    enviar.type = "submit";

    const aviso = elemento("p", "", "ld-status");
    aviso.setAttribute("role", "status");

    const acciones=elemento("div","","ln-application-actions");
    acciones.append(enviar,aviso);
    formulario.append(acciones);
    caja.replaceChildren(
      elemento("p","SOLICITUD DE EMPLEO","ln-application-eyebrow"),
      titulo,
      empresa,
      formulario
    );

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
