(() => {
  'use strict';
  const prefix = 'linknodin-v3-';
  const byId = id => document.getElementById(id);
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; }
    catch { return fallback; }
  };
  const session = read('session', null);
  const account = read('accounts', []).find(item => item.email === session?.email && item.role === 'candidato');
  const form = byId('perfil-form');
  if (!form || !account) return;
  const key = 'perfil-candidato:' + account.email.toLowerCase();
  const fields = ['nombre','telefono','ubicacion','profesion','estudios','habilidades','resumen'];
  const input = name => byId('perfil-' + name);
  const saved = read(key, {});
  const cvName = byId('perfil-cv-nombre');
  const cvInfo = byId('perfil-cv-info');
  const file = input('cv');
  let curriculum = saved.curriculum || '';
  const showCurriculum = () => {
    cvInfo.hidden = !curriculum;
    cvName.textContent = curriculum || '';
  };
  fields.forEach(name => { input(name).value = saved[name] ?? (name === 'nombre' ? account.name || '' : ''); });
  input('correo').value = account.email;
  input('experiencia').value = Number.isFinite(+saved.experiencia) ? Math.max(0, Math.min(15, Number(saved.experiencia))) : 0;
  const experienceLabel = () => {
    const years = Number(input('experiencia').value);
    byId('perfil-experiencia-texto').textContent = years === 15 ? '15+ años' : years === 1 ? '1 año' : years + ' años';
    byId('perfil-nivel').textContent = years === 0 ? 'Sin experiencia' : years <= 2 ? 'Experiencia inicial' : years <= 5 ? 'Experiencia intermedia' : 'Experiencia avanzada';
  };
  const progress = () => {
    const count = fields.filter(name => input(name).value.trim()).length + (curriculum ? 1 : 0) + (Number(input('experiencia').value) > 0 ? 1 : 0);
    const percent = Math.round(count / (fields.length + 2) * 100);
    byId('perfil-porcentaje').textContent = percent + '%';
    byId('perfil-barra-valor').style.width = percent + '%';
  };
  const message = (text, error = false) => {
    const el = byId('perfil-mensaje');
    el.textContent = text;
    el.dataset.error = String(error);
  };
  showCurriculum(); experienceLabel(); progress();
  form.addEventListener('input', () => { experienceLabel(); progress(); message(''); });
  file.addEventListener('change', () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    if (!/\.(pdf|doc|docx)$/i.test(chosen.name)) {
      file.value = '';
      message('Selecciona un archivo PDF, DOC o DOCX.', true);
      return;
    }
    curriculum = chosen.name;
    showCurriculum(); progress();
    message('Archivo seleccionado. Guarda el perfil para conservar su nombre.');
  });
  byId('perfil-cv-quitar').addEventListener('click', () => {
    curriculum = '';
    file.value = '';
    showCurriculum(); progress();
    message('Currículum retirado. Guarda el perfil para confirmar.');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = {};
    fields.forEach(name => { data[name] = input(name).value.trim(); });
    data.experiencia = Number(input('experiencia').value);
    data.curriculum = curriculum;
    try {
      localStorage.setItem(prefix + key, JSON.stringify(data));
      const accounts = read('accounts', []);
      const updated = accounts.map(item => item.email === account.email && item.role === 'candidato' ? {...item, name: data.nombre} : item);
      localStorage.setItem(prefix + 'accounts', JSON.stringify(updated));
      message('Los cambios de tu perfil se guardaron correctamente.');
    } catch {
      message('No se pudieron guardar los cambios en este navegador.', true);
    }
  });
})();
