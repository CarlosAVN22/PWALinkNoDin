# LinkNoDin

Portal web de empleo que conecta candidatos y empresas. Incluye gestión de
vacantes y postulaciones, perfiles, recursos, cursos, foros, planes y un panel
administrativo. La plataforma usa Supabase para autenticación, datos y
almacenamiento.

## Tecnologías

- Frontend: HTML, CSS y JavaScript servido desde `public/`.
- Servidor de archivos: Node.js (`serve.mjs`), por defecto en el puerto `3000`.
- API: Node.js y Express (`src/`), por defecto en el puerto `3001`.
- Datos y autenticación: Supabase Auth, PostgreSQL, Data API y Row Level
  Security (RLS).
- Archivos: Supabase Storage; los CV y videos de cursos deben permanecer
  privados. El bucket de logos empresariales es público intencionalmente.

## Módulos principales

### Acceso y navegación

El inicio de sesión, registro y recuperación de contraseña usan Supabase Auth.
La navegación consulta la sesión y el perfil real para mostrar las secciones
permitidas. Los roles del sistema son candidato, empresa y administrador.
Ocultar una opción en el navegador no reemplaza la autorización del servidor ni
las políticas RLS.

### Candidato

El panel permite consultar vacantes, guardar empleos, postularse, revisar el
estado e historial de postulaciones y comunicarse sobre ellas. Las operaciones
de candidato se sirven desde `/api/v1/candidate`; el catálogo público y los
empleos guardados usan `/api/v1/empleo`.

### Empresa

Las empresas pueden completar y actualizar su perfil. Las cuentas pendientes
de verificación pueden gestionar su perfil; publicar y administrar vacantes
o consultar postulaciones requiere verificación. El módulo incluye preguntas
de postulación, cambios de estado, notas, mensajes y acceso autorizado al CV
mediante una URL firmada de corta duración.

API: `/api/v1/company`. El alta inicial se completa con `POST /onboard`.
Consulta `InfoApiEmpresa.txt` para los endpoints y formatos de solicitud.

### Empleos y postulaciones

El portal ofrece búsqueda y consulta de empleos, detalle de empresa, guardados
y flujos de postulación. Las operaciones de escritura verifican la sesión y la
relación entre candidato, empresa, vacante y postulación; la publicación y
postulación pueden depender de funciones SQL de Supabase.

### Cursos y foros

Incluye catálogo y progreso de cursos, publicación según permisos, categorías,
temas, respuestas y reportes de contenido. Las rutas de integración se
encuentran bajo `/api/v1/cursos-foros`; las vistas públicas pueden consultarse
sin sesión, pero las operaciones de escritura requieren autenticación.

### Recursos, guía, opiniones y notificaciones

El módulo general ofrece recursos y secciones de guía, progreso personal,
opiniones de empresas, notificaciones y preferencias. Las rutas Node
correspondientes se agrupan bajo `/api/v1/general`; algunas lecturas públicas
no requieren inicio de sesión.

### Administración

El panel requiere una cuenta activa con rol administrador y usa
`/api/v1/admin`. Incluye:

- Panel y estadísticas calculadas con conteos de Supabase.
- Verificación de empresas.
- Administración de usuarios: invitaciones, cambios permitidos, suspensión,
  restablecimiento por correo y eliminación, con restricciones para proteger
  la cuenta propia y al último administrador activo.
- Categorías de cursos y foros, cursos y temas.
- Revisión de reportes de contenido.
- Preferencias de seguridad, alertas guardadas y bitácora administrativa.

Las estadísticas reflejan los conteos existentes en la base de datos. La
sección de seguridad consulta las alertas guardadas, permite administrar las
preferencias y muestra las acciones registradas en la bitácora. Consulta
`InfoApiAdmin.txt` para los endpoints y sus restricciones.

### Planes

Presenta los planes disponibles y el flujo de selección correspondiente a la
experiencia del portal.

## Arquitectura

La API mantiene las responsabilidades separadas:

```text
navegador -> rutas -> middleware -> controladores -> servicios -> Supabase
```

- `src/routes/`: URL, método HTTP, middleware y controlador.
- `src/middleware/`: autenticación, permisos, validación y errores.
- `src/controllers/`: coordina la solicitud y forma la respuesta HTTP.
- `src/services/`: reglas de negocio y consultas a Supabase.
- `public/js/`: interfaz y clientes frontend para los endpoints.

La mayoría de respuestas de API usa `{ "data": ... }`; los endpoints
administrativos también pueden incluir `meta.dataSource`. El cliente de
administración envía el access token como `Authorization: Bearer <token>`.

## Configuración y ejecución local

### Requisitos

- Node.js 22 o superior y npm.
- Acceso a un proyecto Supabase configurado con el esquema, funciones SQL,
  políticas RLS, buckets y proveedor de correo requeridos por los módulos.

### Preparar entorno

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y completa los valores del proyecto:

   ```env
   API_PORT=3001
   FRONTEND_ORIGIN=http://localhost:3000
   SUPABASE_URL=
   SUPABASE_PUBLISHABLE_KEY=
   SUPABASE_SECRET_KEY=
   ```

3. Configura la URL y la clave **publicable** correspondientes en
   `public/js/supabase-config.js`. Nunca pongas `SUPABASE_SECRET_KEY` en el
   frontend.

4. Inicia el API en una terminal:

   ```bash
   npm run dev:api
   ```

5. Inicia el servidor del frontend en otra terminal:

   ```bash
   npm run dev
   ```

6. Abre <http://localhost:3000/doc/general/index.html>.

`npm start` inicia solo el servidor frontend; el API debe iniciarse por
separado. Si se usa otro origen para el frontend, actualiza
`FRONTEND_ORIGIN`. Para cambiar la dirección del API usada por una página
administrativa, configura su meta `lnd-api-base-url` con la URL base terminada
en `/api/v1`.

## Base de datos y seguridad

- Supabase PostgreSQL es la base de datos de la integración actual; no se usa
  MySQL.
- Aplica los scripts SQL después de respaldar la base y confirmar que
  corresponden al esquema y al estado actual del proyecto Supabase.
- `ActualizacionTablas.txt` documenta el esquema relacional inicial del
  proyecto y se conserva como referencia histórica.
- Los permisos deben verificarse en el API y en RLS. No abras políticas
  generales para hacer que una pantalla funcione.
- `SUPABASE_SECRET_KEY` es solo para operaciones privilegiadas del servidor.
  Nunca la incluyas en JavaScript, HTML, capturas, ZIP públicos ni Git.
- Configura las URL de redirección de Supabase Auth para registro, invitaciones
  y recuperación de contraseña, y el proveedor de correo correspondiente.

## Validación funcional

Para comprobar la experiencia completa, utiliza cuentas separadas de
candidato, empresa pendiente, empresa verificada y administrador:

1. Registro, inicio y cierre de sesión, y recuperación de contraseña.
2. Denegación de rutas cuando falta sesión o el rol/estado no tiene permiso.
3. Verificación de empresa, publicación de vacante y postulación.
4. Visibilidad de postulaciones, mensajes y CV únicamente para sus
   participantes autorizados.
5. Cursos, progreso, foros, reportes y moderación después de recargar.
6. Gestión de usuarios, estadísticas, preferencias, alertas y bitácora.
7. Políticas RLS y almacenamiento privado desde cuentas que no son propietarias.
8. Consola y pestaña Network del navegador, y despliegue en el origen HTTPS
   definitivo.

---

<div align="center">
  <h2>Nuestro equipo</h2>
  <p><em>Contribuidores de LinkNoDin</em></p>
</div>

<table align="center" border="1" cellpadding="10" cellspacing="0">
  <caption><strong>Equipo de desarrollo</strong></caption>
  <thead>
    <tr>
      <th align="center">Integrante</th>
      <th align="center">Carnét</th>
    </tr>
  </thead>
  <tbody>
    <tr><td align="center"> Kevin Alexander Salazar Estrada</td><td align="center"><code>2024-SE-651</code></td></tr>
    <tr><td align="center"> Javier Alexander Martinez Vasquez</td><td align="center"><code>2025-MV-652</code></td></tr>
    <tr><td align="center"> Carlos Alfredo Vejar Noguera</td><td align="center"><code>2024-VN-601</code></td></tr>
    <tr><td align="center"> Marlin Yolanda Afane Vasquez</td><td align="center"><code>2024-AV-601</code></td></tr>
  </tbody>
</table>

<p align="center">
  <img src="public/img/logo.png" alt="Logo de LinkNoDin" width="150">
</p>

<p align="center">
  <img src="public/img/group.png" alt="Logo de LinkNoDin" width="350">
</p>

<h1 align="center">LinkNoDin</h1>
<p align="center"><strong>Conectando oportunidades laborales</strong></p>

