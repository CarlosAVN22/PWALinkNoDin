import {supabase} from '/js/supabase-config.js';
const form=document.getElementById('ln-reset-form'),out=document.getElementById('ln-reset-status');
let recovery=false;
function msg(value,error=false){out.textContent=value;out.dataset.error=String(error);}
supabase.auth.onAuthStateChange((event)=>{
 if(event==='PASSWORD_RECOVERY'){recovery=true;form.hidden=false;msg('Introduce tu contraseña nueva.');}
});
// Supabase recupera la sesión del token del enlace y emite PASSWORD_RECOVERY.
if(location.hash.includes('type=recovery')||new URLSearchParams(location.search).get('type')==='recovery'){
 msg('Verificando tu enlace de recuperación...');
}
form?.addEventListener('submit',async event=>{
 event.preventDefault();
 const password=form.elements.namedItem('password').value;
 const confirm=form.elements.namedItem('confirm').value;
 if(password.length<8||password!==confirm){msg('Usa al menos 8 caracteres y verifica que ambas contraseñas coincidan.',true);return;}
 if(!recovery){msg('Abre el enlace de recuperación enviado a tu correo. No se puede cambiar la contraseña sin verificarlo.',true);return;}
 const button=form.querySelector('[type=submit]');button.disabled=true;
 try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;
   msg('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');form.hidden=true;
   await supabase.auth.signOut();
 }catch(error){msg(error.message,true);}finally{button.disabled=false;}
});
