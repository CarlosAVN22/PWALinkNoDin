document.addEventListener('DOMContentLoaded', function () {
    const search = document.getElementById('rc-search');
    if (!search) return;
    const cards = Array.from(document.querySelectorAll('.rc-resource'));
    const buttons = Array.from(document.querySelectorAll('.rc-filter'));
    const count = document.getElementById('rc-count');
    const empty = document.getElementById('rc-empty');
    const detail = document.getElementById('rc-detail');
    const detailTitle = document.getElementById('rc-detail-title');
    const detailList = document.getElementById('rc-detail-list');
    const key = 'linknodin-recursos-guardados';
    const content = {
        cv: ['Cómo crear tu currículum', 'Coloca tus datos de contacto actualizados.', 'Resume tu formación y experiencia con información clara.', 'Añade habilidades relacionadas con el puesto al que deseas aplicar.', 'Revisa la ortografía antes de enviarlo.'],
        entrevista: ['Consejos para una entrevista', 'Investiga el puesto y la empresa antes de asistir.', 'Prepara ejemplos concretos de tus habilidades.', 'Practica cómo explicar tu experiencia y tus fortalezas.', 'Prepara preguntas sobre las responsabilidades del puesto.'],
        habilidades: ['Habilidades más buscadas', 'Identifica habilidades técnicas relacionadas con tu área.', 'Trabaja la comunicación, colaboración y organización.', 'Practica herramientas digitales útiles para el puesto.', 'Actualiza tu perfil con las habilidades que realmente dominas.']
    };
    let active = 'todos';
    let saved = [];
    try { const loaded = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(loaded)) saved = loaded.filter(x => Object.hasOwn(content, x)); } catch (error) { saved = []; }
    function update() {
        const term = search.value.trim().toLocaleLowerCase('es');
        let visible = 0;
        cards.forEach(function (card) {
            const id = card.dataset.resource;
            const matchCategory = active === 'todos' || (active === 'favoritos' ? saved.includes(id) : card.dataset.topic === active);
            const matchText = card.textContent.toLocaleLowerCase('es').includes(term);
            card.hidden = !(matchCategory && matchText);
            if (!card.hidden) visible++;
            const save = card.querySelector('.rc-save');
            save.setAttribute('aria-pressed', String(saved.includes(id)));
            save.textContent = saved.includes(id) ? 'Guardado' : 'Guardar';
        });
        empty.hidden = visible > 0;
        count.textContent = visible === 1 ? '1 recurso disponible' : visible + ' recursos disponibles';
    }
    buttons.forEach(button => button.addEventListener('click', function () {
        active = button.dataset.filter;
        buttons.forEach(b => b.classList.toggle('selected', b === button));
        update();
    }));
    cards.forEach(function (card) {
        const id = card.dataset.resource;
        card.querySelector('.rc-save').addEventListener('click', function () {
            saved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
            try { localStorage.setItem(key, JSON.stringify(saved)); } catch (error) { /* La navegación sigue funcionando sin almacenamiento. */ }
            update();
        });
        card.querySelector('.rc-preview').addEventListener('click', function () {
            const lines = content[id];
            detailTitle.textContent = lines[0];
            detailList.replaceChildren();
            lines.slice(1).forEach(function (line) { const li = document.createElement('li'); li.textContent = line; detailList.appendChild(li); });
            detail.hidden = false;
            detail.scrollIntoView({block:'nearest',behavior:'smooth'});
        });
    });
    document.getElementById('rc-close').addEventListener('click', function () { detail.hidden = true; });
    search.addEventListener('input', update);
    update();
});
