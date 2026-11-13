import { ServiceError } from "./serviceError.js";

const companyFields        = "id, commercial_name, sector, public_email, city, verification_status, created_at";
const verificationStatuses = new Set(["pending", "verified", "rejected"]);

export async function listAdminCompanies(adminContext) {
    const { data, error } = await adminContext.client
        .from("companies")
        .select(companyFields)
        .order("created_at", { ascending: false });

    if (error) throw error;
    if (!Array.isArray(data)) {
        throw new Error("Supabase devolvio una respuesta inesperada al listar empresas.");
    }
    return data;
}

export async function updateCompanyVerification(adminContext, companyId, status) {
    if (!verificationStatuses.has(status)) {
        throw new ServiceError("BAD_REQUEST", "El estado debe ser pending, verified o rejected.");
    }

    const { data: verificationResult, error } = await adminContext.client.rpc(
        "ln26_admin_verificar_empresa",
        {
            p_company_id: companyId,
            p_status: status,
        },
    );

    if (error) throw error;
    if (!verificationResult || (Array.isArray(verificationResult) && verificationResult.length === 0)) {
        throw new ServiceError("NOT_FOUND", "No se encontro la empresa o el cambio fue rechazado.");
    }

    const { data: company, error: readError } = await adminContext.client
        .from("companies")
        .select(companyFields)
        .eq("id", companyId)
        .maybeSingle();

    if (readError) throw readError;
    if (!company) throw new ServiceError("NOT_FOUND", "No se encontro la empresa.");
    return company;
}
