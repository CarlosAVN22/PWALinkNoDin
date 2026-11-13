/* Vista de recurso: datos y marcadores persistidos en PostgreSQL. */
import {supabase,run,who,dom,status,messageError} from './base.js';
import { generalRequest } from '/js/general/api-general.js';
const $=id=>document.getElementById(id);
async function init(){
 if(!$('rd-sections'))return;
 const slug=new URLSearchParams(location.search).get('id')||'cv';
 const all=await generalRequest('/resources');
 const resource=all.find(r=>r.slug===slug||String(r.id)===slug);
 if(!resource){$('rd-title').textContent='Recurso no encontrado';$('rd-intro').textContent='Consulta los recursos disponibles desde la biblioteca.';$('rd-save').disabled=true;$('rd-read').disabled=true;return;}
 document.title=resource.title+' | LinkNoDin';
 $('rd-title').textContent=resource.title;$('rd-category').textContent=resource.category||'General';$('rd-reading').textContent=`Lectura estimada: ${resource.reading_minutes||5} minutos`;$('rd-intro').textContent=resource.intro||resource.summary||'';
 const [parts,checklist,me]=await Promise.all([
  generalRequest('/resources/'+resource.id+'/sections'),
  generalRequest('/resources/'+resource.id+'/checklist'),who()
 ]);
 $('rd-sections').replaceChildren();parts.forEach((part,i)=>{const section=dom('section','rd-section');section.append(dom('h2','',`${i+1}. ${part.heading||'Contenido'}`),dom('p','',part.body||''));$('rd-sections').append(section);});
 $('rd-checklist').replaceChildren();for(const check of checklist)$('rd-checklist').append(dom('li','',check.item_text));
 const related=$('rd-related-list');related.replaceChildren();for(const r of all.filter(r=>r.id!==resource.id).slice(0,6)){const a=dom('a','rd-related-card');a.href='?id='+encodeURIComponent(r.slug);a.append(dom('span','',r.category||'General'),dom('strong','',r.title));related.append(a);}
 const save=$('rd-save'),read=$('rd-read'),notice=$('rd-status');
 if(!me){save.disabled=true;read.disabled=true;status(notice,'Inicia sesión para guardar este recurso y registrar la lectura.');return;}
 let activity=(await generalRequest('/resource-activity')).find(item=>item.resource_id===resource.id)||null;
 function draw(){save.textContent=activity?.is_saved?'Quitar de guardados':'Guardar recurso';read.textContent=activity?.read_at?'Marcar pendiente':'Marcar como leído';}
 async function update(property){const next=property==='read_at'?!activity?.read_at:!activity?.[property];
  try{const values=property==='read_at'?{is_read:next}:{is_saved:next};
  activity=await generalRequest('/resource-activity/'+resource.id,'PUT',values);status(notice,'Progreso guardado correctamente.');draw();
  }catch(e){status(notice,messageError(e),true);}}
 save.onclick=()=>update('is_saved');read.onclick=()=>update('read_at');draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
