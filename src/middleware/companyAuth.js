import { HttpError } from "./errorHandler.js";

export async function requireCompany(req, res, next) {
    try {
        const { client, user } = req.userContext;
        const { data: account, error: accountError } = await client
            .from("users")
            .select("id,role_id,status")
            .eq("auth_user_id", user.id)
            .maybeSingle();

        if (accountError) throw accountError;
        if (!account || account.role_id !== 2 || account.status !== "active") {
            throw new HttpError(403, "Solo las cuentas empresariales activas pueden acceder.");
        }

        const { data: company, error: companyError } = await client
            .from("companies")
            .select("id,user_id,commercial_name,verification_status")
            .eq("user_id", account.id)
            .maybeSingle();

        if (companyError) throw companyError;
        if (!company) throw new HttpError(404, "No se encontró una empresa asociada a esta cuenta.");

        req.companyContext = {
            client,
            user,
            userId: account.id,
            companyId: company.id,
            company,
        };
        next();
    } catch (error) {
        next(error);
    }
}

export function requireVerifiedCompany(req, res, next) {
    if (req.companyContext?.company?.verification_status !== "verified") {
        next(new HttpError(403, "La empresa debe estar verificada para gestionar vacantes y postulaciones."));
        return;
    }
    next();
}
