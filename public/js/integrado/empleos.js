import {supabase,$,dom,run,who,status,messageError,money,date} from './base.js';
import {empleoRequest} from '/js/empleo/api-empleo.js';
import {companyRequest} from '/js/empresa/api-empresa.js';
const detail=id=>'/doc/empleo/detalle-empleo.html?id='+encodeURIComponent(id);
const apply=id=>'/doc/candidato/postular.html?id='+encodeURIComponent(id);
let identity=null;
async function my(){if(identity===null)identity=await who();return identity;}
async function jobs(){
 return empleoRequest('/jobs');
}
async function companyLogos(records){
 const ids=[...new Set(records.map(job=>job.company_id).filter(Boolean))];if(!ids.length)return new Map();
 let companies;try{companies=await run(supabase.from('companies').select('id,commercial_name,logo_storage_key').in('id',ids));}catch{return new Map();}
 return new Map(companies.map(company=>[company.id,{
  name:company.commercial_name,
  url:company.logo_storage_key?supabase.storage.from('company-logos').getPublicUrl(company.logo_storage_key).data.publicUrl:null,
 }]));
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
  const card=dom('article','panel ln-integ-card ld-job-result-card'),brand=dom('div','ld-job-company');
  const company=options.logos?.get(job.company_id),logo=dom('span','ld-job-company-logo');
  if(company?.url){const image=dom('img');image.src=company.url;image.alt='';image.loading='lazy';image.addEventListener('error',()=>{logo.replaceChildren(dom('span','ld-job-company-initial',String(company.name||job.company||'E').charAt(0).toLocaleUpperCase('es')));},{once:true});logo.append(image);}
  else logo.append(dom('span','ld-job-company-initial',String(company?.name||job.company||'E').charAt(0).toLocaleUpperCase('es')));
  brand.append(logo,dom('span','ld-job-company-name',company?.name||job.company||'Empresa'));card.append(brand);
  const title=dom('h3','ld-job-result-title',job.title);
  const meta=dom('p','muted',`${job.city||'El Salvador'} · ${job.modality||'No especificada'}`);
  const summary=dom('p','',job.summary||'Consulta los detalles de esta oportunidad.');
  const actions=dom('div','ln-integ-actions');const link=dom('a','btn btn-primary','Ver vacante');link.href=detail(job.id);actions.append(link);
  if(options.saved!==undefined&&options.me?.role_id===1){
   const isSaved=options.saved.has(job.id);
   const feedback=dom('small','muted');
   actions.append(button(isSaved?'Quitar guardado':'Guardar',async ev=>{
    const node=ev.currentTarget||ev.target;node.disabled=true;
    try{
     if(isSaved)await empleoRequest(`/saved/${job.id}`,'DELETE');
     else await empleoRequest(`/saved/${job.id}`,'POST');
     feedback.textContent='Guardado actualizado.';
     await options.refresh();
    }catch(e){feedback.textContent='No se pudo actualizar el guardado. Inténtalo de nuevo.';node.disabled=false;}
   }),feedback);
  }
  card.append(title,meta,summary,actions);target.append(card);
 });
}
async function catalogue(){
 const root=$('ld-job-list');if(!root)return;
 const form=$('ld-filter-form');const summary=$('ld-job-count');
 const all=await jobs(),logos=await companyLogos(all);
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
  cards(root,match,{logos});status(summary,`${match.length} oportunidades disponibles`);
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
    const popup=dom('div','ld-map-popup');popup.append(dom('strong','ld-map-popup-title',j.title),dom('p','ld-map-popup-company',`${j.company} · ${j.city||'El Salvador'}`));const a=dom('a','btn btn-primary btn-sm ld-map-popup-link','Ver vacante');a.href=detail(j.id);popup.append(a);
    const icon=L.divIcon({className:'ld-vacancy-pin-wrap',html:'<span class="ld-vacancy-pin" aria-hidden="true"></span>',iconSize:[34,44],iconAnchor:[17,42],popupAnchor:[0,-38]});
    L.marker(point,{icon}).addTo(layer).bindPopup(popup,{className:'ld-vacancy-popup',maxWidth:260});bounds.push(point);
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
 const id=Number(new URLSearchParams(location.search).get('id'));if(!Number.isInteger(id)||id<1){root.setAttribute('aria-busy','false');root.replaceChildren(dom('p','muted','Selecciona una vacante publicada desde Empleos.'));return;}
 const all=await jobs(),job=all.find(j=>j.id===id);
 if(!job){root.setAttribute('aria-busy','false');root.replaceChildren(dom('p','muted','La vacante no está disponible.'));return;}
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
 document.querySelectorAll('[data-company-profile-link]').forEach(a=>{a.href=companyLink;a.hidden=false;});
 const reviewsLink='/doc/general/opiniones.html?empresa='+encodeURIComponent(job.company_id);
 document.querySelectorAll('[data-company-reviews-link]').forEach(a=>{a.href=reviewsLink;a.hidden=false;});
 const companyName=$('ld-detail-company');
 if(companyName)companyName.textContent=job.company;
 const companyDescription=$('ld-company-desc');
 let companyRecord=null,companyLoadFailed=false;
 try{companyRecord=(await empleoRequest(`/companies/${job.company_id}`))[0]||null;}catch{companyLoadFailed=true;}
 if(companyDescription){companyDescription.textContent=companyRecord?.description|| (companyLoadFailed?'No se pudo cargar la descripción de la empresa.':'Esta empresa aún no ha agregado una descripción.');companyDescription.classList.remove('ld-company-description-loading');}
 const companyLogo=$('ld-company-logo');
 if(companyLogo){
  companyLogo.replaceChildren();
  if(companyRecord?.logo_storage_key){
   const img=dom('img');img.alt='Logo de '+job.company;
   img.src=supabase.storage.from('company-logos').getPublicUrl(companyRecord.logo_storage_key).data.publicUrl;
   img.style.maxWidth='100%';img.style.maxHeight='100%';img.addEventListener('error',()=>{companyLogo.textContent=(job.company||'E').charAt(0).toLocaleUpperCase('es');},{once:true});companyLogo.append(img);
  }else companyLogo.textContent=(job.company||'E').charAt(0).toUpperCase();
  companyLogo.classList.remove('ld-company-logo-loading');
 }
 $('ld-company-panel')?.removeAttribute('aria-busy');
 root.setAttribute('aria-busy','false');
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
  const notice=dom('p','ld-status');
  const saveButton=button('Guardar esta vacante',async()=>{
   saveButton.disabled=true;
   try{
    if(saved){
     await empleoRequest(`/saved/${id}`,'DELETE');
     saved=false;
    }else{
     await empleoRequest(`/saved/${id}`,'POST');
     saved=true;
    }
    updateButton();
    status(notice,saved?'Vacante guardada en tu cuenta.':'Vacante eliminada de tus guardados.');
   }catch(e){
    status(notice,'No se pudo actualizar el guardado: '+messageError(e),true);
   }finally{
    saveButton.disabled=false;
   }
  });
  let saved=false;
  function updateButton(){saveButton.textContent=saved?'Quitar guardado':'Guardar esta vacante';}
  action.append(saveButton,notice);
  const stored=await empleoRequest('/saved');
  saved=stored.some(row=>row.job_id===id);
  updateButton();
 }
 root.querySelector('.panel')?.append(action);
}
async function savedJobs(){
 const list=$('em-listado');if(!list)return;const me=await my();
 if(!me||me.role_id!==1){status($('em-resumen'),'Inicia sesión como candidato para ver tus guardados.');list.replaceChildren();return;}
 async function refresh(){
  const [all,stored]=await Promise.all([jobs(),empleoRequest('/saved')]);
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
 const editId=new URLSearchParams(location.search).get('id');
 if(!me||me.role_id!==2){status(output,'Solo empresas verificadas pueden publicar vacantes.',true);form.querySelector('button[type="submit"]')?.setAttribute('disabled','');return;}
 try {
  await companyRequest('/vacancies');
 } catch(error) {
  status(output,'Tu empresa debe estar verificada para publicar vacantes.',true);
  form.querySelector('button[type="submit"]')?.setAttribute('disabled','');
  return;
 }
 async function refresh(){const list=await companyRequest('/vacancies');target?.replaceChildren();for(const j of list){const p=dom('p');const a=dom('a','',`${j.title} · ${j.city} · ${j.status}`);a.href=detail(j.id);p.append(a);target?.append(p);}}
 if(editId){
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Guardar cambios';
  const title=document.querySelector('main h1, main h2');if(title)title.textContent='Editar vacante';
  const sectionTitle=document.querySelector('#ld-publish h3');if(sectionTitle)sectionTitle.textContent='Editar oferta laboral';
  try{
   let job;
   try{job=await companyRequest(`/vacancies/${encodeURIComponent(editId)}`);}
   catch{job=(await companyRequest('/vacancies')).find(item=>String(item.id)===String(editId));if(!job)throw new Error('La vacante no aparece entre las vacantes de tu empresa.');}
   const fields={titulo:'title',plazas:'openings',contrato:'contract_type',modalidad:'modality',experiencia:'experience_level',escolaridad:'education_required',tiempoTrabajo:'work_time',jornada:'schedule',horario:'work_days_hours',area:'area',descripcion:'summary',responsabilidades:'responsibilities',licencia:'license_requirement',vehiculo:'vehicle_requirement',competencias:'competencies',requisitos:'requirements',beneficios:'benefits',salarioMin:'salary_min',salarioMax:'salary_max',frecuenciaPago:'salary_period',fechaLimite:'application_deadline',departamento:'department',ciudad:'city',direccion:'address',referencia:'reference_point',latitud:'latitude',longitud:'longitude',contacto:'contact_email',metodoPostulacion:'application_method',instrucciones:'application_instructions'};
   for(const [name,key] of Object.entries(fields)){const field=form.elements.namedItem(name);if(field&&job[key]!=null)field.value=job[key];}
   for(const [name,key] of [['salarioConfidencial','salary_confidential'],['ubicacionAproximada','approximate_location_only']]){const field=form.elements.namedItem(name);if(field)field.checked=Boolean(job[key]);}
   form.elements.namedItem('preguntas').value=JSON.stringify(job.questions||[]);
   window.dispatchEvent(new CustomEvent('ln:edit-vacancy-loaded',{detail:job}));
  }catch(error){status(output,'No se pudo cargar la vacante para editar: '+messageError(error),true);if(submit)submit.disabled=true;return;}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;
  const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
  const val=key=>collect(form,key);
  try{
  const payload={title:val('titulo'),openings:Number(val('plazas'))||1,
   contract_type:val('contrato'),modality:val('modalidad'),experience_level:val('experiencia'),education_required:val('escolaridad'),
   work_time:val('tiempoTrabajo'),schedule:val('jornada'),work_days_hours:val('horario'),area:val('area'),
   summary:val('descripcion'),responsibilities:val('responsabilidades'),license_requirement:val('licencia'),
   vehicle_requirement:val('vehiculo'),competencies:val('competencias'),requirements:val('requisitos'),benefits:val('beneficios'),
   salary_min:number(val('salarioMin')),salary_max:number(val('salarioMax')),salary_period:val('frecuenciaPago'),
   salary_confidential:val('salarioConfidencial'),application_deadline:val('fechaLimite')||null,
   department:val('departamento'),city:val('ciudad'),address:val('direccion'),reference_point:val('referencia'),
   latitude:number(val('latitud')),longitude:number(val('longitud')),approximate_location_only:val('ubicacionAproximada'),
   contact_email:val('contacto')||null,application_method:val('metodoPostulacion'),application_instructions:val('instrucciones'),
  };
   if(!payload.title||payload.title.trim().length<3||!payload.city||!payload.summary||!payload.requirements)throw Error('Completa el título, ciudad, descripción y requisitos.');
   if(payload.salary_min!==null&&payload.salary_max!==null&&payload.salary_min>payload.salary_max)throw Error('El salario mínimo no debe superar al máximo.');
   const questions=JSON.parse(val('preguntas')||'[]');
   if(!Array.isArray(questions)||questions.length>5)throw Error('Se permiten como máximo cinco preguntas.');
   await companyRequest(editId?`/vacancies/${encodeURIComponent(editId)}`:'/vacancies',editId?'PATCH':'POST',{job:payload,questions:questions.filter(q=>typeof q==='string'&&q.trim()).map(q=>q.trim())});
   if(editId){status(output,'Vacante actualizada correctamente.');location.href='/doc/empresa/empresa-vacantes.html';}
   else{status(output,'Vacante publicada correctamente.');form.reset();await refresh();}
  }catch(err){status(output,'No se pudo publicar: '+messageError(err),true);}finally{submit.disabled=false;}
 },true);
 await refresh();
}
async function applyJob(){
 const box=$('ld-apply-box');if(!box)return;
 const id=Number(new URLSearchParams(location.search).get('id'));box.replaceChildren();
 const me=await my();if(!me||me.role_id!==1){box.append(dom('h2','','Postulación'),dom('p','','Inicia sesión con una cuenta de candidato para postularte.'));const link=dom('a','btn btn-primary','Iniciar sesión');link.href='/doc/general/login.html';box.append(link);return;}
 const all=await jobs(),job=all.find(j=>j.id===id);if(!job){box.append(dom('p','','Esta vacante no está disponible.'));return;}
 box.append(dom('p','ln-application-eyebrow','SOLICITUD DE EMPLEO'),dom('h1','ln-application-title',`Postularse a ${job.title}`),dom('p','ln-application-company',[job.company,job.city].filter(Boolean).join(' · ')));
 const form=dom('form','ln-application-form');form.setAttribute('aria-label',`Postulación a ${job.title}`);
 const letterGroup=dom('div','ln-application-letter'),letterLabel=dom('label','','Carta de presentación');letterLabel.htmlFor='ln-application-letter';letterLabel.append(dom('span','ln-application-optional','Opcional'));
 const letter=dom('textarea');letter.id='ln-application-letter';letter.name='coverLetter';letter.placeholder='Cuéntale a la empresa por qué te interesa esta vacante.';letter.maxLength=4000;letter.rows=5;letter.setAttribute('aria-describedby','ln-application-letter-help');
 letterGroup.append(letterLabel,letter,dom('small','ln-application-help','Máximo 4,000 caracteres.'));form.append(letterGroup);
 const questions=await run(supabase.from('job_questions').select('id,question,is_required').eq('job_id',id).order('sort_order'));
 const answers=[];
 if(questions.length){const questionSection=dom('section','ln-application-questions');questionSection.append(dom('h2','','Preguntas de la empresa'),dom('p','ln-application-help','Responde cada pregunta para completar tu postulación.'));
  for(const [index,q] of questions.entries()){const group=dom('div','ln-application-question'),label=dom('label','',q.question),answer=dom('textarea');answer.id=`ln-application-answer-${q.id}`;answer.name=`answer-${q.id}`;answer.rows=4;answer.maxLength=1000;answer.required=q.is_required;answer.placeholder='Escribe tu respuesta';label.htmlFor=answer.id;if(q.is_required)label.append(dom('span','ln-application-required','Obligatoria'));answers.push({id:q.id,input:answer});group.append(dom('span','ln-application-question-number',`Pregunta ${index+1}`),label,answer);questionSection.append(group);}
  form.append(questionSection);
 }
 const actions=dom('div','ln-application-actions'),send=dom('button','btn btn-primary','Enviar postulación');send.type='submit';const feedback=dom('p','ld-status');feedback.setAttribute('aria-live','polite');actions.append(send,feedback);form.append(actions);box.append(form);
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
 const heading=dom('h2','','Postulaciones recibidas');root.replaceChildren(heading);root.setAttribute('aria-busy','true');
 for(let i=0;i<3;i++){const card=dom('article','ln-integ-card ld-skeleton-card');card.setAttribute('aria-hidden','true');card.append(dom('span','ld-skeleton ld-skeleton-line medium'),dom('span','ld-skeleton ld-skeleton-line short'));root.append(card);}
 let rows;try{rows=await companyRequest('/applications');}catch{root.replaceChildren(heading,dom('p','ld-status','No se pudieron cargar las postulaciones. Recarga la página para intentarlo de nuevo.'));root.removeAttribute('aria-busy');return;}
 root.replaceChildren(heading);root.removeAttribute('aria-busy');
 const statusLabels={received:'Recibida',reviewing:'En revisión',preselected:'Preseleccionado',interview_scheduled:'Entrevista programada',interview_completed:'Entrevista realizada',offer:'Oferta laboral',hired:'Contratado',rejected:'Rechazado',withdrawn:'Retirado',interview:'Entrevista',selected:'Seleccionado'};
 const stats=dom('div','ats-summary');
 const counts=[['Total',rows.length],['Nuevas',rows.filter(x=>x.status==='received').length],['En revisión',rows.filter(x=>x.status==='reviewing').length],['Entrevistas',rows.filter(x=>['interview','interview_scheduled','interview_completed'].includes(x.status)).length],['Contratados',rows.filter(x=>['hired','selected'].includes(x.status)).length]];
 for(const [label,value] of counts){const item=dom('div','ats-stat');item.append(dom('strong','',String(value)),dom('span','',label));stats.append(item);}root.append(stats);
 const toolbar=dom('div','ats-toolbar'),search=dom('input'),vacancy=dom('select'),stage=dom('select');
 search.type='search';search.placeholder='Buscar candidato o correo';search.setAttribute('aria-label','Buscar candidato');
 const allJobs=dom('option','', 'Todas las vacantes');allJobs.value='all';vacancy.append(allJobs);
 for(const item of new Map(rows.map(row=>[row.job_id,row.job_title])).entries()){const option=dom('option','',item[1]);option.value=String(item[0]);vacancy.append(option);}
 const allStages=dom('option','','Todas las etapas');allStages.value='all';stage.append(allStages);
 for(const [value,label] of Object.entries(statusLabels)){if(![...stage.options].some(option=>option.value===value)){const option=dom('option','',label);option.value=value;stage.append(option);}}
 toolbar.append(search,vacancy,stage);root.append(toolbar);
 const resultCount=dom('p','ats-result-count'),list=dom('div','ats-applications-list');root.append(resultCount,list);
 function render(){const query=search.value.trim().toLocaleLowerCase('es');const filtered=rows.filter(row=>(vacancy.value==='all'||String(row.job_id)===vacancy.value)&&(stage.value==='all'||row.status===stage.value)&&`${row.candidate_name} ${row.candidate_email||''} ${row.job_title}`.toLocaleLowerCase('es').includes(query));
  resultCount.textContent=`${filtered.length} ${filtered.length===1?'postulación':'postulaciones'}`;list.replaceChildren();
  if(!filtered.length){list.append(dom('p','muted',rows.length?'No hay resultados con estos filtros.':'Todavía no hay postulaciones para tus vacantes.'));return;}
  for(const application of filtered){const card=dom('article','ats-application-card'),top=dom('div','ats-application-card-top'),person=dom('div','ats-person-heading');
   const initials=(application.candidate_name||'C').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('es');person.append(dom('span','ats-avatar',initials),dom('div','',''));
   const personDetails=person.lastChild;personDetails.append(dom('h3','',application.candidate_name),dom('p','muted',application.occupation||'Perfil profesional'));
   const badge=dom('span','ats-stage-badge',statusLabels[application.status]||application.status);badge.dataset.stage=application.status;top.append(person,badge);card.append(top);
   card.append(dom('p','ats-application-job',application.job_title||'Vacante'),dom('p','ats-application-meta',`${date(application.applied_at)}${application.location?' · '+application.location:''}`));
   const details=dom('div','ats-candidate-snapshot');if(application.candidate_email)details.append(dom('span','',application.candidate_email));if(application.education_summary)details.append(dom('span','',application.education_summary));if(application.experience_years!=null)details.append(dom('span','',`${application.experience_years} años de experiencia`));if(application.has_cv)details.append(dom('span','ats-cv-available','CV disponible'));if(details.childElementCount)card.append(details);
    const profileLink=dom('a','btn btn-primary','Gestionar candidatura');profileLink.href='/doc/candidato/candidato-detalle.html?application_id='+encodeURIComponent(application.id);card.append(profileLink);list.append(card);
  }
 }
 search.addEventListener('input',render);vacancy.addEventListener('change',render);stage.addEventListener('change',render);render();
}
async function companyJobs(){
 const table=$('ld-company-posts');if(!table)return;
 const me=await my();if(!me||me.role_id!==2)return;
 const root=dom('section','panel');root.id='ln-real-company-jobs';root.append(dom('h2','','Vacantes de mi empresa'));
 for(let i=0;i<3;i++){const skeleton=dom('article','ln-integ-card ld-skeleton-card');skeleton.setAttribute('aria-hidden','true');skeleton.append(dom('span','ld-skeleton ld-skeleton-line medium'),dom('span','ld-skeleton ld-skeleton-line short'));root.append(skeleton);}
 table.closest('.panel')?.prepend(root);table.hidden=true;table.closest('.panel')?.setAttribute('aria-busy','true');
 async function refresh(){
  let all;try{all=await companyRequest('/vacancies');}catch{for(const node of [...root.querySelectorAll('article')])node.remove();root.append(dom('p','ld-status','No se pudieron cargar tus vacantes. Recarga la página para intentarlo de nuevo.'));return;}
  for(const old of [...root.querySelectorAll('article')])old.remove();
  for(const j of all){const card=dom('article','ln-integ-card');card.append(dom('strong','',j.title),dom('p','muted',`${j.city} · ${j.status}`));const a=dom('a','btn','Ver vacante');a.href=detail(j.id);
   const edit=dom('a','btn','Editar vacante');edit.href=`/doc/empleo/publicar.html?id=${encodeURIComponent(j.id)}`;
   const feedback=dom('small','muted');
   const toggle=button(j.status==='active'?'Cerrar vacante':'Reactivar vacante',async()=>{toggle.disabled=true;feedback.textContent='';try{await companyRequest(`/vacancies/${j.id}/status`,'PATCH',{status:j.status==='active'?'closed':'active'});await refresh();}catch(e){feedback.textContent='No se pudo cambiar el estado. Inténtalo de nuevo.';toggle.disabled=false;}});card.append(a,edit,toggle,feedback);root.append(card);}
  if(!all.length)root.append(dom('p','muted','Aún no se han publicado vacantes.'));
 }
 await refresh();table.closest('.panel')?.removeAttribute('aria-busy');
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
  const detailRoot=$('ld-detail-content');
  if(detailRoot){detailRoot.setAttribute('aria-busy','false');detailRoot.replaceChildren(dom('p','ld-status','No se pudo cargar la vacante. Recarga la página para intentarlo de nuevo.'));const detailStatus=$('ld-detail-status');if(detailStatus){detailStatus.hidden=false;status(detailStatus,'No se pudo cargar la información de la empresa o de la vacante.',true);}}
  else{const node=$('ld-job-count')||$('ld-status')||$('em-resumen')||$('company-candidate-status');status(node,'No se pudo cargar esta sección. Inténtalo de nuevo.',true);}
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
