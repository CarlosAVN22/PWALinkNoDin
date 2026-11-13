document.addEventListener("DOMContentLoaded", function () {
    const detailModal = document.querySelector("#security-detail-modal");
    const settingsModal = document.querySelector("#security-settings-modal");
    const rows = Array.from(document.querySelectorAll("[data-security-row]"));
    const search = document.querySelector("[data-security-search]");
    const filter = document.querySelector("[data-security-filter]");
    const empty = document.querySelector("[data-security-empty]");
    const detailContent = {
        reset: ["Contraseña restablecida", "ana@ejemplo.com", "Se generó una contraseña temporal. La cuenta deberá cambiarla al iniciar sesión."],
        company: ["Verificación pendiente", "Grupo Norte", "El registro lleva cuatro días esperando validación documental."],
        inactive: ["Cuenta sin actividad", "8 cuentas candidatas", "Estas cuentas no registran movimientos durante el periodo configurado."],
        "company-edit": ["Empresa editada", "Banco Agrícola", "Se actualizaron los datos de contacto y la información visible de la empresa."],
        report: ["Reporte revisado", "Valoración de empleador", "El reporte fue consultado desde el centro de moderación."],
        login: ["Sesión iniciada", "Panel administrativo", "Acceso realizado desde un dispositivo reconocido."]
    };

    function closeModal() {
        detailModal.hidden = true;
        settingsModal.hidden = true;
        document.body.classList.remove("ld-modal-open");
    }

    function openDetail(key) {
        const content = detailContent[key] || detailContent.reset;
        detailModal.querySelector("[data-detail-action]").textContent = content[0];
        detailModal.querySelector("[data-detail-record]").textContent = content[1];
        detailModal.querySelector("[data-detail-note]").textContent = content[2];
        detailModal.hidden = false;
        document.body.classList.add("ld-modal-open");
        detailModal.querySelector("[data-security-close]").focus();
    }

    function applyFilters() {
        const query = search.value.trim().toLowerCase();
        const selectedType = filter.value;
        let visible = 0;
        rows.forEach(function (row) {
            const matchesType = selectedType === "all" || row.dataset.securityType === selectedType;
            const matchesQuery = !query || row.textContent.toLowerCase().includes(query);
            row.hidden = !(matchesType && matchesQuery);
            if (!row.hidden) visible += 1;
        });
        empty.hidden = visible > 0;
    }

    document.addEventListener("click", function (event) {
        const detailButton = event.target.closest("[data-security-detail], [data-security-log-detail]");
        if (detailButton) {
            openDetail(detailButton.dataset.securityDetail || detailButton.dataset.securityLogDetail);
            return;
        }
        if (event.target.closest("[data-security-open='settings']")) {
            settingsModal.hidden = false;
            document.body.classList.add("ld-modal-open");
            settingsModal.querySelector("input").focus();
            return;
        }
        if (event.target.closest("[data-security-close]")) {
            closeModal();
            return;
        }
        if (event.target.closest("[data-security-mark]") || event.target.closest("[data-security-save]")) {
            closeModal();
        }
        if (event.target.closest("[data-security-apply]")) applyFilters();
        if (event.target.closest("[data-security-export]")) {
            event.target.textContent = "Vista preparada";
            window.setTimeout(function () { event.target.textContent = "Exportar vista"; }, 1800);
        }
        if (event.target === detailModal || event.target === settingsModal) closeModal();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModal();
    });
});
