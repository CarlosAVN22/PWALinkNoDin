import {supabase,dom,run,who,money,date,status,messageError} from './base.js';
import {companyRequest} from '/js/empresa/api-empresa.js';
import {empleoRequest} from '/js/empleo/api-empleo.js';
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
 const root=rootIn('main .content','Panel empresarial');if(!root)return;root.setAttribute('aria-busy','true');
 const loading=dom('div','ln-admin-summary');for(let i=0;i<3;i++){const card=dom('div','ln-integ-card ld-skeleton-card');card.setAttribute('aria-hidden','true');card.append(dom('span','ld-skeleton ld-skeleton-stat'),dom('span','ld-skeleton ld-skeleton-line medium'));loading.append(card);}root.append(loading,dom('span','ld-skeleton ld-skeleton-line medium'));
 const company=await companyRequest('/profile');
 const [jobs,apps]=company.verification_status==='verified'
  ? await Promise.all([companyRequest('/vacancies'),companyRequest('/applications')])
  : [[],[]];
 root.replaceChildren(dom('h2','','Panel empresarial'));root.removeAttribute('aria-busy');
 root.append(dom('p','muted',`${company.commercial_name} · Estado de verificación: ${company.verification_status}`));
 if(company.verification_status!=='verified')root.append(dom('p','muted','Solo las empresas verificadas pueden publicar vacantes y cursos.'));
 const stats=dom('div','ln-admin-summary');for(const [name,value] of [['Vacantes activas',jobs.filter(j=>j.status==='active').length],['Postulaciones',apps.length],['En revisión',apps.filter(a=>a.status==='reviewing').length]]){
  const card=dom('div','ln-integ-card');card.append(dom('h3','',String(value)),dom('p','',name));stats.append(card);
 }root.append(stats,dom('h3','','Postulaciones recientes'));
 for(const a of apps.slice(0,6)){
  const card=dom('article','ln-integ-card');card.append(dom('strong','',a.job_title||'Vacante'),dom('p','muted',`Estado: ${a.status} · ${date(a.applied_at)}`),link('Ver postulantes','/doc/empresa/empresa-candidatos.html'));root.append(card);
 }if(!apps.length)root.append(dom('p','muted','Aún no has recibido postulaciones.'));
 root.append(link('Administrar mis vacantes','/doc/empresa/empresa-vacantes.html','btn btn-primary'));
}
async function companyDirectory(){
 const root=$('company-directory-list'),count=$('company-directory-count');if(!root)return;
 const [companies,jobs]=await Promise.all([
  run(supabase.from('companies').select('id,commercial_name,sector,city,department,description,employee_range,founded_year,logo_storage_key').eq('verification_status','verified').order('commercial_name')),
  empleoRequest('/jobs'),
 ]);
 const activeCounts=new Map();for(const job of jobs)activeCounts.set(job.company_id,(activeCounts.get(job.company_id)||0)+1);
 const rows=companies.map(company=>({...company,activeJobs:activeCounts.get(company.id)||0}));
 const sector=$('company-sector-filter'),department=$('company-location-filter');
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
 let currentPage=1;const pageSize=9,pagination=$('company-directory-pages');
 function options(select,values,label){for(const value of [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}select.setAttribute('aria-label',label);}
 options(sector,rows.map(row=>row.sector),'Filtrar empresas por sector');options(department,rows.map(row=>row.department),'Filtrar empresas por departamento');
 const search=$('company-search'),hiring=$('company-hiring-filter'),sort=$('company-sort');
 function render(){
  const query=normalize(search.value.trim()),selectedSector=sector.value,selectedDepartment=department.value;
  let visible=rows.filter(company=>{
   const text=normalize([company.commercial_name,company.sector,company.city,company.department,company.description].join(' '));
   return (!query||text.includes(query))&&(!selectedSector||company.sector===selectedSector)&&(!selectedDepartment||company.department===selectedDepartment)&&(hiring.value==='all'||(hiring.value==='hiring'?company.activeJobs>0:company.activeJobs===0));
  });
  visible.sort(sort.value==='name'?(a,b)=>a.commercial_name.localeCompare(b.commercial_name,'es'):(a,b)=>b.activeJobs-a.activeJobs||a.commercial_name.localeCompare(b.commercial_name,'es'));
  root.replaceChildren();root.setAttribute('aria-busy','false');
  const contratando=rows.filter(company=>company.activeJobs>0).length;
  count.textContent=`${visible.length} ${visible.length===1?'empresa encontrada':'empresas encontradas'} · ${contratando} ${contratando===1?'empresa con vacantes':'empresas con vacantes'}`;
  if(!visible.length){pagination.hidden=true;const empty=dom('div','company-directory-empty');empty.append(dom('span','company-directory-empty-icon','⌕'),dom('h2','','No encontramos empresas'),dom('p','muted','Prueba con otro nombre o cambia los filtros.'));const clear=dom('button','btn btn-soft','Limpiar filtros');clear.type='button';clear.addEventListener('click',()=>{search.value='';sector.value='';department.value='';hiring.value='all';sort.value='jobs';render();});empty.append(clear);root.append(empty);return;}
  const pageCount=Math.ceil(visible.length/pageSize);currentPage=Math.min(currentPage,pageCount);
  for(const company of visible.slice((currentPage-1)*pageSize,currentPage*pageSize)){
   const card=dom('article','company-directory-card');
   const top=dom('div','company-directory-card-top'),brand=dom('div','company-directory-brand');
   if(company.logo_storage_key){const image=document.createElement('img');image.src=supabase.storage.from('company-logos').getPublicUrl(company.logo_storage_key).data.publicUrl;image.alt='';image.loading='lazy';image.addEventListener('error',()=>{image.replaceWith(dom('span','company-directory-initials',company.commercial_name.slice(0,1).toLocaleUpperCase('es')));},{once:true});brand.append(image);}
   else brand.append(dom('span','company-directory-initials',company.commercial_name.slice(0,1).toLocaleUpperCase('es')));
   top.append(brand);card.append(top);
   card.append(dom('h2','company-directory-name',company.commercial_name));
   const meta=dom('p','company-directory-meta',[company.sector,company.city||company.department].filter(Boolean).join(' · ')||'Empresa registrada en El Salvador');card.append(meta);
   card.append(dom('p','company-directory-description',company.description||'Conoce el perfil y las oportunidades de esta empresa.'));
   const facts=dom('div','company-directory-facts');const vacancyFact=dom('div','company-directory-vacancy-count');vacancyFact.append(dom('strong','',String(company.activeJobs)),dom('span','',company.activeJobs===1?'vacante activa':'vacantes activas'));facts.append(vacancyFact);
   if(company.employee_range)facts.append(dom('span','company-directory-size',company.employee_range));
   if(company.founded_year)facts.append(dom('span','company-directory-founded',`Desde ${company.founded_year}`));
   const actions=dom('div','company-directory-actions'),profile=link('Ver perfil',url+encodeURIComponent(company.id),'btn btn-soft');actions.append(profile);
   const offers=link(company.activeJobs?'Ver vacantes':'Conocer empresa',url+encodeURIComponent(company.id)+'#wl-company-jobs',company.activeJobs?'btn btn-primary':'btn btn-soft');actions.append(offers);
   card.append(facts,actions);root.append(card);
  }
  pagination.replaceChildren();pagination.hidden=pageCount<2;
  if(pageCount>1){const previous=dom('button','btn btn-soft','← Anterior');previous.type='button';previous.disabled=currentPage===1;previous.addEventListener('click',()=>{currentPage--;render();});const label=dom('span','',`Página ${currentPage} de ${pageCount}`);const next=dom('button','btn btn-soft','Siguiente →');next.type='button';next.disabled=currentPage===pageCount;next.addEventListener('click',()=>{currentPage++;render();});pagination.append(previous,label,next);}
 }
 for(const control of [search,sector,department,hiring,sort])control.addEventListener(control===search?'input':'change',()=>{currentPage=1;render();});
 render();
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
 }catch(error){const directory=$('company-directory-list');if(directory){directory.replaceChildren();directory.removeAttribute('aria-busy');const empty=dom('div','company-directory-empty');empty.append(dom('span','company-directory-empty-icon','!'),dom('h2','','No se pudo cargar el directorio'),dom('p','muted','Revisa tu conexión e inténtalo de nuevo.'));const retry=dom('button','btn btn-primary','Reintentar');retry.type='button';retry.addEventListener('click',()=>location.reload());empty.append(retry);directory.append(empty);const count=$('company-directory-count');if(count)count.textContent='';}
  else{const root=$('ln-live-portal');if(root){root.removeAttribute('aria-busy');root.replaceChildren(dom('h2','','Panel empresarial'),dom('p','ld-status','No se pudo cargar la información de tu empresa. Recarga la página para intentarlo de nuevo.'));}else{const main=document.querySelector('main');main?.prepend(dom('p','ld-status','No se pudo cargar esta sección. Inténtalo de nuevo.'));}}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
