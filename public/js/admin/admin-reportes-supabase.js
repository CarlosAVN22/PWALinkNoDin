/* Centro de confianza de LinkNoDin: reportes reales de foros, sin tarjetas ficticias. */
import { adminRequest } from '/js/admin/admin-api.js';
const $ = selector => document.querySelector(selector);
function node(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
}
function button(text, action, cls = 'btn') {
    const element = node('button', cls, text);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
}
const errorText = error => error?.message || String(error);
const labels = { forum_topic: 'Tema de foro', forum_reply: 'Respuesta del foro' };
const statusText = { open: 'Pendiente', resolved_keep: 'Se mantuvo visible', resolved_removed: 'Se ocultó' };

async function start() {
    const host = $('main .content');
    if (!host) return;
    // Panel antiguo: contenía reportes escritos en HTML y acciones que solo desaparecían hasta F5.
    const oldPanel = $('#moderacion-demostracion');
    if (oldPanel) oldPanel.hidden = true;

    const card = node('section', 'panel ln-trust-panel');
    const head = node('div', 'ln-trust-header');
    const description = node('div');
    description.append(node('h2', '', 'Centro de confianza'));
    description.append(node('p', '', 'Reportes enviados por la comunidad. Revisa el contenido y decide si se mantiene o se oculta. Las decisiones quedan registradas en Supabase.'));
    const counter = node('span', 'ln-count', 'Cargando reportes...');
    head.append(description, counter);
    card.append(head);
    const filters = node('div', 'ln-trust-filters');
    const listing = node('div', 'ln-trust-list');
    const feedback = node('p', 'ln-trust-feedback');
    feedback.setAttribute('role', 'status');
    card.append(filters, listing, feedback);
    // Mantener las categorías en primer lugar y los reportes justo debajo.
    const categoriesPanel=host.querySelector('#ln-forum-admin');
    if(categoriesPanel) categoriesPanel.insertAdjacentElement('afterend',card);
    else host.prepend(card);
    const shortcut=node('a','btn btn-soft btn-sm','Gestionar categorías');
    shortcut.href='#ln-forum-admin';
    shortcut.title='Ir al formulario para crear y activar categorías';
    head.append(shortcut);

    let active = 'open';
    let data = [];
    async function load() {
        listing.replaceChildren(node('p', 'ln-empty', 'Cargando reportes de la comunidad...'));
        try {
            data = await adminRequest('/reports?status=all');
            await render();
        } catch (error) {
            listing.replaceChildren(node('p', 'ln-empty', 'No se pudieron cargar los reportes: ' + errorText(error)));
            counter.textContent = 'Sin datos';
        }
    }
    function confirmAction(text, run) {
        const backdrop = node('div', 'ld-report-overlay');
        const dialog = node('section', 'ld-report-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.append(node('h2', '', 'Confirmar decisión'), node('p', '', text));
        const actions = node('div', 'ld-report-actions');
        const close = () => { backdrop.remove(); document.removeEventListener('keydown', escape); };
        const escape = e => { if (e.key === 'Escape') close(); };
        actions.append(button('Cancelar', close));
        const confirm = button('Confirmar', async () => {
            confirm.disabled = true;
            try { await run(); close(); await load(); }
            catch (error) { feedback.textContent = 'No se guardó la decisión: ' + errorText(error); close(); }
        }, 'btn btn-primary');
        actions.append(confirm);dialog.append(actions);backdrop.append(dialog);document.body.append(backdrop);
        backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
        document.addEventListener('keydown', escape);
        confirm.focus();
    }

    async function decide(report, remove) {
        await adminRequest(`/reports/${report.id}/decision`, {
            method: 'PATCH',
            body: { decision: remove ? 'hide' : 'keep' }
        });
        feedback.textContent = remove ? 'Contenido ocultado y reportes atendidos.' : 'Reporte atendido: el contenido permanece visible.';
    }

    async function render() {
        filters.replaceChildren(); listing.replaceChildren();
        const waiting = data.filter(r => r.status === 'open').length;
        counter.textContent = waiting + (waiting === 1 ? ' reporte pendiente' : ' reportes pendientes');
        for (const [key, label] of [['open', 'Pendientes'], ['closed', 'Atendidos'], ['all', 'Todos']]) {
            const amount = data.filter(r => key === 'all' || (key === 'open' ? r.status === 'open' : r.status !== 'open')).length;
            const control = button(label + ' (' + amount + ')', () => { active = key; render(); });
            control.className = active === key ? 'is-current' : '';
            control.setAttribute('aria-pressed', String(active === key));
            filters.append(control);
        }
        const selected = data.filter(r => active === 'all' || (active === 'open' ? r.status === 'open' : r.status !== 'open'));
        if (!selected.length) {
            listing.append(node('p', 'ln-empty', active === 'open' ? 'No hay reportes pendientes. Los nuevos aparecerán aquí.' : 'No hay reportes en esta sección.'));
            return;
        }
        for (const report of selected) {
            const content = report.content;
            const item = node('article', 'ln-report-card');
            const copy = node('div');
            const pill = node('span', report.status === 'open' ? 'ln-pill' : 'ln-pill is-done', statusText[report.status] || report.status);
            copy.append(pill, node('h3', '', (labels[report.content_type] || 'Contenido') + ': ' + (report.content_type === 'forum_topic' ? (content?.title || 'Contenido no disponible') : 'Comentario #' + report.content_id)));
            copy.append(node('p', 'ln-content', content?.body || 'El contenido ya no está disponible.'));
            copy.append(node('p', '', 'Motivo: ' + report.reason + (report.description ? ' · ' + report.description : '')));
            copy.append(node('p', '', 'Recibido: ' + new Date(report.created_at).toLocaleString('es-SV')));
            item.append(copy);
            const actions = node('div', 'ln-report-actions');
            if (content) {
                const link = node('a', 'btn btn-soft btn-sm', 'Ver en el foro');
                link.href = '/doc/cursos-foros/foro-tema.html?id=' + (report.content_type === 'forum_topic' ? report.content_id : content.topic_id);
                actions.append(link);
            }
            if (report.status === 'open') {
                actions.append(button('Mantener visible', () => confirmAction('Este reporte quedará atendido y el contenido seguirá visible. No se borrará el registro.', () => decide(report, false)), 'btn btn-soft btn-sm'));
                actions.append(button('Ocultar contenido', () => confirmAction('El contenido dejará de mostrarse al público. Los reportes sobre este mismo contenido se marcarán como atendidos.', () => decide(report, true)), 'btn btn-danger btn-sm'));
            }
            item.append(actions); listing.append(item);
        }
    }
    await load();
}
document.addEventListener('DOMContentLoaded', start);
