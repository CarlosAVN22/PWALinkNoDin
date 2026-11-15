import { HttpError } from "../middleware/errorHandler.js";

const profileFields = [
    "commercial_name", "legal_name", "sector", "employee_range", "founded_year",
    "department", "city", "address", "public_email", "public_phone", "website",
    "linkedin_url", "description", "culture", "logo_storage_key",
];
const profileColumns = [
    "id", ...profileFields, "verification_status", "created_at", "updated_at",
];
const applicationStatuses = new Set([
    "received", "reviewing", "preselected", "interview_scheduled", "interview_completed",
    "offer", "hired", "rejected", "withdrawn",
]);
const applicationStatusLabels = {
    received: "Recibida", reviewing: "En revisión", preselected: "Preseleccionado",
    interview_scheduled: "Entrevista programada", interview_completed: "Entrevista realizada",
    offer: "Oferta laboral", hired: "Contratado", rejected: "Rechazado", withdrawn: "Retirado",
};
const vacancyStatuses = new Set(["active", "closed"]);

function unwrap(result) {
    if (result.error) throw result.error;
    return result.data;
}

function validId(value, label) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, `${label} no válido.`);
    return id;
}

function applicationStatus(value) {
    if (!applicationStatuses.has(value)) {
        throw new HttpError(400, "El estado de postulación no es válido.");
    }
    return value;
}

async function ownedVacancyIds(context) {
    const jobs = unwrap(await context.client.from("jobs")
        .select("id,title,company_id")
        .eq("company_id", context.companyId)
        .order("created_at", { ascending: false }));
    return jobs;
}

async function ownedApplication(context, value) {
    const applicationId = validId(value, "El identificador de postulación");
    const jobs = await ownedVacancyIds(context);
    if (!jobs.length) throw new HttpError(404, "No se encontró la postulación.");
    const application = unwrap(await context.client.from("applications")
        .select("id,job_id,status,applied_at,candidate_id,cover_letter")
        .eq("id", applicationId)
        .in("job_id", jobs.map(job => job.id))
        .maybeSingle());
    if (!application) throw new HttpError(404, "No se encontró la postulación.");
    const job = jobs.find(item => item.id === application.job_id);
    return { application: { ...application, title: job?.title || `Vacante ${application.job_id}` }, jobs };
}

async function applicantDirectory(context) {
    const result = await context.client.rpc("ln_applicant_directory");
    // Older database deployments may not expose this optional directory RPC.
    if (result.error) return [];
    return result.data || [];
}

export async function getProfile(context) {
    const company = unwrap(await context.client.from("companies")
        .select(profileColumns.join(","))
        .eq("id", context.companyId)
        .single());
    return company;
}

export async function updateProfile(context, input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new HttpError(400, "Envía los datos del perfil empresarial.");
    }
    const values = {};
    for (const field of profileFields) {
        if (!Object.hasOwn(input, field)) continue;
        const value = input[field];
        if (field === "logo_storage_key" && value !== null) {
            const ownerPrefix = `${context.user.id}/`;
            const filename = typeof value === "string" && value.startsWith(ownerPrefix)
                ? value.slice(ownerPrefix.length)
                : "";
            if (!/^[0-9a-f-]{36}\.(png|jpe?g|webp)$/i.test(filename)) {
                throw new HttpError(400, "La ruta del logo no pertenece a esta cuenta o no es válida.");
            }
        }
        if (field === "founded_year") {
            if (value !== null && (!Number.isInteger(value) || value < 1800 || value > new Date().getFullYear())) {
                throw new HttpError(400, "El año de fundación no es válido.");
            }
            values[field] = value;
            continue;
        }
        if (value !== null && typeof value !== "string") {
            throw new HttpError(400, `El campo ${field} debe ser texto.`);
        }
        if (typeof value === "string" && value.length > (field === "description" || field === "culture" ? 5000 : 500)) {
            throw new HttpError(400, `El campo ${field} excede la longitud permitida.`);
        }
        values[field] = value;
    }
    if (!Object.keys(values).length) throw new HttpError(400, "No hay campos de perfil válidos para actualizar.");
    if (typeof values.commercial_name === "string" && values.commercial_name.trim().length < 2) {
        throw new HttpError(400, "El nombre comercial debe tener al menos dos caracteres.");
    }
    values.updated_at = new Date().toISOString();
    return unwrap(await context.client.from("companies")
        .update(values)
        .eq("id", context.companyId)
        .select(profileColumns.join(","))
        .single());
}

export async function getVacancies(context) {
    const jobs = unwrap(await context.client.from("jobs")
        .select("*")
        .eq("company_id", context.companyId)
        .order("created_at", { ascending: false }));
    if (!jobs.length) return [];
    const questions = unwrap(await context.client.from("job_questions")
        .select("job_id,question,sort_order").in("job_id", jobs.map(job => job.id)).order("sort_order"));
    const byJob = new Map(jobs.map(job => [job.id, []]));
    for (const row of questions) byJob.get(row.job_id)?.push(row.question);
    return jobs.map(job => ({ ...job, questions: byJob.get(job.id) || [] }));
}

export async function publishVacancy(context, values) {
    const payload = { ...(values?.job || {}) };
    const questions = values?.questions || [];
    if (!Array.isArray(questions) || questions.length > 5 ||
        !questions.every(question => typeof question === "string")) {
        throw new HttpError(400, "Las preguntas no son válidas; se permiten hasta cinco.");
    }
    if (typeof payload.title !== "string" || payload.title.trim().length < 3 ||
        typeof payload.city !== "string" || !payload.city.trim() ||
        typeof payload.summary !== "string" || !payload.summary.trim() ||
        typeof payload.requirements !== "string" || !payload.requirements.trim()) {
        throw new HttpError(400, "Completa el título, ciudad, descripción y requisitos de la vacante.");
    }
    if (payload.salary_min != null && payload.salary_max != null && Number(payload.salary_min) > Number(payload.salary_max)) {
        throw new HttpError(400, "El salario mínimo no debe superar al máximo.");
    }

    payload.company_id = context.companyId;
    payload.created_by = context.userId;
    payload.status = "active";
    payload.published_at = new Date().toISOString();
    return unwrap(await context.client.rpc("ln26_publicar_vacante", {
        p_job: payload,
        p_questions: questions.map(question => question.trim()).filter(Boolean),
    }));
}

export async function getVacancy(context, value) {
    const vacancyId = validId(value, "El identificador de vacante");
    const job = unwrap(await context.client.from("jobs").select("*")
        .eq("id", vacancyId).eq("company_id", context.companyId).maybeSingle());
    if (!job) throw new HttpError(404, "No se encontró la vacante de esta empresa.");
    const questions = unwrap(await context.client.from("job_questions")
        .select("question,is_required,sort_order").eq("job_id", vacancyId).order("sort_order"));
    return { ...job, questions: questions.map(item => item.question) };
}

export async function updateVacancy(context, value, values) {
    const vacancyId = validId(value, "El identificador de vacante");
    const payload = { ...(values?.job || {}) };
    const questions = values?.questions || [];
    if (!Array.isArray(questions) || questions.length > 5 ||
        !questions.every(question => typeof question === "string")) {
        throw new HttpError(400, "Las preguntas no son válidas; se permiten hasta cinco.");
    }
    if (typeof payload.title !== "string" || payload.title.trim().length < 3 ||
        typeof payload.city !== "string" || !payload.city.trim() ||
        typeof payload.summary !== "string" || !payload.summary.trim() ||
        typeof payload.requirements !== "string" || !payload.requirements.trim()) {
        throw new HttpError(400, "Completa el título, ciudad, descripción y requisitos de la vacante.");
    }
    if (payload.salary_min != null && payload.salary_max != null && Number(payload.salary_min) > Number(payload.salary_max)) {
        throw new HttpError(400, "El salario mínimo no debe superar al máximo.");
    }
    const allowed = [
        "title", "openings", "contract_type", "modality", "experience_level", "education_required",
        "work_time", "schedule", "work_days_hours", "area", "summary", "responsibilities",
        "license_requirement", "vehicle_requirement", "competencies", "requirements", "benefits",
        "salary_min", "salary_max", "salary_period", "salary_confidential", "application_deadline",
        "department", "city", "address", "reference_point", "latitude", "longitude",
        "approximate_location_only", "contact_email", "application_method", "application_instructions",
    ];
    const updates = Object.fromEntries(allowed.filter(key => Object.hasOwn(payload, key)).map(key => [key, payload[key]]));
    updates.updated_at = new Date().toISOString();
    const job = unwrap(await context.client.from("jobs").update(updates)
        .eq("id", vacancyId).eq("company_id", context.companyId).select("id").maybeSingle());
    if (!job) throw new HttpError(404, "No se encontró la vacante de esta empresa.");

    unwrap(await context.client.from("job_questions").delete().eq("job_id", vacancyId));
    const cleanQuestions = questions.map(question => question.trim()).filter(Boolean);
    if (cleanQuestions.length) {
        unwrap(await context.client.from("job_questions").insert(cleanQuestions.map((question, index) => ({
            job_id: vacancyId, question, is_required: true, sort_order: index,
        }))));
    }
    return { id: vacancyId, updated: true };
}

export async function updateVacancyStatus(context, value, status) {
    const vacancyId = validId(value, "El identificador de vacante");
    if (!vacancyStatuses.has(status)) throw new HttpError(400, "El estado de vacante debe ser active o closed.");
    const result = unwrap(await context.client.from("jobs")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", vacancyId)
        .eq("company_id", context.companyId)
        .select("id,title,city,status")
        .maybeSingle());
    if (!result) throw new HttpError(404, "No se encontró la vacante de esta empresa.");
    return result;
}

export async function getApplications(context) {
    const jobs = await ownedVacancyIds(context);
    if (!jobs.length) return [];
    const applications = unwrap(await context.client.from("applications")
        .select("id,job_id,status,applied_at,candidate_id,cover_letter")
        .in("job_id", jobs.map(job => job.id))
        .order("applied_at", { ascending: false }));
    const names = new Map(jobs.map(job => [job.id, job.title]));
    const people = new Map((await applicantDirectory(context)).map(person => [person.application_id, person]));
    const profilesResult = await context.client.from("candidate_profiles")
        .select("user_id,location,education_summary,experience_years,professional_summary")
        .in("user_id", [...new Set(applications.map(application => application.candidate_id))]);
    const profiles = profilesResult.error ? [] : profilesResult.data || [];
    const profileById = new Map(profiles.map(profile => [profile.user_id, profile]));
    return applications.map(application => {
        const person = people.get(application.id);
        const profile = profileById.get(application.candidate_id) || {};
        return {
            ...application,
            job_title: names.get(application.job_id) || `Vacante ${application.job_id}`,
            candidate_name: person?.candidate_name || `Candidato #${application.candidate_id}`,
            candidate_email: person?.candidate_email || null,
            occupation: person?.occupation || null,
            location: profile.location || null,
            education_summary: profile.education_summary || null,
            experience_years: profile.experience_years ?? null,
            professional_summary: profile.professional_summary || null,
            has_cv: Boolean(person?.cv_storage_key),
        };
    });
}

export async function getApplication(context, value) {
    const { application, jobs } = await ownedApplication(context, value);
    const person = (await applicantDirectory(context)).find(item => item.application_id === application.id);
    if (!person) throw new HttpError(404, "No tienes permiso para consultar el perfil de esta postulación.");
    const profileResult = await context.client.from("candidate_profiles")
        .select("phone,location,occupation,education_summary,experience_years,professional_summary")
        .eq("user_id", application.candidate_id).maybeSingle();
    const profile = profileResult.error ? {} : profileResult.data || {};
    return {
        ...application,
        job_title: jobs.find(job => job.id === application.job_id)?.title || `Vacante ${application.job_id}`,
        candidate_name: person.candidate_name,
        candidate_email: person.candidate_email,
        occupation: person.occupation || profile.occupation || null,
        ...profile,
        has_cv: Boolean(person.cv_storage_key),
    };
}

export async function getApplicationAnswers(context, value) {
    const { application } = await ownedApplication(context, value);
    return unwrap(await context.client.rpc("ln26_respuestas_postulacion", {
        p_application_id: application.id,
    }));
}

export async function getApplicationCv(context, value) {
    const { application } = await ownedApplication(context, value);
    const person = (await applicantDirectory(context)).find(item => item.application_id === application.id);
    if (!person?.cv_storage_key) throw new HttpError(404, "Esta postulación no tiene un CV disponible.");
    const result = unwrap(await context.client.storage.from("candidate-cvs")
        .createSignedUrl(person.cv_storage_key, 300));
    return { signedUrl: result.signedUrl };
}

export async function getApplicationHistory(context, value) {
    const { application } = await ownedApplication(context, value);
    return unwrap(await context.client.from("application_status_history")
        .select("id,status,note,changed_at,changed_by")
        .eq("application_id", application.id).order("changed_at", { ascending: true }));
}

export async function getApplicationNotes(context, value) {
    const { application } = await ownedApplication(context, value);
    return unwrap(await context.client.from("application_internal_notes")
        .select("note,rating,updated_at")
        .eq("application_id", application.id).maybeSingle()) || { note: "", rating: null };
}

export async function saveApplicationNotes(context, value, input) {
    const { application } = await ownedApplication(context, value);
    const note = typeof input?.note === "string" ? input.note.trim() : "";
    const rating = input?.rating == null || input.rating === "" ? null : Number(input.rating);
    if (note.length > 5000) throw new HttpError(400, "La nota no puede superar los 5,000 caracteres.");
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
        throw new HttpError(400, "La valoración debe estar entre una y cinco estrellas.");
    }
    return unwrap(await context.client.from("application_internal_notes").upsert({
        application_id: application.id,
        company_id: context.companyId,
        note,
        rating,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
    }, { onConflict: "application_id" }).select("application_id,note,rating,updated_at").single());
}

export async function getApplicationMessages(context, value) {
    const { application } = await ownedApplication(context, value);
    const rows = unwrap(await context.client.from("application_messages")
        .select("id,sender_user_id,body,created_at,read_at")
        .eq("application_id", application.id).order("created_at", { ascending: true }));
    const incoming = rows.filter(message => message.sender_user_id !== context.userId && !message.read_at).map(message => message.id);
    if (incoming.length) await context.client.from("application_messages")
        .update({ read_at: new Date().toISOString() }).in("id", incoming).eq("application_id", application.id);
    const person = (await applicantDirectory(context)).find(item => item.application_id === application.id);
    return rows.map(message => ({ ...message, name: message.sender_user_id === context.userId ? context.company.commercial_name : person?.candidate_name || "Candidato", role: message.sender_user_id === context.userId ? "empresa" : "candidato", is_mine: message.sender_user_id === context.userId }));
}

export async function sendApplicationMessage(context, value, input) {
    const { application } = await ownedApplication(context, value);
    const body = typeof input?.body === "string" ? input.body.trim() : "";
    if (!body || body.length > 4000) throw new HttpError(400, "Escribe un mensaje de hasta 4,000 caracteres.");
    const message = unwrap(await context.client.from("application_messages").insert({
        application_id: application.id,
        sender_user_id: context.userId,
        body,
    }).select("id,application_id,sender_user_id,body,created_at,read_at").single());
    const recipientId = application.candidate_id;
    const title = "Nuevo mensaje de empresa";
    const notice = await context.client.from("notifications").insert({
        user_id: recipientId,
        notification_type: "application_message",
        title,
        message: `Nuevo mensaje sobre ${application.title || "tu postulación"}.`,
        target_url: "/doc/candidato/postulaciones.html",
    });
    if (notice.error) console.warn("No se pudo crear la notificación del mensaje:", notice.error.message);
    return message;
}

export async function updateApplicationStatus(context, value, status) {
    const { application } = await ownedApplication(context, value);
    const nextStatus = applicationStatus(status);
    if (application.status === nextStatus) return application;
    const updated = unwrap(await context.client.from("applications")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", application.id)
        .select("id,status,updated_at")
        .single());
    try {
        unwrap(await context.client.from("application_status_history").insert({
            application_id: application.id,
            changed_by: context.userId,
            status: nextStatus,
            note: null,
        }));
    } catch (error) {
        // Do not leave the visible stage out of sync with its audit trail.
        await context.client.from("applications").update({ status: application.status })
            .eq("id", application.id).eq("job_id", application.job_id);
        throw error;
    }
    const notice = await context.client.from("notifications").insert({
        user_id: application.candidate_id,
        notification_type: "application_status",
        title: "Actualización de tu postulación",
        message: `Tu postulación para ${application.title || "la vacante"} ahora está en etapa: ${applicationStatusLabels[nextStatus]}.`,
        target_url: "/doc/candidato/postulaciones.html",
    });
    if (notice.error) console.warn("No se pudo crear la notificación del cambio de estado:", notice.error.message);
    return updated;
}
