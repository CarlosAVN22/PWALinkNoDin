# LinkNoDin — integración con Supabase (11/11/2026)

Versión integrada del portal de empleos, empresas, postulaciones, CV privado, cursos, foros y recursos. **No es una certificación de funcionamiento en producción**: debe probarse contra el proyecto privado de Supabase con usuarios de los tres roles.

## Requisitos

- Node.js 22+ y npm (requerido por la version actual del cliente Supabase).
- Acceso a la organización y proyecto de Supabase correspondiente.
- Las **41 tablas originales** y la migración `LINKNODIN_MIGRACION_BD_2026_11_11.sql` ya aplicada. Si no está aplicada, consulta antes la migración: no repitas a ciegas los SQL antiguos de etapas 4–9.
- Navegador moderno con conectividad a los módulos CDN y a Supabase.

## Pasos obligatorios en Supabase (una sola vez)

1. Respalda la base de datos.
2. En **SQL Editor**, ejecuta `database/03_catalogos_complementarios.sql` para poblar habilidades y guías.
3. En **SQL Editor**, ejecuta `database/04_complementos_frontend.sql` para habilitar logos empresariales públicos con permiso de escritura del propietario y limpieza de metadatos CV. Esta migración **añade la columna** `companies.logo_storage_key` y el bucket `company-logos` público. No modifica la privacidad de `candidate-cvs` ni `course-videos`.
4. Revisa Data API: deben estar expuestas las tablas de la aplicación y las funciones `ln26_admin_verificar_empresa`, `ln26_publicar_vacante`, `ln26_postular`, `ln26_respuestas_postulacion`, `ln26_forum_author_names` y `ln_applicant_directory` (el SQL define las funciones; Data API puede requerir configurar esquemas expuestos y permisos). Las políticas RLS se mantienen como fuente de autorización.
5. En **Authentication → URL Configuration**, agrega `http://localhost:3000/doc/general/restablecer.html` y `http://localhost:3000/doc/general/login.html` a las URL de redirección autorizadas; agrega además tus URLs reales de hosting con HTTPS. Comprueba que Email auth y el proveedor de envíos estén funcionando.
6. Verifica que `candidate-cvs` (máximo 5 MB) y `course-videos` (máximo 30 MB) sigan siendo **privados**. `company-logos` es público a propósito. Nunca pongas la `service_role` key en JavaScript, HTML o Git.

## Iniciar la aplicación

Completa `.env` con `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Para desarrollo local, el backend permite por defecto el origen `http://localhost:3000`; si publicas el frontend en otro origen, configura `FRONTEND_ORIGIN` con su URL exacta.

Si aún no instalaste las dependencias, ejecuta `npm install`. Después, inicia cada proceso en una terminal distinta:

```bash
npm run dev:api
```

```bash
npm run dev
```

Abre **http://localhost:3000/doc/general/index.html**. El frontend admin obtiene la sesión actual de Supabase y manda su access token al API en `http://localhost:3001/api/v1`; el backend vuelve a validar el usuario y el rol admin. No se usa la `service_role` key en el navegador.

Si el API se despliega en otra URL, configura el `meta` `lnd-api-base-url` en las páginas administrativas que consumen Node, con la URL base terminada en `/api/v1`.

## Modulo MVC de perfil propio

`GET /api/v1/me` es un piloto de solo lectura para probar Node con Supabase usando una cuenta normal de LND, sin requerir rol admin. El flujo es ruta → middleware (valida el token Supabase) → controlador → servicio (consulta `public.users`). La politica `user_self_read` debe estar aplicada; RLS limita la lectura al perfil del usuario autenticado. No se modifican datos.

Configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en `.env` usando los valores publicos ya presentes en `public/js/supabase-config.js`.

Para probarlo con Postman, inicia la API con `npm run dev:api` y envía `GET http://localhost:3001/api/v1/me` con el access token de una cuenta normal de LND en `Authorization: Bearer <access_token>`. Se espera HTTP 200 y un objeto `data` con el perfil propio. No se requiere rol admin y la ruta no modifica datos.

La consulta depende de la politica RLS `user_self_read`, los permisos de lectura y la función `linknodin_user_id()`.

## Modulo MVC de administracion

El backend agrupa las funciones administrativas bajo `routes`, `controllers`, `middleware` y `services`. Usa Supabase directamente y no tiene carpetas de `models` o `repositories`.
Los servicios no responden HTTP: propagan errores de consulta o errores de negocio y el `errorHandler` central los convierte en respuestas JSON.

El primer alcance incluye empresas, categorias, cursos, temas, reportes y estadisticas. La gestion administrativa de usuarios queda fuera por ahora; Auth y las operaciones de cuenta permanecen en Supabase.

### Usar la API administrativa

Configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` en `.env` y ejecuta:
```bash
npm run dev:api
```

Las rutas requieren `Authorization: Bearer <access_token>` de una cuenta con rol admin de LND:

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/companies`
- `PATCH /api/v1/admin/companies/:companyId/verification` con JSON `{"status":"verified"}` (tambien acepta `rejected` o `pending`)
- `GET|POST /api/v1/admin/categories/forum` y `/categories/course`
- `PATCH|DELETE /api/v1/admin/categories/:type/:categoryId`; DELETE desactiva la categoria, no borra el registro
- `GET /api/v1/admin/courses` y `PATCH /api/v1/admin/courses/:courseId/status`
- `GET /api/v1/admin/forum/topics` y `PATCH /api/v1/admin/forum/topics/:topicId/status`
- `GET /api/v1/admin/reports?status=open|closed|all`
- `PATCH /api/v1/admin/reports/:reportId/decision` con `{"decision":"keep"}` o `{"decision":"hide"}`

Las respuestas incluyen `meta.dataSource: "supabase"`. Las páginas de empresas, moderación de reportes, categorías y cursos, temas de foro, panel principal y estadísticas usan estas rutas. La gestión de usuarios y las páginas de seguridad siguen fuera de este módulo API. Las estadísticas no incluyen conteos de usuarios, vacantes ni postulaciones.

El middleware valida el usuario y el rol con `public.linknodin_role`. Los servicios consultan las tablas permitidas y usan el RPC existente `ln26_admin_verificar_empresa` para verificar empresas. La autorización final depende de RLS y de las funciones expuestas a la Data API. La integración está implementada, pero aún falta validarla con una cuenta admin contra el proyecto remoto.

Ya se comprobó con una cuenta normal que Node puede validar una sesión y leer el perfil propio. Eso no prueba el rol admin ni las operaciones de escritura. Para validar la integración administrativa, inicia sesión en el frontend con una cuenta admin de LND y revisa las páginas conectadas. Ya no se incluyen pruebas automatizadas locales ni modo demo.

## Rutas y módulos principales

- `public/js/general/supabase-acceso.js`: inicio de sesión y registro por Supabase Auth.
- `public/js/integrado/navegacion.js`: navegación y controles visuales por sesión real; las solicitudes directas del frontend a Supabase siguen protegidas por RLS.
- `public/js/admin/admin-empresas-supabase.js`: aprobación empresarial mediante `ln26_admin_verificar_empresa`.
- `public/js/admin/admin-reportes-supabase.js`: administración de reportes y moderación.
- `public/js/integrado/empleos.js`: catálogo, filtros, mapas, publicación `ln26_publicar_vacante`, postulación `ln26_postular`, respuestas `ln26_respuestas_postulacion`, guardados y estados.
- `public/js/integrado/perfiles.js`: perfil candidato/empresa, habilidades, CV privado y logo público (requiere ambos SQL complementarios).
- `public/js/integrado/portales.js`: paneles de candidatos/empresas, directorio y detalle de empresas, mapa.
- `public/js/cursos-foros/*`: foros, cursos, categorías y lecciones adicionales.
- `public/js/integrado/{recursos,recurso-detalle,guia-real,opiniones,notificaciones,seguridad}.js`: contenidos reales y administración.
- `public/doc/general/restablecer.html`: nueva página de restablecimiento mediante correo.

## Pruebas imprescindibles, por roles

1. Registrar candidato y empresa. Verificar que el rol se asigna correctamente en `public.users`, con empresa pendiente.
2. Intentar publicar con empresa pendiente: debe rechazarse **desde API**, además de desde UI.
3. Con administrador, verificar empresa. Publicar vacante con preguntas y ubicación.
4. Con candidato distinto, ver vacante, guardar, completar perfil y habilidades, subir CV y postular.
5. Con empresa, consultar respuestas y CV autorizado, actualizar estado; candidato debe ver el cambio y la notificación.
6. Con una segunda empresa y un segundo candidato, verificar que **no pueden ver CV, postulaciones ni perfiles privados ajenos**.
7. Probar cursos MP4/WebM y YouTube, varias lecciones, progreso, foros, reportes y moderación tras recargar.
8. Probar recuperación de contraseña desde correo real y volver a iniciar sesión.
9. Repetir con dos navegadores y en hosting, no solo localhost. Registrar errores de Console/Network.

## Alcance aún condicionado

- El envío **automático de avisos por correo** requiere un servicio/infraestructura de envío fuera del frontend. La UI permite preferencias, pero no promete correos si no se habilita ese servicio.
- Los **planes y pagos** no procesan cobros reales. Es una sección informativa, no una pasarela.
- No se han migrado registros antiguos de `localStorage` a PostgreSQL; los datos reales deben ingresarse en Supabase.
- No se ejecutaron pruebas de extremo a extremo de las operaciones administrativas contra el Supabase privado del equipo.
- **Revisar RLS y todos los casos de `FUNCIONALIDADESPENDIENTES.txt` antes de declararlo listo para entrega**. No subir directamente a `main` sin revisión y respaldo.

Consulta `CAMBIOS_Y_PRUEBAS.md` para conocer archivos, verificaciones y límites del paquete.
