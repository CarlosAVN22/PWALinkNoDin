import { supabase } from "/js/supabase-config.js";

const configuredApiUrl = document.querySelector('meta[name="lnd-api-base-url"]')?.content.trim();
const defaultApiUrl = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? `${location.protocol}//${location.hostname}:3001/api/v1`
    : `${location.origin}/api/v1`;
const apiBaseUrl = (configuredApiUrl || defaultApiUrl).replace(/\/+$/, "");

export async function adminRequest(path, { method = "GET", body } = {}) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const accessToken = data.session?.access_token;
    if (!accessToken) {
        throw new Error("Inicia sesión con una cuenta administradora de LND.");
    }

    const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
    };
    const options = { method, headers };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(`${apiBaseUrl}/admin${path}`, options);
    } catch {
        throw new Error("No se pudo conectar al API de Node. Confirma que está iniciado y disponible.");
    }
    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("El API devolvió una respuesta que no es JSON.");
    }

    if (!response.ok) {
        throw new Error(result.error || `La solicitud falló (HTTP ${response.status}).`);
    }

    return result.data;
}
