(function () {
    'use strict';

    const requested = new URLSearchParams(location.search).get('id');
    const customTopic = (window.LinkNoDinPublicaciones?.get()||[]).find(x=>x.tipo==='foro'&&x.id===requested&&x.estado==='aprobado');
    const topicId = requested || 'entrevista-demo';
    if (requested && !customTopic) {
        document.querySelector('.ld-forum > .panel:first-child h1').textContent = 'Tema no disponible';
        document.querySelector('.ld-forum > .panel:first-child p:nth-of-type(2)').textContent = 'Este tema no existe o todavía no fue aprobado.';
    } else if (customTopic) {
        const header=document.querySelector('.ld-forum > .panel:first-child');
        header.querySelector('h1').textContent=customTopic.titulo;
        const ps=header.querySelectorAll('p');
        ps[1].textContent=customTopic.descripcion;
        ps[2].textContent='Publicado por '+customTopic.autor+' · '+customTopic.categoria;
    }
    const key = 'linknodin-foro-respuestas-' + topicId;
    const example = { id: 'ejemplo', author: 'Comunidad LinkNoDin', message: 'Investiga la empresa, practica tus respuestas y prepara preguntas sobre el puesto.', date: 'Ejemplo de respuesta', demo: true };
    const list = document.getElementById('ld-forum-answers');
    const total = document.getElementById('ld-forum-total');
    const form = document.getElementById('ld-forum-form');
    const input = document.getElementById('ld-forum-message');
    const count = document.getElementById('ld-forum-count');
    const permission = document.getElementById('ld-forum-permission');
    const status = document.getElementById('ld-forum-status');
    const modal = document.getElementById('ld-forum-modal');
    let pending = null;

    function getSession() {
        try { return JSON.parse(localStorage.getItem('linknodin-v3-session') || 'null'); }
        catch (e) { return null; }
    }
    function getCandidate() {
        const s = getSession();
        if (!s || !['candidato','empresa'].includes(s.role) || !s.email) return null;
        try {
            const accounts = JSON.parse(localStorage.getItem('linknodin-v3-accounts') || '[]');
            if (!accounts.some(a => a.role === s.role && String(a.email).toLowerCase() === String(s.email).toLowerCase())) return null;
        } catch (e) { return null; }
        return s;
    }
    function load() {
        try { const items = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(items) ? items : []; }
        catch (e) { return []; }
    }
    function save(items) { localStorage.setItem(key, JSON.stringify(items)); }
    function accountName(session) {
        try {
            const accounts = JSON.parse(localStorage.getItem('linknodin-v3-accounts') || '[]');
            const a = accounts.find(x => x.email === session.email && x.role === session.role);
            return (a && (a.nombre || a.name || a.nombreCompleto)) || session.name || session.nombre || session.email;
        } catch (e) { return session.email; }
    }
    function element(tag, cls, content) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (content !== undefined) el.textContent = content;
        return el;
    }
    function render() {
        const candidate = getCandidate();
        const items = (topicId === 'entrevista-demo' && !requested ? [example] : []).concat(load());
        list.replaceChildren();
        total.textContent = items.length + (items.length === 1 ? ' respuesta' : ' respuestas');
        items.forEach(item => {
            const article = element('article', 'ld-forum-answer');
            const head = element('div', 'ld-forum-heading');
            const meta = element('div');
            meta.append(element('strong', '', item.author || 'Usuario'), element('small', 'muted', ' · ' + (item.date || 'Sin fecha')));
            head.append(meta);
            if (!item.demo && candidate && item.owner === candidate.email.toLowerCase()) {
                const remove = element('button', 'btn btn-sm', 'Eliminar mi respuesta');
                remove.type = 'button';
                remove.addEventListener('click', () => { pending = item.id; modal.hidden = false; document.getElementById('ld-forum-cancel').focus(); });
                head.append(remove);
            }
            article.append(head, element('p', '', item.message));
            list.append(article);
        });
        const isAllowed = Boolean(candidate) && (!requested || Boolean(customTopic));
        input.disabled = !isAllowed;
        form.querySelector('button[type="submit"]').disabled = !isAllowed;
        permission.hidden = isAllowed;
        if (!isAllowed) {
            permission.replaceChildren(document.createTextNode('Para responder debes iniciar sesión como candidato o empresa. '));
            const a = element('a', '', 'Iniciar sesión');
            a.href = '/doc/general/login.html?next=' + encodeURIComponent(location.pathname + location.search);
            permission.append(a);
        }
    }
    input.addEventListener('input', () => { count.textContent = input.value.length; });
    form.addEventListener('submit', event => {
        event.preventDefault();
        const candidate = getCandidate();
        if (!candidate || (requested && !customTopic)) return render();
        const message = input.value.trim();
        if (!message || message.length > 1000) return;
        const items = load();
        items.push({id: String(Date.now()) + '-' + String(Math.random()).slice(2, 8), author: accountName(candidate), owner: candidate.email.toLowerCase(), message, date: new Date().toLocaleString('es-SV')});
        save(items);
        input.value = '';
        count.textContent = '0';
        status.textContent = 'Tu respuesta se publicó en esta demostración.';
        render();
    });
    function closeModal() { pending = null; modal.hidden = true; }
    document.getElementById('ld-forum-cancel').addEventListener('click', closeModal);
    document.getElementById('ld-forum-confirm').addEventListener('click', () => {
        const candidate = getCandidate();
        if (candidate && pending) {
            save(load().filter(x => !(x.id === pending && x.owner === candidate.email.toLowerCase())));
            status.textContent = 'Tu respuesta fue eliminada.';
        }
        closeModal(); render();
    });
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
    render();
})();
