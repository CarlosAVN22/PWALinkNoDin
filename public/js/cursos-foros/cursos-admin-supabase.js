import { adminRequest } from "/js/admin/admin-api.js";

const el = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
};

const feedback = (node, message) => {
    node.textContent = message;
    node.setAttribute("role", "status");
};

async function init() {
    const host = document.querySelector("main .content") || document.querySelector("main");
    if (!host) return;

    const panel = el("section", "panel ln-course-admin");
    panel.id = "ln-course-admin";
    panel.append(
        el("h2", "", "Administrar categorías y cursos"),
        el("p", "muted", "Crea categorías, desactívalas y oculta cursos sin eliminarlos."),
    );
    const status = el("p", "ln-course-status");
    panel.append(status);

    const form = el("form", "ln-category-form");
    const name = el("input");
    name.placeholder = "Nombre de categoría de curso";
    name.required = true;
    name.minLength = 3;
    name.maxLength = 120;
    name.setAttribute("aria-label", "Nueva categoría de curso");
    const add = el("button", "btn btn-primary", "Agregar categoría");
    add.type = "submit";
    form.append(name, add);
    panel.append(form);

    const categories = el("div", "ln-course-admin-list");
    panel.append(categories, el("h3", "", "Cursos publicados y ocultos"));
    const courses = el("div", "ln-course-admin-list");
    panel.append(courses);

    const forumPanel = host.querySelector("#ln-forum-admin");
    if (forumPanel) forumPanel.insertAdjacentElement("afterend", panel);
    else host.prepend(panel);

    async function refresh() {
        try {
            const [categoryItems, courseItems] = await Promise.all([
                adminRequest("/categories/course"),
                adminRequest("/courses"),
            ]);

            categories.replaceChildren();
            if (!categoryItems.length) {
                categories.append(el("p", "muted", "Todavía no hay categorías para cursos."));
            }
            for (const category of categoryItems) {
                const line = el("div", "ln-course-admin-row");
                line.append(el("strong", "", category.name));
                line.append(el("span", "", category.is_active ? "Activa" : "Inactiva"));

                const button = el("button", "btn", category.is_active ? "Desactivar" : "Activar");
                button.type = "button";
                button.addEventListener("click", async () => {
                    button.disabled = true;
                    try {
                        await adminRequest(`/categories/course/${category.id}`, {
                            method: "PATCH",
                            body: { is_active: !category.is_active },
                        });
                        await refresh();
                    } catch (error) {
                        feedback(status, error.message);
                    } finally {
                        button.disabled = false;
                    }
                });
                line.append(button);
                categories.append(line);
            }

            courses.replaceChildren();
            if (!courseItems.length) courses.append(el("p", "muted", "No se han creado cursos."));
            for (const course of courseItems) {
                const line = el("div", "ln-course-admin-row");
                line.append(
                    el("strong", "", course.title),
                    el("span", "", course.status === "published" ? "Publicado" : "Oculto"),
                );

                const button = el("button", "btn", course.status === "published" ? "Ocultar" : "Publicar");
                button.type = "button";
                button.addEventListener("click", async () => {
                    button.disabled = true;
                    try {
                        const statusValue = course.status === "published" ? "hidden" : "published";
                        await adminRequest(`/courses/${course.id}/status`, {
                            method: "PATCH",
                            body: { status: statusValue },
                        });
                        await refresh();
                    } catch (error) {
                        feedback(status, error.message);
                    } finally {
                        button.disabled = false;
                    }
                });
                line.append(button);
                courses.append(line);
            }
        } catch (error) {
            feedback(status, `Error al consultar administración de cursos: ${error.message}`);
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        add.disabled = true;
        try {
            await adminRequest("/categories/course", {
                method: "POST",
                body: { name: name.value.trim() },
            });
            name.value = "";
            feedback(status, "Categoría creada correctamente.");
            await refresh();
        } catch (error) {
            feedback(status, error.message);
        } finally {
            add.disabled = false;
        }
    });

    await refresh();
}

document.addEventListener("DOMContentLoaded", () => {
    init().catch(error => console.error("No se pudo iniciar administración de cursos:", error));
});
