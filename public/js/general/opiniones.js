// Opiniones: lectura de datos locales existentes, sin modificar el modulo empresarial.
(function () {
  'use strict';
  const prefix = 'linknodin-v3-';
  const companies = [
    { id: 'banco-agricola', name: 'Banco Agrícola', example: {name:'Persona candidata',stars:4,text:'La información de las ofertas es clara.'} },
    { id: 'super-selectos', name: 'Súper Selectos', example: {name:'Visitante',stars:5,text:'Me resultó fácil encontrar el perfil de la empresa.'} },
    { id: 'adoc', name: 'ADOC', example: {name:'Persona candidata',stars:4,text:'El perfil presenta los empleos de forma sencilla.'} }
  ];
  const $ = id => document.getElementById(id);
  function read(key) {
    try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function account() {
    try {
      const session = JSON.parse(localStorage.getItem(prefix+'session'));
      if (!session || session.role !== 'candidato') return null;
      const found = read(prefix+'accounts').find(x => x.email === session.email && x.role === 'candidato');
      return found ? { email: found.email, name: found.name || 'Candidato' } : null;
    } catch (_) { return null; }
  }
  function entry(type, subject, item, sample, key, index) {
    return {type,subject,name:String(item.name||'Usuario'),text:String(item.text||''),stars:Number(item.stars)||0,
      sample,key,index,owner:item.owner||'',date:item.date||'',company:item.company||''};
  }
  function allReviews() {
    const opinionSamples = [
      {text:'Me gustó lo sencillo que es comparar oportunidades desde una sola página.',name:'Persona candidata'},
      {text:'Pude conocer las vacantes antes de decidir crear una cuenta.',name:'Visitante'},
      {text:'La información de las empresas está organizada y resulta fácil de consultar.',name:'Persona candidata'},
      {text:'La búsqueda en el mapa me ayuda a ubicar oportunidades cercanas.',name:'Visitante'}
    ];
    let data = opinionSamples.map((x,i)=>entry('plataforma','LinkNoDin',x,true,'',i));
    data = data.concat(read(prefix+'opinions').map((x,i)=>entry('plataforma','LinkNoDin',x,false,prefix+'opinions',i)));
    companies.forEach(c => {
      data.push(entry('empresa',c.name,c.example,true,'',0));
      read('worklink-reviews-'+c.id).forEach((x,i)=>data.push(entry('empresa',c.name,x,false,'worklink-reviews-'+c.id,i)));
    });
    return data;
  }
  function render() {
    const user=account(),kind=$('co-tipo').value,company=$('co-empresa').value,min=Number($('co-estrellas').value);
    const data=allReviews().filter(x=>{
      if(kind==='mias' && (!user || x.owner!==user.email))return false;
      if(kind!=='todas' && kind!=='mias' && x.type!==kind)return false;
      if(company!=='todas' && x.company!==company && !(x.key==='worklink-reviews-'+company))return false;
      if(min && x.stars<min)return false;
      return true;
    });
    $('co-count').textContent=data.length+' opinión(es) encontradas. Contenido de demostración almacenado en este navegador.';
    const root=$('co-results');root.replaceChildren();
    if(!data.length){const box=document.createElement('p');box.className='co-empty';box.textContent=kind==='mias'&&!user?'Inicia sesión como candidato para consultar tus opiniones.':'No hay opiniones para estos filtros.';root.append(box);return;}
    data.forEach(x=>{
      const card=document.createElement('article');card.className='co-entry';
      const head=document.createElement('div');head.className='co-entry-head';
      const title=document.createElement('h3');title.textContent=x.subject;
      const kindLabel=document.createElement('small');kindLabel.textContent=x.type==='empresa'?'Empresa':'Plataforma';head.append(title,kindLabel);card.append(head);
      if(x.type==='empresa'){const rating=document.createElement('div');rating.className='co-rating';rating.textContent=x.stars+' de 5 estrellas';card.append(rating);}
      const message=document.createElement('p');message.textContent=x.text;card.append(message);
      const author=document.createElement('small');author.textContent='Por '+x.name+(x.sample?' · Ejemplo':' · Guardada localmente');card.append(author);
      if(x.type==='empresa'){
        const link=document.createElement('a');link.href='/doc/empresa/empresa-detalle.html?empresa='+encodeURIComponent(companies.find(c=>c.name===x.subject)?.id||'banco-agricola');link.textContent='Ver perfil de empresa';card.append(link);
      }
      // Las valoraciones antiguas no guardaban el identificador de su autor.
      // Solo permitimos eliminar opiniones nuevas cuya propiedad este confirmada.
      if(user && x.type==='plataforma' && !x.sample && x.owner===user.email){
        const button=document.createElement('button');button.type='button';button.className='btn btn-sm';button.textContent='Eliminar mi opinión';
        button.addEventListener('click',()=>{
          showDeleteModal(()=>{
            const existing=read(x.key);
            if(existing[x.index]?.owner!==user.email)return;
            existing.splice(x.index,1);
            localStorage.setItem(x.key,JSON.stringify(existing));
            render();
            // El carrusel original vuelve a leer los datos cuando se recarga la pagina.
          });
        });card.append(button);
      }
      root.append(card);
    });
  }
  function showDeleteModal(onConfirm) {
    const modal=$('co-delete-modal');
    if(!modal)return;
    const confirm=$('co-delete-confirm');
    const cancel=$('co-delete-cancel');
    const close=()=>{
      if(modal.open)modal.close();
      confirm.removeEventListener('click',accept);
      cancel.removeEventListener('click',close);
    };
    const accept=()=>{close();onConfirm();};
    confirm.addEventListener('click',accept);
    cancel.addEventListener('click',close);
    modal.showModal();
    modal.addEventListener('close',()=>{
      confirm.removeEventListener('click',accept);
      cancel.removeEventListener('click',close);
    },{once:true});
  }
  document.addEventListener('DOMContentLoaded',function(){
    if(!$('co-results'))return;
    ['co-tipo','co-empresa','co-estrellas'].forEach(id=>$(id).addEventListener('change',render));
    const user=account(),form=$('carlos-opinion-form');
    if(form){
      const textarea=$('ld-opinion-text'),button=form.querySelector('button[type=submit]'),note=document.createElement('p');note.className='co-form-note';
      if(!user){textarea.disabled=true;button.disabled=true;note.textContent='Para publicar opiniones inicia sesión con una cuenta de candidato. ';
        const link=document.createElement('a');link.href='/doc/general/login.html?next='+encodeURIComponent(location.pathname);link.textContent='Iniciar sesión';note.append(link);form.prepend(note);
      }else{note.textContent='Publicarás como '+user.name+'.';form.prepend(note);}
      form.addEventListener('submit',e=>{
        e.preventDefault();const current=account();if(!current)return;
        const content=textarea.value.trim();if(content.length<15){$('ld-status').textContent='Escribe al menos 15 caracteres.';return;}
        const existing=read(prefix+'opinions');existing.push({text:content.slice(0,350),name:current.name,kind:'Usuario registrado',initial:current.name.charAt(0).toUpperCase(),owner:current.email,date:new Date().toISOString()});
        localStorage.setItem(prefix+'opinions',JSON.stringify(existing));textarea.value='';$('ld-status').textContent='Tu opinión se guardó en este navegador.';render();
        // Permite que el carrusel existente actualice su lista sin cambiar linknodin.js.
        document.querySelector('[data-op-next]')?.click();
      });
    }
    window.addEventListener('storage',render);
    render();
  });
})();
