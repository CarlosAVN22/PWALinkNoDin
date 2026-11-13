/* Recursos auténticos de PostgreSQL: filtros, lectura y marcadores por usuario. */
import {supabase,$,dom,run,who,status,messageError} from './base.js';
async function init(){
 const old=$('rc-count');if(!old)return;
 document.querySelector('.rc-tools')?.setAttribute('hidden','');
 document.querySelector('.cards')?.setAttribute('hidden','');
 const root=dom('section','panel ln-integ-section');
 const anchor=$('rc-detail')||old;anchor.insertAdjacentElement('afterend',root);
 root.append(dom('h2','','Biblioteca de recursos'));
 const q=dom('input');q.type='search';q.placeholder='Buscar recursos publicados';
 const info=dom('p','muted'),list=dom('div');root.append(q,info,list);
 const me=await who();
 const [resources,sections,activity]=await Promise.all([
   run(supabase.from('resources').select('id,slug,title,category,summary,intro,reading_minutes').order('created_at',{ascending:false})),
   run(supabase.from('resource_sections').select('resource_id,heading,body,sort_order').order('sort_order')),
   me?run(supabase.from('user_resource_activity').select('resource_id,is_saved').eq('user_id',me.id)):Promise.resolve([])
 ]);
 const saved=new Map(activity.map(a=>[a.resource_id,a.is_saved]));
 async function flip(r,btn){
  if(!me){status(info,'Inicia sesión para guardar recursos.',true);return;}
  btn.disabled=true;
  try{const value=!saved.get(r.id);
   if(saved.has(r.id))await run(supabase.from('user_resource_activity').update({is_saved:value,updated_at:new Date().toISOString()}).eq('user_id',me.id).eq('resource_id',r.id));
   else await run(supabase.from('user_resource_activity').insert({user_id:me.id,resource_id:r.id,is_saved:value}));
   saved.set(r.id,value);render();
  }catch(e){status(info,messageError(e),true);btn.disabled=false;}
 }
 function render(){
  list.replaceChildren();const search=q.value.trim().toLowerCase();
  const found=resources.filter(r=>[r.title,r.summary,r.category].join(' ').toLowerCase().includes(search));
  status(info,`${found.length} recursos disponibles`);
  for(const r of found){
   const card=dom('article','ln-integ-card');card.append(dom('h3','',r.title),dom('p','muted',r.category||'General'),dom('p','',r.summary||''));
   const details=dom('details');details.append(dom('summary','','Leer recurso'),dom('p','',r.intro||''));
   for(const part of sections.filter(s=>s.resource_id===r.id)){details.append(dom('h4','',part.heading||'Contenido'),dom('p','',part.body));}
   const btn=dom('button','btn',saved.get(r.id)?'Quitar de guardados':'Guardar recurso');btn.type='button';btn.addEventListener('click',()=>flip(r,btn));
   const open=dom('a','btn btn-primary','Ver recurso completo');open.href='/doc/cursos-foros/recurso-detalle.html?id='+encodeURIComponent(r.slug);
   card.append(details,open,btn);list.append(card);
  }
  if(!found.length)list.append(dom('p','muted','Todavía no hay recursos disponibles.'));
 }
 q.addEventListener('input',render);render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
