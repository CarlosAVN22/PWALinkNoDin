(() => {
  'use strict';
  const app = document.getElementById('ld-guide-app');
  if (!app) return;

  const guides = {
    candidato: [
      { title: 'Crear cuenta y perfil', steps: ['Abre el registro y selecciona Candidato.', 'Completa tus datos de prueba y crea la cuenta.', 'Inicia sesión y consulta tu panel personal.'], label: 'Ir al registro', url: '/doc/general/registro.html' },
      { title: 'Completar mi perfil', steps: ['Inicia sesión con tu cuenta de candidato.', 'Abre tu perfil y revisa los datos personales.', 'Completa la información profesional disponible.'], label: 'Abrir mi perfil', url: '/doc/general/perfil.html' },
      { title: 'Buscar empleos', steps: ['Abre el listado público de empleos.', 'Utiliza los filtros por ubicación o modalidad.', 'Selecciona una vacante para consultar los requisitos.'], label: 'Buscar empleos', url: '/doc/empleo/empleos.html' },
      { title: 'Postularme a una vacante', steps: ['Inicia sesión como candidato.', 'Abre una oferta y revisa sus requisitos.', 'Selecciona Postularme y completa la solicitud de prueba.'], label: 'Consultar vacantes', url: '/doc/empleo/empleos.html' },
      { title: 'Revisar mis postulaciones', steps: ['Entra con tu cuenta de candidato.', 'Abre Mis postulaciones desde el panel.', 'Consulta las solicitudes registradas en el prototipo.'], label: 'Mis postulaciones', url: '/doc/candidato/postulaciones.html' },
      { title: 'Consultar empresas y valoraciones', steps: ['Abre el listado público de empresas.', 'Selecciona una empresa para revisar su perfil.', 'Para publicar una valoración inicia sesión como candidato.'], label: 'Ver empresas', url: '/doc/empresa/empresas.html' },
      { title: 'Explorar recursos y cursos', steps: ['Visita Recursos para leer consejos profesionales.', 'Abre Cursos y consulta las lecciones disponibles.', 'Revisa los requisitos de acceso de los contenidos.'], label: 'Ver recursos', url: '/doc/general/recursos.html' }
    ],
    empresa: [
      { title: 'Registrar mi empresa', steps: ['Abre el registro y selecciona el tipo Empresa.', 'Completa los datos de demostración.', 'Inicia sesión con las credenciales creadas.'], label: 'Registrar empresa', url: '/doc/empresa/registro-empresa.html' },
      { title: 'Completar perfil empresarial', steps: ['Inicia sesión como empresa.', 'Accede al panel empresarial.', 'Revisa y actualiza la información del perfil.'], label: 'Perfil de empresa', url: '/doc/empresa/empresa-perfil.html' },
      { title: 'Publicar una vacante', steps: ['Entra al panel con una cuenta empresarial.', 'Abre el formulario de publicación.', 'Completa puesto, ubicación, requisitos y descripción.'], label: 'Publicar vacante', url: '/doc/empleo/publicar.html' },
      { title: 'Revisar postulaciones', steps: ['Accede al panel empresarial.', 'Abre el apartado de candidatos.', 'Consulta las postulaciones recibidas en el prototipo.'], label: 'Ver candidatos', url: '/doc/empresa/empresa-candidatos.html' },
      { title: 'Administrar vacantes', steps: ['Inicia sesión como empresa.', 'Accede a la administración de vacantes.', 'Revisa las ofertas de empleo publicadas.'], label: 'Administrar vacantes', url: '/doc/empresa/empresa-vacantes.html' }
    ]
  };
  const content = document.getElementById('ld-guide-content');
  const heading = document.getElementById('ld-guide-heading');
  const counter = document.getElementById('ld-guide-counter');
  const progress = document.getElementById('ld-guide-progress');
  const progressFill = document.getElementById('ld-guide-progress-fill');
  const tabs = [...app.querySelectorAll('[data-role]')];
  let active = 'candidato';

  function currentUser() {
    try { const session = JSON.parse(localStorage.getItem('linknodin-v3-session')); return session?.email && session?.role ? session.role + ':' + session.email.toLowerCase() : 'visitante'; }
    catch { return 'visitante'; }
  }
  const storageKey = () => 'linknodin-guide-progress:' + currentUser() + ':' + active;
  function loadProgress() {
    try { const saved = JSON.parse(localStorage.getItem(storageKey())); return Array.isArray(saved) ? saved.filter(n => Number.isInteger(n) && n >= 0 && n < guides[active].length) : []; }
    catch { return []; }
  }
  function saveProgress(items) { localStorage.setItem(storageKey(), JSON.stringify(items)); }
  function updateProgress() {
    const selected = loadProgress();
    const count = selected.length;
    counter.textContent = count + ' de ' + guides[active].length + ' actividades completadas';
    progress.setAttribute('aria-valuenow', String(count));
    progress.setAttribute('aria-valuemax', String(guides[active].length));
    progressFill.style.width = (count / guides[active].length * 100) + '%';
  }
  function render() {
    heading.textContent = active === 'candidato' ? 'Guía para candidatos' : 'Guía para empresas';
    tabs.forEach(tab => {
      const selected = tab.dataset.role === active;
      tab.setAttribute('aria-selected', String(selected));
      tab.classList.toggle('btn-primary', selected);
    });
    content.setAttribute('aria-labelledby', active === 'candidato' ? 'ld-guide-candidato' : 'ld-guide-empresa');
    content.replaceChildren();
    const finished = loadProgress();
    guides[active].forEach((guide, i) => {
      const section = document.createElement('section');
      section.className = 'panel ld-guide-card';
      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'ld-guide-toggle';
      header.setAttribute('aria-expanded', String(i === 0));
      header.setAttribute('aria-controls', 'ld-guide-detail-' + active + '-' + i);
      const num = document.createElement('span'); num.className = 'ld-guide-number'; num.textContent = String(i + 1);
      const title = document.createElement('span'); title.className = 'ld-guide-card-title'; title.textContent = guide.title;
      const state = document.createElement('span'); state.className = 'ld-guide-status'; state.textContent = finished.includes(i) ? 'Completado' : 'Pendiente';
      const arrow = document.createElement('span'); arrow.className = 'ld-guide-arrow'; arrow.textContent = i === 0 ? '−' : '+';
      header.append(num, title, state, arrow);
      const detail = document.createElement('div'); detail.id = 'ld-guide-detail-' + active + '-' + i; detail.className = 'ld-guide-detail'; detail.hidden = i !== 0;
      const ol = document.createElement('ol'); guide.steps.forEach(step => { const li=document.createElement('li'); li.textContent=step; ol.append(li); });
      const actions = document.createElement('div'); actions.className = 'ld-guide-actions';
      const link = document.createElement('a'); link.className = 'btn btn-primary'; link.href = guide.url; link.textContent = guide.label;
      const done = document.createElement('button'); done.type = 'button'; done.className = 'btn ld-guide-complete';
      done.textContent = finished.includes(i) ? 'Marcar como pendiente' : 'Marcar como completado';
      done.addEventListener('click', () => {
        let saved = loadProgress();
        saved = saved.includes(i) ? saved.filter(value => value !== i) : [...saved, i];
        saveProgress(saved);
        state.textContent = saved.includes(i) ? 'Completado' : 'Pendiente';
        done.textContent = saved.includes(i) ? 'Marcar como pendiente' : 'Marcar como completado';
        updateProgress();
      });
      actions.append(link, done); detail.append(ol, actions);
      header.addEventListener('click', () => {
        const show = detail.hidden;
        detail.hidden = !show;
        header.setAttribute('aria-expanded', String(show));
        arrow.textContent = show ? '−' : '+';
      });
      section.append(header, detail); content.append(section);
    });
    updateProgress();
  }
  tabs.forEach(tab => tab.addEventListener('click', () => { active = tab.dataset.role; render(); }));
  render();
})();
