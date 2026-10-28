(() => {
  'use strict';

  const form = document.getElementById('ld-publish');
  if (!form) return;

  const modal = document.getElementById('em-preview-modal');
  const preview = document.getElementById('em-preview-data');
  const field = name => form.elements.namedItem(name);
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem('linknodin-v3-' + key)) ?? fallback; }
    catch { return fallback; }
  };
  const cities = {
    'san salvador': [13.6929, -89.2182], 'santa ana': [13.9942, -89.5597],
    'san miguel': [13.4833, -88.1833], sonsonate: [13.7189, -89.7248],
    ahuachapan: [13.9214, -89.845], chalchuapa: [13.9867, -89.6811],
    'la libertad': [13.4883, -89.3222], 'santa tecla': [13.6769, -89.2797],
    'antiguo cuscatlan': [13.6644, -89.2502], usulutan: [13.35, -88.45],
    'la union': [13.3369, -87.8439], zacatecoluca: [13.5, -88.8667],
    'san vicente': [13.6411, -88.7858], cojutepeque: [13.7167, -88.9333],
    sensuntepeque: [13.8667, -88.6333], chalatenango: [14.0333, -88.9333],
    metapan: [14.3333, -89.45], apopa: [13.8074, -89.1792]
  };

  function clean(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function cityPoint() {
    const city = clean(field('ciudad').value);
    const name = Object.keys(cities).find(key => city === key || city.startsWith(key + ',') || city.startsWith(key + ' '));
    return name ? cities[name] : null;
  }
  function record() {
    const value = name => field(name).value.trim();
    return {
      title: value('titulo'), questions: (() => { try { return JSON.parse(field('preguntas').value || '[]'); } catch { return []; } })(), area: value('area'), responsibilities: value('responsabilidades'), license: value('licencia'), vehicle: value('vehiculo'), competencies: value('competencias'), openings: Number(value('plazas')) || 1,
      city: value('ciudad'), department: value('departamento'), address: value('direccion'), reference: value('referencia'),
      contract: value('contrato'), workTime: value('tiempoTrabajo'), modality: value('modalidad'), salaryMin: value('salarioMin'), salaryMax: value('salarioMax'),
      salaryPeriod: value('frecuenciaPago'), salaryHidden: field('salarioConfidencial').checked,
      experience: value('experiencia'), education: value('escolaridad'), schedule: value('jornada'), hours: value('horario'),
      contact: value('contacto'), applicationMethod: value('metodoPostulacion'), instructions: value('instrucciones'),
      description: value('descripcion'), requirements: value('requisitos'), benefits: value('beneficios'),
      deadline: value('fechaLimite'), latitude: value('latitud'), longitude: value('longitud'),
      approximateLocation: field('ubicacionAproximada').checked
    };
  }

  function initQuestions() {
    const list = document.getElementById('job-questions-list');
    const add = document.getElementById('job-question-add');
    const data = field('preguntas');
    if (!list || !add || !data) return;
    let questions = [];
    try { questions = JSON.parse(data.value || '[]'); } catch { questions = []; }
    const sync = () => {
      data.value = JSON.stringify(questions);
      list.replaceChildren();
      questions.forEach((question, index) => {
        const row = document.createElement('div');
        row.className = 'field job-question-row';
        const label = document.createElement('label');
        label.textContent = `Pregunta ${index + 1}`; label.htmlFor = `job-question-${index}`;
        const input = document.createElement('input');
        input.type = 'text'; input.id = `job-question-${index}`; input.maxLength = 240; input.required = true;
        input.value = question; input.placeholder = 'Ej. Disponibilidad para trabajar en turnos';
        input.addEventListener('input', () => { questions[index] = input.value.trim(); data.value = JSON.stringify(questions); });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'btn btn-soft btn-sm'; remove.textContent = 'Quitar pregunta';
        remove.addEventListener('click', () => { questions.splice(index, 1); sync(); });
        row.append(label, input, remove); list.append(row);
      });
      add.disabled = questions.length >= 5;
    };
    add.addEventListener('click', () => { if (questions.length < 5) { questions.push(''); sync(); list.lastElementChild?.querySelector('input')?.focus(); } });
    form.addEventListener('reset', () => window.setTimeout(() => { questions = []; sync(); }, 0));
    sync();
  }

  function updateContactRequirement() {
    const emailRequired = field('metodoPostulacion').value !== 'portal';
    field('contacto').required = emailRequired;
    field('contacto').placeholder = emailRequired ? 'reclutamiento@empresa.com' : 'No hace falta si recibes postulaciones en LinkNoDin';
  }

  function initMap() {
    const mapNode = document.getElementById('job-location-map');
    const status = document.getElementById('job-location-status');
    if (!window.L) {
      const updateApproximatePoint = () => {
        const point = cityPoint();
        field('latitud').value = point ? point[0] : '';
        field('longitud').value = point ? point[1] : '';
      };
      field('ciudad').addEventListener('change', updateApproximatePoint);
      updateApproximatePoint();
    }
    if (!mapNode || !window.L) {
      if (status) status.textContent = 'El mapa no está disponible ahora. Completa municipio, departamento y dirección; el prototipo ubicará la oferta de forma aproximada por municipio.';
      return;
    }
    const map = L.map(mapNode).setView([13.73, -89.05], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let marker = null;
    let lookupTimer = null, lookupController = null, lastLookupAt = 0;
    const addressCache = new Map();
    const departmentField = field('departamento');
    const municipalityField = field('ciudad');
    const addressField = field('direccion');
    const setFromAddress = data => {
      const address = data?.address || {};
      departmentField.value = ''; municipalityField.value = ''; addressField.value = '';
      const cleanValue = value => clean(String(value || '').replace(/^departamento de /i, ''));
      const department = address.state || address.region || address.state_district;
      if (department) {
        const option = [...departmentField.options].find(item => cleanValue(item.value || item.textContent) === cleanValue(department));
        if (option) departmentField.value = option.value;
      }
      const municipality = address.municipality || address.city || address.town || address.village || address.city_district || address.county;
      if (municipality) municipalityField.value = municipality;
      const parts = [address.house_number, address.road || address.pedestrian || address.footway, address.neighbourhood || address.suburb || address.residential].filter(Boolean);
      addressField.value = [...new Set(parts)].join(', ');
    };
    const lookupAddress = point => {
      clearTimeout(lookupTimer);
      if (lookupController) lookupController.abort();
      const controller = new AbortController();
      lookupController = controller;
      const lat = Number(point.lat ?? point[0]), lon = Number(point.lng ?? point[1]);
      const cacheKey = lat.toFixed(5) + ',' + lon.toFixed(5);
      if (addressCache.has(cacheKey)) { setFromAddress(addressCache.get(cacheKey)); status.textContent = 'Ubicacion completada con OpenStreetMap. Revisa y corrige los campos si hace falta.'; return; }
      lookupTimer = window.setTimeout(async () => {
        const wait = Math.max(0, 1100 - (Date.now() - lastLookupAt));
        if (wait) await new Promise(resolve => window.setTimeout(resolve, wait));
        if (controller.signal.aborted) return;
        lastLookupAt = Date.now();
        status.textContent = 'Buscando departamento, municipio y direccion en OpenStreetMap...';
        const query = new URLSearchParams({format:'jsonv2',addressdetails:'1',zoom:'18',lat:String(lat),lon:String(lon)});
        try {
          const response = await fetch('https://nominatim.openstreetmap.org/reverse?' + query, {signal:controller.signal, headers:{'Accept-Language':'es'}});
          if (!response.ok) throw new Error('geocoding unavailable');
          const data = await response.json();
          if (controller.signal.aborted) return;
          if (!data?.address) throw new Error('address unavailable');
          addressCache.set(cacheKey, data);
          setFromAddress(data);
          status.textContent = 'Ubicacion completada con OpenStreetMap. Revisa y corrige los campos si hace falta.';
        } catch (error) {
          if (error.name === 'AbortError' || controller.signal.aborted) return;
          status.textContent = 'No pudimos identificar la direccion. Completa o corrige departamento, municipio y direccion manualmente.';
        }
      }, 600);
    };
    const setPoint = (point, exact) => {
      const latlng = Array.isArray(point) ? point : [point.lat, point.lng];
      if (marker) marker.setLatLng(latlng);
      else marker = L.marker(latlng, { draggable: true }).addTo(map);
      const save = () => {
        const pos = marker.getLatLng();
        field('latitud').value = pos.lat.toFixed(6);
        field('longitud').value = pos.lng.toFixed(6);
        status.textContent = exact ? 'Punto seleccionado en el mapa. Arrastra el marcador para ajustarlo.' : 'Centro aproximado del municipio. Haz clic en el mapa para señalar el lugar exacto.';
      };
      marker.off('dragend');
      marker.on('dragend', () => { save(); status.textContent = 'Punto ajustado. Buscando la direccion...'; lookupAddress(marker.getLatLng()); });
      save();
    };

    map.on('click', event => { setPoint(event.latlng, true); lookupAddress(event.latlng); });
    field('ciudad').addEventListener('change', () => {
      const point = cityPoint();
      if (!point) {
        if (marker) { map.removeLayer(marker); marker = null; }
        field('latitud').value = '';
        field('longitud').value = '';
        map.setView([13.73, -89.05], 8);
        status.textContent = 'No encontramos el centro de ese municipio. Mueve y amplía el mapa para seleccionar el lugar de trabajo.';
        return;
      }
      map.setView(point, 13);
      setPoint(point, false);
      lookupAddress(point);
    });

    const savedLat = Number(field('latitud').value), savedLng = Number(field('longitud').value);
    const initial = Number.isFinite(savedLat) && Number.isFinite(savedLng) && savedLat && savedLng ? [savedLat, savedLng] : cityPoint();
    if (initial) { map.setView(initial, 14); setPoint(initial, Boolean(field('latitud').value)); }
    window.setTimeout(() => map.invalidateSize(), 150);
  }

  function showPreview() {
    if (!form.reportValidity()) return;
    const job = record();
    if (window.L && job.modality !== 'Remoto' && (!job.latitude || !job.longitude)) {
      document.getElementById('job-location-status').textContent = 'Selecciona el punto del lugar de trabajo en el mapa para continuar.';
      return;
    }
    if (job.questions.some(question => !String(question).trim())) {
      document.getElementById('ld-status').textContent = 'Completa o elimina las preguntas vacias.';
      return;
    }
    if (!job.description || !job.requirements) {
      document.getElementById('ld-status').textContent = 'Completa las funciones y los requisitos antes de continuar.';
      return;
    }
    if (job.salaryMin && job.salaryMax && Number(job.salaryMin) > Number(job.salaryMax)) {
      field('salarioMax').setCustomValidity('El salario máximo debe ser igual o mayor al mínimo.');
      field('salarioMax').reportValidity();
      field('salarioMax').setCustomValidity('');
      return;
    }
    preview.replaceChildren();
    const salary = job.salaryHidden ? 'No se mostrará' : job.salaryMin || job.salaryMax
      ? `$${job.salaryMin || '—'} – $${job.salaryMax || '—'} USD · ${job.salaryPeriod}`
      : 'No especificado';
    const location = [job.address, job.city, job.department].filter(Boolean).join(', ');
    [
      ['Preguntas obligatorias', job.questions.length ? job.questions.join(' | ') : 'No se solicitaran preguntas adicionales'],
      ['Puesto', job.title], ['Area o rubro', job.area || 'No especificada'], ['Plazas', job.openings], ['Lugar de trabajo', location],
      ['Ubicación en el mapa', job.latitude ? (job.approximateLocation ? 'Aproximada' : 'Punto exacto') : 'Sin punto seleccionado'],
      ['Modalidad', job.modality], ['Contrato', job.contract], ['Tiempo de trabajo', job.workTime], ['Jornada', `${job.schedule}${job.hours ? ' · ' + job.hours : ''}`],
      ['Salario', salary], ['Experiencia', job.experience], ['Escolaridad', job.education],
      ['Licencia de conducir', job.license], ['Vehiculo propio', job.vehicle], ['Competencias deseables', job.competencies || 'No especificadas'],
      ['Fecha de publicacion', new Date().toLocaleDateString('es-SV')],
      ['Fecha limite para postularse', job.deadline || 'No indicada'], ['Objetivo del puesto', job.description],
      ['Responsabilidades principales', job.responsibilities],
      ['Requisitos', job.requirements], ['Beneficios', job.benefits || 'No especificados'],
      ['Postulación', job.applicationMethod === 'email' ? 'Por correo' : job.applicationMethod === 'both' ? 'Portal y correo' : 'Desde LinkNoDin']
    ].forEach(([label, value]) => {
      const p = document.createElement('p'), strong = document.createElement('strong');
      strong.textContent = label + ': ';
      p.append(strong, document.createTextNode(String(value)));
      preview.append(p);
    });
    modal.hidden = false;
    document.getElementById('em-preview-close').focus();
  }

  function refreshPublished() {
    const session = read('session', null), jobs = read('jobs', []);
    const own = jobs.filter(job => job.owner === session?.email).slice(-4).reverse();
    const target = document.getElementById('em-publicadas-lista');
    target.replaceChildren();
    if (!own.length) {
      const message = document.createElement('p');
      message.textContent = 'Todavía no has publicado vacantes en este navegador.';
      target.append(message);
      return;
    }
    own.forEach(job => {
      const article = document.createElement('article'), link = document.createElement('a');
      link.href = '/doc/empleo/detalle-empleo.html?id=' + encodeURIComponent(job.id);
      link.textContent = `${job.title} — ${job.city} · ${job.status || 'Activa'}`;
      article.append(link);
      target.append(article);
    });
  }

  document.getElementById('em-preview-open').addEventListener('click', showPreview);
  field('metodoPostulacion').addEventListener('change', updateContactRequirement);
  document.getElementById('em-preview-close').addEventListener('click', () => { modal.hidden = true; });
  document.getElementById('em-preview-confirm').addEventListener('click', () => { modal.hidden = true; form.requestSubmit(); });
  modal.addEventListener('click', event => { if (event.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) modal.hidden = true; });
  form.addEventListener('submit', () => window.setTimeout(refreshPublished, 0));
  window.addEventListener('ld:activity-updated', refreshPublished);
  document.addEventListener('DOMContentLoaded', () => {
    updateContactRequirement();
    const deadline = field('fechaLimite');
    const today = new Date();
    deadline.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    initMap();
    initQuestions();
    refreshPublished();
  });
})();
