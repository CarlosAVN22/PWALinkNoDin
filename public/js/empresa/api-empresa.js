import { supabase } from "/js/supabase-config.js";

const base = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? `${location.protocol}//${location.hostname}:3001/api/v1/company`
    : `${location.origin}/api/v1/company`;

export async function companyRequest(path, method = "GET", body) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const headers = { Accept: "application/json" };
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    const options = { method, headers };
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const response = await fetch(base + path, options);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error(`La API respondió con ${contentType || "un formato inesperado"} (${response.status}). Reinicia npm run dev:api y vuelve a cargar la página.`);
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo completar la solicitud.");
    return result.data;
}
