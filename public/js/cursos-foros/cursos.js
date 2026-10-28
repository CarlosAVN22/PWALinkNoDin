// Cursos de demostración: las lecciones se completan manualmente.
document.addEventListener('DOMContentLoaded', function () {
  const $ = id => document.getElementById(id);
  const prefix = 'linknodin-v3-';
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; } catch (e) { return fallback; } }
  const session = read('session', null);
  const accounts = read('accounts', []);
  const account = session && accounts.find(a => a.email === session.email && a.role === session.role);
  const candidate = !!account && account.role === 'candidato';
  const premium = !!account && account.plan === 'Premium';
  const progressKey = candidate ? 'cursos-carlos-' + account.email.toLowerCase() : null;
  const courses = [
    {id:'cv',title:'Cómo crear un currículum profesional',description:'Prepara un CV claro y adecuado a las oportunidades laborales.',level:'Básico',duration:'25 min',free:true,lessons:[['Estructura de un currículum','Identifica las secciones básicas de un currículum.'],['Experiencia y estudios','Organiza tus estudios y experiencias de forma clara.'],['Revisión y presentación','Revisa ortografía, formato y presentación final.']]},
    {id:'entrevistas',title:'Preparación para entrevistas',description:'Practica respuestas, presentación y preguntas habituales.',level:'Básico',duration:'35 min',free:false,lessons:[['Conocer la empresa','Investiga la empresa y el puesto antes de la entrevista.'],['Respuestas profesionales','Prepara ejemplos de tus capacidades y experiencia.'],['Preguntas finales','Formula preguntas claras sobre las funciones del puesto.']]},
    {id:'digital',title:'Habilidades digitales para el empleo',description:'Conoce herramientas digitales útiles en el entorno laboral.',level:'Intermedio',duration:'45 min',free:false,lessons:[['Organización digital','Ordena archivos y documentos laborales.'],['Hojas de cálculo','Conoce las funciones básicas para organizar datos.'],['Seguridad digital','Aprende buenas prácticas para proteger tus cuentas.']]}
  ];
  // Se pueden agregar URLs verificadas de YouTube que permitan inserción, por ejemplo:
  // courses[0].lessons[0][2] = 'https://www.youtube-nocookie.com/embed/ID_VERIFICADO';
  let progress = progressKey ? read(progressKey, {}) : {};
  let active = null, step = 0;
  const root = $('ld-courses'); const detail = $('cf-detail');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function done(id) { return Array.isArray(progress[id]) ? progress[id] : []; }
  function render() {
    const search = $('cf-search').value.toLowerCase().trim(), level = $('cf-level').value;
    const visible = courses.filter(c => (level === 'todos' || c.level === level) && (c.title + ' ' + c.description).toLowerCase().includes(search));
    root.innerHTML = visible.length ? '<div class="cf-grid">' + visible.map(c => {
      const count = done(c.id).length, locked = !c.free && !premium;
      return `<article class="cf-card"><div class="cf-cover"><strong>${escape(c.title)}</strong><span>FORMACIÓN LINKNODIN</span></div><div class="cf-card-content"><span class="ld-overline">${c.free?'GRATUITO':'PREMIUM DE PRUEBA'}</span><h2>${escape(c.title)}</h2><p>${escape(c.description)}</p><div class="cf-tags"><span>${c.level}</span><span>${c.duration}</span><span>${c.lessons.length} lecciones</span></div><p class="cf-lock">${locked?'Disponible con Premium de demostración':candidate?'Tu progreso: '+count+'/'+c.lessons.length+' lecciones':'Catálogo público. Inicia sesión como candidato para guardar progreso.'}</p><button type="button" class="btn btn-primary" data-open-course="${c.id}">${locked?'Ver acceso':'Ver curso'}</button></div></article>`;
    }).join('') + '</div>' : '<div class="cf-empty">No encontramos cursos con esos filtros.</div>';
  }
  function showCourse(id) {
    const course = courses.find(c => c.id === id); if (!course) return;
    if (!course.free && !premium) { location.href = '/doc/general/planes.html'; return; }
    active = course; step = 0; detail.hidden = false; drawLesson(); detail.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function drawLesson() {
    const c = active; if (!c) return;
    $('cf-detail-title').textContent = c.title;
    $('cf-detail-meta').textContent = c.level + ' · ' + c.duration;
    $('cf-detail-desc').textContent = c.description;
    $('cf-lesson-title').textContent = c.lessons[step][0];
    $('cf-lesson-text').textContent = c.lessons[step][1];
    const frame = $('cf-video-frame'); frame.replaceChildren();
    const url = c.lessons[step][2];
    if (url && /^https:\/\/www\.youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]+$/.test(url)) {
      const iframe = document.createElement('iframe'); iframe.src = url; iframe.title = 'Vídeo: '+c.lessons[step][0]; iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; frame.append(iframe);
    } else {
      const box = document.createElement('div'); box.className = 'cf-video-placeholder';
      const title = document.createElement('strong'); title.textContent = 'Vídeo pendiente de incorporar';
      const info = document.createElement('p'); info.textContent = 'Este espacio reproducirá la lección sin salir de LinkNoDin. El equipo añadirá un vídeo educativo que permita inserción.';
      box.append(title, info); frame.append(box);
    }
    $('cf-prev').disabled = step === 0;
    $('cf-next').disabled = step === c.lessons.length - 1;
    $('cf-complete').disabled = !candidate || done(c.id).includes(step);
    $('cf-complete').textContent = !candidate ? 'Inicia sesión para guardar progreso' : done(c.id).includes(step) ? 'Lección completada' : 'Marcar lección completada';
    const doneCount = done(c.id).length;
    $('cf-progress-label').textContent = doneCount+' de '+c.lessons.length+' lecciones completadas ('+Math.round(doneCount/c.lessons.length*100)+'%)';
    $('cf-progress-bar').style.width = (doneCount/c.lessons.length*100)+'%';
    $('cf-lesson-list').replaceChildren();
    c.lessons.forEach((lesson,i) => {const b=document.createElement('button');b.type='button';b.className='cf-lesson-button'+(i===step?' active':'');b.textContent=(i+1)+'. '+lesson[0];const small=document.createElement('small');small.textContent=done(c.id).includes(i)?'Completada':'Pendiente';b.append(small);b.onclick=()=>{step=i;$('cf-message').textContent='';drawLesson();};$('cf-lesson-list').append(b);});
  }
  // El carrusel anterior utiliza los mismos identificadores. Se reemplaza su contenido
  // tras inicializarse para conservar las otras funciones del archivo compartido.
  root.addEventListener('click', e => {const button=e.target.closest('[data-open-course]');if(button)showCourse(button.dataset.openCourse);});
  $('cf-search').addEventListener('input',render); $('cf-level').addEventListener('change',render);
  $('cf-close').onclick=()=>{detail.hidden=true;active=null;$('cf-video-frame').replaceChildren();};
  $('cf-prev').onclick=()=>{if(step>0){step--;drawLesson();}};
  $('cf-next').onclick=()=>{if(active&&step<active.lessons.length-1){step++;drawLesson();}};
  $('cf-complete').onclick=()=>{
    if(!candidate){location.href='/doc/general/login.html?next='+encodeURIComponent(location.pathname);return;}
    if(!active)return;
    progress[active.id]=Array.from(new Set([...done(active.id),step])).sort((a,b)=>a-b);
    localStorage.setItem(prefix+progressKey,JSON.stringify(progress));
    $('cf-message').textContent='Progreso guardado para tu cuenta.'; drawLesson();render();
  };
  render();
});
