document.addEventListener("DOMContentLoaded", function () {
    const modal = document.querySelector("#admin-modal");
    const form = document.querySelector("#admin-form");
    const title = document.querySelector("#admin-modal-title");
    const table = document.querySelector("table");

    if (!modal || !form || !title || !table) return;

    const resource = form.dataset.adminResource;
    const config = resource === "empresa"
        ? {
            title: "empresa",
            fields: ["name", "sector", "email", "city", "status"],
            defaults: ["", "", "", "", "Pendiente"]
        }
        : {
            title: "vacante",
            fields: ["name", "company", "type", "status"],
            defaults: ["", "", "", "En revisión"]
        };
    const tableBody = table.tBodies[0] || table;
    let editingRow = null;

    function valuesFromRow(row) {
        return Array.from(row.querySelectorAll("td")).slice(0, config.fields.length).map(function (cell) {
            return cell.textContent.trim();
        });
    }

    function openModal(row) {
        editingRow = row;
        title.textContent = (row ? "Editar " : "Agregar ") + config.title;
        const values = row ? valuesFromRow(row) : config.defaults;
        config.fields.forEach(function (field, index) {
            form.elements[field].value = values[index];
        });
        modal.hidden = false;
        document.body.classList.add("ld-modal-open");
        form.elements[config.fields[0]].focus();
    }

    function closeModal() {
        modal.hidden = true;
        editingRow = null;
        form.reset();
        document.body.classList.remove("ld-modal-open");
    }

    function makeAction(text, action, className) {
        const button = document.createElement("button");
        button.className = "btn btn-sm " + className;
        button.dataset.adminAction = action;
        button.type = "button";
        button.textContent = text;
        if (action === "reset") {
            button.title = "Restablecer contraseña";
            button.setAttribute("aria-label", "Restablecer contraseña");
        }
        return button;
    }

    function confirmDelete(row) {
        const backdrop = document.createElement("div");
        backdrop.className = "admin-confirm-backdrop";
        backdrop.innerHTML = "<section class=\"admin-confirm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"confirm-title\">" +
            "<h2 id=\"confirm-title\">Confirmar eliminación</h2><p>El registro se retirará de esta tabla del prototipo.</p>" +
            "<div class=\"admin-confirm-actions\"><button class=\"btn\" data-confirm-cancel type=\"button\">Cancelar</button>" +
            "<button class=\"btn btn-danger\" data-confirm-delete type=\"button\">Eliminar</button></div></section>";
        document.body.appendChild(backdrop);
        backdrop.querySelector("[data-confirm-delete]").focus();
        backdrop.addEventListener("click", function (event) {
            if (event.target === backdrop || event.target.closest("[data-confirm-cancel]")) backdrop.remove();
            if (event.target.closest("[data-confirm-delete]")) {
                row.remove();
                backdrop.remove();
            }
        });
    }

    function confirmReset(row) {
        const backdrop = document.createElement("div");
        backdrop.className = "admin-confirm-backdrop";
        backdrop.innerHTML = "<section class=\"admin-confirm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"confirm-title\">" +
            "<h2 id=\"confirm-title\">Restablecer contraseña</h2><p>Se asignará una contraseña temporal y la empresa deberá cambiarla al iniciar sesión.</p>" +
            "<div class=\"admin-confirm-actions\"><button class=\"btn\" data-confirm-cancel type=\"button\">Cancelar</button>" +
            "<button class=\"btn btn-primary\" data-confirm-reset type=\"button\">Restablecer</button></div></section>";
        document.body.appendChild(backdrop);
        backdrop.querySelector("[data-confirm-reset]").focus();
        backdrop.addEventListener("click", function (event) {
            if (event.target === backdrop || event.target.closest("[data-confirm-cancel]")) backdrop.remove();
            if (event.target.closest("[data-confirm-reset]")) {
                row.dataset.passwordReset = "true";
                backdrop.remove();
            }
        });
    }

    document.addEventListener("click", function (event) {
        const button = event.target.closest("[data-admin-action], [data-admin-close]");
        if (!button) return;
        if (button.hasAttribute("data-admin-close")) {
            closeModal();
            return;
        }
        if (button.dataset.adminAction === "add") openModal(null);
        if (button.dataset.adminAction === "edit") openModal(button.closest("tr"));
        if (button.dataset.adminAction === "delete") {
            const row = button.closest("tr");
            if (row) confirmDelete(row);
        }
        if (button.dataset.adminAction === "reset") {
            const row = button.closest("tr");
            if (row) confirmReset(row);
        }
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const values = config.fields.map(function (field) {
            return form.elements[field].value.trim();
        });
        const row = editingRow || document.createElement("tr");
        if (!editingRow) {
            row.dataset.adminRow = "";
            tableBody.appendChild(row);
        }
        row.replaceChildren();
        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        const actions = document.createElement("td");
        actions.append(
            makeAction("Editar", "edit", "btn-soft"),
            makeAction("Restablecer", "reset", ""),
            makeAction("Eliminar", "delete", "btn-danger")
        );
        row.appendChild(actions);
        closeModal();
    });

    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) closeModal();
    });
});
