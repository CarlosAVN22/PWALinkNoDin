/* Flujo de empresa de demostración, con información guardada en este navegador. */
(() => {
  'use strict';
  const prefix = 'linknodin-v3-';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { localStorage.setItem(prefix + key, JSON.stringify(value)); window.dispatchEvent(new Event('ld:activity-updated')); };
  const session = read('session', null);
  const accounts = read('accounts', []);
  const user = accounts.find(a => a.email === session?.email && a.role === 'empresa');
  const publicPath = /\/(?:empresas|empresa-detalle)\.html$/.test(location.pathname);
  if (!user && !publicPath) return;
  const email = user?.email || '';
  const profileKey = 'company-profile-' + email;
  const profile = () => ({name:user?.name || '', representative:user?.representative || '', email, phone:user?.phone || '', sector:user?.sector || '', city:user?.city || '', website:'', description:'', ...read(profileKey, {})});
  const jobs = () => read('jobs', []).filter(j => j.owner === email);
  const applications = () => {
    const result = [];
    read('accounts', []).filter(a => a.role === 'candidato').forEach(candidate => {
      const ids = read('applications-' + candidate.email, []);
      const details = read('candidate-application-details-' + candidate.email, {});
      ids.forEach(id => { const job = jobs().find(j => String(j.id) === String(id)); if (job) result.push({id:String(id), job, candidate, detail:details[id] || {}}); });
    });
    return result;
  };
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusOptions = ['Recibida','En revisión','Entrevista','Seleccionada','Rechazada'];
  const candidateFilters = {query:'', vacancy:new URLSearchParams(location.search).get('vacante') || 'all', status:'all', sort:'newest'};
  const notice = message => { const node = document.getElementById('ld-status') || document.querySelector('.company-status'); if (node) node.textContent = message; };

  function renderPanel() {
    const root = document.querySelector('.content'); if (!root || !location.pathname.endsWith('empresa-panel.html')) return;
    const list = jobs(), apps = applications();
    const stats = root.querySelectorAll('.stats .stat strong');
    [list.filter(j => (j.status || 'Activa') === 'Activa').length, apps.length, apps.filter(a => (a.detail.status || 'Recibida') === 'En revisión').length, '—'].forEach((v,i) => { if (stats[i]) stats[i].textContent = v; });
    const holder = root.querySelector('.rows'); if (!holder) return;
    holder.replaceChildren();
    if (!apps.length) { holder.innerHTML = '<p class="company-empty">Aún no recibes postulaciones. Publica una vacante para comenzar.</p>'; return; }
    apps.slice(-3).reverse().forEach(app => { const row=document.createElement('div'); row.className='rowcard'; row.innerHTML=`<div><strong>${safe(app.candidate.name)}</strong><p>${safe(app.job.title)} · ${safe(app.detail.status || 'Recibida')}</p></div><a class="btn btn-primary" href="/doc/empresa/empresa-candidatos.html">Revisar candidato</a>`; holder.append(row); });
  }

  function renderProfile() {
    const form=document.getElementById('company-profile-form'); if(!form || !location.pathname.endsWith('empresa-perfil.html'))return;
    const stored=profile();
    form.elements.namedItem('foundedYear').max=String(new Date().getFullYear());
    const values={...stored,name:stored.name||user?.name||'',sector:stored.sector||user?.sector||'',city:stored.city||user?.city||'',department:stored.department||user?.department||'',publicEmail:stored.publicEmail||stored.email||email,phone:stored.phone||user?.phone||''};
    const controls=[...form.querySelectorAll('[name]')];
    controls.forEach(control=>{if(control.type!=='file'&&values[control.name]!=null)control.value=values[control.name];});
    const status=form.querySelector('#company-profile-status');
    const imageField=form.querySelector('#company-logo-file'),logoPreview=form.querySelector('#company-profile-logo-preview'),removeLogo=form.querySelector('#company-logo-remove');
    let logo=values.logo||'';
    const renderLogo=()=>{logoPreview.replaceChildren();if(logo){const img=document.createElement('img');img.src=logo;img.alt='Logo de '+(values.name||'la empresa');logoPreview.append(img);removeLogo.hidden=false;}else{logoPreview.textContent=(form.elements.namedItem('name').value.trim()[0]||'E').toUpperCase();removeLogo.hidden=true;}};
    const updateCompleteness=()=>{
      const required=[form.elements.namedItem('name').value.trim(),form.elements.namedItem('sector').value.trim(),form.elements.namedItem('department').value,form.elements.namedItem('city').value.trim(),form.elements.namedItem('publicEmail').value.trim(),form.elements.namedItem('description').value.trim()];
      const percent=Math.round(required.filter(Boolean).length/required.length*100);
      form.querySelector('#company-profile-progress-label').textContent=percent+'%';form.querySelector('#company-profile-progress').style.width=percent+'%';
      form.querySelector('#company-profile-hint').textContent=percent===100?'Los datos principales del perfil estan completos.':`Completa ${required.filter(value=>!value).length} dato(s) principal(es) para que el perfil sea mas informativo.`;
    };
    renderLogo();
    const publicLink=form.querySelector('[data-company-public-preview]');if(publicLink)publicLink.href='/doc/empresa/empresa-detalle.html?empresa='+encodeURIComponent('empresa-'+email.toLowerCase());
    const description=form.elements.namedItem('description'),counter=form.querySelector('#company-description-count');
    const updateCounter=()=>{counter.textContent=String(description.value.length);updateCompleteness();};
    form.querySelectorAll('input:not([type=file]),select,textarea').forEach(control=>control.addEventListener('input',updateCompleteness));
    form.querySelectorAll('select').forEach(control=>control.addEventListener('change',updateCompleteness));
    description.addEventListener('input',updateCounter);updateCounter();
    imageField.addEventListener('change',()=>{
      const file=imageField.files?.[0];if(!file)return;
      if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>1024*1024){imageField.value='';status.textContent='Elige un archivo PNG, JPG o WebP de hasta 1 MB.';return;}
      const reader=new FileReader();reader.onload=()=>{logo=String(reader.result||'');renderLogo();status.textContent='Logo listo. Guarda el perfil para publicarlo.';};reader.onerror=()=>{status.textContent='No se pudo leer el logo seleccionado.';};reader.readAsDataURL(file);
    });
    removeLogo.addEventListener('click',()=>{logo='';imageField.value='';renderLogo();status.textContent='Logo quitado. Guarda el perfil para confirmar el cambio.';});
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const next={...values};controls.forEach(control=>{if(control.type!=='file')next[control.name]=control.value.trim();});
      next.logo=logo;next.email=email;next.updatedAt=new Date().toISOString();
      try{
        localStorage.setItem(prefix+profileKey,JSON.stringify(next));
        localStorage.setItem(prefix+'accounts',JSON.stringify(accounts.map(account=>account.email===email?{...account,name:next.name,sector:next.sector,city:next.city,department:next.department,phone:next.phone}:account)));
        status.textContent='Perfil guardado en este navegador. Ya esta disponible en el perfil publico de la empresa.';
        Object.assign(values,next);renderLogo();updateCompleteness();window.dispatchEvent(new Event('ld:activity-updated'));
      }catch{status.textContent='No se pudo guardar el perfil. Prueba con una imagen mas pequena o quita el logo.';}
    });
  }

  function renderVacancies() {
    const table=document.getElementById('ld-company-posts'); if(!table)return;
    table.innerHTML='<thead><tr><th>Vacante</th><th>Modalidad</th><th>Postulaciones</th><th>Estado</th><th>Acciones</th></tr></thead><tbody></tbody>';
    const tbody=table.tBodies[0], mine=jobs();
    if(!mine.length){tbody.innerHTML='<tr><td colspan="5">Aún no has publicado vacantes. Usa “Nueva vacante” para comenzar.</td></tr>';return;}
    mine.forEach(job=>{const count=applications().filter(a=>a.id===String(job.id)).length;const row=document.createElement('tr');
      row.innerHTML=`<td>${safe(job.title)}</td><td>${safe(job.modality || 'Presencial')}</td><td>${count}</td><td><span class="pill">${safe(job.status || 'Activa')}</span></td><td class="company-job-actions"><a class="btn btn-soft btn-sm" href="/doc/empresa/empresa-candidatos.html?vacante=${encodeURIComponent(job.id)}">Candidatos (${count})</a><a class="btn btn-sm" href="/doc/empleo/publicar.html?editar=${encodeURIComponent(job.id)}">Editar</a></td>`;
      const actions=row.querySelector('.company-job-actions');
      if((job.status||'Activa')==='Activa') actions.insertAdjacentHTML('beforeend','<button type="button" class="btn btn-sm" data-job-action="Pausada">Pausar</button>');
      else if(job.status==='Pausada') actions.insertAdjacentHTML('beforeend','<button type="button" class="btn btn-sm" data-job-action="Activa">Reactivar</button>');
      if(job.status!=='Cerrada') actions.insertAdjacentHTML('beforeend','<button type="button" class="btn btn-danger btn-sm" data-job-action="Cerrada">Cerrar</button>');
      actions.querySelectorAll('[data-job-action]').forEach(button=>button.addEventListener('click',()=>{const all=read('jobs',[]);write('jobs',all.map(j=>j.id===job.id&&j.owner===email?{...j,status:button.dataset.jobAction}:j));renderVacancies();renderPanel();}));
      tbody.append(row);
    });
  }

  function renderCandidates() {
    const root=document.getElementById('company-candidates-root'); if(!root)return;
    const stats=document.getElementById('company-candidate-stats');
    const toolbar=document.getElementById('company-candidate-toolbar');
    const list=document.getElementById('company-candidate-list');
    const allApps=applications();
    const counts={all:allApps.length};
    statusOptions.forEach(status=>counts[status]=allApps.filter(app=>(app.detail.status||'Recibida')===status).length);
    stats.innerHTML=[
      ['Postulaciones',counts.all,'all'],['Por revisar',counts['Recibida'],'Recibida'],
      ['En revision',counts[statusOptions[1]],statusOptions[1]],['Entrevistas',counts.Entrevista,'Entrevista'],
      ['Seleccionadas',counts.Seleccionada,'Seleccionada'],['Rechazadas',counts.Rechazada,'Rechazada']
    ].map(([label,count,key])=>`<button class="company-candidate-stat ${candidateFilters.status===key?'is-active':''}" type="button" data-stat-filter="${safe(key)}"><span>${safe(label)}</span><strong>${count}</strong></button>`).join('');
    const vacancyOptions=jobs().map(job=>`<option value="${safe(job.id)}" ${candidateFilters.vacancy===String(job.id)?'selected':''}>${safe(job.title)}</option>`).join('');
    toolbar.innerHTML=`
      <label class="company-filter-search" for="company-candidate-search"><span>Buscar</span><input id="company-candidate-search" type="search" value="${safe(candidateFilters.query)}" placeholder="Nombre, correo o vacante"></label>
      <label for="company-candidate-vacancy"><span>Vacante</span><select id="company-candidate-vacancy"><option value="all">Todas las vacantes</option>${vacancyOptions}</select></label>
      <label for="company-candidate-status-filter"><span>Estado</span><select id="company-candidate-status-filter"><option value="all">Todos los estados</option>${statusOptions.map(status=>`<option value="${safe(status)}" ${candidateFilters.status===status?'selected':''}>${safe(status)}</option>`).join('')}</select></label>
      <label for="company-candidate-sort"><span>Ordenar por</span><select id="company-candidate-sort"><option value="newest" ${candidateFilters.sort==='newest'?'selected':''}>Mas recientes</option><option value="oldest" ${candidateFilters.sort==='oldest'?'selected':''}>Mas antiguas</option><option value="name" ${candidateFilters.sort==='name'?'selected':''}>Nombre A-Z</option></select></label>
      <button class="btn btn-soft" type="button" data-clear-filters>Limpiar</button>
      <button class="btn btn-soft" type="button" data-export-applications>Exportar CSV</button>`;
    const search=toolbar.querySelector('#company-candidate-search');
    search.addEventListener('input',()=>{candidateFilters.query=search.value;renderCandidateList(allApps,list);});
    toolbar.querySelector('#company-candidate-vacancy').addEventListener('change',event=>{candidateFilters.vacancy=event.target.value;renderCandidateList(allApps,list);});
    toolbar.querySelector('#company-candidate-status-filter').addEventListener('change',event=>{candidateFilters.status=event.target.value;renderCandidates();});
    toolbar.querySelector('#company-candidate-sort').addEventListener('change',event=>{candidateFilters.sort=event.target.value;renderCandidateList(allApps,list);});
    toolbar.querySelector('[data-clear-filters]').addEventListener('click',()=>{candidateFilters.query='';candidateFilters.vacancy='all';candidateFilters.status='all';candidateFilters.sort='newest';history.replaceState(null,'',location.pathname);renderCandidates();});
    toolbar.querySelector('[data-export-applications]').addEventListener('click',()=>exportApplications(allApps));
    stats.querySelectorAll('[data-stat-filter]').forEach(button=>button.addEventListener('click',()=>{candidateFilters.status=button.dataset.statFilter;renderCandidates();}));
    renderCandidateList(allApps,list);
  }

  function filteredApplications(apps) {
    const query=candidateFilters.query.trim().toLocaleLowerCase('es');
    return apps.filter(app=>
      (candidateFilters.vacancy==='all'||app.id===String(candidateFilters.vacancy))&&
      (candidateFilters.status==='all'||(app.detail.status||'Recibida')===candidateFilters.status)&&
      (!query||[app.candidate.name,app.candidate.email,app.job.title].join(' ').toLocaleLowerCase('es').includes(query))
    ).sort((a,b)=>{
      if(candidateFilters.sort==='name')return String(a.candidate.name).localeCompare(String(b.candidate.name),'es');
      const delta=new Date(a.detail.date||0)-new Date(b.detail.date||0);
      return candidateFilters.sort==='oldest'?delta:-delta;
    });
  }

  function renderCandidateList(apps,list) {
    const visible=filteredApplications(apps);
    list.replaceChildren();
    const result=document.createElement('p');result.className='company-results-count';result.textContent=`${visible.length} de ${apps.length} postulacion(es)`;list.append(result);
    if(!visible.length){const empty=document.createElement('div');empty.className='company-candidate-empty';empty.innerHTML=apps.length?'No hay resultados con estos filtros. Prueba limpiar la busqueda.':'Aun no hay postulaciones para tus vacantes. Cuando lleguen, apareceran aqui.';list.append(empty);return;}
    visible.forEach(app=>{
      const status=app.detail.status||'Recibida';
      const initials=String(app.candidate.name||'?').trim().split(/\s+/).slice(0,2).map(name=>name[0]||'').join('').toUpperCase();
      const answers=Array.isArray(app.detail.answers)?app.detail.answers:[];
      const card=document.createElement('article');card.className='company-candidate-card';
      card.innerHTML=`
        <div class="company-candidate-main">
          <div class="company-candidate-avatar" aria-hidden="true">${safe(initials)}</div>
          <div class="company-candidate-identity"><h3>${safe(app.candidate.name||'Candidato')}</h3><a href="mailto:${encodeURIComponent(app.candidate.email||'')}">${safe(app.candidate.email)}</a><p>${safe(app.job.title)} <span>-</span> ${app.detail.date?new Date(app.detail.date).toLocaleDateString('es-SV'):'Fecha no disponible'}</p></div>
          <span class="company-status-pill" data-status-pill>${safe(status)}</span>
        </div>
        <div class="company-candidate-summary">
          <p><strong>Mensaje de presentacion</strong><br>${safe(app.detail.message||'No incluyo un mensaje de presentacion.')}</p>
          <span class="company-answer-count">${answers.length?`${answers.length} respuesta(s) a preguntas`:'Sin preguntas de filtro'}</span>
        </div>
        <div class="company-candidate-review">
          <label><span>Etapa del proceso</span><select data-status-select aria-label="Etapa del proceso para ${safe(app.candidate.name)}">${statusOptions.map(option=>`<option ${option===status?'selected':''}>${safe(option)}</option>`).join('')}</select></label>
          <button class="btn btn-primary btn-sm" type="button" data-save-status>Guardar etapa</button>
          <div class="company-candidate-actions">
            <button class="btn btn-soft btn-sm" type="button" data-profile>Ver perfil</button>
            ${answers.length?'<button class="btn btn-soft btn-sm" type="button" data-answers>Ver respuestas</button>':''}
            <button class="btn btn-soft btn-sm" type="button" data-note>Nota interna</button>
            <a class="btn btn-soft btn-sm" href="mailto:${encodeURIComponent(app.candidate.email||'')}?subject=${encodeURIComponent('Postulacion: '+app.job.title)}">Contactar</a>
          </div>
        </div>`;
      card.querySelector('[data-save-status]').addEventListener('click',()=>{
        const key='candidate-application-details-'+app.candidate.email,all=read(key,{}),old=all[app.id]||{},next=card.querySelector('[data-status-select]').value;
        if(next===old.status){notice('La etapa seleccionada ya esta guardada.');return;}
        all[app.id]={...old,status:next,history:[...(Array.isArray(old.history)?old.history:[]),{date:new Date().toISOString(),status:next}]};
        write(key,all);notice('Etapa de candidatura actualizada.');renderCandidates();renderPanel();
      });
      card.querySelector('[data-profile]').addEventListener('click',()=>showCandidate(app));
      card.querySelector('[data-answers]')?.addEventListener('click',()=>showAnswers(app));
      card.querySelector('[data-note]').addEventListener('click',()=>showNotes(app));
      list.append(card);
    });
  }

  function exportApplications(apps) {
    const visible=filteredApplications(apps);
    const quote=value=>{let text=String(value??'').replace(/[\r\n]+/g,' ');if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['Candidato','Correo','Vacante','Estado','Fecha','Mensaje','Preguntas y respuestas']];
    visible.forEach(app=>rows.push([app.candidate.name,app.candidate.email,app.job.title,app.detail.status||'Recibida',app.detail.date||'',app.detail.message||'',(app.detail.answers||[]).map(item=>`${item.question}: ${item.answer}`).join(' | ')]));
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='postulaciones-linknodin.csv';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function showNotes(app) {
    const box=document.createElement('div');box.className='company-candidate-dialog';
    const section=document.createElement('section');section.className='panel';section.setAttribute('role','dialog');section.setAttribute('aria-modal','true');section.setAttribute('aria-labelledby','company-note-title');
    const heading=document.createElement('h2');heading.id='company-note-title';heading.textContent='Nota interna: '+(app.candidate.name||'candidato');
    const context=document.createElement('p');context.textContent='Solo visible para la empresa en este navegador. Vacante: '+app.job.title;
    const label=document.createElement('label');label.htmlFor='company-internal-note';label.textContent='Notas de revision';
    const input=document.createElement('textarea');input.id='company-internal-note';input.rows=5;input.maxLength=2000;input.value=app.detail.internalNote||'';input.placeholder='Puntos para revisar, seguimiento o comentarios del equipo...';
    const actions=document.createElement('div');actions.className='company-note-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn btn-soft';cancel.textContent='Cancelar';cancel.addEventListener('click',()=>box.remove());
    const save=document.createElement('button');save.type='button';save.className='btn btn-primary';save.textContent='Guardar nota';save.addEventListener('click',()=>{const key='candidate-application-details-'+app.candidate.email,all=read(key,{}),old=all[app.id]||{};all[app.id]={...old,internalNote:input.value.trim()};write(key,all);box.remove();notice('Nota interna guardada.');renderCandidates();});
    actions.append(cancel,save);section.append(heading,context,label,input,actions);box.append(section);box.addEventListener('click',event=>{if(event.target===box)box.remove();});document.body.append(box);input.focus();
  }

  function showAnswers(app) {
    const box=document.createElement('div');box.className='company-candidate-dialog';
    const section=document.createElement('section');section.className='panel';section.setAttribute('role','dialog');section.setAttribute('aria-modal','true');section.setAttribute('aria-labelledby','company-answers-title');
    const close=document.createElement('button');close.type='button';close.className='btn';close.textContent='Cerrar';close.addEventListener('click',()=>box.remove());
    const heading=document.createElement('h2');heading.id='company-answers-title';heading.textContent='Respuestas de '+(app.candidate.name||'la persona candidata');
    const subtitle=document.createElement('p');subtitle.textContent='Vacante: '+(app.job.title||'');
    section.append(close,heading,subtitle);
    app.detail.answers.forEach((item,index)=>{const article=document.createElement('div');article.className='company-answer';const question=document.createElement('h3');question.textContent=`${index+1}. ${item.question||'Pregunta'}`;const answer=document.createElement('p');answer.textContent=item.answer||'Sin respuesta';article.append(question,answer);section.append(article);});
    box.append(section);box.addEventListener('click',event=>{if(event.target===box)box.remove();});document.body.append(box);close.focus();
  }

  function showCandidate(app) {
    const profile=read('perfil-candidato:'+app.candidate.email.toLowerCase(),{}),extra=read('candidate-extra-'+app.candidate.email.toLowerCase(),{});
    const box=document.createElement('div');box.className='company-candidate-dialog';box.innerHTML=`<section class="panel" role="dialog" aria-modal="true" aria-labelledby="company-candidate-title"><button type="button" class="btn" data-close>Cerrar</button><h2 id="company-candidate-title">${safe(profile.nombre||app.candidate.name)}</h2><p>${safe(profile.profesion||'Perfil profesional')}</p><p>${safe(profile.ubicacion||'Ubicación no indicada')} · ${safe(profile.experiencia||'Experiencia no indicada')}</p><h3>Resumen</h3><p>${safe(profile.resumen||'La persona aún no ha agregado un resumen.')}</p><h3>Habilidades</h3><p>${safe(profile.habilidades||'No especificadas')}</p><p>Vacante: ${safe(app.job.title)}</p></section>`;
    document.body.append(box);box.querySelector('[data-close]').onclick=()=>box.remove();box.addEventListener('click',e=>{if(e.target===box)box.remove();});
  }

  function publicCompany() {
    const root=document.getElementById('wl-company-name'); if(!root)return;
    const slug=new URLSearchParams(location.search).get('empresa');
    const p=Object.values(readAllProfiles()).find(profile=>profile.slug===slug); if(!p)return;
    root.textContent=p.name||'Empresa'; document.title=(p.name||'Empresa')+' | LinkNoDin';
    const about=document.getElementById('wl-company-about');about.textContent=p.description||'Esta empresa aun no ha agregado una presentacion.';
    document.getElementById('wl-company-location').textContent=[p.address,p.city,p.department,'El Salvador'].filter(Boolean).join(', ')||'Ubicacion no indicada';
    document.getElementById('wl-company-sector').textContent=p.sector||'Sector no indicado';
    const size=document.getElementById('wl-company-size');if(p.employeeRange){size.hidden=false;size.textContent=p.employeeRange;}
    const founded=document.getElementById('wl-company-founded');if(p.foundedYear){founded.hidden=false;founded.textContent='Desde '+p.foundedYear;}
    const contact=document.getElementById('wl-company-contact'),contactEmail=p.publicEmail||p.email;
    if(contactEmail){contact.hidden=false;contact.href='mailto:'+encodeURIComponent(contactEmail);contact.textContent='Contactar: '+contactEmail;}
    const webUrl=value=>{const raw=String(value||'').trim();if(!raw)return '';try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}};
    [['wl-company-website',p.website,'Sitio web'],['wl-company-linkedin',p.linkedin,'LinkedIn']].forEach(([id,value,label])=>{const link=document.getElementById(id),url=webUrl(value);if(url){link.href=url;link.hidden=false;link.textContent=label;}});
    const cultureSection=document.getElementById('wl-company-culture-section');if(p.culture){cultureSection.hidden=false;document.getElementById('wl-company-culture').textContent=p.culture;}
    const image=document.getElementById('wl-company-logo');
    if(image&&p.logo){image.src=p.logo;image.alt='Logo de '+(p.name||'la empresa');image.hidden=false;}
    else if(image){const mark=document.createElement('span');mark.className='company-logo';mark.textContent=(p.name||'E').slice(0,1).toUpperCase();image.replaceWith(mark);}
    const offers=document.getElementById('wl-company-jobs');offers.replaceChildren();
    const publicJobs=read('jobs',[]).filter(job=>job.owner===p.email&&(job.status||'Activa')==='Activa');
    if(!publicJobs.length){offers.innerHTML='<p>Esta empresa aun no tiene vacantes activas.</p>';return;}
    publicJobs.forEach(job=>{const article=document.createElement('article');article.className='wl-job-entry';article.innerHTML=`<strong>${safe(job.title)}</strong><p>${safe(job.city)} ? ${safe(job.modality||'')}</p><a class="btn btn-primary" href="/doc/empleo/detalle-empleo.html?id=${encodeURIComponent(job.id)}">Ver empleo</a>`;offers.append(article);});
  }
  function readAllProfiles(){const result=[];Object.keys(localStorage).filter(k=>k.startsWith(prefix+'company-profile-')).forEach(k=>{try{const p=JSON.parse(localStorage.getItem(k));if(p?.email)result.push({...p,slug:'empresa-'+encodeURIComponent(p.email.toLowerCase())});}catch{}});return result;}
  function renderDirectory(){
    const root=document.querySelector('[data-company-carousel]');if(!root)return;
    const profiles=readAllProfiles(),cards=document.querySelector('.container .cards');
    const logoMarkup=p=>p.logo?`<span class="company-logo"><img src="${safe(p.logo)}" alt="Logo de ${safe(p.name)}"></span>`:`<span class="company-logo">${safe((p.name||'E')[0])}</span>`;
    profiles.forEach(p=>{
      const tile=document.createElement('a');tile.className='wl-company-tile';tile.href='/doc/empresa/empresa-detalle.html?empresa='+encodeURIComponent(p.slug);tile.innerHTML=`${logoMarkup(p)}<h3>${safe(p.name)}</h3><p>${safe(p.sector||p.city||'Empresa registrada')}</p><span>Ver perfil y vacantes ?</span>`;root.append(tile);
      if(cards){const card=document.createElement('article');card.className='card';const active=read('jobs',[]).filter(job=>job.owner===p.email&&(!job.status||job.status==='Activa')).length;card.innerHTML=`${logoMarkup(p)}<h3>${safe(p.name)}</h3><p>${safe(p.description||p.sector||'Empresa registrada en LinkNoDin.')}</p><span class="tag">${active} ${active===1?'vacante':'vacantes'}</span><p><a class="btn btn-primary" href="/doc/empresa/empresa-detalle.html?empresa=${encodeURIComponent(p.slug)}">Ver perfil</a></p>`;cards.append(card);}
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{renderPanel();renderProfile();renderVacancies();renderCandidates();publicCompany();renderDirectory();});
})();
