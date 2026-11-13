import { createClient } from "@supabase/supabase-js";
import { HttpError } from "../middleware/errorHandler.js";

function publicClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        throw new HttpError(503, "La conexión con Supabase no está configurada.");
    }

    return createClient(url, key);
}

function unwrap(result) {
    if (result.error) {
        throw result.error;
    }

    return result.data;
}

async function candidateAccount(context) {
    const account = unwrap(await context.client
        .from("users")
        .select("id,email,role_id,status")
        .eq("auth_user_id", context.user.id)
        .single());

    if (!account || account.role_id !== 1 || account.status !== "active") {
        throw new HttpError(403, "Solo los candidatos activos pueden valorar empresas.");
    }

    return account;
}

export async function getVerifiedCompanies() {
    return unwrap(await publicClient()
        .from("companies")
        .select("id,commercial_name,verification_status")
        .eq("verification_status", "verified"));
}

export async function getReviews() {
    return unwrap(await publicClient()
        .from("company_reviews")
        .select("id,company_id,user_id,display_name,rating,comment,created_at,status")
        .eq("status", "visible")
        .order("created_at", { ascending: false }));
}

export async function createReview(context, values) {
    const account = await candidateAccount(context);
    const companyId = Number(values?.company_id);
    const rating = Number(values?.rating);
    const comment = typeof values?.comment === "string" ? values.comment.trim() : "";

    if (!Number.isSafeInteger(companyId) || companyId < 1) {
        throw new HttpError(400, "Selecciona una empresa válida.");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new HttpError(400, "Selecciona una calificación de 1 a 5.");
    }
    if (comment.length < 15 || comment.length > 1200) {
        throw new HttpError(400, "El comentario debe tener entre 15 y 1200 caracteres.");
    }

    const company = unwrap(await context.client
        .from("companies")
        .select("id")
        .eq("id", companyId)
        .eq("verification_status", "verified")
        .maybeSingle());

    if (!company) {
        throw new HttpError(400, "Selecciona una empresa verificada.");
    }

    return unwrap(await context.client
        .from("company_reviews")
        .insert({
            user_id: account.id,
            company_id: companyId,
            display_name: String(account.email || context.user.email || "Candidato").slice(0, 100),
            rating,
            comment,
            status: "visible",
        })
        .select("id,company_id,user_id,display_name,rating,comment,created_at,status")
        .single());
}

export async function deleteReview(context, reviewValue) {
    const account = await candidateAccount(context);
    const reviewId = Number(reviewValue);

    if (!Number.isSafeInteger(reviewId) || reviewId < 1) {
        throw new HttpError(400, "La valoración no es válida.");
    }

    const deleted = unwrap(await context.client
        .from("company_reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", account.id)
        .select("id")
        .maybeSingle());

    if (!deleted) {
        throw new HttpError(404, "No se encontró una valoración propia para eliminar.");
    }

    return deleted;
}
