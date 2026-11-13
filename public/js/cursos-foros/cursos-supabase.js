/* LinkNoDin / Cursos reales. Autorizacion de publicaciones en RLS, no en el navegador. */
import { supabase } from '/js/supabase-config.js';
import { cursosForosRequest } from './api-cursos-foros.js';
import { generalRequest } from '/js/general/api-general.js';

const $ = id => document.getElementById(id);
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const query = async request => {
  const { data, error } = await request;
  if (error) throw error;
  return data;
};
const notify = (node, value) => { node.textContent = value; node.setAttribute('role', 'status'); };
const errorText = error => error?.message || String(error);
const slug = () => 'curso-' + crypto.randomUUID();
const LEVELS = ['Básico','Intermedio','Avanzado'];

function youtubeEmbed(raw) {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    let id = '';
    if (['youtu.be','www.youtu.be'].includes(u.hostname)) id = u.pathname.slice(1);
    if (['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(u.hostname)) {
      id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/) || [])[1];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? 'https://www.youtube-nocookie.com/embed/' + id : '';
  } catch { return ''; }
}

async function identity() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const user = await generalRequest('/account');
  return user.status === 'active' ? { ...user, authId: data.session.user.id } : null;
}
async function canPublish(me) {
  if (!me || ![2,3].includes(me.role_id)) return false;
  const permission = await cursosForosRequest('/courses/publishing-permission');
  return permission.allowed;
}

async function load() {
  return cursosForosRequest('/courses');
}

async function init() {
  const root = $('ld-courses');
  if (!root) return;
  const oldDetail = $('cf-detail');
  oldDetail.hidden = true;
  const host = make('div','ln-course-app');
  root.insertAdjacentElement('afterend',host);
  root.hidden = true;
  const status = make('p','ln-course-status','Cargando cursos...');
  status.setAttribute('role','status');
  host.append(status);
  let me = null;
  try { me = await identity(); } catch (err) { notify(status, 'Error al consultar la sesión: ' + errorText(err)); }
  let publisher = false;
  try { publisher = await canPublish(me); } catch (err) { notify(status, 'No se pudo verificar el permiso empresarial: ' + errorText(err)); }
  const list = make('section','ln-course-list');
  const detail = make('section','ln-course-detail');
  detail.hidden = true;
  const author = make('section','ln-course-author');
  host.append(list,detail,author);
  let data = {categories:[],courses:[],modules:[]};
  let active = null;
  let lesson = 0;
  let progress = new Set();
  async function reload() {
    try {data = await load();notify(status,'');renderList();renderAuthor();}
    catch(err) {notify(status,'No se pudieron cargar los cursos. Comprueba las tablas expuestas, RLS y el script SQL: '+errorText(err));}
  }
  function renderList() {
    list.replaceChildren();
    const search = $('cf-search')?.value.trim().toLowerCase() || '';
    const filter = $('cf-level')?.value || 'todos';
    const visible = data.courses.filter(c => c.status === 'published' && (filter === 'todos' || c.level === filter) && (c.title+' '+(c.description||'')).toLowerCase().includes(search));
    list.append(make('h2','','Cursos disponibles'));
    const grid = make('div','cf-grid');
    if (!visible.length) list.append(make('p','ln-course-empty','No hay cursos publicados con esos filtros.'));
    for (const course of visible) {
      const card = make('article','cf-card ln-course-card');
      const cover = make('div','cf-cover');
      cover.append(make('strong','',course.title),make('span','','ACADEMIA LINKNODIN'));
      const body = make('div','cf-card-content');
      const cat = data.categories.find(c => c.id === course.category_id);
      body.append(make('span','ld-overline','ACCESO GRATUITO'),make('h3','',course.title),make('p','',course.description||''));
      const tags = make('div','cf-tags');
      tags.append(make('span','',cat?.name||'General'),make('span','',course.level||'Básico'),make('span','',(course.duration_minutes||0)+' min'));
      const count = data.modules.filter(m=>m.course_id===course.id).length;
      tags.append(make('span','',count+' lección(es)'));
      const open = make('button','btn btn-primary','Ver curso');open.type='button';open.onclick=()=>openCourse(course);
      body.append(tags,open);card.append(cover,body);grid.append(card);
    }
    list.append(grid);
  }
  async function openCourse(course) {
    active = course; lesson = 0; detail.hidden = false;
    progress = new Set();
    if (me?.role_id === 1) {
      try {
        const rows = await cursosForosRequest('/courses/progress');
        progress = new Set(rows.filter(x=>x.completed_at).map(x=>x.module_id));
      } catch(err) {notify(status,'No se pudo consultar tu progreso: '+errorText(err));}
    }
    await drawLesson();detail.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function drawLesson() {
    detail.replaceChildren();if (!active) return;
    const modules = data.modules.filter(m=>m.course_id===active.id).sort((a,b)=>a.sort_order-b.sort_order);
    const head = make('div','ln-course-detail-head');
    head.append(make('h2','',active.title));
    const close = make('button','btn','Cerrar curso');close.type='button';close.onclick=()=>{active=null;detail.hidden=true;detail.replaceChildren();};head.append(close);detail.append(head);
    detail.append(make('p','',active.description||''));
    if (!modules.length){detail.append(make('p','', 'Este curso aún no tiene lecciones disponibles.'));return;}
    lesson = Math.min(lesson,modules.length-1);
    const mod = modules[lesson];
    const wrapper = make('div','ln-course-learning');const media = make('div','ln-course-media');
    media.append(make('h3','',mod.title));
    const screen = make('div','ln-course-screen');media.append(screen);
    if (mod.video_url && youtubeEmbed(mod.video_url)) {
      const frame=make('iframe');frame.src=youtubeEmbed(mod.video_url);frame.title='Vídeo del curso: '+mod.title;frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';screen.append(frame);
    } else if (mod.video_storage_key) {
      screen.append(make('p','','Preparando reproducción segura…'));
      try {
        const {data:signed,error} = await supabase.storage.from('course-videos').createSignedUrl(mod.video_storage_key, 600);
        if(error) throw error;
        if (active && data.modules.filter(m=>m.course_id===active.id)[lesson]?.id===mod.id) {
          const video=make('video');video.controls=true;video.playsInline=true;video.preload='metadata';video.src=signed.signedUrl;screen.replaceChildren(video);
        }
      } catch(err) {screen.replaceChildren(make('p','','No se pudo reproducir el vídeo: '+errorText(err)));}
    } else {screen.append(make('p','','Esta lección no tiene vídeo asignado.'));}
    if (mod.content) media.append(make('p','',mod.content));
    if (mod.description) media.append(make('p','',mod.description));
    const commands=make('div','ln-course-controls');
    const prev=make('button','btn','Anterior');prev.disabled=lesson===0;prev.onclick=()=>{lesson--;drawLesson();};
    const next=make('button','btn','Siguiente');next.disabled=lesson===modules.length-1;next.onclick=()=>{lesson++;drawLesson();};
    commands.append(prev,next);
    const progressMsg=make('p','muted','');
    if (me?.role_id===1){
      const complete=make('button','btn btn-primary',progress.has(mod.id)?'Lección completada':'Marcar como completada');
      complete.disabled=progress.has(mod.id);
      complete.onclick=async()=>{
        complete.disabled=true;
        try {
          await cursosForosRequest(`/courses/${active.id}/modules/${mod.id}/complete`, 'POST');
          progress.add(mod.id);await drawLesson();
        }catch(err){notify(progressMsg,'No se pudo guardar el progreso: '+errorText(err));complete.disabled=false;}
      };
      commands.append(complete);
    }
    media.append(commands,progressMsg);
    const aside=make('aside','ln-course-lessons');aside.append(make('h3','','Lecciones'));
    modules.forEach((m,index)=>{
      const button=make('button','ln-course-lesson'+(index===lesson?' active':''),(index+1)+'. '+m.title+(progress.has(m.id)?' · Completada':''));
      button.type='button';button.onclick=()=>{lesson=index;drawLesson();};aside.append(button);
    });
    aside.append(make('p','muted','Avance: '+progress.size+' de '+modules.length+' lecciones'));
    wrapper.append(media,aside);detail.append(wrapper);
  }
  function renderAuthor() {
    author.replaceChildren();
    if (!publisher) {
      author.append(make('p','ln-course-note', me?.role_id===2 ? 'Tu empresa debe estar verificada para publicar cursos.' : 'Solo administradores y empresas verificadas pueden publicar cursos.'));
      return;
    }
    author.append(make('h2','','Publicar un curso y vídeo'));
    const form=make('form','ln-course-form');author.append(form);
    function field(label,tag='input'){
      const box=make('label','ln-course-field'),heading=make('span','',label),entry=make(tag);box.append(heading,entry);form.append(box);return entry;
    }
    const title=field('Título');title.required=true;title.minLength=8;title.maxLength=220;
    const description=field('Descripción','textarea');description.required=true;description.minLength=20;description.maxLength=3000;description.rows=4;
    const category=field('Categoría','select');category.required=true;
    data.categories.filter(c=>c.is_active).forEach(c=>{const option=make('option','',c.name);option.value=c.id;category.append(option);});
    const level=field('Nivel','select');LEVELS.forEach(l=>{const option=make('option','',l);option.value=l;level.append(option);});
    const duration=field('Duración (minutos)');duration.type='number';duration.min=5;duration.max=1200;duration.required=true;duration.value=30;
    const lessonTitle=field('Nombre de la primera lección');lessonTitle.required=true;lessonTitle.maxLength=220;
    const lessonText=field('Contenido de la lección','textarea');lessonText.rows=3;lessonText.maxLength=5000;
    const url=field('Enlace de YouTube (si no subes archivo)');url.type='url';url.maxLength=500;
    const file=field('O archivo MP4 / WebM (máximo 30 MB)');file.type='file';file.accept='video/mp4,video/webm';
    const send=make('button','btn btn-primary','Publicar curso');send.type='submit';form.append(send);
    const feedback=make('p','ln-course-status');form.append(feedback);
    if(!category.options.length){send.disabled=true;notify(feedback,'El administrador debe crear una categoría activa antes de publicar.');}
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const selected=file.files?.[0];
      if (!!selected === !!url.value.trim()) {notify(feedback,'Selecciona solo una opción: enlace de YouTube o archivo de vídeo.');return;}
      if(url.value.trim() && !youtubeEmbed(url.value.trim())) {notify(feedback,'Ingresa un enlace válido de YouTube.');return;}
      if(selected && (!['video/mp4','video/webm'].includes(selected.type) || selected.size>30*1024*1024)){
        notify(feedback,'Solo MP4 o WebM de hasta 30 MB.');return;
      }
      send.disabled=true;notify(feedback,'Guardando curso...');
      let storageKey=null;
      try {
        if(selected){
          const extension=selected.type==='video/webm'?'webm':'mp4';
          storageKey=me.authId+'/'+crypto.randomUUID()+'.'+extension;
          const {error}=await supabase.storage.from('course-videos').upload(storageKey,selected,{contentType:selected.type,upsert:false});
          if(error)throw error;
        }
        await cursosForosRequest('/courses','POST',{
          title:title.value.trim(),description:description.value.trim(),level:level.value,
          category_id:Number(category.value),duration_minutes:Number(duration.value),
          lesson_title:lessonTitle.value.trim(),lesson_text:lessonText.value.trim(),
          video_url:url.value.trim()||null,video_storage_key:storageKey
        });
        form.reset();notify(feedback,'Curso publicado y disponible para todos.');await reload();
      } catch(error){
        notify(feedback,'No se pudo publicar: '+errorText(error));
        if(storageKey) await supabase.storage.from('course-videos').remove([storageKey]);
      } finally {send.disabled=false;}
    });
  }
  $('cf-search')?.addEventListener('input',renderList);
  $('cf-level')?.addEventListener('change',renderList);
  await reload();
}
document.addEventListener('DOMContentLoaded',init);
