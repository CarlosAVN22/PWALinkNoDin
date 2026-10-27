document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('[data-company-carousel]').forEach(function(slider){
    var box=slider.parentElement;
    var next=box.querySelector('[data-company-next]');
    var prev=box.querySelector('[data-company-prev]');
    if(next)next.addEventListener('click',function(){slider.scrollBy({left:270,behavior:'smooth'});});
    if(prev)prev.addEventListener('click',function(){slider.scrollBy({left:-270,behavior:'smooth'});});
  });
  var name=document.getElementById('wl-company-name');
  if(!name)return;
  var companies={
    'banco-agricola':{name:'Banco Agrícola',image:'agricola.png',description:'Banca y servicios financieros para personas y empresas.',city:'Santa Ana',job:'Desarrollador Web',id:'demo-web'},
    'super-selectos':{name:'Súper Selectos',image:'Selectos.png',description:'Cadena de supermercados con presencia en El Salvador.',city:'San Salvador',job:'Diseñador UI/UX',id:'demo-ui'},
    'adoc':{name:'ADOC',image:'Adoc.png',description:'Empresa de calzado, moda y accesorios.',city:'San Miguel',job:'Analista de datos',id:'demo-data'}
  };
  var slug=new URLSearchParams(window.location.search).get('empresa')||'banco-agricola';
  if(!companies[slug])slug='banco-agricola';
  var company=companies[slug];
  name.textContent=company.name;
  document.title=company.name+' | LinkNoDin';
  document.getElementById('wl-company-logo').src='/img/'+company.image;
  document.getElementById('wl-company-logo').alt='Logo de '+company.name;
  document.getElementById('wl-company-about').textContent=company.description;
  document.getElementById('wl-company-location').textContent=company.city+', El Salvador';
  document.getElementById('wl-company-jobs').innerHTML='<div class="wl-job-entry"><strong>'+company.job+'</strong><p>'+company.city+' · Oferta demostrativa</p><a class="btn btn-primary" href="/doc/empleo/detalle-empleo.html?id='+company.id+'">Ver empleo</a></div>';
  var key='worklink-reviews-'+slug;
  var samples={
    'banco-agricola':[{name:'Persona candidata',stars:4,text:'La información de las ofertas es clara.'}],
    'super-selectos':[{name:'Visitante',stars:5,text:'Me resultó fácil encontrar el perfil de la empresa.'}],
    'adoc':[{name:'Persona candidata',stars:4,text:'El perfil presenta los empleos de forma sencilla.'}]
  };
  function read(){try{return JSON.parse(localStorage.getItem(key))||[]}catch(e){return[]}}
  function show(){
    var list=samples[slug].concat(read());
    var average=list.reduce(function(sum,x){return sum+x.stars},0)/list.length;
    document.getElementById('wl-rating-summary').textContent='★ '+average.toFixed(1)+' / 5 · '+list.length+' valoración(es)';
    var area=document.getElementById('wl-reviews');area.innerHTML='';
    list.forEach(function(review,index){
      var article=document.createElement('article');article.className='wl-review';
      var heading=document.createElement('strong');heading.textContent=review.name+' · '+'★'.repeat(review.stars)+'☆'.repeat(5-review.stars);
      var message=document.createElement('p');message.textContent=review.text;
      var kind=document.createElement('small');kind.textContent=index===0?'Opinión ilustrativa':'Opinión guardada en este navegador';
      article.append(heading,message,kind);area.append(article);
    });
  }
  document.getElementById('wl-review-form').addEventListener('submit',function(e){
    e.preventDefault();
    var author=document.getElementById('wl-review-name').value.trim();
    var stars=Number(document.getElementById('wl-review-stars').value);
    var content=document.getElementById('wl-review-text').value.trim();
    if(!author||content.length<5)return;
    var all=read();all.push({name:author,stars:stars,text:content});
    localStorage.setItem(key,JSON.stringify(all));
    e.target.reset();show();
    document.getElementById('wl-review-message').textContent='Tu valoración de prueba se agregó a esta empresa en este navegador.';
  });
  show();
});
