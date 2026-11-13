
import { supabase } from '/js/supabase-config.js';

const $ = id => document.getElementById(id);

const form = $('perfil-form');
const boton = form.querySelector('button[type="submit"]');
const habilidades = $('perfil-habilidades');
const archivo = $('perfil-cv');
const aviso = $('perfil-mensaje');

let candidato = null;
let cvActual = null;
let catalogo = [];
let seleccionadas = [];
let habilidadesCargadas = false;
let permitePersonalizadas = false;

function mensaje(texto, error = false) {
  aviso.textContent = texto;
  aviso.dataset.error = String(error);
}

function valor(nombre) {
  return $('perfil-' + nombre).value.trim();
}

function comprobar(resultado) {
  if (resultado.error) throw resultado.error;
  return resultado.data;
}

function progreso() {
  const campos = [
    'nombre', 'telefono', 'ubicacion',
    'profesion', 'estudios', 'resumen'
  ];

  let completos = campos.filter(c => valor(c)).length;

  if (habilidades.value.trim()) completos++;
  if (cvActual) completos++;

  const porcentaje = Math.round(completos / 8 * 100);

  $('perfil-porcentaje').textContent = porcentaje + '%';
  $('perfil-barra-valor').style.width = porcentaje + '%';

  const anios = Number($('perfil-experiencia').value);

  $('perfil-experiencia-texto').textContent =
    anios === 1 ? '1 año' : anios + ' años';

  $('perfil-nivel').textContent =
    anios === 0 ? 'Sin experiencia' :
    anios <= 2 ? 'Experiencia inicial' :
    anios <= 5 ? 'Experiencia intermedia' :
    'Experiencia avanzada';
}

async function asegurarPerfil() {
  const registro = comprobar(await supabase
    .from('candidate_profiles')
    .select('user_id')
    .eq('user_id', candidato.id)
    .maybeSingle());

  if (!registro) {
    comprobar(await supabase
      .from('candidate_profiles')
      .insert({ user_id: candidato.id })
      .select('user_id')
      .single());
  }
}

// HABILIDADES

async function cargarHabilidades(perfil) {
  const lista = comprobar(await supabase
    .from('skills')
    .select('id, name')
    .order('name'));

  const relaciones = comprobar(await supabase
    .from('candidate_skills')
    .select('skill_id')
    .eq('candidate_user_id', candidato.id));

  catalogo = lista;
  seleccionadas = relaciones.map(item => item.skill_id);

  const nombres = catalogo
    .filter(item => seleccionadas.includes(item.id))
    .map(item => item.name);

  permitePersonalizadas =
    Object.prototype.hasOwnProperty.call(perfil, 'custom_skills');

  if (permitePersonalizadas && perfil.custom_skills) {
    nombres.push(...perfil.custom_skills.split(','));
  }

  habilidades.value = [...new Set(
    nombres.map(n => n.trim()).filter(Boolean)
  )].join(', ');

  habilidadesCargadas = true;
}

function prepararHabilidades() {
  if (!habilidadesCargadas) {
    throw new Error(
      'No se cargó el catálogo de habilidades de Supabase.'
    );
  }

  const nombres = [...new Map(
    habilidades.value
      .split(/[,;\n]/)
      .map(n => n.trim())
      .filter(Boolean)
      .map(n => [n.toLowerCase(), n])
  ).values()];

  const ids = [];
  const personalizadas = [];

  for (const nombre of nombres) {
    const encontrada = catalogo.find(
      item => item.name.toLowerCase() === nombre.toLowerCase()
    );

    if (encontrada) {
      ids.push(encontrada.id);
    } else {
      personalizadas.push(nombre);
    }
  }

  if (personalizadas.length && !permitePersonalizadas) {
    throw new Error(
      'Estas habilidades no están en el catálogo: ' +
      personalizadas.join(', ') +
      '. La base actual no permite guardar habilidades libres.'
    );
  }

  return { ids, personalizadas };
}

async function guardarRelaciones(ids) {
  const quitar = seleccionadas.filter(id => !ids.includes(id));
  const agregar = ids.filter(id => !seleccionadas.includes(id));

  for (const id of quitar) {
    comprobar(await supabase
      .from('candidate_skills')
      .delete()
      .eq('candidate_user_id', candidato.id)
      .eq('skill_id', id));
  }

  if (agregar.length) {
    comprobar(await supabase
      .from('candidate_skills')
      .insert(agregar.map(id => ({
        candidate_user_id: candidato.id,
        skill_id: id,
        proficiency: 'general'
      }))));
  }

  seleccionadas = [...ids];
}

// CURRÍCULUM PRIVADO

const cvInfo = $('perfil-cv-info');
const cvNombre = $('perfil-cv-nombre');
const quitarCV = $('perfil-cv-quitar');

const verCV = document.createElement('button');
verCV.type = 'button';
verCV.className = 'btn btn-sm';
verCV.textContent = 'Ver currículum';

cvInfo.insertBefore(verCV, quitarCV);

function mostrarCV() {
  cvInfo.hidden = !cvActual;
  cvNombre.textContent = cvActual?.original_name || '';
  verCV.hidden = !cvActual;
  progreso();
}

async function cargarCV(perfil) {
  cvActual = null;

  if (perfil.cv_file_id) {
    cvActual = comprobar(await supabase
      .from('file_assets')
      .select('id, storage_key, original_name')
      .eq('id', perfil.cv_file_id)
      .single());
  }

  mostrarCV();
}

async function borrarArchivo(registro) {
  comprobar(await supabase.storage
    .from('candidate-cvs')
    .remove([registro.storage_key]));

  comprobar(await supabase
    .from('file_assets')
    .delete()
    .eq('id', registro.id));
}

archivo.addEventListener('change', async () => {
  const file = archivo.files?.[0];
  if (!file) return;

  const tipos = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const extension = file.name.split('.').pop().toLowerCase();

  if (
    !['pdf', 'doc', 'docx'].includes(extension) ||
    !tipos.includes(file.type) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  ) {
    archivo.value = '';
    mensaje('Selecciona un PDF, DOC o DOCX de máximo 5 MB.', true);
    return;
  }

  if (!candidato) {
    archivo.value = '';
    mensaje('Primero debes iniciar sesión.', true);
    return;
  }

  archivo.disabled = true;
  mensaje('Subiendo currículum...');

  let ruta = null;
  let nuevo = null;

  try {
    await asegurarPerfil();

    const { data: sesion } = await supabase.auth.getUser();
    const uid = sesion.user.id;

    ruta = `${uid}/${crypto.randomUUID()}.${extension}`;

    comprobar(await supabase.storage
      .from('candidate-cvs')
      .upload(ruta, file, {
        contentType: file.type,
        upsert: false
      }));

    nuevo = comprobar(await supabase
      .from('file_assets')
      .insert({
        uploaded_by: candidato.id,
        storage_key: ruta,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size
      })
      .select('id, storage_key, original_name')
      .single());

    comprobar(await supabase
      .from('candidate_profiles')
      .update({ cv_file_id: nuevo.id })
      .eq('user_id', candidato.id)
      .select('user_id')
      .single());

    const anterior = cvActual;
    cvActual = nuevo;
    mostrarCV();

    mensaje('Currículum guardado correctamente.');

    // Limpiar el archivo anterior solo después de guardar el nuevo.
    if (anterior) {
      try {
        await borrarArchivo(anterior);
      } catch (error) {
        console.warn('Limpieza del CV anterior:', error);
        mensaje(
          'Nuevo CV guardado. El archivo anterior requiere limpieza.',
          true
        );
      }
    }

  } catch (error) {
    console.error('Error subiendo CV:', error);
    mensaje('No se pudo subir el CV: ' + error.message, true);

    if (nuevo) {
      await supabase.from('file_assets')
        .delete().eq('id', nuevo.id);
    }

    if (ruta) {
      await supabase.storage.from('candidate-cvs')
        .remove([ruta]);
    }
  } finally {
    archivo.value = '';
    archivo.disabled = false;
  }
});

verCV.addEventListener('click', async () => {
  if (!cvActual) return;

  try {
    const resultado = comprobar(await supabase.storage
      .from('candidate-cvs')
      .createSignedUrl(cvActual.storage_key, 120));

    window.open(resultado.signedUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    mensaje('No se pudo abrir el CV: ' + error.message, true);
  }
});

quitarCV.addEventListener('click', async () => {
  if (!cvActual) return;
  if (!confirm('¿Eliminar tu currículum?')) return;

  quitarCV.disabled = true;

  try {
    const anterior = cvActual;

    comprobar(await supabase
      .from('candidate_profiles')
      .update({ cv_file_id: null })
      .eq('user_id', candidato.id)
      .select('user_id')
      .single());

    cvActual = null;
    mostrarCV();

    try {
      await borrarArchivo(anterior);
      mensaje('Currículum eliminado correctamente.');
    } catch (error) {
      console.warn('Limpieza pendiente:', error);
      mensaje(
        'CV desvinculado del perfil, pero falta limpiar el archivo.',
        true
      );
    }
  } catch (error) {
    mensaje('No se pudo quitar el CV: ' + error.message, true);
  } finally {
    quitarCV.disabled = false;
  }
});

// GUARDAR DATOS Y HABILIDADES

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (!form.reportValidity() || !candidato) return;

  let datosHabilidades;

  try {
    datosHabilidades = prepararHabilidades();
  } catch (error) {
    mensaje(error.message, true);
    return;
  }

  boton.disabled = true;
  mensaje('Guardando perfil...');

  try {
    await asegurarPerfil();

    const datos = {
      phone: valor('telefono') || null,
      location: valor('ubicacion') || null,
      occupation: valor('profesion') || null,
      education_summary: valor('estudios') || null,
      experience_years: Number($('perfil-experiencia').value),
      professional_summary: valor('resumen') || null,
      updated_at: new Date().toISOString()
    };

    if (permitePersonalizadas) {
      datos.custom_skills =
        datosHabilidades.personalizadas.join(', ');
    }

    comprobar(await supabase
      .from('candidate_profiles')
      .update(datos)
      .eq('user_id', candidato.id)
      .select('user_id')
      .single());

    await guardarRelaciones(datosHabilidades.ids);

    mensaje('Perfil y habilidades guardados correctamente.');
    progreso();

  } catch (error) {
    console.error('Error guardando:', error);
    mensaje('No se pudo completar el guardado: ' + error.message, true);
  } finally {
    boton.disabled = false;
  }
});

// CARGAR PERFIL

form.addEventListener('input', progreso);

async function iniciar() {
  boton.disabled = true;
  archivo.disabled = true;
  habilidades.disabled = true;
  mensaje('Cargando perfil...');

  try {
    const sesion = comprobar(await supabase.auth.getUser());
    if (!sesion.user) throw new Error('Debes iniciar sesión.');

    candidato = comprobar(await supabase
      .from('users')
      .select('id, full_name, email, role_id, status')
      .eq('auth_user_id', sesion.user.id)
      .single());

    if (candidato.role_id !== 1 || candidato.status !== 'active') {
      throw new Error('Esta cuenta no es de candidato activo.');
    }

    $('perfil-nombre').value = candidato.full_name || '';
    $('perfil-correo').value = candidato.email || sesion.user.email;
    $('perfil-nombre').readOnly = true;

    await asegurarPerfil();

    const perfil = comprobar(await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', candidato.id)
      .single());

    const campos = {
      telefono: perfil.phone,
      ubicacion: perfil.location,
      profesion: perfil.occupation,
      estudios: perfil.education_summary,
      resumen: perfil.professional_summary
    };

    for (const [campo, contenido] of Object.entries(campos)) {
      $('perfil-' + campo).value = contenido || '';
    }

    $('perfil-experiencia').value = perfil.experience_years ?? 0;

    const errores = [];

    try {
      await cargarHabilidades(perfil);
    } catch (error) {
      console.error('Error de habilidades:', error);
      errores.push('Habilidades: ' + error.message);
    }

    try {
      await cargarCV(perfil);
    } catch (error) {
      console.error('Error de CV:', error);
      errores.push('Currículum: ' + error.message);
    }

    habilidades.disabled = !habilidadesCargadas;
    archivo.disabled = false;

    progreso();

    mensaje(
      errores.length
        ? errores.join(' | ')
        : 'Perfil listo para editar.',
      errores.length > 0
    );

  } catch (error) {
    console.error('Error cargando perfil:', error);
    mensaje('No se pudo cargar el perfil: ' + error.message, true);
  } finally {
    boton.disabled = !candidato || !habilidadesCargadas;
  }
}

iniciar();
