import { adminRequest } from "/js/admin/admin-api.js";

const feedback = document.getElementById("empresas-estado");
const tbody = document.getElementById("empresas-tabla");
const refresh = document.getElementById("empresas-actualizar");
let isAdmin = false;

function notify(text, isError = false) {
    feedback.textContent = text;
    feedback.style.color = isError ? "#e77878" : "";
}

function textCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value == null || value === "" ? "—" : String(value);
    row.appendChild(cell);
    return cell;
}

function action(row, company, label, status, className = "btn-soft") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn btn-sm ${className}`;
    button.textContent = label;
    button.disabled = company.verification_status === status;
    button.addEventListener("click", async () => {
        if (!isAdmin || !confirm(`${label} a ${company.commercial_name}?`)) return;

        button.disabled = true;
        notify("Guardando cambio...");
        try {
            await adminRequest(`/companies/${company.id}/verification`, {
                method: "PATCH",
                body: { status },
            });
            notify("Estado actualizado correctamente.");
            await loadCompanies();
        } catch (error) {
            notify(`No se pudo cambiar el estado: ${error.message}`, true);
            button.disabled = false;
        }
    });
    row.appendChild(button);
}

async function loadCompanies() {
    tbody.replaceChildren();
    notify("Cargando empresas desde el API...");

    try {
        const companies = await adminRequest("/companies");
        isAdmin = true;

        if (!companies.length) {
            notify("No hay empresas registradas.");
            return;
        }

        for (const company of companies) {
            const row = document.createElement("tr");
            textCell(row, company.commercial_name);
            textCell(row, company.sector);
            textCell(row, company.public_email);
            textCell(row, company.city);
            textCell(
                row,
                ({ pending: "Pendiente", verified: "Verificada", rejected: "Rechazada" })[
                    company.verification_status
                ] || company.verification_status,
            );

            const actions = document.createElement("td");
            action(actions, company, "Aprobar", "verified", "btn-primary");
            actions.append(" ");
            action(actions, company, "Rechazar", "rejected", "btn-danger");
            actions.append(" ");
            action(actions, company, "Pendiente", "pending");
            row.appendChild(actions);
            tbody.appendChild(row);
        }

        notify(`${companies.length} empresa(s) registradas.`);
    } catch (error) {
        isAdmin = false;
        notify(`No se pudieron cargar las empresas: ${error.message}`, true);
    }
}

refresh.addEventListener("click", loadCompanies);

loadCompanies().then(() => {
    refresh.disabled = !isAdmin;
});
