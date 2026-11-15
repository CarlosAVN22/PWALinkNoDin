
import { ServiceError } from "./serviceError.js";

async function consultar(peticion) {
  const { data, error } = await peticion;
  if (error) {
    if (error.code === "23505") {
      throw new ServiceError("CONFLICT", "El registro ya existe.");
    }
    throw error;
  }
  return data;
}

function idValido(valor) {
  const texto = String(valor);
  const numero = Number(texto);

  if (!/^[1-9]\d*$/.test(texto) || !Number.isSafeInteger(numero)) {
    throw new ServiceError("BAD_REQUEST", "ID de vacante inválido.");
  }
  return numero;
}

export async function listarVacantes({ client }) {
  const [vacantes, empresas] = await Promise.all([
    consultar(client.from("jobs")
      .select("id,title,company_id,city,modality,application_deadline")
      .eq("status", "active")
      .order("created_at", { ascending: false })),
    consultar(client.from("companies")
      .select("id,commercial_name")
      .eq("verification_status", "verified"))
  ]);

  const nombres = new Map(
    empresas.map(e => [e.id, e.commercial_name])
  );
  const hoy = new Date().toISOString().slice(0, 10);

  return vacantes
    .filter(v =>
      nombres.has(v.company_id) &&
      (!v.application_deadline || v.application_deadline >= hoy)
    )
    .map(v => ({
      ...v,
      company: nombres.get(v.company_id),
      status: "active"
    }));
}

export async function detalleVacante(context, rawId) {
  const jobId = idValido(rawId);
  const vacantes = await listarVacantes(context);
  const job = vacantes.find(v => v.id === jobId);

  if (!job) {
    throw new ServiceError("NOT_FOUND", "La vacante no está disponible.");
  }

  const questions = await consultar(context.client
    .from("job_questions")
    .select("id,question,is_required")
    .eq("job_id", jobId)
    .order("sort_order"));

  return { job, questions };
}

export async function listarGuardados({ client, candidateId }) {
  const guardados = await consultar(client.from("saved_jobs")
    .select("job_id")
    .eq("candidate_id", candidateId));

  if (!guardados.length) return [];

  const ids = guardados.map(g => g.job_id);
  const vacantes = await consultar(client.from("jobs")
    .select("id,title,company_id,city,modality,status")
    .in("id", ids));

  const empresasIds = [...new Set(vacantes.map(v => v.company_id))];
  const empresas = empresasIds.length
    ? await consultar(client.from("companies")
        .select("id,commercial_name")
        .in("id", empresasIds))
    : [];

  const mapaVacantes = new Map(vacantes.map(v => [v.id, v]));
  const mapaEmpresas = new Map(
    empresas.map(e => [e.id, e.commercial_name])
  );

  return guardados.map(g => {
    const v = mapaVacantes.get(g.job_id);

    return {
      id: g.job_id,
      title: v?.title || "Vacante no disponible",
      company: mapaEmpresas.get(v?.company_id) || "Empresa",
      city: v?.city || "",
      modality: v?.modality || "",
      status: v?.status || "unavailable"
    };
  });
}

export async function agregarGuardado(context, rawId) {
  const jobId = idValido(rawId);
  const vacantes = await listarVacantes(context);

  if (!vacantes.some(v => v.id === jobId)) {
    throw new ServiceError("NOT_FOUND", "La vacante no está disponible.");
  }

  await consultar(context.client.from("saved_jobs").insert({
    candidate_id: context.candidateId,
    job_id: jobId
  }));

  return { job_id: jobId };
}

export async function eliminarGuardado(context, rawId) {
  const jobId = idValido(rawId);

  const eliminados = await consultar(context.client
    .from("saved_jobs")
    .delete()
    .eq("candidate_id", context.candidateId)
    .eq("job_id", jobId)
    .select("job_id"));

  return { deleted: eliminados.length > 0 };
}

export async function listarPostulaciones({ client, candidateId }) {
  const solicitudes = await consultar(client.from("applications")
    .select("id,job_id,status,applied_at")
    .eq("candidate_id", candidateId)
    .order("applied_at", { ascending: false }));

  if (!solicitudes.length) return [];

  const vacantes = await consultar(client.from("jobs")
    .select("id,title,company_id")
    .in("id", [...new Set(solicitudes.map(s => s.job_id))]));

  const empresasIds = [...new Set(vacantes.map(v => v.company_id))];
  const empresas = empresasIds.length
    ? await consultar(client.from("companies")
        .select("id,commercial_name")
        .in("id", empresasIds))
    : [];

  const puestos = new Map(vacantes.map(v => [v.id, v]));
  const nombres = new Map(
    empresas.map(e => [e.id, e.commercial_name])
  );

  return solicitudes.map(s => {
    const puesto = puestos.get(s.job_id);

    return {
      ...s,
      title: puesto?.title || "Vacante #" + s.job_id,
      company: nombres.get(puesto?.company_id) || "Empresa"
    };
  });
}

export async function enviarPostulacion(context, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ServiceError("BAD_REQUEST", "Datos de postulación inválidos.");
  }

  const jobId = idValido(body.jobId);

  const previa = await consultar(context.client.from("applications")
    .select("id")
    .eq("candidate_id", context.candidateId)
    .eq("job_id", jobId)
    .maybeSingle());
  if (previa) {
    throw new ServiceError("CONFLICT", "Ya enviaste tu postulación a esta vacante. Puedes consultar su estado desde Mis postulaciones.");
  }

  const carta = body.coverLetter ?? "";
  const respuestas = body.answers ?? [];

  if (typeof carta !== "string" || carta.length > 4000) {
    throw new ServiceError("BAD_REQUEST", "Carta inválida o muy larga.");
  }

  if (!Array.isArray(respuestas) || respuestas.length > 5) {
    throw new ServiceError("BAD_REQUEST", "Respuestas inválidas.");
  }

  const { questions } = await detalleVacante(context, jobId);
  const preguntas = new Map(questions.map(q => [q.id, q]));
  const usadas = new Set();
  const answers = [];

  for (const r of respuestas) {
    if (!r || typeof r !== "object") {
      throw new ServiceError("BAD_REQUEST", "Respuesta inválida.");
    }

    const questionId = idValido(r.job_question_id);

    if (
      !preguntas.has(questionId) ||
      usadas.has(questionId) ||
      typeof r.answer !== "string" ||
      r.answer.length > 1000
    ) {
      throw new ServiceError(
        "BAD_REQUEST", "Una respuesta no es válida."
      );
    }

    usadas.add(questionId);
    answers.push({
      job_question_id: questionId,
      answer: r.answer.trim()
    });
  }

  for (const q of questions) {
    if (q.is_required) {
      const respuesta = answers.find(a => a.job_question_id === q.id);
      if (!respuesta?.answer) {
        throw new ServiceError(
          "BAD_REQUEST", "Completa todas las preguntas obligatorias."
        );
      }
    }
  }

  try {
    await consultar(context.client.rpc("ln26_postular", {
      p_job_id: jobId,
      p_cover_letter: carta.trim() || null,
      p_answers: answers
    }));
  } catch (error) {
    if (error instanceof ServiceError && error.code === "CONFLICT") {
      throw new ServiceError("CONFLICT", "Ya enviaste tu postulación a esta vacante. Puedes consultar su estado desde Mis postulaciones.");
    }
    throw error;
  }

  return { submitted: true };
}

async function ownedCandidateApplication({ client, candidateId }, rawId) {
  const applicationId = idValido(rawId);
  const application = await consultar(client.from("applications")
    .select("id,job_id,candidate_id,status,applied_at")
    .eq("id", applicationId).eq("candidate_id", candidateId).maybeSingle());
  if (!application) throw new ServiceError("NOT_FOUND", "No se encontró esta postulación.");
  const job = await consultar(client.from("jobs")
    .select("id,title,company_id").eq("id", application.job_id).single());
  const company = await consultar(client.from("companies")
    .select("id,user_id,commercial_name").eq("id", job.company_id).single());
  return { application, job, company };
}

export async function listarMensajesPostulacion(context, rawId) {
  const { application } = await ownedCandidateApplication(context, rawId);
  const messages = await consultar(context.client.from("application_messages")
    .select("id,sender_user_id,body,created_at,read_at")
    .eq("application_id", application.id).order("created_at", { ascending: true }));
  const unread = messages.filter(message => message.sender_user_id !== context.candidateId && !message.read_at).map(message => message.id);
  if (unread.length) await context.client.from("application_messages")
    .update({ read_at: new Date().toISOString() }).in("id", unread).eq("application_id", application.id);
  const { company } = await ownedCandidateApplication(context, rawId);
  return messages.map(message => ({ ...message, name: message.sender_user_id === context.candidateId ? "Tú" : company.commercial_name || "Empresa", role: message.sender_user_id === context.candidateId ? "candidato" : "empresa", is_mine: message.sender_user_id === context.candidateId }));
}

export async function enviarMensajePostulacion(context, rawId, input) {
  const { application, job, company } = await ownedCandidateApplication(context, rawId);
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!body || body.length > 4000) throw new ServiceError("BAD_REQUEST", "Escribe un mensaje de hasta 4,000 caracteres.");
  const message = await consultar(context.client.from("application_messages").insert({
    application_id: application.id,
    sender_user_id: context.candidateId,
    body,
  }).select("id,application_id,sender_user_id,body,created_at,read_at").single());
  const notice = await context.client.from("notifications").insert({
    user_id: company.user_id,
    notification_type: "application_message",
    title: "Nuevo mensaje de candidato",
    message: `Nuevo mensaje sobre ${job.title}.`,
    target_url: "/doc/empresa/empresa-candidatos.html",
  });
  if (notice.error) console.warn("No se pudo crear la notificación del mensaje:", notice.error.message);
  return message;
}

export async function historialPostulacionCandidato(context, rawId) {
  const { application } = await ownedCandidateApplication(context, rawId);
  return consultar(context.client.from("application_status_history")
    .select("id,status,note,changed_at")
    .eq("application_id", application.id).order("changed_at", { ascending: true }));
}
