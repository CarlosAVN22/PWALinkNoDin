/* Centro de seguridad: solo registros auténticos de administración. */
import {supabase,dom,run,who,status,messageError,date} from './base.js';
async function init(){
 if(!location.pathname.endsWith('/admin/admin-seguridad.html'))return;
 const parent=document.querySelector('main .content')||document.querySelector('main');if(!parent)return;
 const me=await who();if(!me||me.role_id!==3){parent.prepend(dom('p','ld-status','Acceso reservado para administradores.'));return;}
 [...parent.children].forEach(n=>n.hidden=true);
 const root=dom('section','panel ln-integ-section');root.append(dom('h2','','Centro de seguridad de LinkNoDin'),dom('p','muted','Configuración y alertas de seguridad del sistema.'));
 const notice=dom('p','ld-status');root.append(notice);parent.prepend(root);
 let settings=(await run(supabase.from('security_preferences').select('*').eq('admin_user_id',me.id)))[0];
 if(!settings)settings=await run(supabase.from('security_preferences').insert({admin_user_id:me.id}).select('*').single());
 const box=dom('section','ln-integ-card');box.append(dom('h3','','Preferencias de seguridad'));
 for(const [key,title] of [['repeated_password_resets','Avisar de restablecimientos repetidos'],['unverified_companies','Alertar sobre empresas pendientes'],['inactive_accounts','Detectar cuentas inactivas']]){
  const label=dom('label'),check=dom('input');check.type='checkbox';check.checked=settings[key];label.append(check,document.createTextNode(' '+title));box.append(label);
  check.addEventListener('change',async()=>{check.disabled=true;try{await run(supabase.from('security_preferences').update({[key]:check.checked,updated_at:new Date().toISOString()}).eq('id',settings.id));status(notice,'Preferencia guardada.');}catch(e){check.checked=!check.checked;status(notice,messageError(e),true);}finally{check.disabled=false;}});
 }root.append(box);
 root.append(dom('h3','','Alertas de seguridad'));
 const alerts=await run(supabase.from('security_alerts').select('id,title,description,severity,status,created_at').order('created_at',{ascending:false}).limit(50));
 if(!alerts.length)root.append(dom('p','muted','No hay alertas de seguridad registradas.'));
 for(const item of alerts){const card=dom('article','ln-integ-card');card.append(dom('strong','',item.title),dom('p','muted',`${item.severity} · ${date(item.created_at)} · ${item.status}`),dom('p','',item.description||''));
  if(item.status==='open'){const button=dom('button','btn','Marcar revisada');button.type='button';button.onclick=async()=>{button.disabled=true;try{await run(supabase.from('security_alerts').update({status:'reviewed',reviewed_by:me.id,reviewed_at:new Date().toISOString()}).eq('id',item.id));button.textContent='Revisada';}catch(e){status(notice,messageError(e),true);button.disabled=false;}};card.append(button);}root.append(card);
 }
 root.append(dom('h3','','Últimas acciones administrativas'));
 const audit=await run(supabase.from('admin_audit_log').select('id,event_type,action,affected_record,occurred_at').order('occurred_at',{ascending:false}).limit(40));
 if(!audit.length)root.append(dom('p','muted','Todavía no hay eventos de auditoría registrados.'));
 for(const event of audit){const card=dom('article','ln-integ-card');card.append(dom('strong','',event.action),dom('p','muted',`${event.event_type} · ${date(event.occurred_at)}`),dom('p','',event.affected_record||''));root.append(card);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
