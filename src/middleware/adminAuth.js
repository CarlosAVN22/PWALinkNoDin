import { createClient } from "@supabase/supabase-js";

function readBearerToken(req) {
    const match = /^Bearer\s+(.+)$/i.exec(req.get("authorization") || "");
    return match ? match[1] : null;
}

export function createAdminAuth() {
    const supabaseUrl            = process.env.SUPABASE_URL;
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
        throw new Error("Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY.");
    }

    return async function requireAdmin(req, res, next) {
        const token = readBearerToken(req);
        if (!token) {
            res.status(401).json({ error: "Se requiere un token Bearer." });
            return;
        }

        try {
            const client = createClient(supabaseUrl, supabasePublishableKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
                global: {
                    headers: { Authorization: `Bearer ${token}` },
                },
            });
            const { data: authData, error: authError } = await client.auth.getUser(token);

            if (authError) {
                if (authError.status === 401 || authError.status === 403) {
                    res.status(401).json({ error: "La sesion de Supabase no es valida." });
                    return;
                }
                next(authError);
                return;
            }
            if (!authData.user) {
                res.status(401).json({ error: "La sesion de Supabase no es valida." });
                return;
            }

            const { data: role, error: roleError } = await client.rpc("linknodin_role");
            if (roleError) {
                next(roleError);
                return;
            }
            if (role !== "admin") {
                res.status(403).json({ error: "La cuenta no tiene rol administrativo." });
                return;
            }

            req.adminContext = { dataSource: "supabase", client };
            next();
        } catch (error) {
            next(error);
        }
    };
}
