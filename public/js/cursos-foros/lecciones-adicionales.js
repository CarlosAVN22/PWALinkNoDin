import {supabase,run,who,dom,status,messageError} from '/js/integrado/base.js';
async function init(){
 const parent=document.getElementById('ld-courses')?.parentElement;if(!parent)return;
 const me=await who();if(!me||![2,3].includes(me.role_id))return;
 const authorized=me.role_id===3||(await run(supabase.from('companies').select('verification_status').eq('user_id',me.id))).some(c=>c.verification_status==='verified');
 if(!authorized)return;
 const courses=await run(supabase.from('courses').select('id,title,created_by,status').eq('created_by',me.id).order('created_at',{ascending:false}));
 const root=dom('section','panel ln-integ-section');root.style.marginTop='2rem';root.append(dom('h2','','Agregar lecciones a mis cursos'));
 const notice=dom('p','ld-status');root.append(notice);
 if(!courses.length){root.append(dom('p','muted','Publica primero un curso desde el formulario anterior.'));parent.append(root);return;}
 const form=dom('form','ln-integ-form ln-lesson-form'),select=dom('select'),title=dom('input'),body=dom('textarea'),video=dom('input'),file=dom('input'),duration=dom('input'),send=dom('button','btn btn-primary','Agregar lección');
 select.required=true;for(const course of courses){const opt=dom('option','',course.title);opt.value=String(course.id);select.append(opt);}
 title.placeholder='Título de la lección';title.maxLength=220;title.required=true;body.placeholder='Descripción/contenido';body.maxLength=5000;body.rows=4;
 video.type='url';video.placeholder='URL de YouTube (si no subes archivo)';file.type='file';file.accept='video/mp4,video/webm';
 duration.type='number';duration.min=1;duration.max=1200;duration.value=15;duration.required=true;
 const wrap=(label,el)=>{const box=dom('label','ln-form-field',label);box.append(el);form.append(box);};
 wrap('Curso',select);wrap('Título',title);wrap('Contenido',body);wrap('Vídeo de YouTube',video);wrap('O archivo de vídeo',file);wrap('Duración (minutos)',duration);send.type='submit';form.append(send);root.append(form);parent.append(root);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const selected=file.files?.[0];if(Boolean(selected)===Boolean(video.value.trim())){status(notice,'Selecciona exactamente una fuente de vídeo.',true);return;}
  if(selected&&(!['video/mp4','video/webm'].includes(selected.type)||selected.size>30*1024*1024)){status(notice,'Solo MP4 o WebM de máximo 30 MB.',true);return;}
  if(video.value.trim()&&!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(video.value.trim())){status(notice,'Utiliza una URL válida de YouTube.',true);return;}
  send.disabled=true;let path=null;
  try{
   if(selected){const ext=selected.type==='video/webm'?'webm':'mp4';path=me.uid+'/'+crypto.randomUUID()+'.'+ext;
    const up=await supabase.storage.from('course-videos').upload(path,selected,{contentType:selected.type,upsert:false});if(up.error)throw up.error;
   }
   const id=Number(select.value),list=await run(supabase.from('course_modules').select('sort_order').eq('course_id',id).order('sort_order',{ascending:false}).limit(1));
   await run(supabase.from('course_modules').insert({course_id:id,title:title.value.trim(),description:body.value.trim()||null,
    content:body.value.trim()||null,video_url:video.value.trim()||null,video_storage_key:path,
    duration_minutes:Number(duration.value),sort_order:Math.min(32767,Number(list[0]?.sort_order||0)+1)}));
   status(notice,'Lección agregada. Actualiza el catálogo para verla en el reproductor.');title.value='';body.value='';video.value='';file.value='';
  }catch(e){status(notice,'No se pudo guardar: '+messageError(e),true);if(path)await supabase.storage.from('course-videos').remove([path]);}
  finally{send.disabled=false;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error));else init().catch(console.error);
