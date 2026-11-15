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
 window.addEventListener('ln:edit-vacancy-loaded',event=>{items=(event.detail?.questions||[]).map(value=>({value}));draw();});
 const map=$('job-location-map'),lat=form.elements.namedItem('latitud'),lng=form.elements.namedItem('longitud'),note=$('job-location-status');
 if(map&&window.L){
  const L=window.L,svBounds=L.latLngBounds([[13.14,-90.20],[14.46,-87.63]]),instance=L.map(map,{maxBounds:svBounds,maxBoundsViscosity:1}).setView([13.7,-89.2],8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(instance);
  const department=$('job-department'),city=$('job-city'),address=$('job-address'),reference=$('job-reference'),searchButton=$('job-address-search');
  let marker=null,lastRequest=0,sequence=0,requestQueue=Promise.resolve();const cache=new Map();
  const inElSalvador=pos=>svBounds.contains(pos);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^departamento de |^departamento | department$/g,'').trim();
  function fillFields(result){
   const a=result.address||{};
   const dep=a.state||a.region||a.state_district||a.county||'';
   if(dep){const wanted=normalize(dep),option=[...department.options].find(o=>normalize(o.textContent)===wanted||normalize(o.value)===wanted);if(option)department.value=option.value;}
   const town=a.municipality||a.city_district||a.town||a.village||a.city||a.suburb||'';if(town)city.value=town;
   const road=[a.road||a.pedestrian||a.footway||a.path,a.house_number].filter(Boolean).join(' ');
   const zone=a.neighbourhood||a.quarter||a.suburb||a.residential||a.hamlet||'';
   if(road||zone)address.value=[road,zone].filter(Boolean).join(', ');
   const landmark=a.amenity||a.shop||a.tourism||a.building;if(landmark&&landmark!=='yes')reference.value=landmark;
  }
  async function geocode(url,key,requestId){
   if(cache.has(key)){const result=cache.get(key);if(requestId===sequence){if(Array.isArray(result)){if(result[0])applyResult(result[0]);}else applyResult(result);}return result;}
   const request=requestQueue.then(async()=>{
    if(requestId!==sequence)return null;
    const delay=Math.max(0,1100-(Date.now()-lastRequest));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    lastRequest=Date.now();const response=await fetch(url,{headers:{'Accept':'application/json'}});if(!response.ok)throw new Error('No fue posible consultar OpenStreetMap.');return response.json();
   });requestQueue=request.catch(()=>{});const data=await request;if(data===null)return null;
   cache.set(key,data);if(cache.size>40)cache.delete(cache.keys().next().value);
   if(requestId===sequence){if(Array.isArray(data)){if(data[0])applyResult(data[0]);}else applyResult(data);}return data;
  }
  function applyResult(result){
   const pos=L.latLng(Number(result.lat),Number(result.lon));if(!inElSalvador(pos)||result.address?.country_code!=='sv'){note.textContent='La ubicación debe estar dentro de El Salvador. Prueba con otra dirección o punto.';return false;}
   lat.value=pos.lat.toFixed(6);lng.value=pos.lng.toFixed(6);if(!marker){marker=L.marker(pos,{draggable:true}).addTo(instance);marker.on('dragend',()=>setPoint(marker.getLatLng()));}else marker.setLatLng(pos);
   fillFields(result);instance.setView(pos,15);note.textContent='Ubicación encontrada en El Salvador. Puedes ajustar el marcador; los campos se actualizarán.';return true;
  }
  function setPoint(pos){if(!inElSalvador(pos)){note.textContent='Selecciona un punto dentro de El Salvador.';return;}
   lat.value=pos.lat.toFixed(6);lng.value=pos.lng.toFixed(6);if(!marker){marker=L.marker(pos,{draggable:true}).addTo(instance);marker.on('dragend',()=>setPoint(marker.getLatLng()));}else marker.setLatLng(pos);
   note.textContent='Buscando departamento, municipio y dirección…';const id=++sequence,key='reverse:'+lat.value+','+lng.value;
   const url='https://nominatim.openstreetmap.org/reverse?'+new URLSearchParams({format:'jsonv2',addressdetails:'1',zoom:'18',lat:lat.value,lon:lng.value,'accept-language':'es'});
   geocode(url,key,id).catch(()=>{if(id===sequence)note.textContent='Punto guardado. No se pudieron completar los campos automáticamente.';});
  }
  async function searchAddress(){const query=[address.value,city.value,department.value,'El Salvador'].filter(Boolean).join(', ');if(!address.value.trim()){address.focus();note.textContent='Escribe una dirección o zona para buscarla en El Salvador.';return;}
   const id=++sequence;note.textContent='Buscando dirección en El Salvador…';const params=new URLSearchParams({q:query,countrycodes:'sv',format:'jsonv2',addressdetails:'1',limit:'1','accept-language':'es'});
   try{const results=await geocode('https://nominatim.openstreetmap.org/search?'+params,'search:'+query.toLowerCase(),id);if(id===sequence&&!Array.isArray(results))return;if(id===sequence&&results.length===0)note.textContent='No encontramos esa dirección en El Salvador. Prueba con más detalles.';}
   catch{if(id===sequence)note.textContent='No se pudo buscar la dirección. Revisa tu conexión e inténtalo de nuevo.';}
  }
  searchButton?.addEventListener('click',searchAddress);address?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchAddress();}});
  instance.on('click',event=>setPoint(event.latlng));
  window.addEventListener('ln:edit-vacancy-loaded',event=>{const job=event.detail;if(job?.latitude!=null&&job?.longitude!=null){const point=L.latLng(Number(job.latitude),Number(job.longitude));if(inElSalvador(point)){lat.value=point.lat.toFixed(6);lng.value=point.lng.toFixed(6);marker=L.marker(point,{draggable:true}).addTo(instance);marker.on('dragend',()=>setPoint(marker.getLatLng()));instance.setView(point,15);}}});
 }else if(note){note.textContent='Mapa no disponible. Puedes publicar sin coordenadas, o intentar nuevamente con internet.';}
 form.addEventListener('reset',()=>{items=[];setTimeout(()=>{draw();if(note)note.textContent='Selecciona un punto del mapa para marcar la ubicación.';},0);});
 draw();
}
