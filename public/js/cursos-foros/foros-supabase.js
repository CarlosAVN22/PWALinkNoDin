/* LinkNoDin - Foros conectados a Supabase (etapa 5).
   Los permisos reales están en PostgreSQL RLS; nunca se confía en localStorage. */
import { supabase } from '/js/supabase-config.js';
import { adminRequest } from '/js/admin/admin-api.js';
const $=s=>document.querySelector(s);
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
function btn(label,run,cls='btn'){const x=el('button',cls,label);x.type='button';x.onclick=run;return x;}
function info(box,text){box.textContent=text;box.setAttribute('role','status');}
async function db(query){const {data,error}=await query;if(error)throw error;return data;}
async function identity(){
 const {data:{user},error}=await supabase.auth.getUser();
 if(error || !user)return null;
 const record=await db(supabase.from('users').select('id,full_name,role_id,status').eq('auth_user_id',user.id).single());
 return record.status==='active'?record:null;
}
function message(err){return err?.message||String(err);}

// Los reportes se guardan en content_reports; no se crean alertas de demostración.
function reportDialog(me, contentType, contentId, onSuccess) {
 const backdrop=el('div','ld-report-overlay');
 const dialog=el('section','ld-report-dialog');
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 const heading=el('h2','','Reportar contenido');
 const help=el('p','muted','Indica el motivo. Un administrador revisará el reporte.');
 const form=el('form','ld-report-form');
 const label=el('label','','Motivo del reporte');
 const reason=el('select');reason.required=true;
 ['Lenguaje ofensivo','Contenido fuera de tema','Acoso o discriminación','Información engañosa','Spam o publicidad','Datos personales','Otro motivo'].forEach(value=>{const opt=el('option','',value);opt.value=value;reason.append(opt);});
 const detailLabel=el('label','','Información adicional (opcional)');
 const detail=el('textarea');detail.maxLength=800;detail.rows=3;detail.placeholder='Explica qué ocurrió';
 const feedback=el('p','muted');feedback.setAttribute('role','status');
 const controls=el('div','ld-report-actions');
 const cancel=btn('Cancelar',close,'btn');const send=el('button','btn btn-primary','Enviar reporte');send.type='submit';
 controls.append(cancel,send);form.append(label,reason,detailLabel,detail,feedback,controls);
 dialog.append(heading,help,form);backdrop.append(dialog);document.body.append(backdrop);reason.focus();
 function close(){backdrop.remove();document.removeEventListener('keydown',escape);}
 function escape(e){if(e.key==='Escape')close();}
 document.addEventListener('keydown',escape);
 backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
 form.addEventListener('submit',async e=>{
  e.preventDefault();send.disabled=true;info(feedback,'Enviando reporte...');
  try{
   await db(supabase.from('content_reports').insert({reporter_id:me.id,content_type:contentType,content_id:contentId,reason:reason.value,description:detail.value.trim()||null}));
   close();if(onSuccess)onSuccess('Reporte enviado. El administrador lo revisará.');
  }catch(err){info(feedback,err.code==='23505'?'Ya reportaste este contenido y tu reporte está registrado.':'No se pudo enviar: '+message(err));send.disabled=false;}
 });
}
async function categories(){return db(supabase.from('forum_categories').select('id,name,is_active').order('name'));}
async function topics(){return db(supabase.from('forum_topics').select('id,title,body,author_id,category_id,status,created_at').order('created_at',{ascending:false}));}
async function replies(topicId){return db(supabase.from('forum_replies').select('id,topic_id,author_id,body,status,created_at').eq('topic_id',topicId).order('created_at',{ascending:true}));}
// Identificar por nombre o alias; nunca exponer correos de participantes.
async function authorNames(topicId){
 const {data,error}=await supabase.rpc('ln26_forum_author_names',{p_topic_id:topicId});
 if(error){console.warn('Autores no disponibles (falta configurar la funcion o su acceso):',error.message);return new Map();}
 return new Map((data||[]).map(person=>[Number(person.user_id),person.display_name]));
}
async function renderList(){
 const main=$('main .container'); if(!main)return;
 const old=$('main .rows');if(old)old.parentElement.hidden=true; // Ocultar tarjetas fijas de demostración.
 const area=el('div','ld-pub-section');main.append(area);
 const list=el('section','panel ld-pub-panel');list.append(el('h2','','Conversaciones de la comunidad'));area.append(list);
 const rows=el('div','rows');list.append(rows);
 const creator=el('section','panel ld-pub-panel');creator.append(el('h2','','Crear un nuevo foro'));area.append(creator);
 const feedback=el('p','muted');creator.append(feedback);
 let me=null;
 try{me=await identity();}catch(e){info(feedback,'No se pudo verificar la sesión: '+message(e));}
 const cats=await categories().catch(e=>{info(feedback,'No se pudieron cargar las categorías: '+message(e));return [];});
 if(me){
  const form=el('form','ld-pub-form');creator.append(form);
  function field(name,label,tag='input'){
   const w=el('div','field'),l=el('label','',label),input=el(tag);input.id='forum-'+name;input.required=true;l.htmlFor=input.id;w.append(l,input);form.append(w);return input;
  }
  const title=field('title','Título del tema');title.minLength=8;title.maxLength=220;
  const category=field('category','Categoría','select');
  cats.filter(c=>c.is_active).forEach(c=>{const opt=el('option','',c.name);opt.value=c.id;category.append(opt);});
  const body=field('body','Pregunta o descripción','textarea');body.minLength=20;body.maxLength=4000;body.rows=4;
  const send=el('button','btn btn-primary','Publicar tema');send.type='submit';form.append(send);
  if(!category.options.length){send.disabled=true;info(feedback,'El administrador debe activar al menos una categoría.');}
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(!form.reportValidity())return;send.disabled=true;info(feedback,'Publicando...');
   try{await db(supabase.from('forum_topics').insert({title:title.value.trim(),body:body.value.trim(),category_id:Number(category.value),author_id:me.id}));
    form.reset();info(feedback,'Tema publicado correctamente.');await draw();
   }catch(e){info(feedback,'No se pudo publicar: '+message(e));}finally{send.disabled=false;}
  });
 }else {creator.append(el('p','muted','Inicia sesión como candidato o empresa para crear un tema.'));const a=el('a','btn btn-primary','Iniciar sesión');a.href='/doc/general/login.html?next='+encodeURIComponent(location.pathname);creator.append(a);}
 async function draw(){
  rows.replaceChildren(el('p','muted','Cargando temas...'));
  try{
   const [items,catList]=await Promise.all([topics(),categories()]);const map=new Map(catList.map(c=>[c.id,c.name]));rows.replaceChildren();
   const visible=items.filter(t=>t.status!=='hidden'||t.author_id===me?.id);
   if(!visible.length)rows.append(el('p','muted','Todavía no hay temas publicados. Sé el primero en compartir uno.'));
   for(const t of visible){const card=el('div','rowcard'),description=el('div');description.append(el('strong','',t.title),el('p','muted',(map.get(t.category_id)||'General')+' · '+(t.status==='blocked'?'Bloqueado':t.status==='hidden'?'Oculto (solo tú)':'Abierto')));card.append(description);
    const a=el('a','btn btn-primary','Ver conversación');a.href='/doc/cursos-foros/foro-tema.html?id='+encodeURIComponent(t.id);card.append(a);if(me && t.status!=='hidden')card.append(btn('Reportar',()=>reportDialog(me,'forum_topic',t.id,value=>info(feedback,value)),'btn btn-sm ld-report-btn'));rows.append(card);}
  }catch(e){rows.replaceChildren(el('p','muted','No se pudieron cargar los foros: '+message(e)));}
 }
 await draw();
}
async function renderTopic(){
 const root=$('.ld-forum');if(!root)return;
 const id=Number(new URLSearchParams(location.search).get('id'));
 const title=$('.ld-forum > .panel:first-child h1'),paragraphs=root.querySelectorAll('section.panel:first-child p');
 const form=$('#ld-forum-form'),textarea=$('#ld-forum-message'),feedback=$('#ld-forum-status'),permission=$('#ld-forum-permission'),list=$('#ld-forum-answers'),total=$('#ld-forum-total');
 const submit=form.querySelector('[type=submit]'); const modal=$('#ld-forum-modal'); let selected=null,me=null,topic=null;
 const pending=el('p','muted','Cargando conversación...');list.append(pending);form.hidden=true;
 if(!Number.isInteger(id)||id<1){title.textContent='Selecciona un tema de la lista de Foros';list.replaceChildren();return;}
 try{me=await identity();topic=await db(supabase.from('forum_topics').select('id,title,body,status,author_id,category_id,created_at').eq('id',id).single());
  title.textContent=topic.title;paragraphs[2].textContent=topic.body;paragraphs[3].textContent='Publicado '+new Date(topic.created_at).toLocaleDateString('es-SV');
  if(me && topic.status!=='hidden'){const report=btn('Reportar tema',()=>reportDialog(me,'forum_topic',id,value=>info(feedback,value)),'btn btn-sm ld-report-btn');title.parentElement.append(report);}
 }catch(e){title.textContent='Tema no disponible';list.replaceChildren(el('p','muted','Este tema no existe o no tienes permiso para verlo.'));return;}
 function allowed(){return !!me&&topic.status==='visible';}
 function permissions(){form.hidden=!allowed();permission.hidden=allowed();
  if(!allowed()){permission.replaceChildren(el('span','',topic.status==='blocked'?'El administrador bloqueó las respuestas de este foro.':topic.status==='hidden'?'El tema está oculto.':'Inicia sesión para responder. '));if(!me){const a=el('a','',' Iniciar sesión');a.href='/doc/general/login.html?next='+encodeURIComponent(location.pathname+location.search);permission.append(a);}}
 }
 async function draw(){
  list.replaceChildren(el('p','muted','Cargando respuestas...'));
  try{const [data,nameMap]=await Promise.all([replies(id),authorNames(id)]);const items=data.filter(r=>r.status==='visible'||r.author_id===me?.id);total.textContent=items.length+(items.length===1?' respuesta':' respuestas');list.replaceChildren();
   if(!items.length)list.append(el('p','muted','Todavía no hay respuestas.'));
   for(const r of items){const card=el('article','ld-forum-answer'),head=el('div','ld-forum-heading'),label=el('div');label.append(el('strong','',nameMap.get(Number(r.author_id)) || 'Miembro de la comunidad'),el('small','muted',' · '+new Date(r.created_at).toLocaleString('es-SV')));head.append(label);
    if(me&&r.author_id===me.id&&r.status==='visible')head.append(btn('Eliminar mi respuesta',()=>{selected=r.id;modal.hidden=false;},'btn btn-sm'));
    if(me&&r.status==='visible')head.append(btn('Reportar',()=>reportDialog(me,'forum_reply',r.id,value=>info(feedback,value)),'btn btn-sm ld-report-btn'));
    card.append(head,el('p','',r.status==='hidden'?'Respuesta retirada':r.body));list.append(card);}
  }catch(e){list.replaceChildren(el('p','muted','Error al cargar respuestas: '+message(e)));}
 }
 textarea.addEventListener('input',()=>{$('#ld-forum-count').textContent=textarea.value.length;});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!allowed())return;
  const body=textarea.value.trim();if(!body||body.length>1000)return;
  submit.disabled=true;info(feedback,'Publicando...');
  try{await db(supabase.from('forum_replies').insert({topic_id:id,author_id:me.id,body}));textarea.value='';$('#ld-forum-count').textContent='0';info(feedback,'Respuesta publicada.');await draw();}
  catch(e){info(feedback,'No se pudo responder: '+message(e));}
  finally{submit.disabled=false;}
 });
 function close(){modal.hidden=true;selected=null;}
 $('#ld-forum-cancel').onclick=close;
 $('#ld-forum-confirm').onclick=async()=>{
  if(!selected||!me)return;const target=selected;close();
  try{await db(supabase.from('forum_replies').update({status:'hidden'}).eq('id',target).eq('author_id',me.id));info(feedback,'Respuesta retirada.');await draw();}
  catch(e){info(feedback,'No se pudo retirar la respuesta: '+message(e));}
 };
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
 permissions();await draw();
}
async function renderAdmin(){
 const main=$('main .content');if(!main)return;
 const panel=el('section','panel ld-pub-panel ln-forum-admin');panel.id='ln-forum-admin';
 panel.append(el('h2','','Categorías de foros y temas'));
 panel.append(el('p','muted','Crea categorías para organizar las conversaciones. Puedes activar o desactivar una categoría sin eliminarla.'));
 const feedback=el('p','muted');panel.append(feedback);main.prepend(panel);
 const controls=el('div','ld-pub-actions ln-category-controls'),name=el('input');name.placeholder='Ej. Consejos laborales';name.maxLength=120;name.setAttribute('aria-label','Nombre de nueva categoría');controls.append(name);
 const add=btn('Agregar categoría',async()=>{
  if(name.value.trim().length<3)return info(feedback,'Escribe al menos 3 caracteres.');add.disabled=true;
  try{await adminRequest('/categories/forum',{method:'POST',body:{name:name.value.trim()}});name.value='';info(feedback,'Categoría creada.');await draw();}
  catch(e){info(feedback,'No se pudo agregar: '+message(e));}finally{add.disabled=false;}
 },'btn btn-primary');controls.append(add);name.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();add.click();}});panel.append(controls);
 const categoriesBox=el('div','rows'),topicsBox=el('div','rows');
 const categorySection=el('section','ln-admin-section'),categoryHeading=el('h3','','Crear y administrar categorías'),topicSection=el('details','ln-admin-section'),topicHeading=el('summary','','Administrar temas publicados');
 topicSection.open=false;
 categorySection.append(categoryHeading,el('p','muted','Los candidatos y empresas solo podrán publicar temas en categorías activas.'),controls,categoriesBox);
 topicSection.append(topicHeading,topicsBox);
 panel.append(categorySection,topicSection);
 async function draw(){
  try{const [catList,topicList]=await Promise.all([adminRequest('/categories/forum'),adminRequest('/forum/topics')]);categoriesBox.replaceChildren();topicsBox.replaceChildren();
   for(const c of catList){const card=el('div','rowcard'),txt=el('div');txt.append(el('strong','',c.name),el('p','muted',c.is_active?'Activa':'Desactivada'));card.append(txt,btn(c.is_active?'Desactivar':'Activar',async()=>{
    try{await adminRequest(`/categories/forum/${c.id}`,{method:'PATCH',body:{is_active:!c.is_active}});await draw();}catch(e){info(feedback,message(e));}
   }));categoriesBox.append(card);}
   for(const t of topicList){const card=el('div','rowcard ld-pub-review'),description=el('div');description.append(el('strong','',t.title),el('p','muted','ID '+t.id+' · Estado: '+t.status),el('p','',t.body));card.append(description);
    const actions=el('div','ld-pub-actions');for(const [state,label] of [['visible','Activar'],['blocked','Bloquear'],['hidden','Ocultar']]){
     if(t.status===state)continue;actions.append(btn(label,async()=>{try{await adminRequest(`/forum/topics/${t.id}/status`,{method:'PATCH',body:{status:state}});info(feedback,'Tema actualizado.');await draw();}catch(e){info(feedback,'No se pudo modificar: '+message(e));}},state==='visible'?'btn btn-primary':'btn'));
    }card.append(actions);topicsBox.append(card);}
   if(!catList.length)categoriesBox.append(el('p','muted','Sin categorías.'));
   if(!topicList.length)topicsBox.append(el('p','muted','Sin temas.'));
  }catch(e){info(feedback,'Error al cargar moderación: '+message(e));}
 }
 await draw();
}
document.addEventListener('DOMContentLoaded',()=>{
 const page=location.pathname;
 if(page.endsWith('/foros.html'))renderList();
 if(page.endsWith('/foro-tema.html'))renderTopic();
 if(page.endsWith('/admin-moderacion.html'))renderAdmin();
});
