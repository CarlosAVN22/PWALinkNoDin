
document.addEventListener("DOMContentLoaded", () => {
    const RUTA_ICONO = "/img/notificaciones.svg";

    const sesion = (() => {
        try {
            return JSON.parse(
                localStorage.getItem("linknodin-v3-session")
            );
        } catch {
            return null;
        }
    })();

    if (sesion?.role === "empresa") return;

    document.body.classList.add("lnc-candidate-ui");

    function crearIcono() {
        const imagen = document.createElement("img");

        imagen.src = RUTA_ICONO;
        imagen.alt = "";
        imagen.className = "lnc-notif-icon";
        imagen.setAttribute("aria-hidden", "true");

        return imagen;
    }

    function reemplazarIcono(contenedor) {
        if (!contenedor) return;

        if (
            contenedor.children.length === 1 &&
            contenedor.firstElementChild?.classList.contains(
                "lnc-notif-icon"
            )
        ) {
            return;
        }

        contenedor.replaceChildren(crearIcono());
    }

    function reemplazarEmoji(elemento, expresion) {
        if (!elemento) return;

        const walker = document.createTreeWalker(
            elemento,
            NodeFilter.SHOW_TEXT
        );

        const nodos = [];

        while (walker.nextNode()) {
            nodos.push(walker.currentNode);
        }

        nodos.forEach(nodo => {
            const texto = nodo.textContent;

            expresion.lastIndex = 0;

            if (!expresion.test(texto)) return;

            expresion.lastIndex = 0;

            const fragmento = document.createDocumentFragment();
            let inicio = 0;

            for (const coincidencia of texto.matchAll(expresion)) {
                const posicion = coincidencia.index;

                if (posicion > inicio) {
                    fragmento.append(
                        document.createTextNode(
                            texto.slice(inicio, posicion)
                        )
                    );
                }

                fragmento.append(crearIcono());

                inicio = posicion + coincidencia[0].length;
            }

            if (inicio < texto.length) {
                fragmento.append(
                    document.createTextNode(texto.slice(inicio))
                );
            }

            nodo.replaceWith(fragmento);
        });
    }

    function actualizarNotificaciones() {
        const bandeja = document.getElementById(
            "ld-notif-inbox"
        );

        const ventana = document.getElementById(
            "ld-notif-pop"
        );

        const contenedores = [
            bandeja,
            ventana
        ].filter(Boolean);

        contenedores.forEach(contenedor => {
            // Reemplazar todos los iconos individuales
            contenedor.querySelectorAll(
                ".ld-notif-item-icon"
            ).forEach(reemplazarIcono);

            // Reemplazar los iconos del encabezado
            contenedor.querySelectorAll(
                ".ld-notif-head h2"
            ).forEach(titulo => {
                reemplazarEmoji(
                    titulo,
                    /🔔|🔕|🛎️?|✨|💼|✅|📣|👤/gu
                );

                if (
                    !titulo.querySelector(".lnc-notif-icon")
                ) {
                    titulo.prepend(crearIcono());
                }
            });

            // Reemplazar el icono del botón de prueba
            contenedor.querySelectorAll(
                "[data-notif-test]"
            ).forEach(boton => {
                reemplazarEmoji(
                    boton,
                    /🔔|🔕|🛎️?|✨|💼|✅|📣|👤/gu
                );
            });
        });

        // Reemplazar icono del modal de permiso
        document.querySelectorAll(
            ".ld-notif-consent-icon"
        ).forEach(reemplazarIcono);

        // Reemplazar emoji en mensajes de prueba
        document.querySelectorAll(
            ".ld-toast"
        ).forEach(alerta => {
            reemplazarEmoji(
                alerta,
                /🔔|🔕|🛎️?|✨|💼|✅|📣|👤/gu
            );
        });
    }

    let actualizando = false;

    const observador = new MutationObserver(() => {
        if (actualizando) return;

        actualizando = true;
        observador.disconnect();

        try {
            actualizarNotificaciones();
        } finally {
            observador.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });

            actualizando = false;
        }
    });

    actualizarNotificaciones();

    observador.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
});
