import { HttpError } from "../middleware/errorHandler.js";

export async function getAccount(context) {
    const { data, error } = await context.client
        .from("users")
        .select("id,full_name,status,role_id")
        .eq("auth_user_id", context.user.id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new HttpError(404, "No se encontró la cuenta.");
    }

    return data;
}
