import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./errorHandler.js";

function readBearerToken(req) {
    const match = /^Bearer\s+(.+)$/i.exec(req.get("authorization") || "");
    return match ? match[1] : null;
}

export function createUserAuth({
    supabaseUrl = process.env.SUPABASE_URL,
    supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY,
    supabaseClientFactory = (url, key, options) => createClient(url, key, options),
} = {}) {
    return async function requireUser(req, res, next) {
        const token = readBearerToken(req);
        if (!token) {
            res.status(401).json({ error: "Se requiere un token Bearer." });
            return;
        }

        if (!supabaseUrl || !supabasePublishableKey) {
            next(new HttpError(503, "Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY."));
            return;
        }

        try {
            const client = supabaseClientFactory(supabaseUrl, supabasePublishableKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
                global: {
                    headers: { Authorization: `Bearer ${token}` },
                },
            });
            const { data, error } = await client.auth.getUser(token);
            if (error) {
                if (error.status === 401 || error.status === 403) {
                    res.status(401).json({ error: "La sesion de Supabase no es valida." });
                    return;
                }
                next(error);
                return;
            }
            if (!data.user) {
                res.status(401).json({ error: "La sesion de Supabase no es valida." });
                return;
            }

            req.userContext = { client, user: data.user };
            next();
        } catch (error) {
            next(error);
        }
    };
}
