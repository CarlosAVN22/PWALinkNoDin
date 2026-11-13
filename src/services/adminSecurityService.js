import { getAdminClient, recordAdminAction } from "./adminAuditService.js";
import { ServiceError } from "./serviceError.js";

const preferenceFields = [
    "repeated_password_resets",
    "unverified_companies",
    "inactive_accounts",
];
const preferenceDefaults = {
    repeated_password_resets: true,
    unverified_companies: true,
    inactive_accounts: false,
};

export async function getAdminSecurityData(adminContext) {
    const client = getAdminClient(adminContext);
    const [
        preferencesResult,
        alertsResult,
        openAlertsResult,
        auditResult,
        totalActivityResult,
    ] = await Promise.all([
        client.from("security_preferences")
            .select("id,repeated_password_resets,unverified_companies,inactive_accounts")
            .eq("admin_user_id", adminContext.actorUserId)
            .maybeSingle(),
        client.from("security_alerts")
            .select("id,alert_type,title,description,severity,status,related_user_id,created_at,reviewed_at,reviewed_by")
            .order("created_at", { ascending: false })
            .limit(50),
        client.from("security_alerts")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
        client.from("admin_audit_log")
            .select("id,actor_user_id,event_type,action,affected_record,details,occurred_at")
            .order("occurred_at", { ascending: false })
            .limit(40),
        client.from("admin_audit_log").select("id", { count: "exact", head: true }),
    ]);

    for (const result of [
        preferencesResult,
        alertsResult,
        openAlertsResult,
        auditResult,
        totalActivityResult,
    ]) {
        if (result.error) throw result.error;
    }

    const actorIds = [...new Set((auditResult.data || [])
        .map(event => event.actor_user_id)
        .filter(Boolean))];
    let actorsById = new Map();
    if (actorIds.length) {
        const { data: actors, error } = await client
            .from("users")
            .select("id,full_name")
            .in("id", actorIds);
        if (error) throw error;
        actorsById = new Map((actors || []).map(actor => [actor.id, actor.full_name]));
    }

    const preferences = preferencesResult.data
        ? Object.fromEntries(preferenceFields.map(field => [field, preferencesResult.data[field]]))
        : { ...preferenceDefaults };

    return {
        preferences,
        alerts: alertsResult.data || [],
        openAlerts: openAlertsResult.count || 0,
        totalActivity: totalActivityResult.count || 0,
        activity: (auditResult.data || []).map(event => ({
            ...event,
            actor_name: actorsById.get(event.actor_user_id) || "Administrador",
        })),
    };
}

export async function updateAdminSecurityPreferences(adminContext, changes) {
    const client = getAdminClient(adminContext);
    const { data: current, error: readError } = await client
        .from("security_preferences")
        .select(preferenceFields.join(","))
        .eq("admin_user_id", adminContext.actorUserId)
        .maybeSingle();

    if (readError) throw readError;

    const preferences = {
        ...preferenceDefaults,
        ...(current || {}),
        ...changes,
    };
    const { data, error } = await client
        .from("security_preferences")
        .upsert(
            { admin_user_id: adminContext.actorUserId, ...preferences },
            { onConflict: "admin_user_id" },
        )
        .select(`id,${preferenceFields.join(",")}`)
        .single();

    if (error) throw error;

    await recordAdminAction(adminContext, {
        eventType: "security",
        action: "Preferencias de seguridad actualizadas",
        details: JSON.stringify(changes),
    });

    return Object.fromEntries(preferenceFields.map(field => [field, data[field]]));
}

export async function reviewAdminSecurityAlert(adminContext, alertId) {
    const client = getAdminClient(adminContext);
    const { data, error } = await client
        .from("security_alerts")
        .update({
            status: "reviewed",
            reviewed_by: adminContext.actorUserId,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", alertId)
        .eq("status", "open")
        .select("id,title,status")
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new ServiceError("CONFLICT", "La alerta no existe o ya fue revisada.");

    await recordAdminAction(adminContext, {
        eventType: "security",
        action: "Alerta de seguridad revisada",
        affectedRecord: data.title,
    });

    return data;
}
