/* Preferencias de avisos por cuenta. El envío por correo requiere proveedor externo. */
import {supabase,dom,run,who,status,messageError} from './base.js';
async function init(){
 const host=document.getElementById('ld-notif-inbox');if(!host)return;
 const me=await who();if(!me)return;
 const root=dom('section','panel ln-integ-section');root.append(dom('h2','','Preferencias de notificaciones'));
 const help=dom('p','muted','Tus preferencias de notificación se guardan en tu cuenta. Los avisos por correo requieren que el servicio de envío esté habilitado.');
 const notice=dom('p','ld-status');root.append(help,notice);host.insertAdjacentElement('afterend',root);
 const stored=await run(supabase.from('notification_preferences').select('id,notification_type,in_app_enabled,email_enabled').eq('user_id',me.id));
 for(const [code,title] of [['application_status','Cambios de mis postulaciones'],['new_application','Nuevas postulaciones recibidas'],['company_verification','Verificación empresarial'],['course','Cursos y aprendizaje']]){
  let row=stored.find(p=>p.notification_type===code)||null;
  const wrap=dom('div','ln-integ-card'),heading=dom('h3','',title);wrap.append(heading);
  const checkbox=dom('input');checkbox.type='checkbox';checkbox.checked=row?.in_app_enabled??true;
  const label=dom('label');label.append(checkbox,document.createTextNode(' Mostrar avisos dentro de LinkNoDin'));wrap.append(label);
  // La preferencia email se muestra, pero no se promete el envío sin backend.
  const email=dom('input');email.type='checkbox';email.checked=row?.email_enabled??false;const emailLabel=dom('label');emailLabel.append(email,document.createTextNode(' Solicitar avisos por correo (requiere configuración del servidor)'));wrap.append(emailLabel);
  root.append(wrap);
  async function save(){checkbox.disabled=true;email.disabled=true;
   try{const values={user_id:me.id,notification_type:code,in_app_enabled:checkbox.checked,email_enabled:email.checked,updated_at:new Date().toISOString()};
    const query=row?supabase.from('notification_preferences').update(values).eq('id',row.id).select('id').single():supabase.from('notification_preferences').insert(values).select('id').single();
    const result=await run(query);row={...values,id:result.id};status(notice,'Preferencia guardada.');}
   catch(error){status(notice,messageError(error),true);}finally{checkbox.disabled=false;email.disabled=false;}
  }
  checkbox.addEventListener('change',save);email.addEventListener('change',save);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
