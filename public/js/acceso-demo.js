(function(){
'use strict';
const base='/doc/general/login.html';
const store='linknodin-v3-';
function session(){try{return JSON.parse(localStorage.getItem(store+'session'))}catch(e){return null}}
function role(){const s=session();if(!s)return null;if(s.role==='admin'&&s.email==='admin@linknodin.demo')return 'admin';try{const accounts=JSON.parse(localStorage.getItem(store+'accounts'))||[];return accounts.some(a=>a.email===s.email&&a.role===s.role)?s.role:null}catch(e){return null}}
const path=location.pathname;
const r=role();
let needed=null;
if(path.startsWith('/doc/admin/'))needed='admin';
else if(['/doc/empresa/empresa-panel.html','/doc/empresa/empresa-perfil.html','/doc/empresa/empresa-vacantes.html','/doc/empresa/empresa-candidatos.html','/doc/empleo/publicar.html'].includes(path))needed='empresa';
else if(['/doc/candidato/candidato.html','/doc/candidato/candidato-detalle.html','/doc/candidato/postulaciones.html','/doc/candidato/postular.html','/doc/empleo/guardados.html','/doc/general/perfil.html'].includes(path))needed='candidato';
if(needed&&r!==needed){document.documentElement.style.visibility='hidden';sessionStorage.setItem('ld-protected-message','Para acceder necesitas iniciar sesión como '+needed+'.');location.replace(base+'?next='+encodeURIComponent(path+location.search));return}
window.LinkNoDinDemoRole=r;
document.addEventListener('DOMContentLoaded',function(){
const form=document.getElementById('wl-review-form');if(form&&r!=='candidato'){
  form.querySelectorAll('input,textarea,select,button').forEach(x=>x.disabled=true);
  const p=document.createElement('p');p.className='ld-status';p.textContent=r?'Solo las cuentas de candidato pueden valorar empresas.':'Inicia sesión como candidato para publicar una valoración.';
  const a=document.createElement('a');a.href=base;a.textContent=' Iniciar sesión';p.append(a);form.prepend(p);
}
const forum=document.querySelector('/doc/cursos-foros/foro-tema.html'===path?'form.demo-form':'.none');
if(forum&&r!=='candidato'){
  forum.querySelectorAll('input,textarea,button').forEach(x=>x.disabled=true);
  const p=document.createElement('p');p.textContent=r?'Solo los candidatos pueden responder en el foro.':'Para responder primero debes iniciar sesión como candidato.';
  const a=document.createElement('a');a.href=base;a.textContent=' Iniciar sesión';p.append(a);forum.prepend(p);
} else if(forum){forum.addEventListener('submit',function(e){e.preventDefault();const val=forum.querySelector('input')?.value.trim();if(!val)return;const p=document.createElement('p');p.className='note';p.textContent='Tu respuesta de demostración: '+val;forum.before(p);forum.reset();});}
const apply=document.getElementById('ld-apply-link');if(apply&&r!=='candidato'){apply.href=base+'?next='+encodeURIComponent('/doc/candidato/postular.html'+location.search);apply.textContent='Inicia sesión para postularte';}
});
})();
