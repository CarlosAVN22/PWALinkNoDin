/* LinkNoDin: autenticación real de candidatos y empresas con Supabase.
   El registro empresarial requiere la migración SQL de esta entrega.
   La sesión de compatibilidad NO es fuente de permisos de base de datos. */
import { supabase } from '/js/supabase-config.js';

const formLogin = document.getElementById('ld-login');
const formRegister = document.getElementById('ld-register');
const status = document.getElementById('ld-status');
const message = (text, type = 'info') => {
    if (status) {
        status.textContent = text;
        status.dataset.kind = type;
    }
};

function cacheForOldPages(perfil, email) {
    // Retrocompatibilidad solo de la respuesta; no se mantiene una sesión paralela local.
    return {candidate:'candidato',company:'empresa',admin:'admin'}[perfil.rol] || 'candidato';
}

async function loadProfile(user) {
    const {data, error} = await supabase.from('users')
        .select('id, full_name, status, role_id')
        .eq('auth_user_id', user.id)
        .single();
    if (error) throw new Error('No se pudo consultar tu perfil: ' + error.message);
    if (data.status !== 'active') throw new Error('Tu cuenta no está activa.');
    // Los ID de roles 1/2/3 fueron verificados en esta base de datos.
    // La autorización real debe validarse mediante RLS, no con este valor del navegador.
    const rol = ({1:'candidate',2:'company',3:'admin'}[data.role_id]);
    if (!rol) throw new Error('No se pudo identificar tu rol.');
    return {...data, rol};
}

function destination(role) {
    const qs = new URLSearchParams(location.search);
    const next = qs.get('next');
    if (next && next.startsWith('/doc/') && !next.startsWith('//') && !next.includes('\\')) {
        if (next.startsWith('/doc/admin/') && role !== 'admin') return '/doc/general/index.html';
        if (next.startsWith('/doc/empresa/') && role !== 'empresa') return '/doc/general/index.html';
        if (next.startsWith('/doc/candidato/') && role !== 'candidato') return '/doc/general/index.html';
        return next;
    }
    return role === 'admin' ? '/doc/admin/admin.html' :
        role === 'empresa' ? '/doc/empresa/empresa-panel.html' :
        '/doc/candidato/candidato.html';
}

if (formLogin) {
    const params = new URLSearchParams(location.search);
    if (params.has('registrado')) message('Cuenta creada. Ya puedes iniciar sesión.');
    formLogin.addEventListener('submit', async (event) => {
        event.preventDefault();
        const inputs = formLogin.querySelectorAll('input');
        const email = inputs[0].value.trim().toLowerCase();
        const password = formLogin.querySelector('input[type=password]').value;
        const button = formLogin.querySelector('button[type=submit]');
        button.disabled = true;
        message('Verificando tus credenciales...');
        try {
            const {data, error} = await supabase.auth.signInWithPassword({email,password});
            if (error) throw error;
            const perfil = await loadProfile(data.user);
            const role = cacheForOldPages(perfil, data.user.email.toLowerCase());
            message('Inicio de sesión correcto.', 'success');
            location.assign(destination(role));
        } catch (error) {
            message(error.message === 'Invalid login credentials' ?
                'Correo o contraseña incorrectos.' : error.message, 'error');
        } finally { button.disabled = false; }
    });
}

if (formRegister) {
    const isCompany = formRegister.dataset.role === 'empresa';
    formRegister.addEventListener('submit', async (event) => {
        event.preventDefault();
        const fields = [...formRegister.querySelectorAll('input')];
        const button = formRegister.querySelector('button[type=submit], button:not([type])');
        let name, email, password, confirmation, company;

        if (isCompany) {
            company = {
                commercial_name: fields[0].value.trim(),
                representative: fields[1].value.trim(),
                phone: fields[3].value.trim(),
                sector: document.getElementById('company-sector').value,
                city: document.getElementById('company-city').value
            };
            name = company.representative;
            email = fields[2].value.trim().toLowerCase();
            password = fields[4].value;
            confirmation = fields[5].value;
            if (company.commercial_name.length < 2 || company.commercial_name.length > 120) {
                return message('El nombre de la empresa debe tener entre 2 y 120 caracteres.', 'error');
            }
            if (!company.phone || company.phone.length > 30 || !company.sector || !company.city) {
                return message('Completa teléfono, sector y ciudad de la empresa.', 'error');
            }
        } else {
            name = fields[0].value.trim();
            email = fields[1].value.trim().toLowerCase();
            password = fields[2].value;
            confirmation = fields[3].value;
        }

        if (name.length < 3 || name.length > 160) {
            return message('Escribe un nombre completo válido.', 'error');
        }
        if (password.length < 8) {
            return message('La contraseña debe tener al menos 8 caracteres.', 'error');
        }
        if (password !== confirmation) {
            return message('Las contraseñas no coinciden.', 'error');
        }

        button.disabled = true;
        message('Creando cuenta en Supabase...');
        try {
            // No mezclar una cuenta nueva con otra sesión ya iniciada.
            const {data: current, error: currentError} = await supabase.auth.getUser();
            if (currentError && currentError.name !== 'AuthSessionMissingError') throw currentError;
            if (current?.user) {
                throw new Error('Primero cierra la sesión actual para registrar otra cuenta.');
            }

            const metadata = {full_name: name};
            if (isCompany) {
                // El trigger validado en PostgreSQL determina el rol y crea companies.
                // No se solicita ni concede el rol admin desde el navegador.
                Object.assign(metadata, {
                    account_type: 'company',
                    company_name: company.commercial_name,
                    company_phone: company.phone,
                    company_sector: company.sector,
                    company_city: company.city
                });
            }
            const {data, error} = await supabase.auth.signUp({
                email, password,
                options: {
                    data: metadata,
                    emailRedirectTo: location.origin + '/doc/general/login.html'
                }
            });
            if (error) throw error;
            if (!data.user) throw new Error('No se pudo confirmar la creación de la cuenta.');
            if (!data.session) {
                return message('Solicitud recibida. Si tu correo requiere confirmación, revísalo antes de iniciar sesión.', 'success');
            }

            const perfil = await loadProfile(data.user);
            if (isCompany && perfil.rol !== 'company') {
                await supabase.auth.signOut();
                throw new Error('No se asignó el perfil empresarial. Comprueba que ejecutaste el SQL de registro de empresas antes de registrarte.');
            }
            const role = cacheForOldPages(perfil, data.user.email.toLowerCase());
            location.assign(destination(role));
        } catch (error) {
            let detail = error.message || 'Error desconocido';
            if (detail.includes('User already registered')) detail = 'Ese correo ya está registrado. Usa Iniciar sesión.';
            if (detail.includes('email rate limit exceeded')) detail = 'Se alcanzó el límite de correos de Supabase. Revisa la configuración del proveedor Email.';
            message('No se pudo registrar: ' + detail, 'error');
        } finally {
            button.disabled = false;
        }
    });
}
