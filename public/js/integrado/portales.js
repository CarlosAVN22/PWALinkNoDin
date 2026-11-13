import {supabase,dom,run,who,money,date,status,messageError} from './base.js';
const $=id=>document.getElementById(id);
const url='/doc/empresa/empresa-detalle.html?empresa=';
function link(label,href,cls='btn'){const x=dom('a',cls,label);x.href=href;return x;}
function rootIn(selector,heading){const parent=document.querySelector(selector);if(!parent)return null;
 const root=dom('section','panel ln-integ-section');root.id='ln-live-portal';root.append(dom('h2','',heading));parent.prepend(root);return root;}
function hideSections(selector){document.querySelectorAll(selector).forEach(x=>x.hidden=true);}
async function candidatePanel(){
 const me=await who();if(!me||me.role_id!==1)return;
 const parent=document.querySelector('main .content')||document.querySelector('main .container');if(!parent)return;
 hideSections('main .content .stats,main .content .panel');
 const root=rootIn('main .content','Mi actividad en LinkNoDin');if(!root)return;
 const [apps,saved,jobs,companies]=await Promise.all([
  run(supabase.from('applications').select('id,job_id,status,applied_at').eq('candidate_id',me.id).order('applied_at',{ascending:false})),
  run(supabase.from('saved_jobs').select('job_id').eq('candidate_id',me.id)),
  run(supabase.from('jobs').select('id,title,company_id,status,city,modality').eq('status','active').order('created_at',{ascending:false}).limit(10)),
  run(supabase.from('companies').select('id,commercial_name,verification_status').eq('verification_status','verified'))
 ]);
 const companyNames=new Map(companies.map(c=>[c.id,c.commercial_name]));
 const stats=dom('div','ln-admin-summary');for(const [name,n] of [['Postulaciones',apps.length],['En revisión',apps.filter(x=>['reviewing','interview'].includes(x.status)).length],['Vacantes guardadas',saved.length]]){
  const card=dom('div','ln-integ-card');card.append(dom('h3','',String(n)),dom('p','',name));stats.append(card);
 }root.append(stats);
 root.append(dom('h3','','Mis postulaciones recientes'));
 if(!apps.length)root.append(dom('p','muted','Aún no tienes postulaciones. Consulta las vacantes disponibles.'));
 for(const app of apps.slice(0,5)){
  const job=jobs.find(j=>j.id===app.job_id);
  const card=dom('article','ln-integ-card');card.append(dom('strong','',job?.title||'Vacante #'+app.job_id),dom('p','muted',`Estado: ${app.status} · ${date(app.applied_at)}`));root.append(card);
 }root.append(link('Ver todas mis postulaciones','/doc/candidato/postulaciones.html','btn btn-primary'));
 root.append(dom('h3','','Vacantes recientes'));
 for(const job of jobs.filter(j=>companyNames.has(j.company_id)).slice(0,5)){
  const card=dom('article','ln-integ-card');card.append(dom('strong','',job.title),dom('p','muted',`${companyNames.get(job.company_id)} · ${job.city||'El Salvador'} · ${job.modality||''}`),link('Ver empleo','/doc/empleo/detalle-empleo.html?id='+job.id));root.append(card);
 }
}
async function companyPanel(){
 const me=await who();if(!me||me.role_id!==2)return;
 const parent=document.querySelector('main .content');if(!parent)return;
 hideSections('main .content .stats,main .content .panel');
 const root=rootIn('main .content','Panel empresarial');if(!root)return;
 const companies=await run(supabase.from('companies').select('id,commercial_name,verification_status').eq('user_id',me.id));
 if(!companies.length){root.append(dom('p','muted','No se encontró un registro empresarial vinculado a tu cuenta.'));return;}
 const company=companies[0],jobs=await run(supabase.from('jobs').select('id,title,status,created_at').eq('company_id',company.id));
 const ids=jobs.map(j=>j.id);
 const apps=ids.length?await run(supabase.from('applications').select('id,job_id,status,applied_at').in('job_id',ids).order('applied_at',{ascending:false})):[];
 root.append(dom('p','muted',`${company.commercial_name} · Estado de verificación: ${company.verification_status}`));
 if(company.verification_status!=='verified')root.append(dom('p','muted','Solo las empresas verificadas pueden publicar vacantes y cursos.'));
 const stats=dom('div','ln-admin-summary');for(const [name,value] of [['Vacantes activas',jobs.filter(j=>j.status==='active').length],['Postulaciones',apps.length],['En revisión',apps.filter(a=>a.status==='reviewing').length]]){
  const card=dom('div','ln-integ-card');card.append(dom('h3','',String(value)),dom('p','',name));stats.append(card);
 }root.append(stats,dom('h3','','Postulaciones recientes'));
 for(const a of apps.slice(0,6)){
  const card=dom('article','ln-integ-card');card.append(dom('strong','',jobs.find(j=>j.id===a.job_id)?.title||'Vacante'),dom('p','muted',`Estado: ${a.status} · ${date(a.applied_at)}`),link('Ver postulantes','/doc/empresa/empresa-candidatos.html'));root.append(card);
 }if(!apps.length)root.append(dom('p','muted','Aún no has recibido postulaciones.'));
 root.append(link('Administrar mis vacantes','/doc/empresa/empresa-vacantes.html','btn btn-primary'));
}
async function companyDirectory(){
 const main=document.querySelector('main .container');if(!main)return;
 hideSections('main .wl-section,main .cards');
 const root=rootIn('main .container','Empresas verificadas');
 const data=await run(supabase.from('companies').select('id,commercial_name,sector,city,description').eq('verification_status','verified').order('commercial_name'));
 if(!data.length)root.append(dom('p','muted','Todavía no hay empresas verificadas.'));
 const cards=dom('div','cards');
 for(const c of data){const card=dom('article','card');card.append(dom('h3','',c.commercial_name),dom('p','muted',[c.sector,c.city].filter(Boolean).join(' · ')),dom('p','',c.description||'Consulta la información publicada por esta empresa.'),link('Ver perfil',url+encodeURIComponent(c.id),'btn btn-primary'));cards.append(card);}root.append(cards);
}
async function companyDetail(){
 const params=new URLSearchParams(location.search),id=Number(params.get('empresa')||params.get('id'));
 const heading=$('wl-company-name');if(!heading)return;
 document.querySelectorAll('.wl-note').forEach(n=>{if(n.textContent.toLowerCase().includes('demostraci'))n.textContent='Valoraciones publicadas en LinkNoDin.';});
 const found=Number.isInteger(id)&&id>0?await run(supabase.from('companies').select('id,commercial_name,description,city,department,sector,employee_range,founded_year,culture,public_email,website,linkedin_url,verification_status,logo_storage_key').eq('id',id).eq('verification_status','verified').limit(1)):[];
 if(!found.length){heading.textContent='Empresa no encontrada';document.title='Empresa no encontrada | LinkNoDin';document.querySelectorAll('.wl-columns, .company-public-hero').forEach(n=>n.hidden=true);const main=document.querySelector('main');main.append(dom('p','muted','Selecciona una empresa verificada desde el directorio.'));return;}
 const c=found[0];heading.textContent=c.commercial_name;document.title=c.commercial_name+' | LinkNoDin';
 const fields={'wl-company-about':c.description||'Empresa registrada en LinkNoDin.','wl-company-location':[c.city,c.department].filter(Boolean).join(', '),'wl-company-sector':c.sector||'Sector no indicado','wl-company-size':c.employee_range,'wl-company-founded':c.founded_year?'Fundada en '+c.founded_year:null,'wl-company-culture':c.culture};
 for(const [key,value] of Object.entries(fields)){const node=$(key);if(node){node.textContent=value||'';node.hidden=!value;}}
 if(c.culture&&$('wl-company-culture-section'))$('wl-company-culture-section').hidden=false;
 const contact=$('wl-company-contact');if(c.public_email&&contact){contact.hidden=false;contact.href='mailto:'+c.public_email;contact.textContent='Contactar por correo';}
 for(const [id,value] of [['wl-company-website',c.website],['wl-company-linkedin',c.linkedin_url]]){
  const n=$(id);if(n&&/^https?:\/\//i.test(value||'')){n.hidden=false;n.href=value;n.rel='noopener noreferrer';n.target='_blank';}
 }
 if($('wl-company-logo')){
  if(c.logo_storage_key){$('wl-company-logo').src=supabase.storage.from('company-logos').getPublicUrl(c.logo_storage_key).data.publicUrl;$('wl-company-logo').alt='Logo de '+c.commercial_name;$('wl-company-logo').hidden=false;}
  else{$('wl-company-logo').hidden=true;const holder=$('wl-company-brand');if(holder)holder.textContent=c.commercial_name.slice(0,1).toUpperCase();}
 }
 const jobs=await run(supabase.from('jobs').select('id,title,city,modality,status').eq('company_id',c.id).eq('status','active'));
 const list=$('wl-company-jobs');list?.replaceChildren();
 for(const j of jobs){const item=dom('article','ln-integ-card');item.append(dom('strong','',j.title),dom('p','muted',[j.city,j.modality].filter(Boolean).join(' · ')),link('Ver empleo','/doc/empleo/detalle-empleo.html?id='+j.id));list?.append(item);}
 if(!jobs.length)list?.append(dom('p','muted','No hay vacantes activas para esta empresa.'));
 const me=await who(),form=$('wl-review-form'),notice=$('wl-review-message'),reviews=$('wl-reviews');
 const author=$('wl-review-name');
 if(author){
  author.value=me?.email||'';
  author.readOnly=true;
  author.required=false;
 }
 if(me?.role_id!==1){
  form?.querySelectorAll('textarea,select,button').forEach(e=>e.disabled=true);
  if(notice)notice.textContent='Inicia sesión como candidato para valorar esta empresa.';
 }
 async function refresh(){const data=await run(supabase.from('company_reviews').select('id,user_id,display_name,rating,comment,created_at').eq('company_id',c.id).eq('status','visible').order('created_at',{ascending:false}));reviews?.replaceChildren();
  if($('wl-rating-summary'))$('wl-rating-summary').textContent=data.length?`${(data.reduce((sum,v)=>sum+v.rating,0)/data.length).toFixed(1)} / 5 · ${data.length} valoraciones`:'Sin valoraciones todavía';
  for(const r of data){const card=dom('article','ln-integ-card');card.append(dom('strong','',r.display_name+' · '+r.rating+'/5'),dom('p','',r.comment));if(r.user_id===me?.id){const b=dom('button','btn','Eliminar mi valoración');b.type='button';b.onclick=async()=>{b.disabled=true;try{await run(supabase.from('company_reviews').delete().eq('id',r.id));refresh();}catch(e){status(notice,messageError(e),true);b.disabled=false;}};card.append(b);}reviews?.append(card);}
 }
 form?.addEventListener('submit',async event=>{
  event.preventDefault();if(me?.role_id!==1||!form.reportValidity())return;
  const button=form.querySelector('[type=submit]');button.disabled=true;
  try{await run(supabase.from('company_reviews').insert({company_id:c.id,user_id:me.id,display_name:me.email.slice(0,100),rating:Number($('wl-review-stars').value),comment:$('wl-review-text').value.trim(),status:'visible'}));form.reset();status(notice,'Tu valoración se publicó correctamente.');await refresh();}catch(e){status(notice,messageError(e),true);}finally{button.disabled=false;}
 });
 await refresh();
}
async function mapJobs(){
 const main=document.querySelector('main');if(!main)return;
 const wrap=main.querySelector('.panel')||main;wrap.replaceChildren(dom('h1','','Mapa de empleos publicados'));
 const layout=dom('div');const map=dom('div');map.id='ln-map';map.style.height='470px';map.style.borderRadius='12px';const list=dom('div');layout.append(map,list);wrap.append(layout);
 const [jobs,companies]=await Promise.all([run(supabase.from('jobs').select('id,title,city,latitude,longitude,modality,company_id').eq('status','active')),run(supabase.from('companies').select('id,commercial_name').eq('verification_status','verified'))]);
 const names=new Map(companies.map(x=>[x.id,x.commercial_name]));
 const points=jobs.filter(j=>names.has(j.company_id)&&Number.isFinite(Number(j.latitude))&&Number.isFinite(Number(j.longitude))&&j.latitude!=null&&j.longitude!=null);
 for(const job of points){const card=dom('article','ln-integ-card');card.append(dom('strong','',job.title),dom('p','muted',`${names.get(job.company_id)} · ${job.city||'El Salvador'}`),link('Ver vacante','/doc/empleo/detalle-empleo.html?id='+job.id));list.append(card);}
 if(!points.length){list.append(dom('p','muted','No hay vacantes activas con coordenadas publicadas.'));map.hidden=true;return;}
 if(!window.L){map.hidden=true;list.prepend(dom('p','muted','El mapa no se pudo cargar; puedes abrir las vacantes desde la lista.'));return;}
 const leaflet=window.L.map(map).setView([13.69,-89.22],8);
 window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(leaflet);
 const bounds=[];
 for(const j of points){const coord=[Number(j.latitude),Number(j.longitude)];if(coord[0]<-90||coord[0]>90||coord[1]<-180||coord[1]>180)continue;
  bounds.push(coord);window.L.marker(coord).addTo(leaflet).bindPopup(`<strong>${String(j.title).replace(/[&<>"']/g,'')}</strong><p>Vacante #${j.id}</p>`);
 }
 if(bounds.length)leaflet.fitBounds(bounds,{padding:[25,25],maxZoom:12});
}
async function init(){
 const p=location.pathname;
 try{
  if(p.endsWith('/candidato/candidato.html'))await candidatePanel();
  if(p.endsWith('/empresa/empresa-panel.html'))await companyPanel();
  if(p.endsWith('/empresa/empresas.html'))await companyDirectory();
  if(p.endsWith('/empresa/empresa-detalle.html'))await companyDetail();
  if(p.endsWith('/empleo/mapa-empleos.html'))await mapJobs();
 }catch(error){console.error('Portales LinkNoDin:',error);const main=document.querySelector('main');main?.prepend(dom('p','ld-status','No se pudieron cargar los datos: '+messageError(error)));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
