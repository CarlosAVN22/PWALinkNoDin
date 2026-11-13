import { adminRequest } from "/js/admin/admin-api.js";

const $ = selector => document.querySelector(selector);
const preferenceFields = [
    "repeated_password_resets",
    "unverified_companies",
    "inactive_accounts",
];
let alerts = [];
let activity = [];
let selectedAlertId = null;

function showStatus(message, isError = false) {
    const status = $("#security-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.error = String(isError);
    status.setAttribute("role", "status");
}

function date(value) {
    return value ? new Date(value).toLocaleString("es-SV") : "—";
}

function alertSeverity(value) {
    return ["high", "medium", "low"].includes(value) ? value : "low";
}

function eventCategory(value) {
    if (value === "content") return "content";
    if (value === "access") return "access";
    if (value === "security") return "security";
    return "account";
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = false;
}

function closeModals() {
    document.querySelectorAll(".security-modal-backdrop").forEach(modal => {
        modal.hidden = true;
    });
    selectedAlertId = null;
}

function renderAlerts(openAlerts) {
    const host = $("[data-security-alerts]");
    host.replaceChildren();

    $('[data-security-count="alerts"]').textContent = String(openAlerts);
    if (!alerts.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No hay alertas de seguridad registradas.";
        host.append(empty);
        return;
    }

    for (const alert of alerts) {
        const severity = alertSeverity(alert.severity);
        const card = document.createElement("article");
        card.className = `security-alert security-alert-${severity}`;

        const icon = document.createElement("span");
        icon.className = "security-alert-icon";
        icon.textContent = severity === "high" ? "!" : severity === "medium" ? "i" : "•";

        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = alert.title;
        const description = document.createElement("p");
        description.textContent = alert.description || "Sin descripción adicional.";
        const created = document.createElement("small");
        created.textContent = `${date(alert.created_at)} · ${alert.status === "open" ? "Abierta" : "Revisada"}`;
        copy.append(title, description, created);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-sm";
        button.dataset.securityDetail = String(alert.id);
        button.textContent = alert.status === "open" ? "Ver detalle" : "Consultar";
        card.append(icon, copy, button);
        host.append(card);
    }
}

function renderActivity(totalActivity) {
    const body = $("[data-security-activity]");
    body.replaceChildren();
    $('[data-security-count="activity"]').textContent = String(totalActivity);

    if (!activity.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 5;
        cell.textContent = "Todavía no hay acciones administrativas registradas.";
        row.append(cell);
        body.append(row);
        return;
    }

    for (const event of activity) {
        const category = eventCategory(event.event_type);
        const row = document.createElement("tr");
        row.dataset.securityRow = "";
        row.dataset.securityType = category;
        row.dataset.securityRowId = String(event.id);

        const values = [date(event.occurred_at)];
        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        }

        const actionCell = document.createElement("td");
        const tag = document.createElement("span");
        tag.className = `security-action security-action-${category}`;
        tag.textContent = category === "content" ? "Contenido"
            : category === "access" ? "Acceso"
                : category === "security" ? "Seguridad" : "Cuenta";
        const action = document.createElement("strong");
        action.textContent = ` ${event.action}`;
        actionCell.append(tag, action);
        row.append(actionCell);

        const affected = document.createElement("td");
        affected.textContent = event.affected_record || "—";
        row.append(affected);

        const actor = document.createElement("td");
        actor.textContent = event.actor_name || "Administrador";
        row.append(actor);

        const detailsCell = document.createElement("td");
        const details = document.createElement("button");
        details.type = "button";
        details.className = "btn btn-soft btn-sm";
        details.dataset.securityLogDetail = String(event.id);
        details.textContent = "Consultar";
        detailsCell.append(details);
        row.append(detailsCell);
        body.append(row);
    }
}

function applyActivityFilters() {
    const term = $("[data-security-search]").value.trim().toLocaleLowerCase();
    const category = $("[data-security-filter]").value;
    const rows = [...document.querySelectorAll("[data-security-row]")];
    let visible = 0;

    for (const row of rows) {
        const event = activity.find(item => String(item.id) === row.dataset.securityRowId);
        const matchesText = !term || [
            event.action,
            event.affected_record,
            event.actor_name,
            event.details,
        ].join(" ").toLocaleLowerCase().includes(term);
        const matchesCategory = category === "all" || row.dataset.securityType === category;
        row.hidden = !(matchesText && matchesCategory);
        if (!row.hidden) visible += 1;
    }

    $("[data-security-empty]").hidden = visible > 0;
}

function showAlertDetails(alert) {
    selectedAlertId = alert.id;
    $("[data-security-detail-title]").textContent = "Detalle de alerta";
    $("[data-detail-action]").textContent = alert.title;
    $("[data-detail-record]").textContent = alert.related_user_id
        ? `Usuario #${alert.related_user_id}`
        : alert.alert_type;
    $("[data-detail-date]").textContent = date(alert.created_at);
    $("[data-detail-actor]").textContent = alert.reviewed_by
        ? `Administrador #${alert.reviewed_by}`
        : "Pendiente de revisión";
    $("[data-detail-note]").textContent = alert.description || "Sin descripción adicional.";
    $("[data-security-mark]").hidden = alert.status !== "open";
    openModal("security-detail-modal");
}

function showActivityDetails(event) {
    selectedAlertId = null;
    $("[data-security-detail-title]").textContent = "Detalle de actividad";
    $("[data-detail-action]").textContent = event.action;
    $("[data-detail-record]").textContent = event.affected_record || "—";
    $("[data-detail-date]").textContent = date(event.occurred_at);
    $("[data-detail-actor]").textContent = event.actor_name || "Administrador";
    $("[data-detail-note]").textContent = event.details || "Sin detalles adicionales.";
    $("[data-security-mark]").hidden = true;
    openModal("security-detail-modal");
}

async function loadSecurityData() {
    try {
        const data = await adminRequest("/security");
        alerts = data.alerts;
        activity = data.activity;
        renderAlerts(data.openAlerts);
        renderActivity(data.totalActivity);

        for (const field of preferenceFields) {
            const checkbox = $(`[data-security-preference="${field}"]`);
            checkbox.checked = data.preferences[field];
        }
        showStatus("Preferencias, alertas y bitácora actualizadas.");
    } catch (error) {
        showStatus(`No se pudo cargar Seguridad y actividad: ${error.message}`, true);
        $("[data-security-alerts]").replaceChildren();
        $("[data-security-activity]").replaceChildren();
    }
}

async function savePreferences() {
    const button = $("[data-security-save]");
    button.disabled = true;
    const preferences = Object.fromEntries(preferenceFields.map(field => [
        field,
        $(`[data-security-preference="${field}"]`).checked,
    ]));

    try {
        await adminRequest("/security/preferences", { method: "PATCH", body: preferences });
        showStatus("Preferencias guardadas.");
        closeModals();
        await loadSecurityData();
    } catch (error) {
        showStatus(`No se pudieron guardar las preferencias: ${error.message}`, true);
    } finally {
        button.disabled = false;
    }
}

async function reviewSelectedAlert() {
    if (!selectedAlertId) return;
    const button = $("[data-security-mark]");
    button.disabled = true;
    try {
        await adminRequest(`/security/alerts/${selectedAlertId}/review`, { method: "PATCH" });
        closeModals();
        showStatus("Alerta marcada como revisada.");
        await loadSecurityData();
    } catch (error) {
        showStatus(`No se pudo actualizar la alerta: ${error.message}`, true);
    } finally {
        button.disabled = false;
    }
}

function exportActivity() {
    const rows = [...document.querySelectorAll("[data-security-row]:not([hidden])")];
    const csvRows = [["Fecha", "Tipo", "Acción", "Registro", "Responsable", "Detalle"]];
    for (const row of rows) {
        const event = activity.find(item => String(item.id) === row.dataset.securityRowId);
        if (event) {
            csvRows.push([
                date(event.occurred_at),
                event.event_type,
                event.action,
                event.affected_record || "",
                event.actor_name || "",
                event.details || "",
            ]);
        }
    }
    const csv = csvRows.map(row => row.map(value =>
        `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "linknodin-actividad-admin.csv";
    link.click();
    URL.revokeObjectURL(link.href);
}

async function init() {
    if (!location.pathname.endsWith("/admin/admin-seguridad.html")) return;

    document.querySelectorAll("[data-security-open='settings']").forEach(button => {
        button.addEventListener("click", () => openModal("security-settings-modal"));
    });
    document.querySelectorAll("[data-security-close]").forEach(button => {
        button.addEventListener("click", closeModals);
    });
    document.querySelectorAll(".security-modal-backdrop").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModals();
        });
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModals();
    });
    $("[data-security-save]").addEventListener("click", savePreferences);
    $("[data-security-mark]").addEventListener("click", reviewSelectedAlert);
    $("[data-security-apply]").addEventListener("click", applyActivityFilters);
    $("[data-security-search]").addEventListener("input", applyActivityFilters);
    $("[data-security-filter]").addEventListener("change", applyActivityFilters);
    $("[data-security-export]").addEventListener("click", exportActivity);

    $("[data-security-alerts]").addEventListener("click", event => {
        const button = event.target.closest("[data-security-detail]");
        if (!button) return;
        const alert = alerts.find(item => String(item.id) === button.dataset.securityDetail);
        if (alert) showAlertDetails(alert);
    });
    $("[data-security-activity]").addEventListener("click", event => {
        const button = event.target.closest("[data-security-log-detail]");
        if (!button) return;
        const item = activity.find(entry => String(entry.id) === button.dataset.securityLogDetail);
        if (item) showActivityDetails(item);
    });

    await loadSecurityData();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
} else {
    init();
}
