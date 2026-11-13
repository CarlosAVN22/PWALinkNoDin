LinkNoDin
Actualizado: 12/11/2026

OBJETIVO
---------
Este documento resume lo que ya se implementó en la integración Node/Express
con Supabase y define el flujo recomendado para que cada integrante migre o
agregue su módulo sin duplicar lógica ni debilitar los permisos.

ESTADO ACTUAL
-------------
- Supabase sigue siendo la plataforma de Auth, PostgreSQL, RLS y Storage.
- Node/Express agrega una API para centralizar operaciones del backend.
- La API tiene un piloto de perfil propio: GET /api/v1/me.
Remover luego, esto solo lo puse para probar si conseguia hacerlo furular.

- El módulo admin consulta Supabase con el token del usuario y verifica en
  servidor la sesión y el rol admin de LND.
- El frontend admin usa el API para empresas, reportes, categorías de
  cursos/foros, cursos/temas, usuarios, seguridad, panel y estadísticas.
- Los scripts actualizan los elementos HTML existentes; no ocultan ni
  reconstruyen las tarjetas, tablas y modales del diseño original.
- La cuenta de servidor SUPABASE_SECRET_KEY se usa solo en Node para Auth
  Admin, consultas administrativas y auditoría; nunca se envía al navegador.
- No hay modo demo ni pruebas automatizadas locales.

IMPORTANTE: GET /api/v1/me solo probó una lectura de perfil propio. El usuario
ya confirmó que el dashboard admin carga con su cuenta administradora de LND.
Las escrituras (invitaciones, edición/eliminación, moderación, preferencias y
verificación) aún deben probarse individualmente contra Supabase.

ARQUITECTURA Y RESPONSABILIDADES
--------------------------------
Flujo de una solicitud:
  navegador -> ruta -> middleware -> controlador -> servicio -> Supabase

Estructura del backend:
  src/routes/       Define URL, método HTTP y middleware de la ruta.
  src/middleware/   Autenticación, rol, validación y manejo de errores.
  src/controllers/  Lee datos validados, llama al servicio y arma la respuesta.
  src/services/     Consultas/operaciones Supabase y reglas del caso de uso.







Reglas para mantener la separación:
1. Las rutas no contienen consultas SQL/Supabase ni lógica de interfaz.
2. Los controladores no consultan Supabase; delegan en servicios y responden.
3. Los servicios no conocen Express ni envían respuestas HTTP. Propagan errores
   de Supabase y lanzan ServiceError para errores de negocio esperados.
4. errorHandler convierte errores a respuestas HTTP/JSON centralizadas.
5. Valida en el backend parámetros, IDs, estados y cuerpo JSON. La validación
   del navegador mejora la experiencia, pero no sustituye la del servidor.
6. Usa el cliente Supabase creado por el middleware con el access token de la
   solicitud. No uses service_role para saltarte RLS.
7. La autorización real permanece en Auth, funciones/roles y políticas RLS.
   Ocultar un boton o revisar un rol solo en JavaScript no es seguridad.

IMPLEMENTACIÓN PARA UN NUEVO MÓDULO
-----------------------------------
Antes de programar, el responsable del modulo debe:

1. Definir el alcance: pantallas, operaciones, tablas/RPC, datos de entrada,
   respuestas esperadas y quién puede ejecutar cada operación.
2. Confirmar con el equipo de Supabase que las tablas/funciones están expuestas
   a la Data API y que las politicas RLS permiten exactamente esas operaciones.
   No asumir permisos ni crear politicas amplias para que "funcione".
3. Revisar si ya existe una ruta, servicio, función SQL o flujo de frontend
   equivalente. Reutilizarlo y no duplicar consultas.
4. Implementar en este orden:
   a. Middleware/validador: autenticar, comprobar rol si corresponde y validar
      path params, query params y body.
   b. Servicio: realizar las consultas/CRUD de Supabase usando el contexto
      autenticado; propagar errores y representar errores de negocio con
      ServiceError.
   c. Controlador: llamar al servicio y responder JSON con el formato común.
   d. Ruta: conectar endpoint, validadores, middleware y controlador.
   e. Frontend: consumir el endpoint, presentar estados de carga/vacio/error y
      actualizar la pantalla tras guardar.
   f. Documentación: registrar endpoints, permisos, configuración y límites.
5. Mantener el patron existente. No agregar models/repositories, capas nuevas,
   dependencias ni archivos compartidos si el modulo no los necesita.
6. Entregar el cambio acotado al modulo y coordinar cambios de archivos comunes
   como validators.js, app.js, navigation y políticas SQL antes de editarlos.


Recomiendo que se cree un InfoApi{Modulo}.txt donde se pongan los endpoints e info algo asi como el que hice para Admin, aunque le falta


CONEXIÓN DEL FRONTEND AL API
----------------------------
Para operaciones admin, importar:
  public/js/admin/admin-api.js

adminRequest obtiene la sesión activa de Supabase, manda:
  Authorization: Bearer <access_token>
y devuelve la propiedad data de la respuesta del API. Ejemplos:
  adminRequest("/companies")
  adminRequest("/courses/15/status", {
    method: "PATCH",
    body: { status: "hidden" }
  })

No enviar contraseñas, service_role ni secretos desde el navegador. El API
vuelve a validar el token y el rol admin; no confía en el rol del frontend.

Para desarrollo local, el frontend debe abrirse desde:
  http://localhost:3000
La API escucha por defecto en:
  http://localhost:3001
El CORS local permite http://localhost:3000. Si se usa otro origen, configurar
FRONTEND_ORIGIN en el entorno del backend. Si el API tiene otra URL, configurar
el meta lnd-api-base-url en las paginas admin que consumen Node, con una URL
terminada en /api/v1.


CONFIGURACION Y ARRANQUE LOCAL
------------------------------
1. Instalar dependencias una vez:
     npm install
2. Completar .env con las variables requeridas:
     API_PORT=3001
     FRONTEND_ORIGIN=http://localhost:3000
     SUPABASE_URL=<URL del proyecto>
     SUPABASE_PUBLISHABLE_KEY=<clave pública>
     SUPABASE_SECRET_KEY=<clave secreta del servidor>
     FRONTEND_BASE_URL=http://localhost:3000
     La clave secreta va únicamente en el .env local/servidor. No pegarla en
     JavaScript, HTML, README, Postman compartido o repositorio.
   No compartir el contenido de .env por chat.
3. Abrir dos terminales desde la raíz del proyecto:
   Terminal 1:
     npm run dev:api
   Terminal 2:
     npm run dev
4. Abrir:
     http://localhost:3000/doc/general/index.html
5. Para probar rutas admin, iniciar sesión en el navegador con una cuenta que
   tenga rol admin activo de LND. Una cuenta normal recibe 403; sin
   SUPABASE_SECRET_KEY configurada, la API admin responde 503.

FUNCIONES ADMIN Y LÍMITES
------------------------
- Usuarios: lista, invitación por correo de Supabase, edición de nombre/rol/
  estado (suspender también bloquea Auth), envío de restablecimiento y
  eliminación permanente. No permite
  cambiar el correo desde Editar, suspender/eliminar la sesión propia ni
  desactivar/eliminar al único administrador activo.
- Seguridad: lee alertas existentes, guarda preferencias y marca alertas como
  revisadas; registra acciones administrativas en admin_audit_log.
- Las preferencias no generan alertas automáticamente. Los accesos y eventos
  Auth de Supabase no son una bitácora disponible para este módulo LND.
- Las invitaciones y restablecimientos requieren que el proveedor de correo de
  Supabase esté configurado y que las URL de restablecer/login estén autorizadas.
- La suspensión establece un bloqueo de Auth y el middleware de Node rechaza
  el perfil suspendido. Las políticas RLS deben comprobar también el estado si
  se requiere bloquear inmediatamente sesiones con tokens aún vigentes.
- Eliminar una cuenta es permanente; las filas relacionadas dependen de las
  claves foráneas/cascadas del esquema.
- El detalle de endpoints, bodies y restricciones está en InfoApiAdmin.txt.

DOCUMENTACION DE REFERENCIA
---------------------------
- README.md: pasos del proyecto, API actual y límites conocidos.
- CAMBIOS_Y_PRUEBAS.md: historial de cambios/verificaciones si esta disponible.
- .env.example: nombres de variables requeridas; nunca contiene secretos reales.
