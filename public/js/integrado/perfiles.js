import {supabase,$,dom,run,who,status,messageError} from './base.js';
const mapping={
 'company-name':'commercial_name','company-legal-name':'legal_name','company-sector':'sector',
 'company-size':'employee_range','company-founded':'founded_year','company-department':'department',
 'company-city':'city','company-address':'address','company-public-email':'public_email',
 'company-phone':'public_phone','company-website':'website','company-linkedin':'linkedin_url',
 'company-description':'description','company-culture':'culture'
};
function notify(id,value,error=false){status($(id),value,error);}
async function skillsManager(me){
 const textarea=$('perfil-habilidades');if(!textarea)return;
 textarea.disabled=false;textarea.placeholder='Ejemplo: Java, Excel, Comunicación (separadas por comas)';
 const [catalog,selected,profile]=await Promise.all([
  run(supabase.from('skills').select('id,name').order('name')),
  run(supabase.from('candidate_skills').select('skill_id').eq('candidate_user_id',me.id)),
  run(supabase.from('candidate_profiles').select('custom_skills').eq('user_id',me.id).single())
 ]);
 textarea.value=[...catalog.filter(s=>selected.some(r=>r.skill_id===s.id)).map(s=>s.name),...(profile.custom_skills||'').split(',').map(s=>s.trim()).filter(Boolean)].join(', ');
 const hint=dom('small','muted','Escribe tus habilidades libremente, separadas por comas. Puedes agregar otras que no aparezcan en las sugerencias.');
 textarea.insertAdjacentElement('afterend',hint);
 return async()=>{
  const names=[...new Set(textarea.value.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean))];
  const matched=[],unknown=[];
  for(const name of names){const option=catalog.find(s=>s.name.toLowerCase()===name.toLowerCase());if(option)matched.push(option.id);else unknown.push(name);}
  await run(supabase.from('candidate_profiles').update({custom_skills:unknown.join(', ')}).eq('user_id',me.id));
  const ids=new Set(matched),old=new Set(selected.map(s=>s.skill_id));
  const remove=[...old].filter(id=>!ids.has(id)),add=[...ids].filter(id=>!old.has(id));
  for(const id of remove)await run(supabase.from('candidate_skills').delete().eq('candidate_user_id',me.id).eq('skill_id',id));
  if(add.length)await run(supabase.from('candidate_skills').insert(add.map(skill_id=>({candidate_user_id:me.id,skill_id,proficiency:'general'}))));
  selected.splice(0,selected.length,...matched.map(skill_id=>({skill_id})));
 };
}
async function personal(){
 const form=$('perfil-form');if(!form)return;
 const me=await who(),notice=$('perfil-mensaje');
 if(!me||me.role_id!==1){notify('perfil-mensaje','Inicia sesión como candidato para completar tu perfil.',true);return;}
 let existing=(await run(supabase.from('candidate_profiles').select('*').eq('user_id',me.id)))[0]||null;
 const fields={nombre:me.full_name,correo:me.email,telefono:existing?.phone,ubicacion:existing?.location,
  profesion:existing?.occupation,estudios:existing?.education_summary,experiencia:existing?.experience_years,
  resumen:existing?.professional_summary};
 for(const [key,val] of Object.entries(fields))if($('perfil-'+key))$('perfil-'+key).value=val??'';
 for(const key of ['perfil-nombre','perfil-correo'])if($(key)){$(key).readOnly=true;$(key).title='Dato de cuenta administrado desde autenticación.';}

 if(!existing){existing=await run(supabase.from('candidate_profiles').insert({user_id:me.id}).select('*').single());}
 let saveSkills;try{saveSkills=await skillsManager(me);}catch(e){notify('perfil-mensaje','No se pudieron cargar habilidades: '+messageError(e),true);}
 const cv=$('perfil-cv'),cvInfo=$('perfil-cv-info'),cvName=$('perfil-cv-nombre'),remove=$('perfil-cv-quitar');
 const openCv=dom('button','btn btn-sm','Ver currículum');
 openCv.type='button';
 openCv.id='perfil-cv-ver';
 if(cvInfo)cvInfo.insertBefore(openCv,remove);
 openCv.addEventListener('click',async()=>{
  if(!currentAsset)return;
  openCv.disabled=true;
  const tab=window.open('about:blank','_blank');
  try{
   const result=await supabase.storage.from('candidate-cvs').createSignedUrl(currentAsset.storage_key,120);
   if(result.error)throw result.error;
   if(tab){
    tab.opener=null;
    tab.location.href=result.data.signedUrl;
   }else{
    notify('perfil-mensaje','Tu navegador bloqueó la ventana. Permite abrir ventanas para ver tu currículum.',true);
   }
  }catch(error){
   if(tab)tab.close();
   notify('perfil-mensaje','No se pudo abrir el currículum: '+messageError(error),true);
  }finally{openCv.disabled=false;}
 });
 async function metadata(id){return id?(await run(supabase.from('file_assets').select('id,storage_key,original_name').eq('id',id)))[0]:null;}
 let currentAsset=await metadata(existing.cv_file_id);
 function drawCv(){if(cvInfo)cvInfo.hidden=!currentAsset;if(cvName)cvName.textContent=currentAsset?.original_name||'';if(remove)remove.hidden=!currentAsset;openCv.hidden=!currentAsset;}
 async function deleteOld(asset){if(!asset)return;
  const {error}=await supabase.storage.from('candidate-cvs').remove([asset.storage_key]);if(error)throw error;

  const result=await supabase.from('file_assets').delete().eq('id',asset.id);
  if(result.error)console.warn('Archivo borrado de Storage, pero quedaron metadatos históricos:',result.error.message);
 }
 if(cv){
  const allowed=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
  cv.addEventListener('change',async()=>{
   const file=cv.files?.[0];if(!file)return;
   if(!allowed.has(file.type)||file.size>5*1024*1024||!file.size){notify('perfil-mensaje','Solo se admiten PDF, DOC o DOCX de hasta 5 MB.',true);cv.value='';return;}
   cv.disabled=true;const extension=file.name.split('.').pop().toLowerCase();
   const newPath=`${me.uid}/${crypto.randomUUID()}.${extension}`;let uploaded=false,asset=null;
   try{
    const upload=await supabase.storage.from('candidate-cvs').upload(newPath,file,{contentType:file.type,upsert:false});
    if(upload.error)throw upload.error;uploaded=true;
    asset=await run(supabase.from('file_assets').insert({uploaded_by:me.id,storage_key:newPath,original_name:file.name,mime_type:file.type,size_bytes:file.size}).select('id,storage_key,original_name').single());
    await run(supabase.from('candidate_profiles').update({cv_file_id:asset.id,updated_at:new Date().toISOString()}).eq('user_id',me.id));
    const old=currentAsset;currentAsset=asset;drawCv();notify('perfil-mensaje','CV guardado de forma privada.');
    if(old){try{await deleteOld(old);}catch(e){console.warn('El CV anterior necesita limpieza manual:',e.message);}}
   }catch(e){
    if(uploaded&&asset?.id)await supabase.from('file_assets').delete().eq('id',asset.id);
    if(uploaded)await supabase.storage.from('candidate-cvs').remove([newPath]);
    notify('perfil-mensaje','No se pudo guardar el CV: '+messageError(e),true);
   }finally{cv.disabled=false;cv.value='';}
  });
 }
 if(remove)remove.addEventListener('click',async()=>{
  if(!currentAsset||!confirm('¿Eliminar tu currículum de LinkNoDin?'))return;
  remove.disabled=true;const old=currentAsset;
  try{
   await run(supabase.from('candidate_profiles').update({cv_file_id:null}).eq('user_id',me.id));
   currentAsset=null;drawCv();
   try{await deleteOld(old);}catch(err){console.warn('La limpieza del archivo requiere revisión:',err);}
   notify('perfil-mensaje','Currículum desvinculado de tu perfil.');
  }catch(e){notify('perfil-mensaje',messageError(e),true);}finally{remove.disabled=false;}
 });
 drawCv();
 const note=form.querySelector('.ld-perfil-note');if(note)note.textContent='Tus datos profesionales se guardan en tu cuenta.';
 $('perfil-experiencia')?.dispatchEvent(new Event('input',{bubbles:true}));
 form.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();if(!form.reportValidity())return;
  const submit=form.querySelector('[type=submit]');submit.disabled=true;
  const val=name=>($('perfil-'+name)?.value||'').trim();
  const data={phone:val('telefono')||null,location:val('ubicacion')||null,occupation:val('profesion')||null,
   education_summary:val('estudios')||null,professional_summary:val('resumen')||null,experience_years:Number(val('experiencia'))||0,
   updated_at:new Date().toISOString()};
  try{
   await run(supabase.from('candidate_profiles').update(data).eq('user_id',me.id));
   if(saveSkills)await saveSkills();
   notify('perfil-mensaje','Perfil y habilidades guardados correctamente.');
  }catch(e){notify('perfil-mensaje',messageError(e),true);}finally{submit.disabled=false;}
 },true);
}
async function enterprise(){
 const form=$('company-profile-form');if(!form)return;
 const me=await who(),notice=$('company-profile-status');
 if(!me||me.role_id!==2){status(notice,'Inicia sesión como empresa.',true);return;}
 const company=(await run(supabase.from('companies').select('*').eq('user_id',me.id)))[0];
 if(!company){status(notice,'No se encontró la empresa asociada.',true);return;}
 for(const [id,col] of Object.entries(mapping))if($(id))$(id).value=company[col]??'';
 const preview=form.querySelector('[data-company-public-preview]');if(preview)preview.href='/doc/empresa/empresa-detalle.html?empresa='+company.id;
 const logo=$('company-logo-file'),remove=$('company-logo-remove'),container=$('company-profile-logo-preview');
 let logoPath=company.logo_storage_key||null;
 function logoPreview(){if(!container)return;container.replaceChildren();
  if(logoPath){const img=dom('img');img.alt='Logo de '+company.commercial_name;img.src=supabase.storage.from('company-logos').getPublicUrl(logoPath).data.publicUrl;container.append(img);}
  else container.textContent=(company.commercial_name||'E').slice(0,1).toUpperCase();if(remove)remove.hidden=!logoPath;
 }
 logoPreview();
 if(logo)logo.addEventListener('change',async()=>{
  const file=logo.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024||!file.size){status(notice,'Selecciona una imagen PNG, JPG o WebP de hasta 3 MB.',true);logo.value='';return;}
  logo.disabled=true;const old=logoPath;const path=`${me.uid}/${crypto.randomUUID()}.${file.name.split('.').pop().toLowerCase()}`;
  try{
   const uploaded=await supabase.storage.from('company-logos').upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;
   try{await run(supabase.from('companies').update({logo_storage_key:path}).eq('id',company.id));}
   catch(e){await supabase.storage.from('company-logos').remove([path]);throw e;}
   logoPath=path;logoPreview();status(notice,'Logo actualizado correctamente.');
   if(old)await supabase.storage.from('company-logos').remove([old]);
  }catch(e){status(notice,'No se pudo subir el logo. Revisa que exista el almacenamiento company-logos y vuelve a intentarlo. Detalle: '+messageError(e),true);}finally{logo.disabled=false;logo.value='';}
 });
 if(remove)remove.onclick=async()=>{
  if(!logoPath)return;const old=logoPath;remove.disabled=true;
  try{await run(supabase.from('companies').update({logo_storage_key:null}).eq('id',company.id));logoPath=null;logoPreview();await supabase.storage.from('company-logos').remove([old]);status(notice,'Logo eliminado.');}
  catch(e){status(notice,messageError(e),true);}finally{remove.disabled=false;}
 };
 function progress(){const elements=['company-name','company-sector','company-department','company-city','company-public-email','company-description'];const complete=elements.filter(k=>$(k)?.value.trim()).length;
 const label=$('company-profile-progress-label'),bar=$('company-profile-progress');if(label)label.textContent=Math.round(complete/elements.length*100)+'%';if(bar)bar.style.width=(complete/elements.length*100)+'%';
 const count=$('company-description-count');if(count)count.textContent=String($('company-description')?.value?.length||0);
 }
 form.addEventListener('input',progress);form.addEventListener('change',progress);progress();
 form.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();if(!form.reportValidity())return;
  const btn=form.querySelector('[type=submit]');btn.disabled=true;
  const values={};for(const [id,col] of Object.entries(mapping)){
   const el=$(id);if(!el)continue;const value=el.value.trim();values[col]=col==='founded_year'?(value?Number(value):null):value||null;
  }
  values.updated_at=new Date().toISOString();
  try{await run(supabase.from('companies').update(values).eq('id',company.id));status(notice,'Perfil empresarial actualizado correctamente.');progress();}
  catch(e){status(notice,messageError(e),true);}finally{btn.disabled=false;}
 },true);
}
async function start(){try{await personal();await enterprise();}catch(e){console.error('Error de perfil:',e);status($('perfil-mensaje')||$('company-profile-status'),messageError(e),true);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
