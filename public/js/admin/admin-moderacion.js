document.addEventListener("DOMContentLoaded", function () {
    const modal = document.querySelector("#moderation-modal");
    const form = document.querySelector("#moderation-form");
    const items = Array.from(document.querySelectorAll(".moderation-item"));
    const detailModal = document.querySelector("#moderation-detail-modal");
    const reportModal = document.querySelector("#moderation-report-modal");
    let editingRule = null;
    if (!modal || !form) return;

    function closeModal() {
        modal.hidden = true;
        form.reset();
        editingRule = null;
        document.body.classList.remove("ld-modal-open");
    }

    function confirmDecision(item, keepVisible) {
        const backdrop = document.createElement("div");
        backdrop.className = "admin-confirm-backdrop";
        backdrop.innerHTML = "<section class=\"admin-confirm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"confirm-title\">" +
            (keepVisible
                ? "<h2 id=\"confirm-title\">Mantener contenido visible</h2><p>El reporte se marcará como atendido y el contenido permanecerá visible en su área de origen.</p>"
                : "<h2 id=\"confirm-title\">Retirar contenido</h2><p>El contenido se ocultará de su área de origen y el reporte quedará marcado como atendido.</p>") +
            "<div class=\"admin-confirm-actions\"><button class=\"btn\" data-confirm-cancel type=\"button\">Cancelar</button>" +
            (keepVisible
                ? "<button class=\"btn btn-primary\" data-confirm-decision type=\"button\">Mantener visible</button>"
                : "<button class=\"btn btn-danger\" data-confirm-decision type=\"button\">Retirar contenido</button>") +
            "</div></section>";
        document.body.appendChild(backdrop);
        backdrop.querySelector("[data-confirm-decision]").focus();
        backdrop.addEventListener("click", function (event) {
            if (event.target === backdrop || event.target.closest("[data-confirm-cancel]")) backdrop.remove();
            if (event.target.closest("[data-confirm-decision]")) {
                item.remove();
                backdrop.remove();
            }
        });
    }

    function confirmRuleDelete(rule) {
        const backdrop = document.createElement("div");
        backdrop.className = "admin-confirm-backdrop";
        backdrop.innerHTML = "<section class=\"admin-confirm\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"confirm-title\">" +
            "<h2 id=\"confirm-title\">Eliminar regla</h2><p>La regla dejará de aplicarse en este prototipo.</p>" +
            "<div class=\"admin-confirm-actions\"><button class=\"btn\" data-confirm-cancel type=\"button\">Cancelar</button>" +
            "<button class=\"btn btn-danger\" data-confirm-delete type=\"button\">Eliminar</button></div></section>";
        document.body.appendChild(backdrop);
        backdrop.querySelector("[data-confirm-delete]").focus();
        backdrop.addEventListener("click", function (event) {
            if (event.target === backdrop || event.target.closest("[data-confirm-cancel]")) backdrop.remove();
            if (event.target.closest("[data-confirm-delete]")) {
                rule.remove();
                backdrop.remove();
            }
        });
    }

    function openRule(rule) {
        editingRule = rule;
        document.querySelector("#moderation-modal-title").textContent = rule ? "Editar regla de moderación" : "Nueva regla de moderación";
        document.querySelector("#rule-name").value = rule ? rule.dataset.ruleName : "";
        document.querySelector("#rule-action").value = rule ? rule.dataset.ruleAction : "Enviar a revisión";
        document.querySelector("#rule-threshold").value = rule ? rule.dataset.ruleThreshold : "2";
        modal.hidden = false;
        document.body.classList.add("ld-modal-open");
        document.querySelector("#rule-name").focus();
    }

    function openDetail(item) {
        detailModal.querySelector("[data-report-content]").textContent = item.dataset.reportContent;
        detailModal.querySelector("[data-report-reason]").textContent = item.dataset.reportReason;
        detailModal.querySelector("[data-report-author]").textContent = item.dataset.reportAuthor;
        detailModal.querySelector("[data-report-date]").textContent = item.dataset.reportDate;
        detailModal.querySelector("[data-report-source]").textContent = item.dataset.reportSource;
        detailModal.hidden = false;
        document.body.classList.add("ld-modal-open");
        detailModal.querySelector("[data-moderation-close]").focus();
    }

    function closeOverlay(overlay) {
        overlay.hidden = true;
        document.body.classList.remove("ld-modal-open");
    }

    document.addEventListener("click", function (event) {
        const action = event.target.closest("[data-moderation-action]");
        const filter = event.target.closest("[data-moderation-filter]");
        const opener = event.target.closest("[data-moderation-open]");
        const closer = event.target.closest("[data-moderation-close]");
        const ruleAction = event.target.closest("[data-rule-action]");
        const detail = event.target.closest("[data-moderation-detail]");
        const ruleToggle = event.target.closest("[data-rule-toggle]");

        if (closer) {
            closeModal();
            closeOverlay(detailModal);
            closeOverlay(reportModal);
            return;
        }
        if (opener && opener.dataset.moderationOpen === "rule") openRule(null);
        if (opener && opener.dataset.moderationOpen === "report-preview") {
            reportModal.hidden = false;
            document.body.classList.add("ld-modal-open");
            reportModal.querySelector("#report-reason").focus();
        }
        if (filter) {
            document.querySelectorAll("[data-moderation-filter]").forEach(function (button) {
                button.classList.toggle("is-active", button === filter);
            });
            items.forEach(function (item) {
                const matches = filter.dataset.moderationFilter === "all" ||
                    item.dataset.moderationType === filter.dataset.moderationFilter ||
                    item.dataset.moderationPriority === filter.dataset.moderationFilter;
                item.classList.toggle("is-hidden", !matches);
            });
        }
        if (action) {
            const item = action.closest(".moderation-item");
            confirmDecision(item, action.dataset.moderationAction === "keep");
        }
        if (detail) openDetail(detail.closest(".moderation-item"));
        if (event.target.closest("[data-moderation-source]")) {
            closeOverlay(detailModal);
        }
        if (event.target.closest("[data-report-submit]")) {
            closeOverlay(reportModal);
        }
        if (ruleToggle) {
            const isActive = ruleToggle.classList.toggle("is-active");
            ruleToggle.classList.toggle("is-inactive", !isActive);
            ruleToggle.textContent = isActive ? "Activa" : "Inactiva";
            ruleToggle.setAttribute("aria-pressed", String(isActive));
        }
        if (ruleAction) {
            const rule = ruleAction.closest(".moderation-rule");
            if (ruleAction.dataset.ruleAction === "edit") openRule(rule);
            if (ruleAction.dataset.ruleAction === "delete") confirmRuleDelete(rule);
        }
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const name = document.querySelector("#rule-name").value.trim();
        const action = document.querySelector("#rule-action").value;
        const threshold = document.querySelector("#rule-threshold").value;
        if (!name) return;
        const rule = editingRule || document.createElement("div");
        rule.className = "rowcard moderation-rule";
        rule.dataset.ruleName = name;
        rule.dataset.ruleAction = action;
        rule.dataset.ruleThreshold = threshold;
        rule.innerHTML = "<div><strong></strong><p class=\"muted\"></p></div><div><button class=\"rule-status is-active\" data-rule-toggle aria-pressed=\"true\" type=\"button\">Activa</button>" +
            "<button class=\"btn btn-soft btn-sm\" data-rule-action=\"edit\" type=\"button\">Editar</button>" +
            "<button class=\"btn btn-danger btn-sm\" data-rule-action=\"delete\" type=\"button\">Eliminar</button></div>";
        rule.querySelector("strong").textContent = name;
        rule.querySelector("p").textContent = action + " si recibe " + threshold + " reporte(s).";
        if (!editingRule) document.querySelector(".moderation-rules").appendChild(rule);
        closeModal();
    });

    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
    });

    [detailModal, reportModal].forEach(function (overlay) {
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) closeOverlay(overlay);
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) closeModal();
        if (event.key === "Escape") {
            closeOverlay(detailModal);
            closeOverlay(reportModal);
        }
    });
});
