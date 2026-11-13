import { ServiceError } from "./serviceError.js";

export async function getCurrentUserProfile(userContext) {
    const { data, error } = await userContext.client
        .from("users")
        .select("id, role_id, full_name, created_at")
        .maybeSingle();

    if (error) throw error;
    if (!data) {
        throw new ServiceError("NOT_FOUND", "No se encontro el perfil de esta cuenta en LND.");
    }

    return data;
}
