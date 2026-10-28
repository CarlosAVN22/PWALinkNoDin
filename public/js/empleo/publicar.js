(() => {
'use strict';
const form=document.getElementById('ld-publish');if(!form)return;
const modal=document.getElementById('em-preview-modal');
const data=document.getElementById('em-preview-data');
const input=()=>[...form.querySelectorAll('input')].map(e=>e.value.trim());
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
function record(){const [title,city,contract,salary,experience,email]=input();return {title,city,contract,salary,experience,email,modality:form.querySelector('[name=modalidad]').value,description:form.querySelectorAll('textarea')[0].value.trim(),requirements:form.querySelectorAll('textarea')[1].value.trim()};}
function show(){
 if(!form.reportValidity())return;
 const j=record(); if(!j.description||!j.requirements){const msg=document.getElementById('ld-status');msg.textContent='Completa la descripción y los requisitos antes de continuar.';return;}
 data.replaceChildren();
 [['Puesto',j.title],['Ubicación',j.city],['Contrato',j.contract],['Modalidad',j.modality],['Salario aproximado',j.salary],['Experiencia requerida',j.experience],['Contacto',j.email],['Descripción',j.description],['Requisitos y beneficios',j.requirements]].forEach(([label,value])=>{const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));data.append(p);});
 modal.hidden=false;document.getElementById('em-preview-close').focus();
}
function close(){modal.hidden=true;}
document.getElementById('em-preview-open').onclick=show;
document.getElementById('em-preview-close').onclick=close;
modal.addEventListener('click',e=>{if(e.target===modal)close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
document.getElementById('em-preview-confirm').onclick=()=>{close();form.requestSubmit();};
function list(){const session=read('linknodin-v3-session',null),jobs=read('linknodin-v3-jobs',[]);const mine=jobs.filter(j=>j.owner===session?.email).slice(-4).reverse();const target=document.getElementById('em-publicadas-lista');target.replaceChildren();if(!mine.length){const p=document.createElement('p');p.textContent='Todavía no has publicado vacantes de demostración.';target.append(p);return;}
 mine.forEach(j=>{const article=document.createElement('article'),a=document.createElement('a');a.href='/doc/empleo/detalle-empleo.html?id='+encodeURIComponent(j.id);a.textContent=j.title+' — '+j.city;article.append(a);target.append(article);});
}
form.addEventListener('submit',()=>{window.setTimeout(list,0);});list();
})();
