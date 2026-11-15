import { createClient } from "@supabase/supabase-js";
import { HttpError } from "../middleware/errorHandler.js";

function adminClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
        throw new HttpError(503, "No se pudo completar el registro de la empresa.");
    }
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function check(result) {
    if (result.error) throw result.error;
    return result.data;
}

async function findProfile(client, authUserId) {
    return check(await client.from("users")
        .select("id,role_id,status")
        .eq("auth_user_id", authUserId)
        .maybeSingle());
}

async function findCompany(client, userId) {
    return check(await client.from("companies")
        .select("id,commercial_name,verification_status")
        .eq("user_id", userId)
        .maybeSingle());
}

export async function ensureCompanyForAuthUser(authUserIdValue) {
    const authUserId = String(authUserIdValue || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)) {
        throw new HttpError(400, "No se pudo identificar la cuenta empresarial.");
    }

    const client = adminClient();
    const { data: authResult, error: authError } = await client.auth.admin.getUserById(authUserId);
    if (authError) {
        if (authError.status === 404) throw new HttpError(404, "No se encontró la cuenta registrada.");
        throw authError;
    }
    const authUser = authResult?.user;
    const metadata = authUser?.user_metadata || {};
    if (!authUser || metadata.account_type !== "company") {
        throw new HttpError(403, "Esta cuenta no está registrada como empresa.");
    }

    const commercialName = String(metadata.company_name || "").trim();
    const fullName = String(metadata.full_name || "").trim();
    if (commercialName.length < 2 || commercialName.length > 120 || fullName.length < 3) {
        throw new HttpError(400, "Faltan datos para completar el registro empresarial.");
    }

    let profile = await findProfile(client, authUser.id);
    if (profile && profile.role_id !== 2) {
        throw new HttpError(409, "La cuenta ya tiene otro tipo de perfil.");
    }
    if (profile?.status === "suspended") {
        throw new HttpError(403, "La cuenta no está disponible.");
    }

    if (!profile) {
        const role = check(await client.from("roles")
            .select("id")
            .eq("code", "company")
            .single());
        try {
            profile = check(await client.from("users").insert({
                auth_user_id: authUser.id,
                full_name: fullName,
                email: authUser.email,
                role_id: role.id,
                status: "active",
            }).select("id,role_id,status").single());
        } catch (error) {
            // Auth triggers may have created the profile at the same time.
            if (error.code !== "23505") throw error;
            profile = await findProfile(client, authUser.id);
            if (!profile || profile.role_id !== 2) throw error;
        }
    }

    let company = await findCompany(client, profile.id);
    if (!company) {
        const row = {
            user_id: profile.id,
            commercial_name: commercialName,
            public_email: authUser.email,
            public_phone: String(metadata.company_phone || "").slice(0, 30) || null,
            sector: String(metadata.company_sector || "").slice(0, 100) || null,
            city: String(metadata.company_city || "").slice(0, 100) || null,
            verification_status: "pending",
        };
        try {
            company = check(await client.from("companies").insert(row)
                .select("id,commercial_name,verification_status").single());
        } catch (error) {
            // Keep registration idempotent if an Auth trigger inserted the row.
            if (error.code !== "23505") throw error;
            company = await findCompany(client, profile.id);
            if (!company) throw error;
        }
    }

    return { id: company.id, commercial_name: company.commercial_name, verification_status: company.verification_status };
}
