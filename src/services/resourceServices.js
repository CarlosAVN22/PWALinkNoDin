import { createClient } from "@supabase/supabase-js";
import { HttpError } from "../middleware/errorHandler.js";

function queryData(result) {
    if (result.error) {
        throw result.error;
    }

    return result.data;
}

function publicClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        throw new HttpError(503, "No está configurada la conexión a Supabase.");
    }

    return createClient(url, key);
}

function validId(value) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new HttpError(400, "Identificador de recurso no válido.");
    }

    return id;
}

async function publishedResource(id) {
    const resource = queryData(await publicClient()
        .from("resources")
        .select("id")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle());

    if (!resource) {
        throw new HttpError(404, "No se encontró el recurso publicado.");
    }
}

async function ownUserId(context) {
    const user = queryData(await context.client
        .from("users")
        .select("id,status")
        .eq("auth_user_id", context.user.id)
        .eq("status", "active")
        .single());

    if (!user) {
        throw new HttpError(403, "Esta cuenta no está activa.");
    }

    return user.id;
}

export async function getResources() {
    return queryData(await publicClient()
        .from("resources")
        .select("id,slug,title,category,summary,intro,reading_minutes")
        .eq("status", "published")
        .order("created_at", { ascending: false }));
}

export async function getResourceSections(resourceValue) {
    const id = validId(resourceValue);
    await publishedResource(id);

    return queryData(await publicClient()
        .from("resource_sections")
        .select("resource_id,heading,body,sort_order")
        .eq("resource_id", id)
        .order("sort_order"));
}

export async function getResourceChecklist(resourceValue) {
    const id = validId(resourceValue);
    await publishedResource(id);

    return queryData(await publicClient()
        .from("resource_checklist_items")
        .select("item_text,sort_order")
        .eq("resource_id", id)
        .order("sort_order"));
}

export async function getResourceActivity(context) {
    const userId = await ownUserId(context);

    return queryData(await context.client
        .from("user_resource_activity")
        .select("id,resource_id,is_saved,read_at")
        .eq("user_id", userId));
}

export async function saveResourceActivity(context, resourceValue, values) {
    const resourceId = validId(resourceValue);
    const hasSaved = typeof values?.is_saved === "boolean";
    const hasRead = typeof values?.is_read === "boolean";

    if (hasSaved === hasRead) {
        throw new HttpError(400, "Indica si deseas guardar el recurso o marcar su lectura.");
    }

    const userId = await ownUserId(context);
    const resource = queryData(await context.client
        .from("resources")
        .select("id")
        .eq("id", resourceId)
        .eq("status", "published")
        .maybeSingle());

    if (!resource) {
        throw new HttpError(404, "No se encontró el recurso publicado.");
    }

    const existing = queryData(await context.client
        .from("user_resource_activity")
        .select("id")
        .eq("user_id", userId)
        .eq("resource_id", resourceId)
        .maybeSingle());

    const changes = {
        updated_at: new Date().toISOString(),
    };

    if (hasSaved) {
        changes.is_saved = values.is_saved;
    } else {
        changes.read_at = values.is_read ? new Date().toISOString() : null;
    }

    const request = existing
        ? context.client.from("user_resource_activity").update(changes).eq("id", existing.id)
        : context.client.from("user_resource_activity").insert({
            user_id: userId,
            resource_id: resourceId,
            ...changes,
        });

    return queryData(await request
        .select("id,resource_id,is_saved,read_at")
        .single());
}
