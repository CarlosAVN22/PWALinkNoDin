import {supabase,$,dom,run,who,status,messageError,money,date} from './base.js';
const detail=id=>'/doc/empleo/detalle-empleo.html?id='+encodeURIComponent(id);
const apply=id=>'/doc/candidato/postular.html?id='+encodeURIComponent(id);
let identity=null;
async function my(){if(identity===null)identity=await who();return identity;}
async function companies(){return run(supabase.from('companies').select('id,commercial_name,city,verification_status'));}
async function jobs(){
 const [all,orgs]=await Promise.all([
  run(supabase.from('jobs').select('*').eq('status','active').order('created_at',{ascending:false})),companies()
 ]);
 const verified=new Map(orgs.filter(c=>c.verification_status==='verified').map(c=>[c.id,c.commercial_name]));
 const today=new Date().toISOString().slice(0,10);
 return all.filter(j=>verified.has(j.company_id)&&(!j.application_deadline||j.application_deadline>=today))
  .map(j=>({...j,company:verified.get(j.company_id)}));
}
async function ensureCandidate(me){
  if(!me||me.role_id!==1)throw new Error('Inicia sesión con una cuenta de candidato.');
  const existing=await run(supabase.from('candidate_profiles').select('user_id').eq('user_id',me.id));
  if(!existing.length)await run(supabase.from('candidate_profiles').insert({user_id:me.id}));
}
function paragraph(parent,cls,value){parent.append(dom('p',cls,value));}
function button(text,onClick,cls='btn'){const b=dom('button',cls,text);b.type='button';b.addEventListener('click',onClick);return b;}
function cards(target,records,options={}){
 target.replaceChildren();if(!records.length){paragraph(target,'muted','Aún no hay vacantes que coincidan.');return;}
 records.forEach(job=>{
  const card=dom('article','panel ln-integ-card');const title=dom('h3','',job.title);
  const meta=dom('p','muted',`${job.company} · ${job.city||'El Salvador'} · ${job.modality||'No especificada'}`);
  const summary=dom('p','',job.summary||'Consulta los detalles de esta oportunidad.');
  const actions=dom('div','ln-integ-actions');const link=dom('a','btn btn-primary','Ver vacante');link.href=detail(job.id);actions.append(link);
  if(options.saved!==undefined&&options.me?.role_id===1){
   const isSaved=options.saved.has(job.id);
   actions.append(button(isSaved?'Quitar guardado':'Guardar',async ev=>{
    const node=ev.currentTarget||ev.target;node.disabled=true;
    try{
     if(isSaved)await run(supabase.from('saved_jobs').delete().eq('job_id',job.id).eq('candidate_id',options.me.id));
     else await run(supabase.from('saved_jobs').insert({job_id:job.id,candidate_id:options.me.id}));
     await options.refresh();
    }catch(e){alert(messageError(e));node.disabled=false;}
   }));
  }
  card.append(title,meta,summary,actions);target.append(card);
 });
}
async function catalogue(){
 const root=$('ld-job-list');if(!root)return;
 const form=$('ld-filter-form');const summary=$('ld-job-count');
 const all=await jobs();
 const params=new URLSearchParams(location.search);
 let mapRefresh=null;
 if($('ld-filter-keyword'))$('ld-filter-keyword').value=params.get('q')||'';
 if($('ld-filter-location'))$('ld-filter-location').value=params.get('ubicacion')||'';
 if($('ld-filter-modality')&&params.get('modalidad'))$('ld-filter-modality').value=params.get('modalidad');
 document.querySelectorAll('.ld-demo-job,.demo-job').forEach(n=>n.hidden=true);
 function refresh(){
  const q=($('ld-filter-keyword')?.value||'').toLowerCase().trim();const city=($('ld-filter-location')?.value||'').toLowerCase().trim();
  const modality=$('ld-filter-modality')?.value||'Todas';const contract=$('ld-filter-contract')?.value||'Todos';
  const level=$('ld-filter-experience')?.value||'Todas';
  const match=all.filter(j=>(!q||[j.title,j.summary,j.company,j.requirements].join(' ').toLowerCase().includes(q))
   &&(!city||(j.city||'').toLowerCase().includes(city))
   &&(modality==='Todas'||j.modality===modality)
   &&(contract==='Todos'||j.work_time===contract||j.contract_type===contract)
   &&(level==='Todas'||j.experience_level===level));
  cards(root,match);status(summary,`${match.length} oportunidades disponibles`);
  if(mapRefresh)mapRefresh(match);
  if($('ld-empty'))$('ld-empty').hidden=true;
 }
 form?.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();refresh();},true);
 $('ld-clear-filters')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();form?.reset();refresh();},true);
 refresh();
 const map=$('ld-map-section');
 if(map){
  const mapContainer=$('ld-map'),counter=$('ld-map-result-count');let instance=null,layer=null,view='list';
  function renderMap(filtered=all){
   const available=filtered.filter(j=>j.latitude!=null&&j.longitude!=null&&Number.isFinite(Number(j.latitude))&&Number.isFinite(Number(j.longitude)));
   if(counter)counter.textContent=available.length+' vacantes con coordenadas publicadas';
   if(!window.L){status($('ld-map-error'),'No se cargó el mapa. Prueba con conexión a internet.',true);return;}
   if(!instance){instance=L.map(mapContainer).setView([13.69,-89.2],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(instance);layer=L.layerGroup().addTo(instance);}
   layer.clearLayers();const bounds=[];
   for(const j of available){const point=[Number(j.latitude),Number(j.longitude)];if(point[0]<-90||point[0]>90||point[1]<-180||point[1]>180)continue;
    const popup=dom('div');popup.append(dom('strong','',j.title),dom('p','',j.company));const a=dom('a','btn btn-sm','Ver vacante');a.href=detail(j.id);popup.append(a);
    L.marker(point).addTo(layer).bindPopup(popup);bounds.push(point);
   }
   if(bounds.length)instance.fitBounds(bounds,{padding:[25,25],maxZoom:12});
   setTimeout(()=>instance.invalidateSize(),50);
  }
  mapRefresh=filtered=>{if(view==='map')renderMap(filtered);};
  document.querySelectorAll('[data-job-view]').forEach(button=>button.addEventListener('click',()=>{
   view=button.dataset.jobView;map.hidden=view!=='map';root.hidden=view==='map';
   if(view==='map')refresh();
   document.querySelectorAll('[data-job-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  }));
  if(new URLSearchParams(location.search).get('vista')==='mapa')document.querySelector('[data-job-view="map"]')?.click();
 }

}
async function jobDetail(){
 const root=$('ld-detail-content');if(!root)return;
 const id=Number(new URLSearchParams(location.search).get('id'));if(!Number.isInteger(id)||id<1){root.replaceChildren(dom('p','muted','Selecciona una vacante publicada desde Empleos.'));return;}
 const all=await jobs(),job=all.find(j=>j.id===id);
 if(!job){root.replaceChildren(dom('p','muted','La vacante no está disponible.'));return;}
 const fields={
 'ld-detail-title':job.title,'ld-detail-info':`${job.company} · ${job.city||'El Salvador'}`,
 'ld-detail-salary':job.salary_confidential?'Confidencial':(job.salary_min||job.salary_max)?`${money(job.salary_min)} – ${money(job.salary_max)}`:'No especificado',
 'ld-detail-contract':job.contract_type,'ld-detail-worktime':job.work_time,'ld-detail-modality':job.modality,
 'ld-detail-experience':job.experience_level,'ld-detail-education':job.education_required,
 'ld-detail-schedule':[job.schedule,job.work_days_hours].filter(Boolean).join(' · '),'ld-detail-openings':job.openings,
 'ld-detail-area':job.area,'ld-detail-published':date(job.published_at||job.created_at),
 'ld-detail-deadline':job.application_deadline,'ld-detail-contact':job.contact_email,
 'ld-detail-location':[job.city,job.department].filter(Boolean).join(', '),'ld-detail-desc':job.summary,
 'ld-detail-responsibilities':job.responsibilities,'ld-detail-requirements':job.requirements,
 'ld-detail-license':job.license_requirement,'ld-detail-vehicle':job.vehicle_requirement,
 'ld-detail-competencies':job.competencies,'ld-detail-benefits':job.benefits,
 'ld-detail-instructions':job.application_instructions};
 for(const [id,text] of Object.entries(fields))if($(id))$(id).textContent=text||'No especificado';
 for(const key of ['ld-apply-link','ld-apply-link-bottom'])if($(key))$(key).href=apply(id);
 const companyLink='/doc/empresa/empresa-detalle.html?empresa='+encodeURIComponent(job.company_id);
 document.querySelectorAll('[data-company-profile-link]').forEach(a=>a.href=companyLink);
 const companyName=$('ld-detail-company');
 if(companyName)companyName.textContent=job.company;
 const companyDescription=$('ld-company-desc');
 const companyRecord=(await run(supabase.from('companies').select('description,logo_storage_key').eq('id',job.company_id).limit(1)))[0];
 if(companyDescription)companyDescription.textContent=companyRecord?.description||'Consulta el perfil para conocer esta empresa.';
 const companyLogo=$('ld-company-logo');
 if(companyLogo){
  companyLogo.replaceChildren();
  if(companyRecord?.logo_storage_key){
   const img=dom('img');img.alt='Logo de '+job.company;
   img.src=supabase.storage.from('company-logos').getPublicUrl(companyRecord.logo_storage_key).data.publicUrl;
   img.style.maxWidth='100%';img.style.maxHeight='100%';companyLogo.append(img);
  }else companyLogo.textContent=(job.company||'E').charAt(0).toUpperCase();
 }
 const place=$('ld-detail-location');
 if(place){
  const locationText=[job.address,job.city,job.department,'El Salvador'].filter(Boolean).join(', ');
  place.textContent=locationText;
  const findPlace=dom('a','btn btn-soft','Ver ubicación en el mapa');
  const coordinates=job.latitude!=null&&job.longitude!=null&&Number.isFinite(Number(job.latitude))&&Number.isFinite(Number(job.longitude));
  const destination=coordinates?`${job.latitude},${job.longitude}`:locationText;
  findPlace.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(destination);
  findPlace.target='_blank';findPlace.rel='noopener noreferrer';
  place.insertAdjacentElement('afterend',findPlace);
  if(coordinates){
   const map=dom('div','ln-job-detail-map');
   place.insertAdjacentElement('afterend',map);
   if(window.L){
    const coord=[Number(job.latitude),Number(job.longitude)];
    const instance=window.L.map(map).setView(coord,14);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(instance);
    window.L.marker(coord).addTo(instance).bindPopup(job.title);
   }else map.remove();
  }
 }
 if($('ld-detail-status-tag'))$('ld-detail-status-tag').textContent='Oferta publicada';
 const me=await my();const action=dom('div','ln-integ-actions');
 if(me?.role_id===1){
  action.append(button('Guardar esta vacante',async ev=>{
   ev.currentTarget.disabled=true;
   try{await ensureCandidate(me);try{await run(supabase.from('saved_jobs').insert({candidate_id:me.id,job_id:id}));}
   catch(e){if(e.code!=='23505')throw e;}ev.currentTarget.textContent='Guardada';}
   catch(e){alert(messageError(e));ev.currentTarget.disabled=false;}
  }));
 }
 root.querySelector('.panel')?.append(action);
}
async function savedJobs(){
 const list=$('em-listado');if(!list)return;const me=await my();
 if(!me||me.role_id!==1){status($('em-resumen'),'Inicia sesión como candidato para ver tus guardados.');list.replaceChildren();return;}
 await ensureCandidate(me);
 async function refresh(){
  const [all,stored]=await Promise.all([jobs(),run(supabase.from('saved_jobs').select('job_id').eq('candidate_id',me.id))]);
  const saved=new Set(stored.map(x=>x.job_id)),q=($('em-busqueda')?.value||'').toLowerCase();
  const mode=$('em-filtro')?.value||'guardados';
  cards(list,all.filter(j=>(mode==='todos'||saved.has(j.id))&&[j.title,j.company,j.city].join(' ').toLowerCase().includes(q)),{saved,me,refresh});
  status($('em-resumen'),`${saved.size} vacantes guardadas.`);
 }
 $('em-busqueda')?.addEventListener('input',refresh);$('em-filtro')?.addEventListener('change',refresh);
 await refresh();
}
function collect(form,name){const entry=form.elements.namedItem(name);return entry?.type==='checkbox'?entry.checked:(entry?.value||'').trim();}
function number(value){return value===''?null:Number(value);}
async function publish(){
 const form=$('ld-publish');if(!form)return;
 const me=await my(),output=$('ld-status'),target=$('em-publicadas-lista');
 if(!me||me.role_id!==2){status(output,'Solo empresas verificadas pueden publicar vacantes.',true);form.querySelector('button[type="submit"]')?.setAttribute('disabled','');return;}
 const owned=await run(supabase.from('companies').select('id,verification_status').eq('user_id',me.id));
 const company=owned.find(c=>c.verification_status==='verified');
 if(!company){status(output,'La empresa debe estar verificada por un administrador antes de publicar.',true);form.querySelector('button[type="submit"]')?.setAttribute('disabled','');return;}
 async function refresh(){const list=await run(supabase.from('jobs').select('id,title,city,status').eq('company_id',company.id).order('created_at',{ascending:false}).limit(10));target?.replaceChildren();for(const j of list){const p=dom('p');const a=dom('a','',`${j.title} · ${j.city} · ${j.status}`);a.href=detail(j.id);p.append(a);target?.append(p);}}
 form.addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;
  const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
  const val=key=>collect(form,key);
  const payload={company_id:company.id,created_by:me.id,title:val('titulo'),openings:Number(val('plazas'))||1,
   contract_type:val('contrato'),modality:val('modalidad'),experience_level:val('experiencia'),education_required:val('escolaridad'),
   work_time:val('tiempoTrabajo'),schedule:val('jornada'),work_days_hours:val('horario'),area:val('area'),
   summary:val('descripcion'),responsibilities:val('responsabilidades'),license_requirement:val('licencia'),
   vehicle_requirement:val('vehiculo'),competencies:val('competencias'),requirements:val('requisitos'),benefits:val('beneficios'),
   salary_min:number(val('salarioMin')),salary_max:number(val('salarioMax')),salary_period:val('frecuenciaPago'),
   salary_confidential:val('salarioConfidencial'),application_deadline:val('fechaLimite')||null,
   department:val('departamento'),city:val('ciudad'),address:val('direccion'),reference_point:val('referencia'),
   latitude:number(val('latitud')),longitude:number(val('longitud')),approximate_location_only:val('ubicacionAproximada'),
   contact_email:val('contacto')||null,application_method:val('metodoPostulacion'),application_instructions:val('instrucciones'),
   status:'active',published_at:new Date().toISOString()};
  try{
   if(!payload.title||payload.title.trim().length<3||!payload.city||!payload.summary||!payload.requirements)throw Error('Completa el título, ciudad, descripción y requisitos.');
   if(payload.salary_min!==null&&payload.salary_max!==null&&payload.salary_min>payload.salary_max)throw Error('El salario mínimo no debe superar al máximo.');
   const questions=JSON.parse(val('preguntas')||'[]');
   if(!Array.isArray(questions)||questions.length>5)throw Error('Se permiten como máximo cinco preguntas.');
   await run(supabase.rpc('ln26_publicar_vacante',{p_job:payload,p_questions:questions.filter(q=>typeof q==='string'&&q.trim()).map(q=>q.trim())}));
   status(output,'Vacante publicada correctamente.');form.reset();await refresh();
  }catch(err){status(output,'No se pudo publicar: '+messageError(err),true);}finally{submit.disabled=false;}
 },true);
 await refresh();
}
async function applyJob(){
 const box=$('ld-apply-box');if(!box)return;
 const id=Number(new URLSearchParams(location.search).get('id'));box.replaceChildren();
 const me=await my();if(!me||me.role_id!==1){box.append(dom('h2','','Postulación'),dom('p','','Inicia sesión con una cuenta de candidato para postularte.'));const link=dom('a','btn btn-primary','Iniciar sesión');link.href='/doc/general/login.html';box.append(link);return;}
 const all=await jobs(),job=all.find(j=>j.id===id);if(!job){box.append(dom('p','','Esta vacante no está disponible.'));return;}
 box.append(dom('h2','',`Postularse a ${job.title}`),dom('p','muted',job.company));
 const form=dom('form','ln-integ-form'),letter=dom('textarea');letter.placeholder='Carta de presentación (opcional)';letter.maxLength=4000;letter.rows=5;
 const questions=await run(supabase.from('job_questions').select('id,question,is_required').eq('job_id',id).order('sort_order'));
 const answers=[];
 for(const q of questions){const l=dom('label','',q.question);const a=dom('textarea');a.rows=3;a.maxLength=1000;a.required=q.is_required;answers.push({id:q.id,input:a});form.append(l,a);}
 const send=dom('button','btn btn-primary','Enviar postulación');send.type='submit';const feedback=dom('p','ld-status');form.append(dom('label','','Carta de presentación'),letter,send,feedback);box.append(form);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!form.reportValidity())return;send.disabled=true;
  try{
   await ensureCandidate(me);
   await run(supabase.rpc('ln26_postular',{
    p_job_id:id,
    p_cover_letter:letter.value.trim()||null,
    p_answers:answers.map(q=>({job_question_id:q.id,answer:q.input.value.trim()}))
   }));
   status(feedback,'Tu postulación se envió correctamente.');form.reset();
  }catch(err){status(feedback,messageError(err),true);}finally{send.disabled=false;}
 });
}
async function candidateApplications(){
 const panel=document.querySelector('main .content .panel');if(!panel)return;
 const me=await my();if(!me||me.role_id!==1)return;
 const rows=await run(supabase.from('applications').select('id,job_id,status,applied_at').eq('candidate_id',me.id).order('applied_at',{ascending:false}));
 const all=await jobs(),map=new Map(all.map(j=>[j.id,j]));

 for(const child of [...panel.children])if(child.id!=='ln-real-applications')child.hidden=true;
 const root=dom('section');root.id='ln-real-applications';root.append(dom('h2','','Mis postulaciones'));
 if(!rows.length)root.append(dom('p','muted','Todavía no has enviado postulaciones.'));
 for(const a of rows){const j=map.get(a.job_id);const p=dom('article','ln-integ-card');p.append(dom('strong','',j?.title||'Vacante '+a.job_id),dom('p','',`Estado: ${a.status} · ${date(a.applied_at)}`));root.append(p);}
 panel.prepend(root);
}
async function businessApplications(){
 const root=$('company-candidates-root');if(!root)return;
 const me=await my();if(!me||me.role_id!==2)return;
 const orgs=await run(supabase.from('companies').select('id').eq('user_id',me.id));
 if(!orgs.length)return;
 const own=await run(supabase.from('jobs').select('id,title').eq('company_id',orgs[0].id));const ids=own.map(j=>j.id);
 root.replaceChildren();root.append(dom('h2','','Postulaciones recibidas'));
 if(!ids.length){root.append(dom('p','muted','Publica una vacante para recibir postulaciones.'));return;}
 const rows=await run(supabase.from('applications').select('id,job_id,status,applied_at,candidate_id,cover_letter').in('job_id',ids).order('applied_at',{ascending:false}));
 const jobNames=new Map(own.map(j=>[j.id,j.title]));
 const applicantNames=new Map();
 try{const directory=await run(supabase.rpc('ln_applicant_directory'));
   for(const person of directory)applicantNames.set(person.application_id,person);}
 catch(err){console.warn('Directorio de postulantes no habilitado en Data API:',err.message);}
 const select=dom('select');for(const name of ['received','reviewing','interview','selected','rejected']){const option=dom('option','',name);option.value=name;select.append(option);}
 if(!rows.length)root.append(dom('p','muted','Todavía no hay postulaciones para estas vacantes.'));
 for(const a of rows){const card=dom('article','ln-integ-card');card.append(dom('h3','',jobNames.get(a.job_id)||'Vacante'),dom('p','',`${applicantNames.get(a.id)?.candidate_name||'Candidato #'+a.candidate_id} · ${date(a.applied_at)}`));
  if(applicantNames.has(a.id)){
    const detail=applicantNames.get(a.id);card.append(dom('p','muted',detail.candidate_email||''));
    if(detail.occupation)card.append(dom('p','muted',detail.occupation));
    if(detail.cv_storage_key){
      const cv=button('Abrir currículum',async ev=>{ev.currentTarget.disabled=true;try{
        const result=await supabase.storage.from('candidate-cvs').createSignedUrl(detail.cv_storage_key,300);
        if(result.error)throw result.error;window.open(result.data.signedUrl,'_blank','noopener,noreferrer');
      }catch(e){alert(messageError(e));}finally{ev.currentTarget.disabled=false;}});card.append(cv);
    }
   }
  card.append((()=>{const link=dom('a','btn','Revisar candidato');link.href='/doc/candidato/candidato-detalle.html?application_id='+a.id;return link;})());
  if(a.cover_letter)card.append(dom('p','',a.cover_letter));
  const answersBox=dom('details');answersBox.append(dom('summary','','Ver respuestas de la postulación'));
  answersBox.addEventListener('toggle',async()=>{
   if(!answersBox.open||answersBox.dataset.loaded)return;
   const wrap=dom('div');answersBox.append(wrap);
   try{const responses=await run(supabase.rpc('ln26_respuestas_postulacion',{p_application_id:a.id}));
    if(!responses.length)wrap.append(dom('p','muted','Esta postulación no contiene respuestas adicionales.'));
    for(const response of responses){wrap.append(dom('strong','',response.question),dom('p','',response.answer));}
    answersBox.dataset.loaded='1';
   }catch(error){wrap.replaceChildren(dom('p','muted','No se pudieron consultar las respuestas: '+messageError(error)));}
  });card.append(answersBox);
  const statusSelect=select.cloneNode(true);statusSelect.value=a.status;
  const feedback=dom('small','muted');statusSelect.addEventListener('change',async()=>{try{await run(supabase.from('applications').update({status:statusSelect.value,updated_at:new Date().toISOString()}).eq('id',a.id));feedback.textContent='Estado actualizado.';}catch(e){feedback.textContent=messageError(e);}});
  card.append(dom('label','','Estado de la postulación'),statusSelect,feedback);root.append(card);
 }
}
async function companyJobs(){
 const table=$('ld-company-posts');if(!table)return;
 const me=await my();if(!me||me.role_id!==2)return;
 const orgs=await run(supabase.from('companies').select('id').eq('user_id',me.id));if(!orgs.length)return;
 const root=dom('section','panel');root.id='ln-real-company-jobs';root.append(dom('h2','','Vacantes de mi empresa'));
 table.closest('.panel')?.prepend(root);table.hidden=true;
 async function refresh(){for(const old of [...root.querySelectorAll('article')])old.remove();
  const all=await run(supabase.from('jobs').select('id,title,city,status').eq('company_id',orgs[0].id).order('created_at',{ascending:false}));
  for(const j of all){const card=dom('article','ln-integ-card');card.append(dom('strong','',j.title),dom('p','muted',`${j.city} · ${j.status}`));const a=dom('a','btn','Ver vacante');a.href=detail(j.id);
  const toggle=button(j.status==='active'?'Cerrar vacante':'Reactivar vacante',async()=>{try{await run(supabase.from('jobs').update({status:j.status==='active'?'closed':'active'}).eq('id',j.id));await refresh();}catch(e){alert(messageError(e));}});card.append(a,toggle);root.append(card);}
  if(!all.length)root.append(dom('p','muted','Aún no se han publicado vacantes.'));
 }
 await refresh();
}
async function start(){
 try{
  if($('ld-job-list'))await catalogue();
  if($('ld-detail-content'))await jobDetail();
  if($('em-listado'))await savedJobs();
  if($('ld-publish'))await publish();
  if($('ld-apply-box'))await applyJob();
  if(location.pathname.endsWith('/candidato/postulaciones.html'))await candidateApplications();
  if($('company-candidates-root'))await businessApplications();
  if($('ld-company-posts'))await companyJobs();
 }catch(e){
  console.error('LinkNoDin Supabase empleos',e);
  const node=$('ld-job-count')||$('ld-status')||$('em-resumen')||$('company-candidate-status');status(node,'No se pudo cargar la información real: '+messageError(e),true);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
