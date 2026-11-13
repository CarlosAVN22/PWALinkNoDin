/* Navegación y control visual de acceso. Las políticas RLS son la autoridad final. */
import {supabase} from '/js/supabase-config.js';
const path=location.pathname;
const guarded={
  admin:/^\/doc\/admin\//,
  company:/^\/doc\/empresa\/(?:empresa-panel|empresa-perfil|empresa-vacantes|empresa-candidatos)\.html$|^\/doc\/empleo\/publicar\.html$/,
  candidate:/^\/doc\/candidato\/(?:candidato|postulaciones|postular)\.html$|^\/doc\/empleo\/guardados\.html$|^\/doc\/general\/perfil\.html$/
};
const reviewDetails=path.endsWith('/doc/candidato/candidato-detalle.html');
const wanted=Object.entries(guarded).find(([,pattern])=>pattern.test(path))?.[0]||null;
const roleNames={1:'candidate',2:'company',3:'admin'};
const destinations={candidate:'/doc/candidato/candidato.html',company:'/doc/empresa/empresa-panel.html',admin:'/doc/admin/admin.html'};
const login='/doc/general/login.html';
function redirect(message){
 sessionStorage.setItem('ld-protected-message',message);
 location.replace(login+'?next='+encodeURIComponent(path+location.search));
}
async function init(){
 let user=null;
 try{const response=await supabase.auth.getUser();user=response.data?.user||null;}catch(error){console.warn('No se pudo verificar la sesión:',error);}
 let profile=null;
 if(user){
  const {data,error}=await supabase.from('users').select('id,role_id,status,full_name').eq('auth_user_id',user.id).maybeSingle();
  if(!error&&data?.status==='active')profile=data;
 }
 const role=roleNames[profile?.role_id]||null;
 if((wanted&&wanted!==role)||(reviewDetails&&!['company','admin'].includes(role))){redirect(!user?'Inicia sesión para continuar.':'La cuenta actual no tiene permiso para esta sección.');return;}
 // La autorización no depende nunca del contenido de localStorage.
 const actions=document.querySelector('header .actions');
 if(actions&&role){
  actions.querySelectorAll('a[href*="login.html"],a[href*="registro.html"]').forEach(a=>a.remove());
  if(!actions.querySelector('[data-ln-panel]')){const a=document.createElement('a');a.className='btn btn-sm';a.dataset.lnPanel='';a.href=destinations[role];a.textContent='Mi panel';actions.append(a);}
  if(!actions.querySelector('[data-ln-logout]')){const b=document.createElement('button');b.className='btn btn-soft btn-sm';b.type='button';b.textContent='Cerrar sesión';b.dataset.lnLogout='';b.addEventListener('click',async()=>{
    b.disabled=true;const {error}=await supabase.auth.signOut();
    if(error){alert('No se pudo cerrar sesión: '+error.message);b.disabled=false;return;}
    Object.keys(localStorage).filter(k=>k.startsWith('linknodin-v3-')).forEach(k=>localStorage.removeItem(k));
    location.assign('/doc/general/index.html');
  });actions.append(b);}
 }
 document.documentElement.dataset.lnAuth=role||'guest';
 document.dispatchEvent(new CustomEvent('ln:auth-ready',{detail:{role,profile}}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
