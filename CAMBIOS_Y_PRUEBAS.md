# Entrega de archivos completos — LinkNoDin

## Qué se entrega

ZIP de reemplazos con las mismas rutas relativas del proyecto original (carpeta superior `Prototipo/`), más ZIP de proyecto completo sin `node_modules` ni `.git`.

**No se reemplaza la base de datos automáticamente con un ZIP**. En el SQL Editor, usa primero los scripts complementarios `03` y `04` (lee README.md). Conserva las 41 tablas y el SQL `ln26` ya ejecutado en el proyecto.

## Integraciones realizadas

- Inicio de sesión/registro Supabase y navegación por rol, sin sesión local de seguridad.
- Verificación empresarial por RPC; publicación y postulación transaccionales por RPC `ln26`.
- Catálogo de vacantes, búsqueda, mapas, postulaciones, preguntas, guardados y gestión empresarial.
- CV privado (subir/reemplazar/quitar), perfil, habilidades y logos de empresas (con complemento SQL).
- Paneles, estadísticas, empresas verificadas, valoraciones, cursos y foros reales.
- Recursos, guías, progreso, notificaciones y preferencias en Supabase.
- Recuperación por correo Supabase Auth y formulario nuevo de contraseña.
- Ocultación de vistas estáticas antiguas en los módulos convertidos y actualización de textos incompatibles con la versión integrada.

## Verificaciones automáticas realizadas

- `node --check` para 57 archivos JavaScript: **sin errores de sintaxis**.
- `npm test`: **correcto**.
- Referencias a scripts, CSS, imágenes y enlaces locales en 39 páginas HTML: **sin rutas faltantes**.
- Respuesta de servidor local `serve.mjs`: **HTTP 200**.
- Se intentó una prueba de navegador automatizada, pero el entorno bloqueó el acceso a `127.0.0.1` desde Chromium. No podemos afirmar que no existan errores de runtime.
- No se cuenta con credenciales privadas para ejecutar operaciones reales en Supabase.

## Lo que debe probar el equipo antes de entregar

Registra pruebas para candidato/empresa/admin de `FUNCIONALIDADESPENDIENTES.txt`. En especial: registro, RLS, currículums, permisos entre empresas, curso con vídeo, recuperación de contraseña, foros, reportes, correo, compatibilidad móvil, contraste dark mode, enlaces y despliegue. Comprueba el historial en `application_status_history` y las notificaciones reales.

Los correos de notificación adicionales y los pagos siguen siendo dependencias externas y no se deben dar por implementados.

## Reemplazo

1. Haz respaldo del proyecto y del Supabase.
2. Descomprime `LINKNODIN_ARCHIVOS_PARA_REEMPLAZAR.zip` en la ubicación que contiene la carpeta `Prototipo/`. Permite reemplazar archivos cuando se solicite.
3. Ejecuta SQL complementario 03, SQL complementario 04; conserva SQL ln26.
4. Abre terminal dentro de `Prototipo`, ejecuta `npm install`, `npm test`, `npm run dev`.
5. Para comprobar problemas concretos usa DevTools → Console y Network; envía el error textual y la página/rol.
