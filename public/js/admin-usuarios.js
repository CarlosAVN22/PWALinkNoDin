document.addEventListener("DOMContentLoaded", function () {
    const modal = document.querySelector("#user-modal");
    const form = document.querySelector("#user-form");
    const title = document.querySelector("#user-modal-title");
    const table = document.querySelector("table");
    const tableBody = table ? table.tBodies[0] || table : null;

    if (!modal || !form || !title || !tableBody) return;

    let editingRow = null;

    function setField(name, value) {
        form.elements[name].value = value;
    }

    function getRowValues(row) {
        return Array.from(row.querySelectorAll("td")).slice(0, 4).map(function (cell) {
            return cell.textContent.trim();
        });
    }

    function openForm(row) {
        editingRow = row;
        title.textContent = row ? "Editar usuario" : "Agregar usuario";
        const values = row ? getRowValues(row) : ["", "Candidato", "", "Activo"];
        ["name", "role", "email", "status"].forEach(function (field, index) {
            setField(field, values[index]);
        });
        modal.hidden = false;
        document.body.classList.add("ld-modal-open");
        form.elements.name.focus();
    }

    function closeForm() {
        modal.hidden = true;
        editingRow = null;
        document.body.classList.remove("ld-modal-open");
        form.reset();
    }

    function actionButton(label, action, className) {
        const button = document.createElement("button");
        button.className = "btn btn-sm " + className;
        button.dataset.userAction = action;
        button.type = "button";
        button.textContent = label;
        if (action === "reset") {
            button.title = "Restablecer contraseña";
            button.setAttribute("aria-label", "Restablecer contraseña");
        }
        return button;
    }

    function confirmDelete(row, message) {
        const backdrop = document.createElement("div");
        backdrop.className = "admin-confirm-backdrop";
        backdrop.innerHTML = "<section class=\"admin-confirm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"confirm-title\">" +
            "<h2 id=\"confirm-title\">Confirmar eliminación</h2><p></p>" +
            "<div class=\"admin-confirm-actions\"><button class=\"btn\" data-confirm-cancel type=\"button\">Cancelar</button>" +
            "<button class=\"btn btn-danger\" data-confirm-delete type=\"button\">Eliminar</button></div></section>";
        backdrop.querySelector("p").textContent = message;
        document.body.appendChild(backdrop);
        backdrop.querySelector("[data-confirm-delete]").focus();
        function close() {
            backdrop.remove();
        }
        backdrop.addEventListener("click", function (event) {
            if (event.target === backdrop || event.target.closest("[data-confirm-cancel]")) close();
            if (event.target.closest("[data-confirm-delete]")) {
                row.remove();
                close();
            }
        });
        return close;
    }

    function confirmReset(row) {
        const backdrop = document.createElement("div");
        backdrop.className = "admin-confirm-backdrop";
        backdrop.innerHTML = "<section class=\"admin-confirm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"confirm-title\">" +
            "<h2 id=\"confirm-title\">Restablecer contraseña</h2><p>Se asignará una contraseña temporal y la persona deberá cambiarla al iniciar sesión.</p>" +
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
        const button = event.target.closest("[data-user-action], [data-user-close]");
        if (!button) return;

        if (button.hasAttribute("data-user-close")) {
            closeForm();
            return;
        }

        const action = button.dataset.userAction;
        if (action === "add") {
            openForm(null);
        } else if (action === "edit") {
            openForm(button.closest("tr"));
        } else if (action === "delete") {
            const row = button.closest("tr");
            if (row) confirmDelete(row, "El usuario se retirará de esta tabla del prototipo.");
        } else if (action === "reset") {
            const row = button.closest("tr");
            if (row) confirmReset(row);
        }
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const values = ["name", "role", "email", "status"].map(function (field) {
            return form.elements[field].value.trim();
        });
        const row = editingRow || document.createElement("tr");

        if (!editingRow) {
            row.dataset.userRow = "";
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
            actionButton("Editar", "edit", "btn-soft"),
            actionButton("Restablecer", "reset", ""),
            actionButton("Eliminar", "delete", "btn-danger")
        );
        row.appendChild(actions);
        closeForm();
    });

    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeForm();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) closeForm();
    });
});
