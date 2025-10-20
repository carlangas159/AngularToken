import Fastify from 'fastify';
import cors from '@fastify/cors';

import Redis from 'ioredis';
import ClientController from './controllers/clientController';
import ParamModel from './models/paramModel';
import DiagnosticController from './controllers/diagnosticController';

/**
 * Inicia el microservicio de clientes: carga parámetros en Redis y arranca Fastify.
 *
 * Ejemplos:
 * // Ejecutar localmente
 * start();
 *
 * // En Docker Compose se arranca por defecto al ejecutar el contenedor
 *
 * // Llamadas de prueba:
 * // curl -X POST http://localhost:3002/clients/register -d '{"name":"Ana","email":"a@e.com","token":"12345678"}'
 */
async function start(): Promise<void> {
  const server = Fastify({ logger: true });
  server.register(cors, { origin: true });

  const redisHost = process.env.REDIS_HOST || 'redis';
  const redis = new Redis({ host: redisHost });

  // Cargar parámetros desde la base de datos hacia Redis
  async function loadParamsWithRetry(maxAttempts = 8): Promise<void> {
    let attempt = 0;
    let delay = 1000; // ms
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        server.log.info(`Intento de carga de parámetros desde BD a Redis (intento ${attempt})`);
        const params = await ParamModel.list();
        for (const p of params) {
          await redis.set(p.param_key, p.param_value);
        }
        server.log.info('Parámetros cargados en Redis');
        return;
      } catch (err) {
        server.log.warn(`Error cargando parámetros (intento ${attempt}): ${err?.message || err}`);
        // esperar antes de reintentar
        await new Promise((res) => setTimeout(res, delay));
        delay = Math.min(30000, delay * 2);
      }
    }
    server.log.error('No se pudieron cargar parámetros en Redis tras varios intentos');
  }

  // Llamar la carga con reintentos en background y no bloquear el arranque
  loadParamsWithRetry().catch((err) => server.log.error('loadParamsWithRetry fallo inesperado', err));

  // Registrar rutas
  ClientController.registerRoutes(server, redis);
  // Registrar rutas de diagnóstico (ver /diagnostic/*)
  DiagnosticController.registerRoutes(server, redis);

  const port = Number(process.env.PORT || 3002);
  await server.listen({ port, host: '0.0.0.0' });
  server.log.info(`Clients service running on ${port}`);
}

start().catch((err) => {
  console.error('Error starting clients service', err);
  process.exit(1);
});
