import {supabase,$,dom,run,who,status,messageError} from './base.js';
async function init(){
 const parent=$('co-listado');if(!parent)return;
 parent.hidden=true;
 const form=$('carlos-opinion-form');if(form)form.hidden=true;
 document.querySelector('.ld-testimonials-single')?.setAttribute('hidden','');
 const root=dom('section','panel ln-integ-section');parent.insertAdjacentElement('afterend',root);
 root.append(dom('h2','','Valoraciones reales de empresas'),dom('p','muted','Comentarios publicados por candidatos. Puedes eliminar solamente tus propias valoraciones.'));
 const select=dom('select');const all=dom('option','','Todas las empresas');all.value='';select.append(all);
 const stars=dom('select');for(let i=5;i>=1;i--){const opt=dom('option','',`${i} estrellas`);opt.value=String(i);stars.append(opt);}
 const filter=dom('select');filter.append((()=>{const o=dom('option','','Cualquier calificación');o.value='0';return o;})());
 for(let minimum=3;minimum<=5;minimum++){const o=dom('option','',minimum+' estrellas o más');o.value=String(minimum);filter.append(o);}
 const message=dom('textarea');message.rows=4;message.maxLength=1200;message.placeholder='Describe tu experiencia con esta empresa';
 const send=dom('button','btn btn-primary','Publicar valoración');send.type='button';
 const feedback=dom('p','ld-status'),list=dom('div');
  const labels=[['Empresa',select],['Filtrar valoraciones',filter],['Calificación',stars],['Tu comentario',message]];
 for(const [text,control] of labels){
  const field=dom('label','ln-form-field',text);
  field.append(control);
  root.append(field);
 }
 root.append(send,feedback,list);
 const me=await who();if(me?.role_id!==1){send.disabled=true;status(feedback,'Inicia sesión como candidato para publicar una valoración.');}
 const companies=await run(supabase.from('companies').select('id,commercial_name,verification_status').eq('verification_status','verified'));
 for(const c of companies){
  const opt=dom('option','',c.commercial_name);
  opt.value=String(c.id);
  select.append(opt);
 }
 const requested=new URLSearchParams(location.search).get('empresa');
 if(requested&&companies.some(c=>String(c.id)===requested))select.value=requested;
 else if(companies.length)select.value=String(companies[0].id);
 if(!companies.length){
  send.disabled=true;
  status(feedback,'Todavía no hay empresas verificadas disponibles para valorar.');
 }

 async function refresh(){
  const q=await run(supabase.from('company_reviews').select('id,company_id,user_id,display_name,rating,comment,created_at,status').order('created_at',{ascending:false}));
  list.replaceChildren();for(const r of q.filter(x=>(!select.value||x.company_id===Number(select.value)) && Number(r.rating)>=Number(filter.value||0))){
   const c=companies.find(x=>x.id===r.company_id);const box=dom('article','ln-integ-card');
   box.append(dom('strong','',c?.commercial_name||'Empresa'),dom('p','',`${r.rating}/5 · ${r.display_name}`),dom('p','',r.comment));
   if(me?.id===r.user_id){const btn=dom('button','btn','Eliminar mi valoración');btn.type='button';btn.onclick=async()=>{
    btn.disabled=true;try{await run(supabase.from('company_reviews').delete().eq('id',r.id));await refresh();}catch(e){status(feedback,messageError(e),true);btn.disabled=false;}
   };box.append(btn);}list.append(box);
  }
  if(!list.children.length)list.append(dom('p','muted','Aún no hay valoraciones reales.'));
 }
 select.addEventListener('change',refresh);filter.addEventListener('change',refresh);
 send.addEventListener('click',async()=>{
  if(!me||me.role_id!==1)return;
  if(!select.value){status(feedback,'Selecciona una empresa para publicar.',true);return;}
  if(message.value.trim().length<15){status(feedback,'Escribe al menos 15 caracteres.',true);return;}
  send.disabled=true;
  try{await run(supabase.from('company_reviews').insert({user_id:me.id,company_id:Number(select.value),
    display_name:me.email.slice(0,100),rating:Number(stars.value),comment:message.value.trim(),status:'visible'}));
   message.value='';status(feedback,'Tu valoración se publicó correctamente.');await refresh();}
  catch(e){status(feedback,messageError(e),true);}finally{send.disabled=false;}
 });
 await refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
