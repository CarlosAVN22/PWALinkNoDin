/* Bandeja propia; los avisos reales los generan procesos autorizados del backend. */
import {supabase,$,dom,run,who,status,messageError} from './base.js';
async function init(){
 const old=$('ld-notif-inbox');if(!old)return;
 old.hidden=true;
 const root=dom('section','panel ln-integ-section');old.insertAdjacentElement('afterend',root);
 root.append(dom('h2','','Mis notificaciones reales'));
 const info=dom('p','muted','Aquí aparecen tus notificaciones.');
 const list=dom('div');root.append(info,list);
 const me=await who();if(!me){status(info,'Inicia sesión para ver tus notificaciones.');return;}
 async function refresh(){
  const notices=await run(supabase.from('notifications').select('id,title,message,is_read,created_at,target_url').eq('user_id',me.id).order('created_at',{ascending:false}));
  list.replaceChildren();for(const note of notices){const card=dom('article','ln-integ-card');card.append(dom('strong','',note.title),dom('p','',note.message));
   if(note.target_url?.startsWith('/doc/')){const link=dom('a','btn','Abrir');link.href=note.target_url;card.append(link);}
   if(!note.is_read){const btn=dom('button','btn','Marcar leída');btn.onclick=async()=>{btn.disabled=true;try{await run(supabase.from('notifications').update({is_read:true}).eq('id',note.id));await refresh();}catch(e){status(info,messageError(e),true);}};card.append(btn);}
   list.append(card);
  }
  if(!notices.length)list.append(dom('p','muted','No tienes notificaciones nuevas.'));
 }
 try{await refresh();}catch(e){status(info,messageError(e),true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
