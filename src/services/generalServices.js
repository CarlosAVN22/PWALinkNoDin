import { createClient } from "@supabase/supabase-js";
import { HttpError } from "../middleware/errorHandler.js";

function checkId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
        throw new HttpError(400, "El identificador no es válido.");
    }
    return id;
}

function checkResult(result) {
    if (result.error) {
        throw result.error;
    }
    return result.data;
}

async function currentUser(context) {
    const result = await context.client
        .from("users")
        .select("id,status")
        .eq("auth_user_id", context.user.id)
        .eq("status", "active")
        .single();

    const user = checkResult(result);
    if (!user) {
        throw new HttpError(403, "No se encontró la cuenta activa.");
    }
    return user.id;
}

export async function getGuideActivities() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        throw new HttpError(503, "No está configurada la conexión.");
    }

    const client = createClient(url, key);
    const result = await client
        .from("guide_activities")
        .select("id,audience,title,description,sort_order")
        .order("sort_order");

    return checkResult(result);
}

export async function getGuideProgress(context) {
    const userId = await currentUser(context);
    const result = await context.client
        .from("user_guide_progress")
        .select("activity_id")
        .eq("user_id", userId);

    return checkResult(result);
}

export async function changeGuideProgress(context, activityValue, completed) {
    const activityId = checkId(activityValue);
    if (typeof completed !== "boolean") {
        throw new HttpError(400, "Indica si la actividad está completada.");
    }

    const userId = await currentUser(context);
    let result;

    if (completed) {
        result = await context.client
            .from("user_guide_progress")
            .insert({ user_id: userId, activity_id: activityId, completed_at: new Date().toISOString() });
    } else {
        result = await context.client
            .from("user_guide_progress")
            .delete()
            .eq("user_id", userId)
            .eq("activity_id", activityId);
    }

    checkResult(result);
    return { activity_id: activityId, completed };
}

export async function getNotifications(context) {
    const userId = await currentUser(context);
    const result = await context.client
        .from("notifications")
        .select("id,title,message,is_read,created_at,target_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    return checkResult(result);
}

export async function readNotification(context, notificationValue) {
    const id = checkId(notificationValue);
    const userId = await currentUser(context);
    const result = await context.client
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id,is_read")
        .maybeSingle();

    const notification = checkResult(result);
    if (!notification) {
        throw new HttpError(404, "No se encontró la notificación.");
    }
    return notification;
}

export async function getNotificationPreferences(context) {
    const userId = await currentUser(context);
    const result = await context.client
        .from("notification_preferences")
        .select("id,notification_type,in_app_enabled,email_enabled")
        .eq("user_id", userId);

    return checkResult(result);
}

export async function saveNotificationPreference(context, type, values) {
    const allowed = ["application_status", "new_application", "company_verification", "course"];

    if (!allowed.includes(type)) {
        throw new HttpError(400, "Tipo de notificación no válido.");
    }
    if (typeof values?.in_app_enabled !== "boolean" || typeof values?.email_enabled !== "boolean") {
        throw new HttpError(400, "Las preferencias deben ser valores booleanos.");
    }

    const userId = await currentUser(context);
    const existing = checkResult(await context.client
        .from("notification_preferences")
        .select("id")
        .eq("user_id", userId)
        .eq("notification_type", type)
        .maybeSingle());

    const record = {
        user_id: userId,
        notification_type: type,
        in_app_enabled: values.in_app_enabled,
        email_enabled: values.email_enabled,
        updated_at: new Date().toISOString(),
    };

    const query = existing
        ? context.client.from("notification_preferences").update(record).eq("id", existing.id)
        : context.client.from("notification_preferences").insert(record);

    return checkResult(await query.select("id,notification_type,in_app_enabled,email_enabled").single());
}
