import { ServiceError } from "./serviceError.js";

export function getAdminClient(adminContext) {
    if (!adminContext.adminClient) {
        throw new ServiceError(
            "CONFIGURATION",
            "Configura SUPABASE_SECRET_KEY en el entorno del servidor para esta operación.",
        );
    }

    return adminContext.adminClient;
}

export async function recordAdminAction(adminContext, {
    eventType,
    action,
    affectedRecord = null,
    details = null,
}) {
    const client = adminContext.adminClient || adminContext.client;
    const { error } = await client.from("admin_audit_log").insert({
        actor_user_id: adminContext.actorUserId,
        event_type: eventType,
        action,
        affected_record: affectedRecord,
        details,
    });

    if (error) throw error;
}
