# Propuesta Dockerizada — Registro de Clientes

Resumen
--------
Proyecto de ejemplo que implementa una aplicación de registro de clientes basada en una arquitectura de microservicios. Tecnologías principales:
- Frontend: Angular (SPA)
- Backend: Fastify (Node.js / TypeScript)
- Persistencia: MySQL
- Cache / parámetros: Redis
- Mensajería: RabbitMQ

Servicios incluidos
------------------
- `mysql` (MySQL 8) — puerto interno 3306 (mapeado en host en `docker-compose.yml`)
- `redis` — puerto 6379
- `rabbitmq` (con management) — puertos 5672 / 15672
- `security` (Fastify) — puerto 3001: genera y valida tokens
- `clients` (Fastify) — puerto 3002: registra clientes, carga parámetros en Redis y publica en RabbitMQ
- `mails` (consumer) — consumidor RabbitMQ que registra envíos en MySQL
- `frontend` (Angular) — puerto 4200 (desarrollo) o servido como estático según configuración

Objetivo
--------
Cumplir los requisitos técnicos de una prueba: formulario de registro en Angular con SDK que obtiene un token de 8 dígitos desde el microservicio `security`, microservicio `clients` que valida tokens, persiste clientes y publica órdenes de envío a `mail_queue` en RabbitMQ si el parámetro `enable_emails` está activo; consumidor `mails` que registra los envíos en MySQL.

Requisitos previos
------------------
- Docker y Docker Compose instalados en la máquina.
- Puertos libres (o adaptables en `docker-compose.yml`): 3306, 6379, 5672, 15672, 3001, 3002, 4200.

Arranque rápido (Windows - cmd.exe)
----------------------------------
1. Abrir cmd.exe en la carpeta raíz del proyecto (donde está `docker-compose.yml`).

```bat
cd ./
```

2. Construir y levantar todos los contenedores:

```bat
docker-compose up --build
```

3. Acceder a la UI y herramientas:
- Frontend (si corre en modo desarrollo): http://localhost:4200
- RabbitMQ management: http://localhost:15672 (usuario/clave por defecto: guest/guest)

Comprobaciones y peticiones de prueba
-------------------------------------
- Obtener token (security):

```bat
curl -X POST http://localhost:3001/token
```

- Validar token (security):

```bat
curl -X POST http://localhost:3001/validate -H "Content-Type: application/json" -d "{\"token\":\"12345678\"}"
```

- Registrar cliente (clients) — sustituye <TOKEN> por el token recibido:

```bat
curl -X POST http://localhost:3002/clients/register -H "Content-Type: application/json" -d "{\"name\":\"Prueba\",\"email\":\"prueba@local\",\"token\":\"<TOKEN>\"}"
```

Endpoints de diagnóstico (si están disponibles)
-----------------------------------------------
- `GET /diagnostic/params` → muestra el valor actual de `enable_emails` cargado en Redis.
- `POST /diagnostic/publish` → publica un mensaje de prueba en `mail_queue` (útil para validar la cadena clients → rabbitmq → mails).

Troubleshooting rápido (si `mails` no registra o `mail_queue` está vacío)
---------------------------------------------------------------------------
1. Comprobar valor `enable_emails` en Redis (Windows cmd.exe):

```bat
docker-compose exec redis redis-cli GET enable_emails
```
- Si la salida es `(nil)` o `false`, `clients` no publicará mensajes.

2. Activar envíos (forzar `enable_emails = true`) si hace falta:

```bat
docker-compose exec redis redis-cli SET enable_emails true
```

3. Reintentar publicación de prueba (diagnóstico):

```bat
curl -s -X POST http://localhost:3002/diagnostic/publish -H "Content-Type: application/json" -d "{\"name\":\"Diag\",\"email\":\"diag@local\"}"
```

4. Ver estado de la cola en RabbitMQ (management API):

```bat
curl -u guest:guest http://localhost:15672/api/queues/%2F/mail_queue
```

5. Ver registros en MySQL (tabla `mails`):

```bat
docker-compose exec mysql mysql -uroot -prootpass -e "USE microservices; SELECT * FROM mails ORDER BY id DESC LIMIT 10;"
```

Registro de diseño y cumplimiento
--------------------------------
- Frontend: formulario de registro con Reactive Forms y `SdkService` que encapsula llamadas a `security` y `clients`.
- Security: endpoint `POST /token` (genera token de 8 dígitos) y `POST /validate` (valida token).
- Clients: `POST /clients/register` valida token, persiste en tabla `clients` y, si `enable_emails` en Redis es `true`, publica en `mail_queue`.
- Mails: consumidor que escucha `mail_queue` y registra envíos en la tabla `mails`.
- Redis y RabbitMQ: usados tal como se solicitó para parámetros y mensajería.

Ubicación de archivos importantes
----------------------------------
- `docker-compose.yml` — orquestación
- `mysql/init.sql` — creación de tablas e inserción inicial de parámetros
- `services/security` — código Fastify para tokens
- `services/clients` — código Fastify, lógica Redis/RabbitMQ y endpoints de diagnóstico
- `services/mails` — consumidor RabbitMQ
- `services/frontend` — aplicación Angular y SDK
- `docs/SETUP.md` — guía ampliada de setup y troubleshooting

Contacto técnico (soporte)
--------------------------
Para consultas técnicas o ayuda con la puesta en marcha, revisa este repositorio y usar los logs de los contenedores (`docker-compose logs -f <service>`). Para soporte general: revisa el archivo `contacto.txt` dentro del repo donde se resume la propuesta y los servicios incluidos.

Buenas prácticas y siguientes pasos sugeridos
-------------------------------------------
- Añadir tests unitarios e integración para `security` y `clients`.
- Fortalecer manejo de reintentos y reconexiones (ya se implementó reconexión básica en `mails` y reintentos en publicación de `clients`).
- Para producción: servir frontend estático (build) con un servidor estático (por ejemplo nginx) y usar secretos/variables de entorno para credenciales.

Licencia y notas finales
------------------------
Proyecto de ejemplo diseñado como propuesta técnica; adaptar configuración de puertos y credenciales según tu entorno.
