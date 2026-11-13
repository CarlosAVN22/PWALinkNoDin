/* Notificaciones dentro de LinkNoDin: prototipo local, sin correo, SMS ni servidor de push. */
(() => {
  'use strict';
  const PREFIX='linknodin-v3-';
  const read=(key,fallback)=>{try { return JSON.parse(localStorage.getItem(PREFIX+key)) ?? fallback; }catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(PREFIX+key,JSON.stringify(value));
  const accounts=()=>read('accounts',[]);
  const user=()=>{const s=read('session',null);return s?accounts().find(a=>a.email===s.email)||null:null;};
  const page=(name)=>name?({
    'candidato.html':'/doc/candidato/candidato.html',
    'empresa-panel.html':'/doc/empresa/empresa-panel.html',
    'empleos.html':'/doc/empleo/empleos.html',
    'detalle-empleo.html':'/doc/empleo/detalle-empleo.html',
    'postulaciones.html':'/doc/candidato/postulaciones.html',
    'publicar.html':'/doc/empleo/publicar.html',
    'empresa-candidatos.html':'/doc/empresa/empresa-candidatos.html',
    'alertas.html':'/doc/general/alertas.html'
  }[name]||name):location.pathname.split('/').pop();
  const enable=()=>user()?.notificationsEnabled === true;
  const myKey=(type,a=user())=>type+'-'+(a?.email||'sin-cuenta');
  const DASH=['candidato.html','empresa-panel.html'];
  let firstPromptShown=false;
  const dateOf=(date)=> {try{return new Intl.DateTimeFormat('es-SV',{dateStyle:'medium',timeStyle:'short'}).format(new Date(date));}catch{return 'Reciente';}};
  const safe=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const jobUrl=(id)=>page('detalle-empleo.html')+'?id='+encodeURIComponent(id);
  function savePreference(yes){
    const a=user(); if(!a)return;
    write('accounts',accounts().map(x=>x.email===a.email?{...x,notificationsEnabled:yes}:x));
    document.querySelector('.ld-notif-consent')?.remove();
    document.body.classList.remove('ld-modal-open');
    refresh();
    if(yes)toast('¡Listo! Las notificaciones están activadas. Las encontrarás en la campana y en tu panel.');
  }
  function consent(){
    const a=user();if(!a||!DASH.includes(page())||typeof a.notificationsEnabled==='boolean'||firstPromptShown)return;
    if(document.querySelector('.ld-modal-backdrop'))return; // Deja terminar primero la guía de bienvenida.
    firstPromptShown=true;
    const overlay=document.createElement('div');overlay.className='ld-modal-backdrop ld-notif-consent';
    overlay.innerHTML=`<section class="ld-modal ld-notif-consent-box" role="dialog" aria-modal="true" aria-labelledby="ld-notif-permission-title"><div class="ld-notif-consent-icon" aria-hidden="true">🔔</div><span class="ld-overline">SOLO UNA VEZ</span><h2 id="ld-notif-permission-title">¿Quieres recibir notificaciones?</h2><p>Podrás ver las nuevas vacantes y los avisos de tu cuenta directamente en LinkNoDin. No es necesario configurar alertas ni elegir categorías.</p><div class="ld-notif-consent-actions"><button type="button" class="btn btn-primary" data-choice="yes">Sí, quiero recibirlas</button><button type="button" class="btn" data-choice="no">No, gracias</button></div><p class="ld-notif-disclaimer">Solo avisos dentro de este prototipo en tu navegador. No enviamos correos ni SMS.</p></section>`;
    document.body.append(overlay);document.body.classList.add('ld-modal-open');
    overlay.querySelector('[data-choice=yes]').addEventListener('click',()=>savePreference(true));
    overlay.querySelector('[data-choice=no]').addEventListener('click',()=>savePreference(false));
    overlay.querySelector('[data-choice=yes]').focus();
  }
  function messages(a=user()){
    if(!a)return [];
    let data=[];
    const isCandidate=a.role!=='empresa';
    // Recordatorios iniciales definidos por el portal: sin formulario previo.
    data.push({id:'portal-bienvenida',type:'portal',title:'¡Bienvenido a LinkNoDin!',body:isCandidate?'Consulta oportunidades y realiza tus postulaciones desde tu panel.':'Publica vacantes y revisa las solicitudes recibidas desde tu panel.',url:page(isCandidate?'candidato.html':'empresa-panel.html'),date:'2026-10-21T09:00:00',icon:'✨'});
    if(isCandidate){
      data.push({id:'portal-oportunidades',type:'empleos',title:'Hay oportunidades para explorar',body:'En el portal ya puedes consultar las ofertas de demostración desde la lista o el mapa.',url:page('empleos.html'),date:'2026-10-21T09:05:00',icon:'💼'});
      for(const job of read('jobs',[]).filter(j=>j?.id&&j?.title))data.push({id:'vacante-'+job.id,type:'empleos',title:'Nueva vacante: '+job.title,body:(job.company||'Una empresa')+' · '+(job.city||'Ubicación no disponible')+'. Revisa los detalles antes de postularte.',url:jobUrl(job.id),date:job.createdAt||'2026-10-21T10:00:00',icon:'💼'});
      for(const jobId of read('applications-'+a.email,[])) {
        const job=[...read('jobs',[]),{id:'demo-ui',title:'Diseñador UI/UX'},{id:'demo-web',title:'Desarrollador Web'},{id:'demo-data',title:'Analista de datos'},{id:'demo-admin',title:'Asistente administrativo'}].find(j=>j.id===jobId);
        data.push({id:'postulacion-'+jobId,type:'postulaciones',title:'Postulación registrada',body:'Tu postulación para '+(job?.title||'esta vacante')+' se guardó en este navegador (demostración).',url:page('postulaciones.html'),date:job?.createdAt||'2026-10-21T10:30:00',icon:'✅'});
      }
    } else {
      data.push({id:'empresa-guia',type:'portal',title:'Tu panel de empresa está listo',body:'Puedes publicar vacantes para que los candidatos las encuentren en el listado y mapa.',url:page('publicar.html'),date:'2026-10-21T09:05:00',icon:'📣'});
      const ownJobs=read('jobs',[]).filter(j=>j.owner===a.email);
      ownJobs.forEach(j=>data.push({id:'publicada-'+j.id,type:'empleos',title:'Vacante publicada: '+j.title,body:'Tu oferta se agregó al listado de empleos de demostración.',url:jobUrl(j.id),date:j.createdAt||'2026-10-21T10:00:00',icon:'💼'}));
      // Notificar al propietario de la vacante cuando un candidato realice una postulación local.
      for(const candidate of accounts().filter(x=>x.role==='candidato')){
        for(const id of read('applications-'+candidate.email,[])){
          const offer=ownJobs.find(j=>j.id===id);if(!offer)continue;
          data.push({id:'empresa-postulacion-'+candidate.email+'-'+id,type:'postulaciones',title:'Nueva postulación recibida',body:candidate.name+' se postuló a '+offer.title+' (demostración local).',url:page('empresa-candidatos.html'),date:offer.createdAt||'2026-10-21T10:30:00',icon:'👤'});
        }
      }
    }
    // Botón de prueba: se guarda por cuenta, no entre cuentas distintas.
    data=[...data,...read(myKey('notification-tests',a),[])];
    return data.sort((x,y)=>Date.parse(y.date||0)-Date.parse(x.date||0));
  }
  function unread(a=user()){const viewed=new Set(read(myKey('notification-read',a),[]));return messages(a).filter(m=>!viewed.has(m.id)).length;}
  function markOne(id){const ids=read(myKey('notification-read'),[]);write(myKey('notification-read'),[...new Set([...ids,id])]);refresh();}
  function markAll(){write(myKey('notification-read'),messages().map(m=>m.id));refresh();}
  function toast(message){
    document.querySelector('.ld-toast')?.remove();const t=document.createElement('div');t.className='ld-toast';t.setAttribute('role','status');t.textContent=message;document.body.append(t);
    setTimeout(()=>t.remove(),4600);
  }
  function testNotification(){
    if(!enable())return;
    const arr=read(myKey('notification-tests'),[]);
    const n=arr.length+1;
    arr.push({id:'prueba-'+Date.now()+'-'+n,type:'portal',title:'Notificación de prueba #'+n,body:'¡Funciona! Este aviso apareció automáticamente en tu cuenta de LinkNoDin.',url:page(),date:new Date().toISOString(),icon:'🔔'});
    write(myKey('notification-tests'),arr);refresh();toast('🔔 ¡Nueva notificación de prueba! Revisa la campana.');
  }
  function buildItem(m,viewed){
    const article=document.createElement('article');article.className='ld-notif-item'+(viewed?'':' is-unread');
    article.innerHTML=`<div class="ld-notif-item-icon" aria-hidden="true">${safe(m.icon||'🔔')}</div><div class="ld-notif-item-copy"><div class="ld-notif-row"><strong>${safe(m.title)}</strong>${!viewed?'<span class="ld-notif-dot" aria-label="Sin leer"></span>':''}</div><p>${safe(m.body)}</p><small>${safe(dateOf(m.date))} · ${safe(m.type)}</small></div><a class="ld-notif-item-link" href="${safe(m.url)}">Ver →</a>`;
    article.querySelector('a').addEventListener('click',()=>markOne(m.id));
    return article;
  }
  function writeList(root,limit){
    const a=user();if(!root||!a)return;
    const active=enable();
    root.replaceChildren();
    const header=document.createElement('div');header.className='ld-notif-head';
    header.innerHTML=`<div><span class="ld-overline">CENTRO DE NOTIFICACIONES</span><h2>🔔 Notificaciones ${active&&unread()?`<span class="ld-notif-head-count">${unread()} sin leer</span>`:''}</h2><p>${active?'Novedades y actividad de tu cuenta, sin configurar alertas.':'Elegiste no recibir notificaciones en esta cuenta.'}</p></div>`;
    root.append(header);
    if(!active){const box=document.createElement('div');box.className='ld-notif-optout';box.innerHTML='<strong>Notificaciones desactivadas</strong><p>No recibirás avisos en el panel. Esta elección se hizo al comenzar a utilizar tu cuenta.</p>';root.append(box);return;}
    const controls=document.createElement('div');controls.className='ld-notif-tools';controls.innerHTML='<button type="button" class="btn btn-primary btn-sm" data-notif-test>🔔 Enviar notificación de prueba</button><button type="button" class="btn btn-sm" data-notif-mark-all>Marcar todas como leídas</button>';
    root.append(controls);
    controls.querySelector('[data-notif-test]').addEventListener('click',testNotification);
    controls.querySelector('[data-notif-mark-all]').addEventListener('click',markAll);
    const list=document.createElement('div');list.className='ld-notif-list';
    const data=messages().slice(0,limit||1000),seen=new Set(read(myKey('notification-read'),[]));
    if(!data.length)list.innerHTML='<p class="ld-notif-empty">Todavía no tienes notificaciones.</p>';
    else data.forEach(m=>list.append(buildItem(m,seen.has(m.id))));
    root.append(list);
    if(limit&&messages().length>limit){const all=document.createElement('a');all.href=page('alertas.html');all.className='btn btn-sm ld-notif-all';all.textContent='Ver todas las notificaciones →';root.append(all);}
  }
  function makeBell(){
    const a=user();if(!a)return;
    const actions=document.querySelector('.topbar .actions');if(!actions||document.querySelector('#ld-notif-bell'))return;
    const wrap=document.createElement('div');wrap.className='ld-notif-bell-wrap';
    const button=document.createElement('button');button.id='ld-notif-bell';button.className='ld-notif-bell';button.type='button';button.setAttribute('aria-label','Abrir notificaciones');button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','true');button.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg><span id="ld-notif-badge" class="ld-notif-badge" hidden>0</span>';
    const pop=document.createElement('section');pop.className='ld-notif-pop';pop.id='ld-notif-pop';pop.hidden=true;
    const toggle=()=>{pop.hidden=!pop.hidden;button.setAttribute('aria-expanded',String(!pop.hidden));};
    button.addEventListener('click',e=>{e.stopPropagation();toggle();});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target)){pop.hidden=true;button.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){pop.hidden=true;button.setAttribute('aria-expanded','false');}});
    wrap.append(button,pop);actions.prepend(wrap);
  }
  function updateBell(){
    const badge=document.querySelector('#ld-notif-badge'),pop=document.querySelector('#ld-notif-pop');if(!badge||!pop)return;
    const n=enable()?unread():0;
    badge.hidden=!n;badge.textContent=n>99?'99+':String(n);
    const bell=document.querySelector('#ld-notif-bell');if(bell)bell.setAttribute('aria-label',n?`Notificaciones (${n} sin leer)`:'Notificaciones');
    pop.replaceChildren();
    const bar=document.createElement('div');bar.className='ld-notif-pop-head';bar.innerHTML='<strong>Notificaciones</strong><a href="'+page('alertas.html')+'">Ver todas →</a>';pop.append(bar);
    if(!enable()){const line=document.createElement('p');line.className='ld-notif-pop-empty';line.textContent='Elegiste no recibir notificaciones.';pop.append(line);return;}
    const seen=new Set(read(myKey('notification-read'),[]));messages().slice(0,4).forEach(m=>pop.append(buildItem(m,seen.has(m.id))));
  }
  function refresh(){makeBell();updateBell();writeList(document.querySelector('#ld-notif-dashboard'),4);writeList(document.querySelector('#ld-notif-inbox'),0);}
  function begin(){if(!user())return; if(page()==='alertas.html'&&user().role==='empresa'){const menu=document.querySelector('.sidebar');if(menu){menu.innerHTML='<h4>Menú de navegación</h4><a href="/doc/empresa/empresa-panel.html">Panel empresa</a><a href="/doc/empresa/empresa-perfil.html">Perfil empresa</a><a href="/doc/empresa/empresa-vacantes.html">Mis vacantes</a><a href="/doc/empleo/publicar.html">Publicar empleo</a><a href="/doc/empresa/empresa-candidatos.html">Candidatos</a><a class="active" href="/doc/general/alertas.html">Notificaciones</a>';}} refresh();consent();}
  document.addEventListener('DOMContentLoaded',begin);
  document.addEventListener('ld:onboarding-complete',()=>{consent();refresh();});
  window.addEventListener('storage',e=>{if(e.key?.startsWith(PREFIX))refresh();});
  window.addEventListener('focus',refresh);
  window.addEventListener('ld:activity-updated',refresh);
})();
