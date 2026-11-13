document.addEventListener("DOMContentLoaded", async function () {
    const tableBody = document.querySelector("#admin-users-body");
    const status = document.querySelector("#admin-users-status");

    if (!tableBody || !status) return;

    function addMessageRow(message) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = message;
        row.appendChild(cell);
        tableBody.replaceChildren(row);
    }

    function displayRole(role) {
        const labels = {
            admin: "Administrador",
            candidate: "Candidato",
            company: "Empresa"
        };
        return labels[role] || role;
    }

    function displayStatus(value) {
        const labels = {
            active: "Activo",
            inactive: "Inactivo",
            blocked: "Bloqueado",
            pending: "Pendiente"
        };
        return labels[value] || value;
    }

    try {
        const response = await fetch("/api/admin/users");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "No se pudieron cargar los usuarios");
        }

        const users = result.data;
        if (!Array.isArray(users)) {
            throw new Error("La respuesta del servidor no tiene el formato esperado");
        }

        if (users.length === 0) {
            addMessageRow("No hay usuarios registrados en la base de datos.");
        } else {
            const rows = users.map(function (user) {
                const row = document.createElement("tr");
                [user.full_name, displayRole(user.role), user.email, displayStatus(user.status)]
                    .forEach(function (value) {
                        const cell = document.createElement("td");
                        cell.textContent = value;
                        row.appendChild(cell);
                    });
                return row;
            });
            tableBody.replaceChildren(...rows);
        }

        status.textContent = "Listado conectado a PostgreSQL. Modo de solo lectura.";
    } catch (error) {
        addMessageRow("No fue posible cargar los usuarios.");
        status.textContent = error.message;
    }
});
