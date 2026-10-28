(() => {
'use strict';
const $ = id => document.getElementById(id);
if (!$('em-listado')) return;
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
const session=read('linknodin-v3-session',null);
if (!session || session.role !== 'candidato') return;
const key='linknodin-empleo-guardados-'+session.email.toLowerCase();
const fixed=[
 {id:'demo-ui',title:'Diseñador UI/UX',company:'Súper Selectos',city:'San Salvador',modality:'Remoto',contract:'No especificado'},
 {id:'demo-web',title:'Desarrollador Web',company:'Banco Agrícola',city:'Santa Ana',modality:'Presencial',contract:'Tiempo completo'},
 {id:'demo-data',title:'Analista de datos',company:'ADOC',city:'San Miguel',modality:'Híbrido',contract:'No especificado'},
 {id:'demo-admin',title:'Asistente administrativo',company:'Grupo Central',city:'San Salvador',modality:'Presencial',contract:'No especificado'}
];
let saved=read(key,[]);if(!Array.isArray(saved))saved=[];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function render(){
 const jobs=[...fixed,...read('linknodin-v3-jobs',[]).filter(x=>x?.id&&x?.title)];
 const q=$('em-busqueda').value.trim().toLowerCase();const mode=$('em-filtro').value;
 const visible=jobs.filter(j=>(mode==='todos'||saved.includes(j.id))&&[j.title,j.company,j.city].join(' ').toLowerCase().includes(q));
 const target=$('em-listado');target.replaceChildren();
 visible.forEach(j=>{
  const card=el('article','ld-em-card'),left=el('div'),actions=el('div','ld-em-actions');
  left.append(el('h3','',j.title),el('p','',(j.company||'Empresa')+' · '+(j.city||'Sin ubicación')),el('p','',(j.modality||'Presencial')+' · '+(j.contract||'No especificado')));
  const link=el('a','btn btn-primary','Ver empleo');link.href='/doc/empleo/detalle-empleo.html?id='+encodeURIComponent(j.id);
  const button=el('button','btn',saved.includes(j.id)?'Quitar de guardados':'Guardar empleo');button.type='button';
  button.onclick=()=>{saved=saved.includes(j.id)?saved.filter(x=>x!==j.id):[...saved,j.id];localStorage.setItem(key,JSON.stringify(saved));render();};
  actions.append(link,button);card.append(left,actions);target.append(card);
 });
 $('em-vacio').hidden=visible.length>0;
 $('em-resumen').textContent=saved.length+' '+(saved.length===1?'vacante guardada':'vacantes guardadas')+' en esta cuenta. '+visible.length+' resultados visibles.';
}
$('em-busqueda').addEventListener('input',render);$('em-filtro').addEventListener('change',render);render();
})();
