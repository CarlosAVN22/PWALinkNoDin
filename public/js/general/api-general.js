import { supabase } from "/js/supabase-config.js";

const baseUrl = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? `${location.protocol}//${location.hostname}:3001/api/v1/general`
    : `${location.origin}/api/v1/general`;

export async function generalRequest(path, method = "GET", body) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        throw error;
    }

    const headers = { Accept: "application/json" };
    const token = data.session?.access_token;

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const response = await fetch(baseUrl + path, options);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "No se pudo completar la solicitud.");
    }

    return result.data;
}
