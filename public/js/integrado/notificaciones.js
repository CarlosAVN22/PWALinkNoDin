import { $, dom, who, status, messageError } from './base.js';
import { generalRequest } from '/js/general/api-general.js';

async function init() {
    const old = $('ld-notif-inbox');

    if (!old) {
        return;
    }

    old.hidden = true;

    const root = dom('section', 'panel ln-integ-section');
    const info = dom('p', 'muted', 'Aquí aparecen tus notificaciones.');
    const list = dom('div');

    old.insertAdjacentElement('afterend', root);
    root.append(dom('h2', '', 'Mis notificaciones reales'), info, list);

    const me = await who();

    if (!me) {
        status(info, 'Inicia sesión para ver tus notificaciones.');
        return;
    }

    async function refresh() {
        const notices = await generalRequest('/notifications');

        list.replaceChildren();

        for (const note of notices) {
            const card = dom('article', 'ln-integ-card');

            card.append(
                dom('strong', '', note.title),
                dom('p', '', note.message)
            );

            if (note.target_url?.startsWith('/doc/')) {
                const link = dom('a', 'btn', 'Abrir');
                link.href = note.target_url;
                card.append(link);
            }

            if (!note.is_read) {
                const button = dom('button', 'btn', 'Marcar leída');

                button.onclick = async () => {
                    button.disabled = true;

                    try {
                        await generalRequest('/notifications/' + note.id + '/read', 'PATCH');
                        await refresh();
                    } catch (error) {
                        status(info, messageError(error), true);
                        button.disabled = false;
                    }
                };

                card.append(button);
            }

            list.append(card);
        }

        if (!notices.length) {
            list.append(dom('p', 'muted', 'No tienes notificaciones nuevas.'));
        }
    }

    try {
        await refresh();
    } catch (error) {
        status(info, messageError(error), true);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
