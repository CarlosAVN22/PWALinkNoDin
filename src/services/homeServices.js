import { createClient } from "@supabase/supabase-js";
import { HttpError } from "../middleware/errorHandler.js";

function check(result) {
    if (result.error) {
        throw result.error;
    }

    return result.data;
}

export async function getHome() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        throw new HttpError(503, "La conexión con Supabase no está configurada.");
    }

    const client = createClient(url, key);

    const [companiesResult, jobsResult, reviewsResult] = await Promise.all([
        client
            .from("companies")
            .select("id,commercial_name,sector,city,verification_status,logo_storage_key")
            .eq("verification_status", "verified")
            .order("commercial_name"),
        client
            .from("jobs")
            .select("id,title,company_id,city,modality,salary_min,salary_max,status,application_deadline,created_at")
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(40),
        client
            .from("company_reviews")
            .select("company_id,display_name,comment,rating,created_at")
            .eq("status", "visible")
            .order("created_at", { ascending: false })
            .limit(8)
    ]);

    return {
        companies: check(companiesResult),
        jobs: check(jobsResult),
        reviews: reviewsResult.error ? [] : reviewsResult.data
    };
}
