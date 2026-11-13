/* Guías con actividades de Supabase y avance individual, sin sesión local. */
import {supabase,run,who,dom,status,messageError} from './base.js';
const $=id=>document.getElementById(id);
const destinations={
 'Crear cuenta y perfil':'/doc/general/registro.html','Completar mi perfil':'/doc/general/perfil.html',
 'Buscar empleos':'/doc/empleo/empleos.html','Postularme a una vacante':'/doc/empleo/empleos.html',
 'Revisar mis postulaciones':'/doc/candidato/postulaciones.html',
 'Consultar empresas y valoraciones':'/doc/empresa/empresas.html',
 'Explorar recursos y cursos':'/doc/general/recursos.html',
 'Registrar mi empresa':'/doc/empresa/registro-empresa.html',
 'Completar perfil empresarial':'/doc/empresa/empresa-perfil.html',
 'Publicar una vacante':'/doc/empleo/publicar.html',
 'Revisar postulaciones':'/doc/empresa/empresa-candidatos.html',
 'Administrar vacantes':'/doc/empresa/empresa-vacantes.html'
};
async function init(){
 const root=$('ld-guide-app');if(!root)return;
 const me=await who(),note=$('ld-guide-account-note'),content=$('ld-guide-content');
 const all=await run(supabase.from('guide_activities').select('id,audience,title,description,sort_order').order('sort_order'));
 const saved=me?await run(supabase.from('user_guide_progress').select('activity_id').eq('user_id',me.id)):[];
 let done=new Set(saved.map(x=>x.activity_id));let audience=me?.role_id===2?'empresa':'candidato';
 if(note)note.textContent=me?'Tu progreso se guarda y se sincroniza entre dispositivos.':'Inicia sesión para conservar tu progreso entre dispositivos.';
 function draw(){
  content.replaceChildren();const activities=all.filter(x=>x.audience===audience||x.audience===(audience==='candidato'?'candidate':'company'));
  $('ld-guide-heading').textContent=audience==='empresa'?'Guía para empresas':'Guía para candidatos';
  root.querySelectorAll('[data-role]').forEach(b=>{const active=b.dataset.role===audience;b.setAttribute('aria-selected',String(active));b.classList.toggle('btn-primary',active);});
  const count=activities.filter(a=>done.has(a.id)).length;
  $('ld-guide-counter').textContent=`${count} de ${activities.length} actividades completadas`;
  $('ld-guide-progress').setAttribute('aria-valuenow',String(count));$('ld-guide-progress').setAttribute('aria-valuemax',String(activities.length));
  $('ld-guide-progress-fill').style.width=(activities.length?count/activities.length*100:0)+'%';
  if(!activities.length){content.append(dom('p','muted','No hay actividades configuradas. Administración debe instalar el catálogo de guías.'));return;}
  for(const [index,activity] of activities.entries()){
   const section=dom('section','panel ld-guide-card'),toggle=dom('button','ld-guide-toggle',`${index+1}. ${activity.title} · ${done.has(activity.id)?'Completado':'Pendiente'}`);
   toggle.type='button';const details=dom('div','ld-guide-detail');details.hidden=index!==0;toggle.setAttribute('aria-expanded',String(!details.hidden));
   details.append(dom('p','',activity.description||''));
   const a=dom('a','btn btn-primary','Abrir sección');a.href=destinations[activity.title]||'/doc/general/index.html';details.append(a);
   const button=dom('button','btn ld-guide-complete',done.has(activity.id)?'Marcar pendiente':'Marcar como completada');button.type='button';button.disabled=!me;
   button.onclick=async()=>{
    button.disabled=true;
    try{if(done.has(activity.id)){await run(supabase.from('user_guide_progress').delete().eq('user_id',me.id).eq('activity_id',activity.id));done.delete(activity.id);}
    else{await run(supabase.from('user_guide_progress').insert({user_id:me.id,activity_id:activity.id,completed_at:new Date().toISOString()}));done.add(activity.id);}
    draw();}catch(error){alert(messageError(error));button.disabled=false;}
   };details.append(button);toggle.onclick=()=>{details.hidden=!details.hidden;toggle.setAttribute('aria-expanded',String(!details.hidden));};section.append(toggle,details);content.append(section);
  }
 }
 root.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',()=>{audience=button.dataset.role;draw();}));draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
