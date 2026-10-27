document.addEventListener("submit", function(e) {
    if (e.target.classList.contains("demo-form")) e.preventDefault();
});

// Controles compartidos para todas las vistas del prototipo.
document.addEventListener("DOMContentLoaded", function() {
    const savedTheme = localStorage.getItem("nexo-theme");
    if (savedTheme === "dark") document.body.classList.add("dark-mode");

    document.querySelectorAll(".actions").forEach(function(actions) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "theme-toggle";
        toggle.setAttribute("aria-label", "Cambiar modo de color");

        const icon = function(dark) {
            return dark
                ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
                : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg>';
        };

        toggle.innerHTML = icon(document.body.classList.contains("dark-mode"));
        toggle.title = document.body.classList.contains("dark-mode") ? "Modo claro" : "Modo oscuro";
        toggle.addEventListener("click", function() {
            document.body.classList.toggle("dark-mode");
            const dark = document.body.classList.contains("dark-mode");
            localStorage.setItem("nexo-theme", dark ? "dark" : "light");
            toggle.innerHTML = icon(dark);
            toggle.title = dark ? "Modo claro" : "Modo oscuro";
        });
        actions.prepend(toggle);
    });
});

document.addEventListener("click", function(e) {
    const boton = e.target.closest("[data-demo]");
    if (boton) e.preventDefault();
});
