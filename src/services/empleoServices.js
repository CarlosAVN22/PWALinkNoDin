import { createClient } from "@supabase/supabase-js";
import { HttpError } from "../middleware/errorHandler.js";

function check(result) {
    if (result.error) throw result.error;
    return result.data;
}

function publicClient() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
        throw new HttpError(503, "Falta la configuración de Supabase.");
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
}

function validId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "Identificador inválido.");
    return id;
}

async function account(context) {
    const user = check(await context.client.from("users")
        .select("id,role_id,status").eq("auth_user_id", context.user.id).single());
    if (user.status !== "active") throw new HttpError(403, "Cuenta no activa.");
    return user;
}

async function candidate(context) {
    const user = await account(context);
    if (user.role_id !== 1) throw new HttpError(403, "Se requiere una cuenta de candidato.");
    const profiles = check(await context.client.from("candidate_profiles")
        .select("user_id").eq("user_id", user.id));
    if (!profiles.length) {
        check(await context.client.from("candidate_profiles").insert({ user_id: user.id }));
    }
    return user;
}

async function company(context) {
    const user = await account(context);
    if (user.role_id !== 2) throw new HttpError(403, "Se requiere una cuenta empresarial.");
    const companies = check(await context.client.from("companies")
        .select("id,verification_status").eq("user_id", user.id));
    const verified = companies.find(item => item.verification_status === "verified");
    if (!verified) throw new HttpError(403, "La empresa debe estar verificada.");
    return { userId: user.id, companyId: verified.id };
}

export async function getJobs(context) {
    const client = context?.client || publicClient();
    const [jobsResult, companiesResult] = await Promise.all([
        client.from("jobs").select("*").eq("status", "active")
            .order("created_at", { ascending: false }),
        client.from("companies").select("id,commercial_name,city,verification_status"),
    ]);
    const jobs = check(jobsResult);
    const companies = check(companiesResult);
    const verified = new Map(companies
        .filter(item => item.verification_status === "verified")
        .map(item => [item.id, item.commercial_name]));
    const today = new Date().toISOString().slice(0, 10);
    return jobs.filter(job => verified.has(job.company_id) &&
        (!job.application_deadline || job.application_deadline >= today))
        .map(job => ({ ...job, company: verified.get(job.company_id) }));
}

export async function getCompanyDetail(context, value) {
    const client = context?.client || publicClient();
    return check(await client.from("companies")
        .select("description,logo_storage_key").eq("id", validId(value)).limit(1));
}

export async function getSavedJobs(context) {
    const user = await candidate(context);
    return check(await context.client.from("saved_jobs")
        .select("job_id").eq("candidate_id", user.id));
}

export async function saveJob(context, value) {
    const user = await candidate(context);
    const jobId = validId(value);
    const result = await context.client.from("saved_jobs")
        .insert({ candidate_id: user.id, job_id: jobId });
    if (result.error && result.error.code !== "23505") throw result.error;
    return { job_id: jobId, saved: true };
}

export async function removeSavedJob(context, value) {
    const user = await candidate(context);
    const jobId = validId(value);
    check(await context.client.from("saved_jobs").delete()
        .eq("candidate_id", user.id).eq("job_id", jobId));
    return { job_id: jobId, saved: false };
}

export async function getCompanyJobs(context) {
    const owned = await company(context);
    return check(await context.client.from("jobs")
        .select("id,title,city,status").eq("company_id", owned.companyId)
        .order("created_at", { ascending: false }).limit(10));
}

export async function publishJob(context, values) {
    const owned = await company(context);
    const payload = { ...(values?.job || {}) };
    const questions = values?.questions || [];
    if (!Array.isArray(questions) || questions.length > 5 ||
        !questions.every(question => typeof question === "string")) {
        throw new HttpError(400, "Las preguntas no son válidas.");
    }
    if (typeof payload.title !== "string" || payload.title.trim().length < 3 ||
        !payload.city || !payload.summary || !payload.requirements) {
        throw new HttpError(400, "Completa los campos principales de la vacante.");
    }
    payload.company_id = owned.companyId;
    payload.created_by = owned.userId;
    payload.status = "active";
    payload.published_at = new Date().toISOString();
    return check(await context.client.rpc("ln26_publicar_vacante", {
        p_job: payload,
        p_questions: questions.map(question => question.trim()).filter(Boolean),
    }));
}
