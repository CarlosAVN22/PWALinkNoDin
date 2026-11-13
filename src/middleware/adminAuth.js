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

            const { data: profile, error: profileError } = await client
                .from("users")
                .select("id,role_id,status")
                .eq("auth_user_id", authData.user.id)
                .maybeSingle();

            if (profileError) {
                next(profileError);
                return;
            }
            if (!profile || profile.role_id !== 3 || profile.status !== "active") {
                res.status(403).json({ error: "La cuenta no tiene rol administrativo." });
                return;
            }

            const secretKey = process.env.SUPABASE_SECRET_KEY;
            if (!secretKey) {
                res.status(503).json({
                    error: "Configura SUPABASE_SECRET_KEY en el entorno del servidor para la API administrativa.",
                });
                return;
            }

            const adminClient = createClient(supabaseUrl, secretKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            });

            req.adminContext = {
                dataSource: "supabase",
                client,
                adminClient,
                actorUserId: profile.id,
            };
            next();
        } catch (error) {
            next(error);
        }
    };
}
