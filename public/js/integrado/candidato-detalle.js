/* Vista privada de una postulación: solo empresa propietaria verificada / admin. */
import {supabase,dom,run,who,status,messageError,date} from './base.js';
async function init(){
 if(!location.pathname.endsWith('/candidato/candidato-detalle.html'))return;
 const container=document.querySelector('main .content');if(!container)return;
 for(const item of container.children)item.hidden=true;
 const root=dom('section','panel ln-integ-section');container.prepend(root);
 const info=dom('p','ld-status');root.append(dom('h2','','Detalle real de postulación'),info);
 const me=await who();if(!me||![2,3].includes(me.role_id)){status(info,'Solo una empresa autorizada o un administrador puede ver esta solicitud.',true);return;}
 const applicationId=Number(new URLSearchParams(location.search).get('application_id'));
 if(!Number.isInteger(applicationId)||applicationId<1){status(info,'Selecciona una postulación desde el panel empresarial.');return;}
 try{
  const [persons,record]=await Promise.all([
   run(supabase.rpc('ln_applicant_directory')),
   run(supabase.from('applications').select('id,job_id,status,cover_letter,applied_at,candidate_id').eq('id',applicationId).single())
  ]);
  const person=persons.find(x=>x.application_id===applicationId);
  if(!person){status(info,'No tienes permisos para consultar esta postulación.',true);return;}
  root.append(dom('h3','',person.candidate_name),dom('p','muted',person.occupation||'Ocupación no especificada'),dom('p','',person.candidate_email||''),dom('p','',`Postulación: ${date(record.applied_at)} · Estado: ${record.status}`));
  if(record.cover_letter)root.append(dom('h3','','Carta de presentación'),dom('p','',record.cover_letter));
  const answers=await run(supabase.rpc('ln26_respuestas_postulacion',{p_application_id:applicationId}));
  root.append(dom('h3','','Respuestas a las preguntas'));
  if(!answers.length)root.append(dom('p','muted','Sin respuestas adicionales.'));
  for(const answer of answers)root.append(dom('strong','',answer.question),dom('p','',answer.answer));
  if(person.cv_storage_key){const b=dom('button','btn btn-primary','Abrir CV privado por cinco minutos');b.type='button';b.onclick=async()=>{
   b.disabled=true;try{const {data,error}=await supabase.storage.from('candidate-cvs').createSignedUrl(person.cv_storage_key,300);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer');}
   catch(e){status(info,'No se pudo abrir el CV: '+messageError(e),true);}finally{b.disabled=false;}
  };root.append(b);}else root.append(dom('p','muted','El candidato no tiene un CV asociado.'));
  const states=[['received','Recibida'],['reviewing','En revisión'],['interview','Entrevista'],['selected','Seleccionada'],['rejected','Rechazada']];
  const sel=dom('select');for(const [value,label] of states){const option=dom('option','',label);option.value=value;sel.append(option);}sel.value=record.status;
  sel.onchange=async()=>{sel.disabled=true;try{await run(supabase.from('applications').update({status:sel.value}).eq('id',record.id));status(info,'Estado actualizado. El candidato podrá consultar su nuevo estado.');}
   catch(e){sel.value=record.status;status(info,messageError(e),true);}finally{sel.disabled=false;}};
  root.append(dom('h3','','Actualizar estado'),sel);
 }catch(e){status(info,'No se pudo cargar la postulación: '+messageError(e),true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
