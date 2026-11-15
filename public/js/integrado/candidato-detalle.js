import { $, dom, date, who } from './base.js';
import { companyRequest } from '/js/empresa/api-empresa.js';

const labels={received:'Recibida',reviewing:'En revisión',preselected:'Preseleccionada',interview_scheduled:'Entrevista programada',interview_completed:'Entrevista realizada',offer:'Oferta laboral',hired:'Contratada',rejected:'No seleccionada',withdrawn:'Retirada',interview:'Entrevista',selected:'Seleccionada'};
const stages=['received','reviewing','preselected','interview_scheduled','interview_completed','offer','hired','rejected','withdrawn'];
const field=(label,value)=>{const box=dom('div','ats-fact');box.append(dom('span','',label),dom('strong','',value||'No especificado'));return box;};
const section=(title)=>{const el=dom('section','ats-dossier-section');el.append(dom('h2','',title));return el;};

async function start(){
 const params=new URLSearchParams(location.search),id=params.get('application_id');
 if(!location.pathname.endsWith('/candidato/candidato-detalle.html'))return;
 const shell=document.querySelector('main .content .panel')||document.querySelector('main .content')||document.querySelector('main');
 if(!shell)return;
 const me=await who();
 const root=dom('div','ats-dossier');root.setAttribute('aria-live','polite');shell.replaceChildren(root);
 if(me?.role_id!==2){root.append(dom('p','ld-status','Este expediente está disponible para la empresa que recibió la postulación.'));return;}
 if(!id){root.append(dom('p','ld-status','No se indicó una postulación.'));return;}
 root.setAttribute('aria-busy','true');
 for(let i=0;i<4;i++){const sk=dom('div','ats-skeleton');sk.append(dom('span','ld-skeleton ld-skeleton-line medium'),dom('span','ld-skeleton ld-skeleton-line short'));root.append(sk);}
 try{
  const [person,answers,history,notes,messages]=await Promise.all([
   companyRequest(`/applications/${encodeURIComponent(id)}`),companyRequest(`/applications/${encodeURIComponent(id)}/answers`),companyRequest(`/applications/${encodeURIComponent(id)}/history`),companyRequest(`/applications/${encodeURIComponent(id)}/notes`),companyRequest(`/applications/${encodeURIComponent(id)}/messages`)
  ]);
  root.replaceChildren();root.removeAttribute('aria-busy');
  const back=dom('a','btn','Volver a postulaciones');back.href='/doc/empresa/empresa-candidatos.html';root.append(back);
  const hero=dom('header','ats-dossier-hero'),avatar=dom('span','ats-avatar ats-avatar-large',(person.candidate_name||'C').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase());
  const intro=dom('div','');intro.append(dom('p','eyebrow','EXPEDIENTE DE CANDIDATURA'),dom('h1','',person.candidate_name||'Candidato'),dom('p','muted',`${person.job_title||'Vacante'} · ${person.candidate_email||'Sin correo'}`));hero.append(avatar,intro);root.append(hero);
  const profile=section('Perfil profesional'),grid=dom('div','ats-facts-grid');
  [["Puesto",person.occupation],["Ubicación",person.location],["Formación",person.education_summary],["Experiencia",person.experience_years==null?null:`${person.experience_years} años`],["Teléfono",person.phone],["Postulación",date(person.applied_at)]].forEach(([a,b])=>grid.append(field(a,b)));profile.append(grid);
  if(person.professional_summary)profile.append(dom('p','ats-summary-text',person.professional_summary));root.append(profile);
  const app=section('Postulación'),appgrid=dom('div','ats-facts-grid');appgrid.append(field('Vacante',person.job_title),field('Estado actual',labels[person.status]||person.status),field('Fecha recibida',date(person.applied_at)));app.append(appgrid);
  if(person.cover_letter)app.append(dom('p','ats-summary-text',person.cover_letter));
  if(person.has_cv){const cv=dom('button','btn','Ver currículum');cv.type='button';cv.addEventListener('click',async()=>{cv.disabled=true;try{const result=await companyRequest(`/applications/${encodeURIComponent(id)}/cv`);window.open(result.signedUrl,'_blank','noopener');}catch{feedback.textContent='No se pudo abrir el currículum.';}finally{cv.disabled=false;}});app.append(cv);}root.append(app);
  const response=section('Respuestas a la vacante');if(Array.isArray(answers)&&answers.length){const list=dom('div','ats-answer-list');for(const item of answers){const card=dom('article','ats-answer');card.append(dom('h3','',item.question||item.question_text||'Pregunta'),dom('p','',item.answer||'Sin respuesta'));list.append(card);}response.append(list);}else response.append(dom('p','muted','Esta vacante no tiene respuestas registradas.'));root.append(response);
  const feedback=dom('p','ats-feedback');
  const workflow=section('Etapa del proceso'),form=dom('form','ats-stage-form'),select=dom('select'),save=dom('button','btn btn-primary','Guardar etapa');select.setAttribute('aria-label','Etapa de la postulación');for(const stage of stages){const o=dom('option','',labels[stage]);o.value=stage;select.append(o);}select.value=stages.includes(person.status)?person.status:'received';save.type='submit';form.append(select,save);form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;feedback.textContent='';try{await companyRequest(`/applications/${encodeURIComponent(id)}/status`,'PATCH',{status:select.value});person.status=select.value;appgrid.children[1].lastChild.textContent=labels[select.value];feedback.textContent='Etapa actualizada.';await refreshHistory();}catch(e){feedback.textContent=e.message||'No se pudo actualizar la etapa.';}finally{save.disabled=false;}});workflow.append(form,feedback);root.append(workflow);
  const historySection=section('Historial'),historyList=dom('ol','ats-timeline');historySection.append(historyList);root.append(historySection);
  function renderHistory(rows){historyList.replaceChildren();if(!rows?.length){historyList.append(dom('li','ats-timeline-item','Sin movimientos registrados todavía.'));return;}for(const row of rows){const li=dom('li','ats-timeline-item');li.append(dom('strong','',labels[row.status]||row.status),dom('time','',new Date(row.changed_at).toLocaleString('es-SV')),row.note?dom('p','',row.note):dom('span'));historyList.append(li);}}
  async function refreshHistory(){try{renderHistory(await companyRequest(`/applications/${encodeURIComponent(id)}/history`));}catch{feedback.textContent='La etapa cambió, pero no se pudo actualizar el historial.';}}
  renderHistory(history);
  const privateSection=section('Notas privadas de la empresa'),privateHint=dom('p','muted','Solo tu empresa puede consultar estas notas.'),note=dom('textarea'),rating=dom('select'),noteForm=dom('form','ats-note-form'),noteSave=dom('button','btn btn-primary','Guardar nota');note.maxLength=5000;note.rows=5;note.placeholder='Observaciones internas sobre esta candidatura';note.setAttribute('aria-label','Nota privada');for(let i=0;i<=5;i++){const o=dom('option','',i===0?'Sin valoración':`${i} de 5`);o.value=i?String(i):'';rating.append(o);}note.value=notes?.note||'';rating.value=notes?.rating?String(notes.rating):'';noteSave.type='submit';noteForm.append(note,rating,noteSave);noteForm.addEventListener('submit',async e=>{e.preventDefault();noteSave.disabled=true;try{await companyRequest(`/applications/${encodeURIComponent(id)}/notes`,'PUT',{note:note.value,rating:rating.value||null});privateFeedback.textContent='Nota guardada.';}catch(err){privateFeedback.textContent=err.message||'No se pudo guardar la nota. Verifica que aplicaste ATS_Actualizacion.sql en Supabase.';}finally{noteSave.disabled=false;}});const privateFeedback=dom('p','ats-feedback');privateSection.append(privateHint,noteForm,privateFeedback);root.append(privateSection);
  const chat=section('Conversación con la persona candidata'),thread=dom('div','ats-message-thread'),chatForm=dom('form','ats-message-form'),message=dom('textarea'),send=dom('button','btn btn-primary','Enviar mensaje'),chatFeedback=dom('p','ats-feedback');
  function renderMessages(rows){thread.replaceChildren();if(!rows?.length){thread.append(dom('p','muted','Aún no hay mensajes en esta conversación.'));return;}for(const row of rows){const bubble=dom('article',`ats-message${row.is_mine?' is-mine':''}`);bubble.append(dom('strong','',row.is_mine?'Tú':row.name||'Candidato'),dom('p','',row.body),dom('time','',new Date(row.created_at).toLocaleString('es-SV')));thread.append(bubble);}}
  message.rows=3;message.maxLength=4000;message.placeholder='Escribe un mensaje para la persona candidata';message.setAttribute('aria-label','Mensaje');send.type='submit';chatForm.append(message,send);chatForm.addEventListener('submit',async e=>{e.preventDefault();send.disabled=true;chatFeedback.textContent='';try{await companyRequest(`/applications/${encodeURIComponent(id)}/messages`,'POST',{body:message.value});message.value='';renderMessages(await companyRequest(`/applications/${encodeURIComponent(id)}/messages`));}catch(err){chatFeedback.textContent=err.message||'No se pudo enviar el mensaje. Verifica que aplicaste ATS_Actualizacion.sql en Supabase.';}finally{send.disabled=false;}});renderMessages(messages);chat.append(thread,chatForm,chatFeedback);root.append(chat);
 }catch(error){root.removeAttribute('aria-busy');root.replaceChildren(dom('p','ld-status',`No se pudo cargar el expediente: ${error.message||'Error inesperado.'}`));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
