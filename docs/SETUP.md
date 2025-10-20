# SETUP - Propuesta: Registro de Clientes (Angular + Fastify + Redis + RabbitMQ + MySQL)

Objetivo
--------
Documentar los pasos necesarios para levantar la propuesta por primera vez y explicar el propósito de cada componente del sistema, el flujo de eventos y comandos útiles para pruebas y depuración.

Requisitos previos
------------------
- Docker y Docker Compose instalados y funcionando en la máquina host.
- Puertos libres en la máquina anfitriona: 3306 (MySQL), 6379 (Redis), 5672 y 15672 (RabbitMQ), 4200 (frontend Angular si se sirve localmente) y 3001/3002 (servicios Fastify por defecto).
- (Opcional) curl instalado para probar endpoints desde la línea de comandos.

Estructura principal del repositorio
-----------------------------------
- `docker-compose.yml`       -> Orquesta todos los servicios (MySQL, Redis, RabbitMQ, security, clients, mails, frontend, db_init)
- `mysql/init.sql`           -> Script SQL que crea las tablas necesarias y un parámetro por defecto
- `scripts/init_data.js`    -> Script Node para poblar datos iniciales (tokens, params, clientes de prueba)
- `services/security`        -> Microservicio Fastify que genera y valida tokens
- `services/clients`         -> Microservicio Fastify que registra clientes, consulta Redis y publica en RabbitMQ
- `services/mails`           -> Consumidor RabbitMQ que registra órdenes de envío en MySQL (no envía correos reales)
- `services/frontend`        -> Proyecto Angular mínimo (app de registro) compilado y servido por nginx
- `docs/SETUP.md`            -> Este documento

Resumen del flujo de la aplicación
----------------------------------
1) `security` expone endpoints para generar y validar tokens.
2) `clients` valida solicitudes de registro contra `security`, persiste clientes en MySQL y, si el parámetro `enable_emails` está activo (cargado en Redis), publica mensajes en la cola `mail_queue` de RabbitMQ.
3) `mails` consume `mail_queue` y registra órdenes en la tabla `mails` en MySQL.
4) `frontend` (Angular) ofrece una UI mínima que permite generar un token y registrar un cliente usando el SDK.

Descripción de cada servicio
----------------------------
1) MySQL
   - Imagen: `mysql:8.0`
   - El script `mysql/init.sql` crea las tablas: `tokens`, `clients`, `params`, `mails` y un parámetro por defecto.
   - Credenciales por defecto (definidas en `docker-compose.yml`): `root` / `rootpass`.

2) Redis
   - Almacena parámetros globales cargados por el servicio `clients` al iniciar (por ejemplo: `enable_emails`).

3) RabbitMQ
   - Imagen: `rabbitmq:3-management` con interfaz de administración disponible.
   - Cola usada por la aplicación: `mail_queue`.
   - UI de administración: http://localhost:15672 (usuario/clave por defecto: `guest`/`guest`).

4) Security (`services/security`)
   - Framework: Fastify (TypeScript).
   - Endpoints principales:
     - `POST /token` -> genera un token de 8 dígitos y lo guarda en MySQL.
     - `POST /validate` (body `{ "token": "..." }`) -> valida si el token existe y está activo.
   - Usa validación de esquemas JSON con los `schema` de Fastify.

5) Clients (`services/clients`)
   - Framework: Fastify (TypeScript).
   - Comportamiento en arranque: carga los parámetros desde la tabla `params` en MySQL hacia Redis.
   - Endpoint `POST /clients/register` espera `name`, `email`, `token` y valida el token llamando a `security` (`/validate`).
   - Si la validación es correcta, guarda el cliente en la tabla `clients` de MySQL.
   - Consulta el parámetro `enable_emails` en Redis; si vale `true`, publica un mensaje en la cola `mail_queue`.

6) Mails (`services/mails`)
   - Consumidor que escucha la cola `mail_queue` y registra cada orden de envío en la tabla `mails` en MySQL.
   - No realiza envío real de correos por diseño.

7) Frontend (`services/frontend`)
   - Proyecto Angular mínimo (TypeScript, Reactive Forms) con un componente de registro y un servicio SDK (`SdkService`) que encapsula llamadas a los microservicios.
   - La imagen final compila la app y la sirve por `nginx` en el contenedor `frontend`.

Inicializar y levantar todo (primer arranque)
--------------------------------------------
1) Abrir un terminal (Windows cmd.exe) y ubicarse en la carpeta raíz del proyecto (donde está `docker-compose.yml`):

   cd C:\Users\carlo\WebstormProjects\Linkediin

2) Construir y levantar los contenedores (modo interactivo):

   docker-compose up --build

   - Este comando construirá las imágenes de los servicios `security`, `clients`, `mails` y `frontend` (si no se han construido) y arrancará `mysql`, `redis` y `rabbitmq`.
   - Un servicio `db_init` (definido en `docker-compose.yml`) ejecutará `scripts/init_data.js` contra la base de datos para poblar datos de ejemplo (tokens y parámetros). Si falla por timing, se puede ejecutar manualmente (ver sección de Troubleshooting).

3) Acceder al frontend en el navegador (si la imagen frontend expone el puerto 4200):

   http://localhost:4200

Comprobaciones y comandos útiles (Windows cmd.exe)
-------------------------------------------------
- Obtener un token manualmente (security):
  curl -X POST http://localhost:3001/token

- Validar token (security):
  curl -X POST http://localhost:3001/validate -H "Content-Type: application/json" -d "{\"token\":\"11111111\"}"

- Registrar cliente (clients) — sustituye <TOKEN> por el token recibido:
  curl -X POST http://localhost:3002/clients/register -H "Content-Type: application/json" -d "{\"name\":\"Ana\",\"email\":\"ana@ejemplo.com\",\"token\":\"<TOKEN>\"}"

- Re-ejecutar `db_init` manualmente si la carga inicial falló por timing:
  docker-compose run --rm db_init

- Ver registros `mails` en MySQL desde el host con docker-compose disponible:
  docker-compose exec mysql mysql -uroot -prootpass -e "USE microservices; SELECT * FROM mails ORDER BY id DESC LIMIT 10;"

- Ver la cola y mensajes en RabbitMQ: abrir http://localhost:15672 (guest/guest), ir a la pestaña "Queues" y revisar `mail_queue`.

Comprobaciones de servicios y logs
---------------------------------
- Ver logs de un servicio en ejecución (por ejemplo `clients`):
  docker-compose logs -f clients

- Ver estado de todos los contenedores:
  docker-compose ps

Flujo de registro de un cliente (resumen)
-----------------------------------------
1) El frontend solicita o muestra un token generado por `security` (`POST /token`).
2) El usuario envía el formulario con `name`, `email` y `token` al endpoint de `clients` (`POST /clients/register`).
3) `clients` llama internamente a `security` (`/validate`) para validar el token.
4) Si el token es válido, `clients` inserta el cliente en la tabla `clients` de MySQL.
5) `clients` consulta en Redis el parámetro `enable_emails`; si `true`, publica un mensaje en la cola `mail_queue`.
6) `mails` consume `mail_queue` y crea un registro en la tabla `mails`.

Posibles problemas y soluciones
------------------------------
- El contenedor `frontend` tarda si npm instala dependencias grandes; la primera compilación puede tardar varios minutos en máquinas lentas.
- `db_init` puede fallar por problemas de timing (MySQL aún no listo). Soluciones:
  - Esperar unos segundos y reintentar: `docker-compose run --rm db_init`.
  - Revisar logs del contenedor `db_init` o `mysql` para identificar errores.

- Puertos ocupados: si algún puerto (por ejemplo 3306) ya está en uso, detén el servicio local que lo usa o modifica `docker-compose.yml` para cambiar el puerto.

- Errores en validación de token durante `clients/register`:
  - Asegúrate de que `security` está levantado y accesible en la URL y puerto configurados en `services/clients`.
  - Revisar logs de `clients` y `security` usando `docker-compose logs -f clients` y `docker-compose logs -f security`.

- Si la tabla `mails` está vacía y no hay mensajes en la cola `mail_queue` (problema frecuente):
  - Motivo común: el parámetro `enable_emails` no está presente en Redis (o es `false`). El microservicio `clients` solo publica a RabbitMQ si `enable_emails` == `true`.
  - Comprobar el valor actual en Redis (Windows cmd.exe):

    docker-compose exec redis redis-cli GET enable_emails

    - Si la salida es `(nil)` o `false`, entonces no se publicarán correos.
  - Para forzar la publicación (activar envíos) ejecute:

    docker-compose exec redis redis-cli SET enable_emails true

  - Después de activar la clave, vuelva a realizar un registro de cliente o use el endpoint diagnóstico (si está disponible):

    curl -s -X POST http://localhost:3002/diagnostic/publish -H "Content-Type: application/json" -d "{\"name\":\"Diag\",\"email\":\"diag@local\"}"

  - Verifique la cola y la tabla `mails`:

    curl -u guest:guest http://localhost:15672/api/queues/%2F/mail_queue

    docker-compose exec mysql mysql -uroot -prootpass -e "USE microservices; SELECT * FROM mails ORDER BY id DESC LIMIT 10;"

  - Si `clients` registra que intentó publicar (logs con "Intentando publicar" o "Mensaje publicado correctamente") pero la cola no contiene mensajes, revise que `RABBITMQ_URL` apunte al contenedor correcto y que RabbitMQ esté en funcionamiento (`docker-compose ps` y `docker-compose logs rabbitmq`).

- En general, para problemas de conectividad entre servicios (Redis, RabbitMQ, MySQL), revisar logs individuales y usar los comandos `docker-compose logs -f <service>` y `docker-compose ps` para confirmar que los contenedores están corriendo y accesibles.

Buenas prácticas y siguientes pasos sugeridos
-------------------------------------------
- Añadir validaciones unitarias e integración para los microservicios (`security`, `clients`, `mails`).
- Implementar mecanismos de reintento y reconexión para Redis y RabbitMQ en caso de errores transitorios.
- Usar variables de entorno y secrets gestionados (no hardcodear contraseñas) para entornos de producción.
- Añadir monitoreo y métricas (por ejemplo Prometheus/Grafana) y trazas distribuidas para seguimiento de las peticiones.

Ubicación de los archivos importantes
------------------------------------
- `services/security`  -> código Fastify y modelos
- `services/clients`   -> código Fastify, modelos, Redis
- `services/mails`     -> consumidor RabbitMQ
- `services/frontend`  -> proyecto Angular
- `mysql/init.sql`     -> script SQL de creación de tablas
- `scripts/init_data.js` -> script Node para poblar datos
- `docker-compose.yml` -> orquesta todo

Contacto
--------
Para ajustes adicionales (por ejemplo: convertir el frontend a un repo Angular más completo, añadir tests, o cambiar puertos/credenciales), puedo implementarlos y darte los pasos para ejecutar localmente o en CI.
