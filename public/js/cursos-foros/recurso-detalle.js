document.addEventListener('DOMContentLoaded', function () {
    const resources = {
        cv: {
            title: 'Cómo crear un currículum profesional', category: 'Currículum', minutes: 6,
            intro: 'Organiza tu experiencia, formación y habilidades en un documento claro y fácil de revisar.',
            sections: [
                ['Prepara tus datos', 'Incluye nombre, un correo profesional, teléfono y tu ubicación general. Comprueba que los datos estén actualizados.'],
                ['Describe tu perfil', 'Redacta un resumen breve que muestre tus conocimientos, objetivos y fortalezas relacionadas con el empleo.'],
                ['Organiza estudios y experiencia', 'Presenta primero la información más reciente. Si todavía no has trabajado, incluye proyectos académicos, prácticas o voluntariado.'],
                ['Agrega habilidades relevantes', 'Incluye herramientas, idiomas y capacidades que realmente dominas y que sean útiles para la vacante.'],
                ['Revisa antes de enviarlo', 'Evita errores ortográficos, utiliza un formato legible y adapta tu currículum al puesto al que deseas postularte.']
            ],
            checklist: ['Revisar los datos de contacto', 'Describir formación y experiencia', 'Añadir habilidades reales', 'Revisar ortografía y formato']
        },
        entrevista: {
            title: 'Consejos para una entrevista', category: 'Entrevistas', minutes: 5,
            intro: 'Prepárate para presentar tus habilidades con seguridad y conocer mejor el puesto.',
            sections: [
                ['Investiga la empresa', 'Lee sobre sus actividades, el puesto ofrecido y las responsabilidades principales antes de la entrevista.'],
                ['Prepara tus respuestas', 'Piensa en ejemplos breves de proyectos, estudios o situaciones en las que hayas resuelto problemas.'],
                ['Practica tu presentación', 'Ensaya cómo explicar quién eres, qué sabes hacer y por qué te interesa el puesto.'],
                ['Cuida la comunicación', 'Escucha las preguntas con atención, responde de manera clara y mantén un trato respetuoso.'],
                ['Realiza tus preguntas', 'Prepara dudas sobre funciones, horarios, formación y próximos pasos del proceso de selección.']
            ],
            checklist: ['Investigar empresa y vacante', 'Preparar ejemplos de experiencia', 'Practicar respuestas', 'Escribir preguntas para la entrevista']
        },
        habilidades: {
            title: 'Habilidades más buscadas', category: 'Habilidades', minutes: 5,
            intro: 'Reconoce las capacidades profesionales que puedes mejorar y destacar en tus postulaciones.',
            sections: [
                ['Identifica habilidades técnicas', 'Consulta los requisitos de las vacantes de tu área y enumera las herramientas que necesitas aprender.'],
                ['Desarrolla habilidades interpersonales', 'Practica la comunicación, el trabajo en equipo, la responsabilidad y la organización del tiempo.'],
                ['Mejora tus capacidades digitales', 'Familiarízate con procesadores de texto, hojas de cálculo y herramientas útiles para tu sector.'],
                ['Aprende mediante la práctica', 'Realiza ejercicios y proyectos pequeños que demuestren cómo aplicas tus conocimientos.'],
                ['Actualiza tu perfil profesional', 'Incluye únicamente habilidades que dominas y agrega ejemplos de cómo las has utilizado.']
            ],
            checklist: ['Identificar habilidades que requiere mi área', 'Elegir una habilidad para practicar', 'Realizar un proyecto pequeño', 'Actualizar el perfil con lo aprendido']
        }
    };
    const favoriteKey = 'linknodin-recursos-guardados';
    const readKey = 'linknodin-recursos-leidos';
    const params = new URLSearchParams(location.search);
    const id = Object.hasOwn(resources, params.get('id')) ? params.get('id') : 'cv';
    const data = resources[id];
    function load(key) {
        try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
        catch (error) { return []; }
    }
    let favorites = load(favoriteKey);
    let read = load(readKey);
    function store(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* La lectura sigue disponible. */ }
    }
    function showStatus(message) {
        document.getElementById('rd-status').textContent = message;
    }
    document.title = data.title + ' | LinkNoDin';
    document.getElementById('rd-title').textContent = data.title;
    document.getElementById('rd-category').textContent = data.category;
    document.getElementById('rd-reading').textContent = 'Lectura estimada: ' + data.minutes + ' minutos';
    document.getElementById('rd-intro').textContent = data.intro;
    const sectionRoot = document.getElementById('rd-sections');
    data.sections.forEach(function (section, index) {
        const block = document.createElement('section');
        block.className = 'rd-section';
        const title = document.createElement('h2');
        title.textContent = (index + 1) + '. ' + section[0];
        const body = document.createElement('p');
        body.textContent = section[1];
        block.append(title, body);
        sectionRoot.appendChild(block);
    });
    const list = document.getElementById('rd-checklist');
    data.checklist.forEach(function (item) {
        const li = document.createElement('li'); li.textContent = item; list.appendChild(li);
    });
    const saveButton = document.getElementById('rd-save');
    const readButton = document.getElementById('rd-read');
    function update() {
        const saved = favorites.includes(id);
        const completed = read.includes(id);
        saveButton.textContent = saved ? 'Quitar de guardados' : 'Guardar recurso';
        saveButton.setAttribute('aria-pressed', String(saved));
        readButton.textContent = completed ? 'Marcar como pendiente' : 'Marcar como leído';
        readButton.setAttribute('aria-pressed', String(completed));
    }
    saveButton.addEventListener('click', function () {
        favorites = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
        store(favoriteKey, favorites);
        showStatus(favorites.includes(id) ? 'Recurso guardado.' : 'Recurso quitado de guardados.');
        update();
    });
    readButton.addEventListener('click', function () {
        read = read.includes(id) ? read.filter(x => x !== id) : [...read, id];
        store(readKey, read);
        showStatus(read.includes(id) ? 'Lectura marcada como completada.' : 'Lectura marcada como pendiente.');
        update();
    });
    const related = document.getElementById('rd-related-list');
    Object.keys(resources).filter(x => x !== id).forEach(function (otherId) {
        const link = document.createElement('a');
        link.className = 'rd-related-card';
        link.href = '/doc/cursos-foros/recurso-detalle.html?id=' + otherId;
        const tag = document.createElement('span');
        tag.textContent = resources[otherId].category;
        const label = document.createElement('strong');
        label.textContent = resources[otherId].title;
        link.append(tag, label);
        related.appendChild(link);
    });
    update();
});
