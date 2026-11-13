/* Paneles administrativos: métricas por Node y gestión de usuarios vía Supabase. */
import { supabase, dom, run, who, status, messageError } from "./base.js";
import { adminRequest } from "/js/admin/admin-api.js";

function renderMetrics(root, data, info) {
    const summary = dom("div", "ln-admin-summary");
    const metrics = [
        ["Empresas", data.companies],
        ["Empresas pendientes", data.pendingCompanies],
        ["Cursos", data.courses],
        ["Cursos publicados", data.publishedCourses],
        ["Cursos ocultos", data.hiddenCourses],
        ["Temas de foro", data.forumTopics],
        ["Reportes pendientes", data.openReports],
    ];

    for (const [label, value] of metrics) {
        const card = dom("div", "ln-integ-card");
        card.append(dom("h3", "", String(value)), dom("p", "", label));
        summary.append(card);
    }

    root.append(summary);
    status(info, "Indicadores cargados desde el API de Node.");
}

async function init() {
    const path = location.pathname;
    if (!/\/admin\/(admin(?:-usuarios|-estadisticas)?\.html)$/.test(path)) return;

    const me = await who();
    if (!me || me.role_id !== 3) return;

    const container = document.querySelector("main .content") || document.querySelector("main");
    if (!container) return;

    for (const item of [...container.children]) item.hidden = true;
    const root = dom("section", "panel ln-integ-section");
    container.prepend(root);
    root.append(dom("h2", "", "Administración de LinkNoDin"));
    const info = dom("p", "ld-status");
    root.append(info);

    if (path.endsWith("admin.html") || path.endsWith("admin-estadisticas.html")) {
        root.append(dom("p", "muted", "Indicadores disponibles en el módulo administrativo de Node."));
        try {
            renderMetrics(root, await adminRequest("/dashboard"), info);
        } catch (error) {
            status(info, `No se pudieron cargar las estadísticas: ${error.message}`, true);
        }
        return;
    }

    let users;
    try {
        users = await run(supabase.from("users")
            .select("id,full_name,email,role_id,status")
            .order("created_at", { ascending: false }));
    } catch (error) {
        status(info, `No se pudieron cargar las cuentas: ${messageError(error)}`, true);
        return;
    }

    const search = dom("input");
    search.placeholder = "Buscar por nombre o correo";
    search.type = "search";
    search.className = "ln-admin-search";
    root.append(dom("h3", "", "Cuentas registradas"), search);
    const list = dom("div");
    root.append(list);

    function renderUsers() {
        list.replaceChildren();
        const term = search.value.toLowerCase();
        for (const user of users.filter(item =>
            [item.full_name, item.email].join(" ").toLowerCase().includes(term))) {
            const card = dom("article", "ln-integ-card");
            card.append(
                dom("strong", "", user.full_name),
                dom("p", "", user.email),
                dom("p", "muted", `Rol: ${user.role_id === 3 ? "Administrador" : user.role_id === 2 ? "Empresa" : "Candidato"} · Estado: ${user.status}`),
            );

            if (user.role_id !== 3) {
                const toggle = dom("button", "btn", user.status === "active" ? "Suspender cuenta" : "Reactivar cuenta");
                toggle.type = "button";
                toggle.addEventListener("click", async () => {
                    toggle.disabled = true;
                    try {
                        const nextStatus = user.status === "active" ? "suspended" : "active";
                        await run(supabase.from("users").update({ status: nextStatus }).eq("id", user.id));
                        user.status = nextStatus;
                        status(info, "Cuenta actualizada.");
                        renderUsers();
                    } catch (error) {
                        status(info, messageError(error), true);
                        toggle.disabled = false;
                    }
                });
                card.append(toggle);
            }
            list.append(card);
        }
    }

    search.addEventListener("input", renderUsers);
    renderUsers();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init().catch(error => console.error(error)));
} else {
    init().catch(error => console.error(error));
}
