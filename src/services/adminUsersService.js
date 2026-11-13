import { getAdminClient, recordAdminAction } from "./adminAuditService.js";
import { ServiceError } from "./serviceError.js";

const userFields = "id,auth_user_id,full_name,email,role_id,status,created_at";
const editableRoles = new Set(["candidate", "company", "admin"]);
const creatableRoles = new Set(["candidate", "admin"]);
const userStatuses = new Set(["active", "suspended"]);

function toAdminUser(user, roles) {
    const role = roles.get(user.role_id);
    return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        roleId: user.role_id,
        roleCode: role?.code || "unknown",
        roleName: role?.name || "Sin rol",
        status: user.status,
        createdAt: user.created_at,
    };
}

async function getRoles(client) {
    const { data, error } = await client.from("roles").select("id,code,name");
    if (error) throw error;
    return new Map((data || []).map(role => [role.id, role]));
}

async function getRoleId(client, code) {
    const { data, error } = await client.from("roles").select("id").eq("code", code).maybeSingle();
    if (error) throw error;
    if (!data) throw new ServiceError("BAD_REQUEST", "El rol indicado no existe.");
    return data.id;
}

async function getUser(adminContext, userId) {
    const client = getAdminClient(adminContext);
    const { data, error } = await client
        .from("users")
        .select(userFields)
        .eq("id", userId)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new ServiceError("NOT_FOUND", "No se encontró el usuario.");
    return data;
}

async function setAuthUserStatus(client, user, status) {
    const { error } = await client.auth.admin.updateUserById(user.auth_user_id, {
        ban_duration: status === "suspended" ? "876000h" : "none",
    });
    if (error) throw error;
}

async function ensureNotLastAdmin(client, user, nextRoleId, nextStatus) {
    if (user.role_id !== 3 || user.status !== "active") return;
    if (nextRoleId === 3 && nextStatus === "active") return;

    const { count, error } = await client
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role_id", 3)
        .eq("status", "active");

    if (error) throw error;
    if (count <= 1) {
        throw new ServiceError("CONFLICT", "No se puede desactivar o cambiar el único administrador activo.");
    }
}

export async function listAdminUsers(adminContext) {
    const client = getAdminClient(adminContext);
    const [{ data, error }, roles] = await Promise.all([
        client.from("users")
            .select(userFields)
            .order("created_at", { ascending: false })
            .limit(500),
        getRoles(client),
    ]);

    if (error) throw error;
    return (data || []).map(user => toAdminUser(user, roles));
}

export async function inviteAdminUser(adminContext, input) {
    const client = getAdminClient(adminContext);
    if (!creatableRoles.has(input.roleCode)) {
        throw new ServiceError("BAD_REQUEST", "Solo se pueden invitar candidatos o administradores desde este formulario.");
    }
    if (input.status !== "active") {
        throw new ServiceError("BAD_REQUEST", "Las cuentas nuevas se invitan activas; puedes suspenderlas después.");
    }

    const roleId = await getRoleId(client, input.roleCode);
    const redirectTo = `${process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/doc/general/restablecer.html`;
    const { data: invitation, error: inviteError } = await client.auth.admin.inviteUserByEmail(
        input.email,
        {
            data: { full_name: input.fullName },
            redirectTo,
        },
    );

    if (inviteError) {
        if (inviteError.code === "email_exists" || inviteError.status === 422) {
            throw new ServiceError("CONFLICT", "Ya existe una cuenta con ese correo.");
        }
        throw inviteError;
    }
    if (!invitation.user) {
        throw new Error("Supabase no devolvió el usuario invitado.");
    }

    const { data: user, error: profileError } = await client
        .from("users")
        .update({
            full_name: input.fullName,
            email: input.email,
            role_id: roleId,
            status: input.status,
        })
        .eq("auth_user_id", invitation.user.id)
        .select(userFields)
        .maybeSingle();

    if (profileError || !user) {
        const { error: cleanupError } = await client.auth.admin.deleteUser(invitation.user.id);
        if (cleanupError) {
            console.error("No se pudo revertir la invitación sin perfil LND:", cleanupError);
        }
        if (profileError) throw profileError;
        throw new ServiceError(
            "CONFLICT",
            "La invitación se revirtió porque no se encontró el perfil LND creado por Supabase Auth.",
        );
    }

    await recordAdminAction(adminContext, {
        eventType: "account",
        action: "Usuario invitado",
        affectedRecord: user.email,
        details: `Rol asignado: ${input.roleCode}.`,
    });

    return toAdminUser(user, await getRoles(client));
}

export async function updateAdminUser(adminContext, userId, changes) {
    const client = getAdminClient(adminContext);
    const user = await getUser(adminContext, userId);

    if (user.id === adminContext.actorUserId
        && (changes.roleCode !== undefined || changes.status !== undefined && changes.status !== "active")) {
        throw new ServiceError("CONFLICT", "No puedes cambiar tu propio rol ni suspender tu cuenta desde este módulo.");
    }

    const roles = await getRoles(client);
    const nextRoleId = changes.roleCode === undefined
        ? user.role_id
        : await getRoleId(client, changes.roleCode);
    const nextStatus = changes.status ?? user.status;

    if (changes.roleCode !== undefined && !editableRoles.has(changes.roleCode)) {
        throw new ServiceError("BAD_REQUEST", "El rol indicado no es válido.");
    }
    if (changes.status !== undefined && !userStatuses.has(changes.status)) {
        throw new ServiceError("BAD_REQUEST", "El estado debe ser active o suspended.");
    }

    await ensureNotLastAdmin(client, user, nextRoleId, nextStatus);

    const updates = {
        ...(changes.fullName !== undefined ? { full_name: changes.fullName } : {}),
        ...(changes.roleCode !== undefined ? { role_id: nextRoleId } : {}),
        ...(changes.status !== undefined ? { status: changes.status } : {}),
    };
    const statusChanged = nextStatus !== user.status;
    if (statusChanged) await setAuthUserStatus(client, user, nextStatus);

    const { data: updated, error } = await client
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select(userFields)
        .maybeSingle();

    if (error || !updated) {
        if (statusChanged) {
            try {
                await setAuthUserStatus(client, user, user.status);
            } catch (rollbackError) {
                console.error("No se pudo revertir el estado de Auth tras fallar la actualización del perfil:", rollbackError);
            }
        }
        if (error) throw error;
        throw new ServiceError("NOT_FOUND", "No se encontró el usuario.");
    }

    await recordAdminAction(adminContext, {
        eventType: "account",
        action: "Usuario actualizado",
        affectedRecord: updated.email,
        details: JSON.stringify(updates),
    });

    return toAdminUser(updated, roles);
}

export async function sendAdminUserPasswordReset(adminContext, userId) {
    const user = await getUser(adminContext, userId);
    const redirectTo = `${process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/doc/general/restablecer.html`;
    const { error } = await adminContext.client.auth.resetPasswordForEmail(user.email, { redirectTo });
    if (error) throw error;

    await recordAdminAction(adminContext, {
        eventType: "account",
        action: "Restablecimiento de contraseña solicitado",
        affectedRecord: user.email,
    });

    return { sent: true };
}

export async function deleteAdminUser(adminContext, userId) {
    const client = getAdminClient(adminContext);
    const user = await getUser(adminContext, userId);

    if (user.id === adminContext.actorUserId) {
        throw new ServiceError("CONFLICT", "No puedes eliminar tu propia cuenta administrativa.");
    }

    const roles = await getRoles(client);
    await ensureNotLastAdmin(client, user, null, null);

    const { error: authError } = await client.auth.admin.deleteUser(user.auth_user_id);
    if (authError) throw authError;

    const { data: remainingProfile, error: readError } = await client
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (readError) throw readError;
    if (remainingProfile) {
        const { error: deleteProfileError } = await client.from("users").delete().eq("id", user.id);
        if (deleteProfileError) throw deleteProfileError;
    }

    await recordAdminAction(adminContext, {
        eventType: "account",
        action: "Usuario eliminado",
        affectedRecord: user.email,
        details: `Rol anterior: ${roles.get(user.role_id)?.code || "unknown"}.`,
    });

    return { id: userId, deleted: true };
}
