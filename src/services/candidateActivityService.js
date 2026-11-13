
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

  const previa = await consultar(context.client.from("applications")
    .select("id")
    .eq("candidate_id", context.candidateId)
    .eq("job_id", jobId)
    .maybeSingle());

  if (previa) {
    throw new ServiceError(
      "CONFLICT", "Ya te postulaste a esta vacante."
    );
  }

  await consultar(context.client.rpc("ln26_postular", {
    p_job_id: jobId,
    p_cover_letter: carta.trim() || null,
    p_answers: answers
  }));

  return { submitted: true };
}
