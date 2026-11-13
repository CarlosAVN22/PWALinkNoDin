import {supabase,dom,run} from './base.js';
const $=id=>document.getElementById(id);
const link=(text,url,cls='btn')=>{const a=dom('a',cls,text);a.href=url;return a;};
async function init(){
 if(!location.pathname.endsWith('/general/index.html'))return;
 const featured=$('ld-featured'),carousel=document.querySelector('[data-company-carousel]');
 const [companies,jobs]=await Promise.all([
  run(supabase.from('companies').select('id,commercial_name,sector,city,verification_status,logo_storage_key').eq('verification_status','verified').order('commercial_name')),
  run(supabase.from('jobs').select('id,title,company_id,city,modality,salary_min,salary_max,status,application_deadline,created_at').eq('status','active').order('created_at',{ascending:false}).limit(40))
 ]);
 const names=new Map(companies.map(c=>[c.id,c.commercial_name]));
 if(carousel){carousel.replaceChildren();
  for(const c of companies){const a=dom('a','wl-company-tile');a.href='/doc/empresa/empresa-detalle.html?empresa='+c.id;
   if(c.logo_storage_key){const image=dom('img');image.alt='Logo de '+c.commercial_name;image.src=supabase.storage.from('company-logos').getPublicUrl(c.logo_storage_key).data.publicUrl;a.append(image);}
   a.append(dom('h3','',c.commercial_name),dom('p','',c.sector||c.city||'Empresa verificada'),dom('span','','Ver perfil y valoraciones'));carousel.append(a);
  }
  if(!companies.length)carousel.append(dom('p','muted','Todavía no hay empresas verificadas.'));
  document.querySelectorAll('.wl-note').forEach(note=>{if(note.textContent.toLowerCase().includes('ilustrativ'))note.textContent='Empresas verificadas registradas en LinkNoDin.';});
  for(const [selector,direction] of [['[data-company-prev]',-1],['[data-company-next]',1]])document.querySelector(selector)?.addEventListener('click',()=>carousel.scrollBy({left:direction*280,behavior:'smooth'}));
 }
 if(featured){featured.replaceChildren();
  const today=new Date().toISOString().slice(0,10);const active=jobs.filter(job=>names.has(job.company_id)&&(!job.application_deadline||job.application_deadline>=today)).slice(0,6);
  for(const job of active){const row=dom('article','ln-integ-card');row.append(dom('h3','',job.title),dom('p','muted',`${names.get(job.company_id)} · ${job.city||'El Salvador'} · ${job.modality||''}`),link('Ver empleo','/doc/empleo/detalle-empleo.html?id='+job.id,'btn btn-primary'));featured.append(row);}
  if(!active.length)featured.append(dom('p','muted','Pronto habrá nuevas oportunidades de empleo publicadas.'));
 }

 const testimonials=document.querySelector('section.ld-testimonials');
 if(testimonials){
  testimonials.hidden=true;
  try{
   const reviews=await run(supabase.from('company_reviews')
    .select('company_id,display_name,comment,rating,created_at')
    .eq('status','visible').order('created_at',{ascending:false}).limit(8));
   const carousel=testimonials.querySelector('[data-carousel]');
   if(carousel){
    carousel.replaceChildren();
    for(const review of reviews){
     const company=companies.find(item=>item.id===review.company_id);
     if(!company)continue;
     const card=dom('article','ln-integ-card');
     card.append(dom('p','',review.comment),
      dom('strong','',`${review.display_name} · ${review.rating}/5`),
      dom('p','muted',company.commercial_name));
     carousel.append(card);
    }
    testimonials.hidden=carousel.children.length===0;
   }
  }catch(error){
   console.warn('No se pudieron cargar las opiniones:',error);
  }
 }
 const search=$('ld-home-search');search?.addEventListener('submit',event=>{
  event.preventDefault();const qs=new URLSearchParams(new FormData(search));location.assign('/doc/empleo/empleos.html?'+qs.toString());
 });
 const count=$('ld-home-job-count');if(count)count.textContent=String(jobs.length);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
