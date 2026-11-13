import { dom, who, status, messageError } from './base.js';
import { generalRequest } from '/js/general/api-general.js';

async function init() {
    const host = document.getElementById('ld-notif-inbox');

    if (!host) {
        return;
    }

    const me = await who();

    if (!me) {
        return;
    }

    const root = dom('section', 'panel ln-integ-section');
    const help = dom(
        'p',
        'muted',
        'Tus preferencias se guardan en tu cuenta. Los avisos por correo requieren que el servicio de envío esté habilitado.'
    );
    const notice = dom('p', 'ld-status');

    root.append(dom('h2', '', 'Preferencias de notificaciones'), help, notice);
    host.insertAdjacentElement('afterend', root);

    const stored = await generalRequest('/notification-preferences');
    const types = [
        ['application_status', 'Cambios de mis postulaciones'],
        ['new_application', 'Nuevas postulaciones recibidas'],
        ['company_verification', 'Verificación empresarial'],
        ['course', 'Cursos y aprendizaje']
    ];

    for (const [code, title] of types) {
        let row = stored.find(item => item.notification_type === code) || null;

        const wrap = dom('div', 'ln-integ-card');
        const checkbox = dom('input');
        const email = dom('input');

        checkbox.type = 'checkbox';
        checkbox.checked = row?.in_app_enabled ?? true;

        email.type = 'checkbox';
        email.checked = row?.email_enabled ?? false;

        const label = dom('label');
        label.append(checkbox, document.createTextNode(' Mostrar avisos dentro de LinkNoDin'));

        const emailLabel = dom('label');
        emailLabel.append(email, document.createTextNode(' Solicitar avisos por correo (requiere configuración del servidor)'));

        wrap.append(dom('h3', '', title), label, emailLabel);
        root.append(wrap);

        async function save() {
            checkbox.disabled = true;
            email.disabled = true;

            try {
                const values = {
                    in_app_enabled: checkbox.checked,
                    email_enabled: email.checked
                };

                row = await generalRequest('/notification-preferences/' + code, 'PUT', values);
                status(notice, 'Preferencia guardada.');
            } catch (error) {
                status(notice, messageError(error), true);
            } finally {
                checkbox.disabled = false;
                email.disabled = false;
            }
        }

        checkbox.addEventListener('change', save);
        email.addEventListener('change', save);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
} else {
    init().catch(console.error);
}
