/* Ayudas de publicación: preguntas, mapa y vista previa (sin escritura local). */
const $=id=>document.getElementById(id);
const form=$('ld-publish');
if(form){
 const questions=$('job-questions-list'),hidden=form.elements.namedItem('preguntas'),add=$('job-question-add');
 let items=[];
 function sync(){hidden.value=JSON.stringify(items.map(item=>item.value.trim()).filter(Boolean));}
 function draw(){questions.replaceChildren();items.forEach((item,i)=>{
  const wrap=document.createElement('div');wrap.className='field';
  const label=document.createElement('label');label.textContent='Pregunta '+(i+1);const input=document.createElement('input');input.type='text';input.maxLength=500;input.minLength=3;input.required=true;input.value=item.value;label.append(input);
  input.addEventListener('input',()=>{item.value=input.value;sync();});
  const remove=document.createElement('button');remove.type='button';remove.className='btn btn-sm';remove.textContent='Quitar';remove.onclick=()=>{items.splice(i,1);draw();};wrap.append(label,remove);questions.append(wrap);
 });add.disabled=items.length>=5;sync();}
 add?.addEventListener('click',()=>{if(items.length<5){items.push({value:''});draw();questions.querySelector('input:last-of-type')?.focus();}});
 const modal=$('em-preview-modal'),open=$('em-preview-open'),close=$('em-preview-close'),confirm=$('em-preview-confirm'),summary=$('em-preview-data');
 function dismiss(){if(modal)modal.hidden=true;}
 close?.addEventListener('click',dismiss);
 modal?.addEventListener('click',e=>{if(e.target===modal)dismiss();});
 open?.addEventListener('click',()=>{if(!form.reportValidity())return;sync();summary.replaceChildren();
  const names={titulo:'Puesto',ciudad:'Ciudad',modalidad:'Modalidad',contrato:'Contrato',plazas:'Plazas',descripcion:'Resumen',requisitos:'Requisitos',salarioMin:'Salario mínimo',salarioMax:'Salario máximo',fechaLimite:'Fecha límite'};
  for(const [key,label] of Object.entries(names)){const field=form.elements.namedItem(key);const value=field?.value?.trim();if(value){const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));summary.append(p);}}
  if(items.length){const p=document.createElement('p');p.textContent=items.length+' preguntas de postulación';summary.append(p);}
  modal.hidden=false;
 });
 // El botón de confirmación invoca exactamente el mismo submit real.
 confirm?.addEventListener('click',()=>{dismiss();form.requestSubmit();});
 const map=$('job-location-map'),lat=form.elements.namedItem('latitud'),lng=form.elements.namedItem('longitud'),note=$('job-location-status');
 if(map&&window.L){
  const L=window.L,instance=L.map(map).setView([13.7,-89.2],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(instance);
  let marker=null;
  function setPoint(pos){lat.value=pos.lat.toFixed(6);lng.value=pos.lng.toFixed(6);if(!marker){marker=L.marker(pos,{draggable:true}).addTo(instance);marker.on('dragend',()=>setPoint(marker.getLatLng()));}else marker.setLatLng(pos);
   note.textContent='Ubicación seleccionada: '+lat.value+', '+lng.value;
  }
  instance.on('click',event=>setPoint(event.latlng));
 }else if(note){note.textContent='Mapa no disponible. Puedes publicar sin coordenadas, o intentar nuevamente con internet.';}
 form.addEventListener('reset',()=>{items=[];setTimeout(()=>{draw();if(note)note.textContent='Selecciona un punto del mapa para marcar la ubicación.';},0);});
 draw();
}
