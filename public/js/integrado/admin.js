import { adminRequest } from "/js/admin/admin-api.js";

const $ = selector => document.querySelector(selector);
const roleLabels = { candidate: "Candidato", company: "Empresa", admin: "Administrador" };

function showStatus(node, message, isError = false) {
    if (!node) return;
    node.textContent = message;
    node.dataset.error = String(isError);
    node.setAttribute("role", "status");
}

function number(value) {
    return new Intl.NumberFormat("es-SV").format(value ?? 0);
}

function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
}

async function loadDashboard(path) {
    const content = $("main .content");
    const status = document.createElement("p");
    status.className = "ld-status";
    status.setAttribute("role", "status");
    content.prepend(status);

    try {
        const data = await adminRequest("/dashboard");
        if (path.endsWith("/admin.html")) {
            const statValues = [data.registeredUsers, data.companies, data.jobs, data.applications];
            $(".content .stats")?.querySelectorAll(".stat strong").forEach((node, index) => {
                if (index < statValues.length) node.textContent = number(statValues[index]);
            });
            for (const [key, value] of Object.entries({
                registeredUsers: data.registeredUsers,
                companies: data.companies,
                jobs: data.jobs,
                applications: data.applications,
            })) {
                setText(`[data-admin-metric="${key}"]`, number(value));
            }

            const rows = $(".content .rows");
            const activityStatus = $("[data-admin-activity-status]");
            if (rows) {
                rows.replaceChildren();
                if (!data.recentActivity.length) {
                    if (activityStatus) activityStatus.textContent = "Todavía no hay acciones administrativas registradas.";
                } else {
                    if (activityStatus) activityStatus.remove();
                    for (const event of data.recentActivity) {
                        const row = document.createElement("div");
                        row.className = "rowcard";
                        const copy = document.createElement("div");
                        const action = document.createElement("strong");
                        action.textContent = event.action;
                        const affected = document.createElement("p");
                        affected.className = "muted";
                        affected.textContent = event.affected_record || "Sin registro asociado";
                        const date = document.createElement("span");
                        date.className = "tag";
                        date.textContent = new Date(event.occurred_at).toLocaleString("es-SV");
                        copy.append(action, affected);
                        row.append(copy, date);
                        rows.append(row);
                    }
                }
            }
        } else {
            const metrics = {
                registeredUsers: ["Usuarios registrados", data.registeredUsers],
                verifiedCompanies: ["Empresas verificadas", data.verifiedCompanies],
                activeJobs: ["Vacantes activas", data.activeJobs],
                openReports: ["Reportes pendientes", data.openReports],
            };
            $(".content .stats")?.querySelectorAll(".stat").forEach((node, index) => {
                const item = Object.values(metrics)[index];
                if (!item) return;
                const label = node.querySelector("small");
                const value = node.querySelector("strong");
                if (label) label.textContent = item[0];
                if (value) value.textContent = number(item[1]);
            });
            for (const [key, [label, value]] of Object.entries(metrics)) {
                setText(`[data-admin-stat="${key}"]`, number(value));
                setText(`[data-admin-stat-label="${key}"]`, label);
            }
            setText('[data-admin-stat="candidateProfiles"]', number(data.candidateProfiles));
            setText(
                '[data-admin-stat="resolvedReports"]',
                `${number(data.resolvedReports)} de ${number(data.totalReports)}`,
            );
            setText(
                "[data-admin-insight]",
                `${number(data.pendingCompanies)} empresa(s) pendiente(s) de verificación.`,
            );
        }
        showStatus(status, "Información actualizada desde Supabase.");
    } catch (error) {
        showStatus(status, `No se pudieron cargar los datos: ${error.message}`, true);
    }
}

function renderUsers(users, tbody, search, status) {
    const term = search.value.trim().toLocaleLowerCase();
    const filtered = users.filter(user =>
        `${user.fullName} ${user.email} ${roleLabels[user.roleCode] || user.roleName}`
            .toLocaleLowerCase()
            .includes(term));

    tbody.replaceChildren();
    if (!filtered.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = term ? "No hay usuarios que coincidan con la búsqueda." : "No hay usuarios registrados.";
        row.append(cell);
        tbody.append(row);
        return;
    }

    for (const user of filtered) {
        const row = document.createElement("tr");
        for (const value of [
            user.fullName,
            roleLabels[user.roleCode] || user.roleName,
            user.email,
            user.status === "active" ? "Activo" : "Suspendido",
        ]) {
            const cell = document.createElement("td");
            cell.textContent = value || "—";
            row.append(cell);
        }

        const actions = document.createElement("td");
        for (const [action, label, className] of [
            ["edit", "Editar", "btn btn-soft btn-sm"],
            ["reset", "Restablecer", "btn btn-sm"],
            ["delete", "Eliminar", "btn btn-danger btn-sm"],
        ]) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = className;
            button.dataset.userAction = action;
            button.dataset.userId = String(user.id);
            button.textContent = label;
            button.addEventListener("click", () => handleUserAction(action, user, users, tbody, search, status));
            actions.append(button);
        }
        row.append(actions);
        tbody.append(row);
    }
    showStatus(status, `${filtered.length} de ${users.length} usuario(s).`);
}

async function handleUserAction(action, user, users, tbody, search, status) {
    if (action === "edit") {
        openUserModal(user, async body => {
            const updated = await adminRequest(`/users/${user.id}`, { method: "PATCH", body });
            const index = users.findIndex(item => item.id === updated.id);
            if (index >= 0) users[index] = updated;
            renderUsers(users, tbody, search, status);
            showStatus(status, "Usuario actualizado.");
        });
        return;
    }

    if (action === "reset") {
        if (!confirm(`Enviar un correo para restablecer la contraseña de ${user.email}?`)) return;
        try {
            await adminRequest(`/users/${user.id}/password-reset`, { method: "POST" });
            showStatus(status, `Se solicitó el envío del correo de restablecimiento a ${user.email}.`);
        } catch (error) {
            showStatus(status, `No se pudo enviar el restablecimiento: ${error.message}`, true);
        }
        return;
    }

    if (!confirm(`Eliminar la cuenta de ${user.email}? La acción es permanente y los datos relacionados pueden eliminarse según las relaciones de la base de datos.`)) {
        return;
    }
    try {
        await adminRequest(`/users/${user.id}`, { method: "DELETE" });
        const index = users.findIndex(item => item.id === user.id);
        if (index >= 0) users.splice(index, 1);
        renderUsers(users, tbody, search, status);
        showStatus(status, "Cuenta eliminada.");
    } catch (error) {
        showStatus(status, `No se pudo eliminar la cuenta: ${error.message}`, true);
    }
}

function openUserModal(user, save) {
    const modal = $("#user-modal");
    const form = $("#user-form");
    const title = $("#user-modal-title");
    const name = $("#user-name");
    const role = $("#user-role");
    const email = $("#user-email");
    const state = $("#user-status");
    const note = form.querySelector(".admin-form-note");
    const submit = form.querySelector('[type="submit"]');

    title.textContent = user ? "Editar usuario" : "Invitar usuario";
    name.value = user?.fullName || "";
    email.value = user?.email || "";
    email.readOnly = Boolean(user);
    state.value = user?.status || "active";
    state.disabled = !user;
    role.replaceChildren();
    const options = user
        ? [["candidate", "Candidato"], ["company", "Empresa"], ["admin", "Administrador"]]
        : [["candidate", "Candidato"], ["admin", "Administrador"]];
    for (const [value, label] of options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        role.append(option);
    }
    role.value = user?.roleCode || "candidate";
    note.textContent = user
        ? "El correo no se cambia desde esta pantalla. Las modificaciones de rol y estado quedan registradas."
        : "La cuenta se invita activa por correo de Supabase. Después de aceptar la invitación puedes suspenderla. No se crea ni comparte una contraseña temporal.";
    submit.textContent = user ? "Guardar cambios" : "Enviar invitación";
    modal.hidden = false;
    name.focus();

    const close = () => {
        modal.hidden = true;
        form.removeEventListener("submit", onSubmit);
    };
    const onSubmit = async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        if (role.value === "admin" && (!user || user.roleCode !== "admin")
            && !confirm("Vas a conceder el rol de administrador de LND. ¿Continuar?")) {
            return;
        }

        submit.disabled = true;
        try {
            await save({
                fullName: name.value.trim(),
                email: email.value.trim().toLowerCase(),
                roleCode: role.value,
                status: state.value,
            });
            close();
        } catch (error) {
            showStatus($("#users-status"), `No se pudo guardar: ${error.message}`, true);
        } finally {
            submit.disabled = false;
        }
    };
    form.addEventListener("submit", onSubmit);
    for (const button of modal.querySelectorAll("[data-user-close]")) {
        button.onclick = close;
    }
}

async function loadUsers() {
    const content = $("main .content");
    const old = content.querySelector(".panel");
    if (old) old.hidden = true;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.innerHTML = '<h2>Usuarios registrados</h2><input data-user-search type="search" placeholder="Buscar usuario"><p id="users-status" role="status"></p><button class="btn btn-primary" data-user-action="add" type="button">Agregar nuevo</button><div class="tablewrap"><table><thead><tr><th>Nombre</th><th>Rol</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="admin-users-body"></tbody></table></div>';
    content.prepend(panel);
    const tbody = $("#admin-users-body");
    const search = $("[data-user-search]");
    const status = $("#users-status");
    const users = [];

    try {
        users.push(...await adminRequest("/users"));
    } catch (error) {
        showStatus(status, `No se pudieron cargar los usuarios: ${error.message}`, true);
        return;
    }

    renderUsers(users, tbody, search, status);
    search.addEventListener("input", () => renderUsers(users, tbody, search, status));
    $('[data-user-action="add"]').addEventListener("click", () => {
        openUserModal(null, async body => {
            const invited = await adminRequest("/users", { method: "POST", body });
            users.unshift(invited);
            renderUsers(users, tbody, search, status);
            showStatus(status, "Invitación enviada.");
        });
    });
}

async function init() {
    const path = location.pathname;
    if (path.endsWith("/admin/admin.html") || path.endsWith("/admin/admin-estadisticas.html")) {
        await loadDashboard(path);
    } else if (path.endsWith("/admin/admin-usuarios.html")) {
        await loadUsers();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
} else {
    init();
}
