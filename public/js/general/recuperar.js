/* Restablecimiento real mediante correo de Supabase Auth. */
import {supabase} from '/js/supabase-config.js';
const form=document.getElementById('ld-recuperar-form');
const email=document.getElementById('ld-recuperar-correo');
const info=document.getElementById('ld-recuperar-estado');
function notify(message,error=false){if(!info)return;info.hidden=false;info.textContent=message;info.dataset.error=String(error);}
form?.addEventListener('submit',async event=>{
 event.preventDefault();if(!email.checkValidity())return notify('Introduce un correo válido.',true);
 const button=form.querySelector('[type=submit]');button.disabled=true;
 try{
  const {error}=await supabase.auth.resetPasswordForEmail(email.value.trim().toLowerCase(),{
   redirectTo:location.origin+'/doc/general/restablecer.html'
  });
  if(error)throw error;
  notify('Si existe una cuenta asociada, recibirás un enlace para recuperar tu contraseña. Revisa también spam.');form.reset();
 }catch(error){notify('No se pudo procesar la solicitud: '+error.message,true);}
 finally{button.disabled=false;}
});
