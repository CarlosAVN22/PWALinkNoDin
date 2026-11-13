/* Interacciones del prototipo LinkNoDin: solo datos de demostración guardados en este navegador. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const page = (name) => ({
    'index.html':'/doc/general/index.html',
    'login.html':'/doc/general/login.html',
    'registro.html':'/doc/general/registro.html',
    'planes.html':'/doc/general/planes.html',
    'perfil.html':'/doc/general/perfil.html',
    'alertas.html':'/doc/general/alertas.html',
    'candidato.html':'/doc/candidato/candidato.html',
    'empresa-panel.html':'/doc/empresa/empresa-panel.html',
    'empresa-perfil.html':'/doc/empresa/empresa-perfil.html',
    'empresa-candidatos.html':'/doc/empresa/empresa-candidatos.html',
    'publicar.html':'/doc/empleo/publicar.html',
    'empleos.html':'/doc/empleo/empleos.html',
    'detalle-empleo.html':'/doc/empleo/detalle-empleo.html',
    'postulaciones.html':'/doc/candidato/postulaciones.html',
    'recursos.html':'/doc/general/recursos.html',
    'cursos.html':'/doc/cursos-foros/cursos.html',
    'foros.html':'/doc/cursos-foros/foros.html',
    'valorar.html':'/doc/empresa/valorar.html'
  }[name] || name);
  const KEY = 'linknodin-v3-';
  const get = (name, fallback) => { try { const value = JSON.parse(localStorage.getItem(KEY + name)); return value ?? fallback; } catch { return fallback; } };
  const put = (name, value) => localStorage.setItem(KEY + name, JSON.stringify(value));
  const session = () => get('session', null);
  const ADMIN_EMAIL = 'admin@linknodin.demo';
  const ADMIN_PASSWORD = 'Admin123!';
  const isAdmin = () => session()?.email === ADMIN_EMAIL && session()?.role === 'admin';
  const accounts = () => get('accounts', []);
  const current = () => isAdmin() ? {email:ADMIN_EMAIL,name:'Administrador',role:'admin',plan:'Gratuito'} : (accounts().find(a => a.email === session()?.email && a.role === session()?.role) || null);
  const plan = () => current()?.plan || 'Gratuito';
  const encode = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const baseJobs = [
    {id:'demo-ui', title:'Diseñador UI/UX', company:'Súper Selectos', city:'San Salvador', modality:'Remoto', contract:'No especificado', experience:'No especificada', description:'Diseño de interfaces y experiencias digitales.', isDemo:true},
    {id:'demo-web', title:'Desarrollador Web', company:'Banco Agrícola', city:'Santa Ana', modality:'Presencial', contract:'Tiempo completo', experience:'No especificada', description:'Desarrollo de portales web e interfaces. Conocimientos de HTML, CSS y Bootstrap.', isDemo:true},
    {id:'demo-data', title:'Analista de datos', company:'ADOC', city:'San Miguel', modality:'Híbrido', contract:'No especificado', experience:'No especificada', description:'Análisis de datos y elaboración de reportes.', isDemo:true},
    {id:'demo-admin', title:'Asistente administrativo', company:'Grupo Central', city:'San Salvador', modality:'Presencial', contract:'No especificado', experience:'No especificada', description:'Apoyo en tareas administrativas.', isDemo:true}
  ];
  const cityCoords = {
    'san salvador':[13.6929,-89.2182], 'santa ana':[13.9942,-89.5597], 'san miguel':[13.4833,-88.1833],
    'sonsonate':[13.7189,-89.7248], 'ahuachapan':[13.9214,-89.845], 'chalchuapa':[13.9867,-89.6811],
    'la libertad':[13.4883,-89.3222], 'santa tecla':[13.6769,-89.2797], 'antiguo cuscatlan':[13.6644,-89.2502],
    'usulutan':[13.3500,-88.4500], 'la union':[13.3369,-87.8439], 'zacatecoluca':[13.5000,-88.8667],
    'san vicente':[13.6411,-88.7858], 'cojutepeque':[13.7167,-88.9333], 'sensuntepeque':[13.8667,-88.6333],
    'chalatenango':[14.0333,-88.9333], 'metapan':[14.3333,-89.4500], 'apopa':[13.8074,-89.1792]
  };
  const coords = (city, job) => { const location = norm(city).replace(/,\s*el salvador$/,''); const name = Object.keys(cityCoords).find(n => location === n || location.startsWith(n + ',') || location.startsWith(n + ' ')); if(job && Number(job.latitude) && Number(job.longitude)){if(!job.approximateLocation)return [Number(job.latitude),Number(job.longitude)];if(name)return cityCoords[name];return [Math.round(Number(job.latitude)*100)/100,Math.round(Number(job.longitude)*100)/100];}return name ? cityCoords[name] : null; };
  const jobs = () => [...baseJobs, ...get('jobs', []).filter(x => x && x.id && x.title && x.city && (!x.status || x.status === 'Activa'))];
  function updateAccount(changes) {
    const user = current(); if (!user) return false;
    put('accounts', accounts().map(a => a.email === user.email ? {...a, ...changes} : a)); return true;
  }
  function banner(message, kind='info') {
    const n = $('ld-status'); if (n) { n.textContent = message; n.dataset.kind = kind; }
  }
  function nav() {
    const actions = document.querySelector('.actions'); if (!actions) return;
    if (current()) {
      [...actions.querySelectorAll('a')].forEach(a => { if (['login.html','registro.html'].includes(a.getAttribute('href')?.split('/').pop())) a.remove(); });
      const profile = document.createElement('a'); profile.className = 'btn btn-sm'; profile.href = current().role === 'admin' ? '/doc/admin/admin.html' : page(current().role === 'empresa' ? 'empresa-panel.html' : 'candidato.html'); profile.textContent = 'Mi panel';
      const logout = document.createElement('button'); logout.type = 'button'; logout.className = 'btn btn-soft btn-sm'; logout.textContent='Salir'; logout.addEventListener('click', () => { localStorage.removeItem(KEY + 'session'); location.href=page('index.html'); });
      actions.append(profile, logout);
    }
    if (current() && current().role !== 'admin' && document.querySelector('.navlinks') && !$('ld-plan-nav')) {
      const a = document.createElement('a'); a.id='ld-plan-nav'; a.href=page('planes.html'); a.textContent = plan() === 'Premium' ? '✦ Premium' : 'Planes'; document.querySelector('.navlinks').append(a);
    }
  }
  function protectPages() {
    const path=location.pathname;
    const role=current()?.role;
    let permitted=null;
    if (path.startsWith('/doc/admin/')) permitted='admin';
    else if (['/doc/empresa/empresa-panel.html','/doc/empresa/empresa-perfil.html','/doc/empresa/empresa-vacantes.html','/doc/empresa/empresa-candidatos.html','/doc/empleo/publicar.html'].includes(path)) permitted='empresa';
    else if (['/doc/candidato/candidato.html','/doc/candidato/candidato-detalle.html','/doc/candidato/postulaciones.html','/doc/candidato/postular.html','/doc/empleo/guardados.html','/doc/general/perfil.html'].includes(path)) permitted='candidato';
    if (permitted && role !== permitted) {
      const next=encodeURIComponent(path+location.search);
      sessionStorage.setItem('ld-protected-message','Esta vista solo está disponible para el rol: '+permitted+'.');
      location.replace('/doc/general/login.html?next='+next);
      return false;
    }
    return true;
  }
  if (!protectPages()) return;
  function initAuth() {
    const reg = $('ld-register');
    if (reg) reg.addEventListener('submit', e => {
      e.preventDefault();
      const items = [...reg.querySelectorAll('input')];
      const name = items[0]?.value.trim();
      const email = norm(items.find(i => /correo/i.test(i.placeholder))?.value);
      const pw = items.find(i => i.type === 'password')?.value || '';
      const confirm = items.find(i => /confirmar/i.test(i.placeholder))?.value || '';
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return banner('Completa el nombre y un correo válido.','error');
      if (pw.length < 6 || pw !== confirm) return banner('La contraseña debe tener al menos 6 caracteres y coincidir con la confirmación.','error');
      if (email === ADMIN_EMAIL) return banner('Este correo está reservado para el administrador.','error');
      if (accounts().some(a => a.email === email)) return banner('Ya existe esa cuenta de demostración. Inicia sesión.','error');
      // Contraseña de prueba guardada solo en el navegador. No usar credenciales reales.
      const extra = reg.dataset.role === 'empresa' ? {representative: items[1]?.value.trim() || '', phone: items.find(i => /teléfono/i.test(i.placeholder))?.value.trim() || '', sector:reg.querySelector('#company-sector')?.value || '', city:reg.querySelector('#company-city')?.value || ''} : {};
      put('accounts', [...accounts(), {email,name,password:pw,role:reg.dataset.role || 'candidato',plan:'Gratuito',onboardingSeen:false,notificationsEnabled:null,...extra}]);
      sessionStorage.setItem('ld-registration-email', email);
      location.href = page('login.html') + '?registrado=1';
    });
    const login = $('ld-login');
    if (login) {
      const p = new URLSearchParams(location.search);
      if (sessionStorage.getItem('ld-protected-message')) {banner(sessionStorage.getItem('ld-protected-message'),'error');sessionStorage.removeItem('ld-protected-message');}
      if (p.has('registrado')) banner('Tu cuenta de demostración fue creada. Inicia sesión para conocer la plataforma.','success');
      const email = sessionStorage.getItem('ld-registration-email'); if (email) { login.querySelector('input')?.setAttribute('value',email); sessionStorage.removeItem('ld-registration-email'); }
      login.addEventListener('submit', e => {
        e.preventDefault(); const email = norm(login.querySelector('input')?.value);
        const password = login.querySelector('input[type=password]')?.value || '';
        if (email === ADMIN_EMAIL) {
          if (password !== ADMIN_PASSWORD) return banner('Contraseña de administrador incorrecta.','error');
          put('session',{email:ADMIN_EMAIL,role:'admin'});
          location.href='/doc/admin/admin.html'; return;
        }
        const a = accounts().find(x => x.email === email);
        if (!a) return banner('Cuenta no encontrada en este navegador. Crea una cuenta de demostración para iniciar sesión.','error');
        if (!a.password || a.password !== password) return banner('Correo o contraseña incorrectos. Para cuentas antiguas, regístrate nuevamente con otro correo de prueba.','error');
        put('session', {email:a.email,role:a.role});
        if (!a.onboardingSeen) sessionStorage.setItem('ld-onboarding-pending',a.email);
        location.href = page(a.role === 'empresa' ? 'empresa-panel.html' : 'candidato.html');
      });
    }
    if (['candidato.html','empresa-panel.html'].includes(location.pathname.split('/').pop()) && current() && sessionStorage.getItem('ld-onboarding-pending') === current().email) {
      showOnboarding(current().role);
    }
  }
  function showOnboarding(role) {
    const steps = role === 'empresa' ? [
      ['Completa tu perfil','Agrega los datos de tu empresa para que los candidatos te conozcan.','empresa-perfil.html'],
      ['Publica una vacante','Indica el puesto, la ubicación, modalidad y requisitos.','publicar.html'],
      ['Revisa candidatos','Consulta las solicitudes recibidas en tu panel.','empresa-candidatos.html']
    ] : [
      ['Completa tu perfil','Escribe tus habilidades, experiencia y ubicación.','perfil.html'],
      ['Busca oportunidades','Utiliza los filtros y el mapa para descubrir empleos.','empleos.html'],
      ['Postúlate','Abre una vacante y revisa sus requisitos antes de enviar tu solicitud.','empleos.html']
    ];
    let index=0;
    const overlay=document.createElement('div');overlay.className='ld-modal-backdrop'; overlay.setAttribute('role','presentation');
    overlay.innerHTML='<section class="ld-modal" role="dialog" aria-modal="true" aria-labelledby="ld-step-heading"><div class="ld-modal-top"><span class="ld-overline">BIENVENIDO A LINKNODIN</span><button type="button" class="ld-close" aria-label="Cerrar guía">×</button></div><div class="ld-guide-icon">✦</div><p class="ld-muted" id="ld-step-count"></p><h2 id="ld-step-heading"></h2><p id="ld-step-text"></p><div class="ld-step-progress" id="ld-dots"></div><div class="ld-modal-buttons"><button class="btn" id="ld-skip" type="button">Omitir</button><button class="btn btn-primary" id="ld-continue" type="button">Siguiente →</button></div></section>';
    document.body.append(overlay); document.body.classList.add('ld-modal-open');
    const close=()=>{updateAccount({onboardingSeen:true});sessionStorage.removeItem('ld-onboarding-pending');document.body.classList.remove('ld-modal-open');overlay.remove();document.dispatchEvent(new CustomEvent('ld:onboarding-complete'));};
    function render(){ overlay.querySelector('#ld-step-count').textContent=`PASO ${index+1} DE ${steps.length}`; overlay.querySelector('#ld-step-heading').textContent=steps[index][0]; overlay.querySelector('#ld-step-text').textContent=steps[index][1]; overlay.querySelector('#ld-dots').innerHTML=steps.map((s,i)=>`<span class="${i<=index?'selected':''}"></span>`).join(''); overlay.querySelector('#ld-continue').textContent=index===steps.length-1?'Empezar →':'Siguiente →'; }
    overlay.querySelector('.ld-close').addEventListener('click', close); overlay.querySelector('#ld-skip').addEventListener('click',close);
    overlay.querySelector('#ld-continue').addEventListener('click',()=>{ if(index<steps.length-1){index++;render();}else close(); });
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'&&overlay.isConnected){close();document.removeEventListener('keydown',esc);}});
    render(); overlay.querySelector('.ld-close').focus();
  }
  function initPlans() {
    const section=$('ld-plans');if (!section) return;
    const active=$('ld-plan-current');
    const render=()=>{const a=current(); active.textContent=a?`Plan activo de ${a.name}: ${plan()} (simulación)`:'Inicia sesión para elegir un plan. No se realiza ningún pago.';section.querySelectorAll('[data-choose-plan]').forEach(b => {b.textContent=(a&&plan()===b.dataset.choosePlan)?'Plan actual':b.dataset.choosePlan==='Premium'?'Activar Premium de prueba':'Continuar gratis';b.disabled=!!a&&plan()===b.dataset.choosePlan;});};
    section.querySelectorAll('[data-choose-plan]').forEach(b=>b.addEventListener('click',()=>{if(!current()){location.href=page('login.html');return}updateAccount({plan:b.dataset.choosePlan});render();banner(b.dataset.choosePlan==='Premium'?'Premium simulado activado: ya puedes abrir los cursos.':'Has cambiado al plan gratuito. Los cursos Premium están bloqueados.','success');})); render();
  }
  const lessons=[
    {id:'cv',icon:'📝',title:'Crea un CV profesional',category:'Empleabilidad',time:'25 min',content:[['Presentación clara','Incluye tu nombre, contacto profesional y un resumen breve.'],['Experiencia y proyectos','Describe logros concretos y ordena los puestos del más reciente al más antiguo.'],['Revisión final','Corrige ortografía, usa un formato consistente y exporta en PDF.']]},
    {id:'entrevistas',icon:'🎙',title:'Prepárate para entrevistas',category:'Entrevistas',time:'35 min',content:[['Investiga la empresa','Lee a qué se dedica y revisa los requisitos de la vacante.'],['Ejemplos concretos','Responde usando situación, acción y resultado.'],['Preguntas finales','Prepara dudas sobre funciones, horarios y próximos pasos.']]},
    {id:'digital',icon:'💻',title:'Herramientas digitales',category:'Tecnología',time:'45 min',content:[['Gestión de archivos','Organiza archivos con nombres claros y mantén copias de respaldo.'],['Hojas de cálculo','Practica sumas, filtros y tablas para interpretar datos.'],['Seguridad básica','Usa contraseñas únicas y verificación en dos pasos cuando esté disponible.']]},
    {id:'comunicacion',icon:'🤝',title:'Comunicación laboral',category:'Habilidades',time:'30 min',content:[['Mensajes profesionales','Escribe el asunto, propósito y acción esperada.'],['Escucha activa','Confirma que entendiste antes de responder.'],['Trabajo en equipo','Comparte avances y comunica bloqueos con anticipación.']]}
  ];
  function initCourses(){const root=$('ld-courses');if(!root)return;
    if(!current()||plan()!=='Premium') {root.innerHTML=`<div class="ld-locked"><div class="ld-lock-icon">✦</div><span class="ld-overline">BENEFICIO EXCLUSIVO</span><h2>Los cursos están disponibles con Premium</h2><p>Accede a los módulos formativos al activar el plan Premium de demostración desde tu cuenta.</p><div class="ld-action-row"><a class="btn btn-primary" href="${page('planes.html')}">Ver planes</a><a class="btn" href="${page('recursos.html')}">Explorar recursos gratuitos</a></div><small>No se realiza ningún pago real.</small></div>`;return;}
    const completed=get('courses-'+current().email,[]);
    root.innerHTML='<div class="ld-course-grid">'+lessons.map(l=>`<article class="ld-course"><span class="ld-course-emoji">${l.icon}</span><span class="ld-overline">${l.category} · ${l.time}</span><h3>${l.title}</h3><p>${l.content.length} lecciones breves y prácticas</p><span class="ld-course-badge">${completed.includes(l.id)?'✓ Completado':'Disponible'}</span><button class="btn btn-primary" type="button" data-course="${l.id}">${completed.includes(l.id)?'Repasar':'Comenzar curso'} →</button></article>`).join('')+'</div>';
    root.querySelectorAll('[data-course]').forEach(button=>button.addEventListener('click',()=>{
      const course=lessons.find(l=>l.id===button.dataset.course);let step=0;
      const view=$('ld-lesson');view.hidden=false;view.scrollIntoView({behavior:'smooth',block:'start'});
      const render=()=>{view.innerHTML='<div class="ld-lesson-top"><span class="ld-overline">'+encode(course.title)+' · LECCIÓN '+(step+1)+'/'+course.content.length+'</span><button type="button" id="ld-lesson-close" aria-label="Cerrar curso">×</button></div><h2>'+encode(course.content[step][0])+'</h2><p>'+encode(course.content[step][1])+'</p><div class="ld-lesson-actions"><button class="btn" id="ld-lesson-prev" '+(!step?'disabled':'')+'>← Anterior</button><button class="btn btn-primary" id="ld-lesson-next">'+(step===course.content.length-1?'Finalizar curso ✓':'Siguiente →')+'</button></div>';view.querySelector('#ld-lesson-close').onclick=()=>view.hidden=true;view.querySelector('#ld-lesson-prev').onclick=()=>{step--;render()};view.querySelector('#ld-lesson-next').onclick=()=>{if(step<course.content.length-1){step++;render()}else {const all=get('courses-'+current().email,[]);put('courses-'+current().email,[...new Set([...all,course.id])]);view.hidden=true;initCourses();}};}; render();
    }));
  }
  function initOpinions() {
    document.querySelectorAll('[data-carousel]').forEach(root=>{
      const samples=[{text:'Me gustó lo sencillo que es comparar oportunidades desde una sola página.',name:'Persona candidata',kind:'Usuario registrado',initial:'C'}, {text:'Pude conocer las vacantes antes de decidir crear una cuenta.',name:'Visitante',kind:'Sin registro',initial:'V'}, {text:'La información de las empresas está organizada y resulta fácil de consultar.',name:'Persona candidata',kind:'Usuario registrado',initial:'C'}, {text:'La búsqueda en el mapa me ayuda a ubicar oportunidades cercanas.',name:'Visitante',kind:'Sin registro',initial:'V'}];
      let list=()=>[...samples,...get('opinions',[])];let index=0;let timer;
      const content=root.querySelector('[data-op-content]'), count=root.querySelector('[data-op-counter]'), dots=root.querySelector('[data-op-dots]');
      const render=()=>{const data=list();index=(index+data.length)%data.length;const x=data[index];content.innerHTML=`<div class="ld-stars" aria-label="5 estrellas">★★★★★</div><div class="ld-quote-mark">“</div><blockquote>${encode(x.text)}</blockquote><div class="ld-person"><span class="ld-avatar">${encode(x.initial)}</span><span><strong>${encode(x.name)}</strong><small>${encode(x.kind)} · Opinión demostrativa</small></span></div>`;count.textContent=`${index+1} / ${data.length}`;dots.innerHTML=data.map((_,i)=>`<button type="button" data-go="${i}" aria-label="Ir a la opinión ${i+1}" class="${i===index?'on':''}"></button>`).join('');dots.querySelectorAll('button').forEach(b=>b.onclick=()=>go(+b.dataset.go));};
      const go=i=>{index=i;render();restart()};const restart=()=>{clearInterval(timer);if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>{index++;render()},6500)};
      root.querySelector('[data-op-prev]').onclick=()=>go(index-1); root.querySelector('[data-op-next]').onclick=()=>go(index+1);
      root.addEventListener('mouseenter',()=>clearInterval(timer));root.addEventListener('mouseleave',restart);
      root.addEventListener('focusin',()=>clearInterval(timer));root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))restart()});
      render();restart();
      const form=$('ld-opinion-form');if(form&&!form.dataset.bound){form.dataset.bound='true';form.addEventListener('submit',e=>{e.preventDefault();const value=$('ld-opinion-text').value.trim();if(value.length<15)return banner('La opinión debe tener al menos 15 caracteres.','error');const a=current();const all=get('opinions',[]);all.push({text:value.slice(0,350),name:a?a.name:'Visitante',kind:a?'Usuario registrado':'Sin registro',initial:a?(a.name[0]||'U'):'V'});put('opinions',all);$('ld-opinion-text').value='';index=list().length-1;render();restart();banner('Tu opinión de demostración se agregó al carrusel en este navegador.','success');});}
    });
  }
  function jobCard(job) {const a=document.createElement('article');a.className='job ld-job';a.dataset.jobId=job.id;
    const marker=coords(job.city,job)?'<span class="ld-map-indicator">⌁ En mapa</span>':'<span class="ld-map-indicator">Sin coordenadas</span>';
    a.innerHTML=`<div class="jobmain"><div class="logo">${encode(job.company.charAt(0))}</div><div><h3>${encode(job.title)}</h3><small>${encode(job.company)} · ${encode(job.city)}${job.department?' · '+encode(job.department):''}</small><p>${encode(job.modality)} · ${encode(job.workTime||job.contract)}</p><span class="tag">${encode(job.modality)}</span>${marker}</div></div><a class="btn btn-primary" href="${page('detalle-empleo.html')}?id=${encode(encodeURIComponent(job.id))}">Ver empleo</a>`;return a;
  }
  let sharedMap=null, layer=null;
  function makeMap(){if(sharedMap)return true; if(typeof window.L==='undefined') {const e=$('ld-map-error');if(e)e.textContent='No se pudo cargar el mapa. Se necesita Internet para visualizar OpenStreetMap. La lista de ofertas sí está disponible.';return false}
    sharedMap=L.map('ld-map',{scrollWheelZoom:false}).setView([13.73,-89.05],8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(sharedMap);
    layer=L.layerGroup().addTo(sharedMap);return true;
  }
  function syncMap(jobsToDraw) {if(!makeMap())return;layer.clearLayers();const locations=[];jobsToDraw.forEach(j=>{const pt=coords(j.city,j);if(!pt)return; const icon=L.divIcon({className:'ld-map-pin-wrap',html:'<span class="ld-map-pin">⌖</span>',iconSize:[32,38],iconAnchor:[16,36]});const marker=L.marker(pt,{icon}).addTo(layer);
    const popup=document.createElement('div');popup.className='ld-popup';const h=document.createElement('strong');h.textContent=j.title;const c=document.createElement('p');c.textContent=j.company+' · '+j.city+' · '+j.modality;const a=document.createElement('a');a.href=page('detalle-empleo.html')+'?id='+encodeURIComponent(j.id);a.textContent='Ver vacante →';popup.append(h,c,a);marker.bindPopup(popup);locations.push(pt);});
    if(locations.length)sharedMap.fitBounds(L.latLngBounds(locations).pad(.32),{maxZoom:11});else sharedMap.setView([13.73,-89.05],8);
    const el=$('ld-map-error');if(el)el.textContent=`${locations.length} de ${jobsToDraw.length} vacantes filtradas con ubicación en el mapa. Las ubicaciones se colocan en el centro aproximado de cada ciudad, no en una dirección exacta. Una vacante remota se ubica según la ciudad de la empresa.`;
    setTimeout(()=>sharedMap.invalidateSize(),100);
  }
  function initJobs(){const list=$('ld-job-list');if(!list)return;
    const loc=$('ld-filter-location'),keyword=$('ld-filter-keyword'),contract=$('ld-filter-contract'),exp=$('ld-filter-experience'),modality=$('ld-filter-modality');
    const qs=new URLSearchParams(location.search);keyword.value=qs.get('q')||'';loc.value=qs.get('ubicacion')||'';if(qs.get('modalidad'))modality.value=qs.get('modalidad');
    let selected=qs.get('vista')==='mapa'?'map':'list';
    const update=()=>{const filtered=jobs().filter(j=>(!loc.value.trim()||norm(j.city).includes(norm(loc.value))) && (!keyword.value.trim()||norm([j.title,j.company,j.description].join(' ')).includes(norm(keyword.value))) && (contract.value==='Todos'||norm(j.workTime||j.contract)===norm(contract.value)) && (exp.value==='Todas'||norm(j.experience)===norm(exp.value)) && (modality.value==='Todas'||norm(j.modality)===norm(modality.value)));
      list.replaceChildren(...filtered.map(jobCard));const cnt=$('ld-job-count');cnt.textContent=filtered.length+' '+(filtered.length===1?'vacante encontrada':'vacantes encontradas')+' en el prototipo';
      $('ld-empty').hidden=filtered.length!==0;
      if(selected==='map')syncMap(filtered);
      $('ld-map-result-count').textContent=`${filtered.length} ${filtered.length===1?'resultado':'resultados'} con tus filtros`;
    };
    function choose(mode){selected=mode;$('ld-job-list-section').hidden=mode==='map';$('ld-map-section').hidden=mode!=='map'; document.querySelectorAll('[data-job-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.jobView===mode);b.setAttribute('aria-pressed',String(b.dataset.jobView===mode))});update();}
    $('ld-filter-form').addEventListener('submit',e=>{e.preventDefault();update();});
    [loc,keyword,contract,exp,modality].forEach(field=>field.addEventListener(field.tagName==='SELECT'?'change':'input',update));
    $('ld-clear-filters').onclick=()=>{loc.value='';keyword.value='';contract.value='Todos';exp.value='Todas';modality.value='Todas';update();};
    document.querySelectorAll('[data-job-view]').forEach(b=>b.onclick=()=>choose(b.dataset.jobView));
    choose(selected);
  }
  function initSearch(){const form=$('ld-home-search');if(!form)return;form.onsubmit=e=>{e.preventDefault();const q=new URLSearchParams(); const keyword=form.querySelector('[name=q]').value.trim(),loc=form.querySelector('[name=ubicacion]').value,mode=form.querySelector('[name=modalidad]').value;if(keyword)q.set('q',keyword);if(loc)q.set('ubicacion',loc);if(mode)q.set('modalidad',mode);location.href=page('empleos.html')+'?'+q.toString();};}
  function initFeatured(){const container=$('ld-featured');if(!container)return;container.replaceChildren(...jobs().slice(0,4).map(jobCard));}
  function initPublish(){
    const f=$('ld-publish');if(!f)return;
    const field=name=>f.elements.namedItem(name),editId=new URLSearchParams(location.search).get('editar');
    const old=editId?get('jobs',[]).find(j=>j.id===editId&&j.owner===current()?.email):null;
    const names=['titulo','ciudad','departamento','direccion','referencia','plazas','contrato','tiempoTrabajo','modalidad','salarioMin','salarioMax','frecuenciaPago','experiencia','escolaridad','jornada','horario','contacto','metodoPostulacion','instrucciones','fechaLimite','latitud','longitud','area','responsabilidades','licencia','vehiculo','competencias','preguntas'];
    const areas=['descripcion','responsabilidades','requisitos','beneficios'].map(field);
    if(old){const vals={titulo:old.title,ciudad:old.city,departamento:old.department,direccion:old.address,referencia:old.reference,plazas:old.openings,contrato:['Indefinido','Plazo fijo','Por obra determinada','Prácticas profesionales','Aprendizaje'].includes(old.contract)?old.contract:'Indefinido',tiempoTrabajo:old.workTime||'Tiempo completo',modalidad:old.modality||'Presencial',salarioMin:old.salaryMin||'',salarioMax:old.salaryMax,frecuenciaPago:old.salaryPeriod||'Mensual',experiencia:['Sin experiencia','Junior (1–2 años)','Intermedio (3–5 años)','Senior (más de 5 años)','No especificada'].includes(old.experience)?old.experience:'No especificada',escolaridad:old.education||'Indiferente',jornada:old.schedule||'Diurna',horario:old.hours,contacto:old.contact,metodoPostulacion:old.applicationMethod||'portal',instrucciones:old.instructions,fechaLimite:old.deadline,latitud:old.latitude,longitud:old.longitude,area:old.area,licencia:old.license,vehiculo:old.vehicle,competencias:old.competencies,responsabilidades:old.responsibilities||old.description,preguntas:JSON.stringify(Array.isArray(old.questions)?old.questions:[])};names.forEach(k=>{if(field(k)&&vals[k]!=null)field(k).value=vals[k]});if(field('salarioConfidencial'))field('salarioConfidencial').checked=Boolean(old.salaryHidden);if(field('ubicacionAproximada'))field('ubicacionAproximada').checked=old.approximateLocation!==false;areas.forEach((x,i)=>{if(x)x.value=[old.description,old.responsibilities||old.description,old.requirements,old.benefits][i]||''});const h=f.querySelector('h3');if(h)h.textContent='Editar vacante';const b=f.querySelector('button[type=submit]');if(b)b.textContent='Guardar cambios';}
    f.addEventListener('submit',e=>{e.preventDefault();const title=field('titulo').value.trim(),city=field('ciudad').value.trim(),contact=field('contacto').value.trim(),method=field('metodoPostulacion').value,min=Number(field('salarioMin').value),max=Number(field('salarioMax').value);if(!title||!city||(method!=='portal'&&!contact))return banner('Completa los campos obligatorios.','error');if(window.L&&field('modalidad').value!=='Remoto'&&(!field('latitud').value||!field('longitud').value)){document.getElementById('job-location-status').textContent='Selecciona el punto del lugar de trabajo en el mapa para continuar.';return;}if(field('salarioMin').value&&field('salarioMax').value&&min>max)return banner('El salario maximo debe ser igual o mayor al minimo.','error');const all=get('jobs',[]);const job={...(old||{}),id:old?.id||'local-'+Date.now(),createdAt:old?.createdAt||new Date().toISOString(),title,openings:Number(field('plazas').value)||1,city,department:field('departamento').value,address:field('direccion').value.trim(),reference:field('referencia').value.trim(),contract:field('contrato').value,workTime:field('tiempoTrabajo').value,modality:field('modalidad').value,salaryMin:field('salarioMin').value,salaryMax:field('salarioMax').value,salaryPeriod:field('frecuenciaPago').value,salaryHidden:field('salarioConfidencial').checked,experience:field('experiencia').value,education:field('escolaridad').value,schedule:field('jornada').value,hours:field('horario').value.trim(),contact,applicationMethod:method,instructions:field('instrucciones').value.trim(),deadline:field('fechaLimite').value,questions:(()=>{try{return JSON.parse(field('preguntas').value||'[]')}catch{return []}})(),area:field('area').value.trim(),license:field('licencia').value,vehicle:field('vehiculo').value,competencies:field('competencias').value.trim(),responsibilities:areas[1]?.value.trim()||'',latitude:field('latitud').value,longitude:field('longitud').value,approximateLocation:field('ubicacionAproximada').checked,company:current()?.name||'Empresa de demostracion',owner:current()?.email||null,description:areas[0]?.value.trim()||'',requirements:areas[2]?.value.trim()||'',benefits:areas[3]?.value.trim()||'',status:old?.status||'Activa',isDemo:true};put('jobs',old?all.map(j=>j.id===old.id?job:j):[...all,job]);window.dispatchEvent(new CustomEvent('ld:activity-updated'));if(old){banner('Vacante actualizada en este navegador.','success');location.href='/doc/empresa/empresa-vacantes.html';}else{f.reset();banner('Vacante guardada en el prototipo de este navegador.','success');}});
  }
  function initDetail(){
    const id=new URLSearchParams(location.search).get('id');
    const content=$('ld-detail-content'),status=$('ld-detail-status');
    const job=id?jobs().find(j=>j.id===id):null;
    if(!job){if(content)content.hidden=true;if(status){status.hidden=false;status.textContent='No encontramos esta vacante. Puede haber vencido o ya no estar disponible.';}return;}
    const set=(name,value,fallback='No especificado')=>{const el=$('ld-detail-'+name);if(el)el.textContent=value||fallback;};
    const title=$('ld-detail-title'),info=$('ld-detail-info'),desc=$('ld-detail-desc'),company=$('ld-detail-company');
    if(title)title.textContent=job.title;
    if(info)info.textContent=[job.company,job.city,job.department,job.modality].filter(Boolean).join(' | ');
    const salary=job.salaryHidden?'No publicado':job.salaryMin||job.salaryMax?`$${job.salaryMin||'-'} - $${job.salaryMax||'-'} USD | ${job.salaryPeriod||'Mensual'}`:job.salary||'No especificado';set('salary',salary);
    set('contract',job.contract);set('worktime',job.workTime);set('modality',job.modality);set('experience',job.experience);set('education',job.education);
    set('schedule',[job.schedule,job.hours].filter(Boolean).join(' | '),'No especificada');
    set('openings',String(job.openings||1));
    set('deadline',job.deadline?new Date(job.deadline+'T12:00:00').toLocaleDateString('es-SV',{year:'numeric',month:'long',day:'numeric'}):'No especificada');
    const method=job.applicationMethod||'portal';
    const hasQuestions=Array.isArray(job.questions)&&job.questions.some(question=>String(question).trim());
    set('contact',method==='portal'||hasQuestions?'Postulacion gestionada desde LinkNoDin':job.contact,'No especificado');
    const locationLabel=[job.approximateLocation?null:job.address,job.city,job.department,'El Salvador',job.approximateLocation?null:job.reference].filter(Boolean).join(', ')||'No especificada';set('location',locationLabel);
    if(desc)desc.textContent=job.description||'La empresa no agrego una descripcion.';
    if(company)company.textContent=job.company;
    const req=$('ld-detail-requirements'),benefits=$('ld-detail-benefits'),responsibilities=$('ld-detail-responsibilities'),competencies=$('ld-detail-competencies');
    if(responsibilities)responsibilities.textContent=job.responsibilities||job.description||'No se especificaron responsabilidades.';
    if(req)req.textContent=job.requirements||'No se especificaron requisitos adicionales.';
    if(competencies)competencies.textContent=job.competencies||'No se especificaron competencias adicionales.';
    set('area',job.area,'No especificada');set('license',job.license,'No requerida');set('vehicle',job.vehicle,'No requerido');
    set('published',job.createdAt?new Date(job.createdAt).toLocaleDateString('es-SV',{year:'numeric',month:'long',day:'numeric'}):'No especificada','No especificada');
    if(benefits)benefits.textContent=job.benefits||'No se especificaron beneficios adicionales.';
    set('instructions',job.instructions,'Sigue las indicaciones al iniciar tu postulacion.');
    const tag=$('ld-detail-status-tag');if(tag)tag.textContent=job.status||'Oferta activa';
    const questionNote=$('ld-detail-questions-note');if(questionNote&&hasQuestions){questionNote.hidden=false;questionNote.textContent=`Esta vacante incluye preguntas obligatorias. Responde todas desde LinkNoDin para completar tu postulacion.`;}
    const apply=$('ld-apply-link'),email=$('ld-apply-email'),applyBottom=$('ld-apply-link-bottom'),emailBottom=$('ld-apply-email-bottom');
    if(apply){apply.href='/doc/candidato/postular.html?id='+encodeURIComponent(job.id);apply.textContent=hasQuestions?'Responder preguntas y postularme':'Postularme en LinkNoDin';apply.hidden=method==='email'&&!hasQuestions;}
    if(applyBottom){applyBottom.href='/doc/candidato/postular.html?id='+encodeURIComponent(job.id);applyBottom.hidden=method==='email'&&!hasQuestions;}
    if(email){email.hidden=hasQuestions||!(method==='email'||method==='both');email.href='mailto:'+encodeURIComponent(job.contact||'')+'?subject='+encodeURIComponent('Postulacion: '+job.title);}
    if(emailBottom){emailBottom.hidden=hasQuestions||!(method==='email'||method==='both');emailBottom.href='mailto:'+encodeURIComponent(job.contact||'')+'?subject='+encodeURIComponent('Postulacion: '+job.title);}
    const companyAccount=get('accounts',[]).find(a=>a.role==='empresa'&&a.name===job.company);const demoSlugs={'banco agricola':'banco-agricola','super selectos':'super-selectos','adoc':'adoc','grupo central':'grupo-central'};const slug=companyAccount?'empresa-'+encodeURIComponent(companyAccount.email.toLowerCase()):(demoSlugs[norm(job.company)]||'banco-agricola');document.querySelectorAll('[data-company-profile-link]').forEach(a=>a.href='/doc/empresa/empresa-detalle.html?empresa='+encodeURIComponent(slug));
    const companyDesc=$('ld-company-desc');if(companyDesc)companyDesc.textContent=job.id==='demo-web'?'Empresa dedicada a soluciones tecnologicas y servicios digitales.':'Consulta el perfil y los detalles de la empresa.';
    const logo=$('ld-company-logo');if(logo)logo.textContent=(job.company||'E').charAt(0);
    const point=coords(job.city,job);const map=$('ld-detail-map'),note=$('ld-detail-map-note');
    if(map&&point&&typeof window.L!=='undefined'){
      map.hidden=false;const detailMap=L.map(map,{scrollWheelZoom:false});
      detailMap.setView(point,job.latitude&&job.longitude&&!job.approximateLocation?15:12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'OpenStreetMap contributors'}).addTo(detailMap);
      L.marker(point).addTo(detailMap).bindPopup(job.title).openPopup();
      if(note){note.hidden=false;note.textContent=job.approximateLocation?'El marcador muestra una zona aproximada del municipio.':'El marcador indica la ubicacion compartida por la empresa.';}
    }else if(note){note.hidden=false;note.textContent='No hay coordenadas disponibles para mostrar el mapa de esta vacante.';}
    document.title=job.title+' | LinkNoDin';
  }
  function initApplication(){
    const box=$('ld-apply-box');if(!box)return;
    const id=new URLSearchParams(location.search).get('id')||'demo-web';
    const job=jobs().find(j=>j.id===id);
    if(job)$('ld-apply-title').textContent='Postularse a '+job.title;
    if(!job)return;
    const existing=box.querySelector('p');if(!existing)return;
    if(current()?.role==='candidato'){
      existing.textContent='Revisa tu solicitud antes de enviarla. Esta postulación es una simulación local.';
      [...box.querySelectorAll('a.btn')].forEach(a=>a.remove());
      const button=document.createElement('button');button.type='button';button.className='btn btn-primary';button.textContent='Enviar postulación de prueba';
      const status=document.createElement('p');status.className='ld-status';status.setAttribute('role','status');
      button.onclick=()=>{const all=get('applications-'+current().email,[]);if(all.includes(job.id)){status.textContent='Ya te postulaste a esta vacante de demostración.';return;}put('applications-'+current().email,[...all,job.id]);window.dispatchEvent(new CustomEvent('ld:activity-updated'));status.textContent='Postulación de demostración registrada en este navegador.';button.disabled=true;};
      box.append(button,status);
    } else if(current()?.role==='empresa') {
      existing.textContent='Para postularte debes utilizar una cuenta de candidato.';
    }
  }
  function initCompanyPosts(){
    const table=$('ld-company-posts');if(!table)return;const tbody=table.querySelector('tbody')||table;
    const mine=get('jobs',[]).filter(j => !j.owner || j.owner===current()?.email);
    for(const j of mine){
      const row=document.createElement('tr');
      for(const value of [j.title,j.modality||'Presencial','0','Demostración local']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
      const cell=document.createElement('td'),link=document.createElement('a');link.href=page('detalle-empleo.html')+'?id='+encodeURIComponent(j.id);link.textContent='Ver vacante';cell.append(link);row.append(cell);tbody.append(row);
    }
    const status=$('ld-local-vacancy-info');if(status&&mine.length)status.textContent=`${mine.length} vacante(s) adicional(es) guardada(s) en este navegador.`;
  }
  document.addEventListener('DOMContentLoaded',()=>{nav();initAuth();initPlans();initCourses();initOpinions();initSearch();initFeatured();initJobs();initPublish();initDetail();initApplication();initCompanyPosts();const n=$('ld-home-job-count');if(n)n.textContent=String(jobs().length);});
})();
