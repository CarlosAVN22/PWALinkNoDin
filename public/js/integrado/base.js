import {supabase} from '/js/supabase-config.js';
export {supabase};
export const $ = id => document.getElementById(id);
export const dom = (tag,cls,content) => {
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(content!==undefined)node.textContent=String(content);
  return node;
};
export async function run(request){const {data,error}=await request;if(error)throw error;return data;}
export async function who(){
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return null;
  const info=await run(supabase.from('users').select('id,full_name,email,role_id,status').eq('auth_user_id',user.id).single());
  return info.status==='active'?{...info,uid:user.id}:null;
}
export function status(node,info,bad=false){if(!node)return;node.textContent=info;node.dataset.error=String(bad);node.setAttribute('role','status');}
export function field(tag,placeholder,kind='text'){
  const n=dom(tag);n.placeholder=placeholder;if(tag==='input')n.type=kind;return n;
}
export function lockOriginal(node){if(node)node.hidden=true;}
export function messageError(e){return e?.code==='23505'?'El registro ya existe.':(e?.message||String(e));}
export function money(value){return value==null?'No especificado':new Intl.NumberFormat('es-SV',{style:'currency',currency:'USD'}).format(value);}
export function date(value){return value?new Date(value).toLocaleDateString('es-SV'):'No especificada';}
