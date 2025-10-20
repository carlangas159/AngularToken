import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import amqp from 'amqplib';

/**
 * Controlador con endpoints de diagnóstico para el servicio `clients`.
 *
 * Endpoints:
 * - GET /diagnostic/params -> muestra parámetros cargados en Redis (enable_emails)
 * - POST /diagnostic/publish -> publica un mensaje de prueba en la cola 'mail_queue'
 *
 * Ejemplos:
 * // 1) Obtener parámetros
 * // curl -s http://localhost:3002/diagnostic/params
 *
 * // 2) Publicar mensaje de prueba
 * // curl -s -X POST http://localhost:3002/diagnostic/publish -H "Content-Type: application/json" -d '{"name":"Prueba","email":"t@t.com"}'
 *
 * // 3) Publicar con payload personalizado
 * // curl -s -X POST http://localhost:3002/diagnostic/publish -H "Content-Type: application/json" -d '{"name":"X","email":"x@x.com","subject":"Hola","body":"Cuerpo"}'
 */
export default class DiagnosticController {
  /**
   * Registra las rutas de diagnóstico.
   * @param server Fastify instance
   * @param redis Instancia de Redis
   */
  static registerRoutes(server: FastifyInstance, redis: any) {
    server.get('/diagnostic/params', async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const val = await redis.get('enable_emails');
        return reply.send({ ok: true, enable_emails: val });
      } catch (err: any) {
        server.log.error('Error leyendo enable_emails desde Redis en diagnostic', err);
        return reply.status(500).send({ ok: false, error: 'error leyendo Redis' });
      }
    });

    server.post('/diagnostic/publish', async (req: FastifyRequest, reply: FastifyReply) => {
      const body: any = (req as any).body || {};
      const name = body.name || 'Diagnostico';
      const email = body.email || 'diag@local';
      const subject = body.subject || 'Prueba de publicación';
      const messageBody = body.body || 'Mensaje de prueba desde endpoint diagnostico';

      const payload = { clientId: 0, name, email, subject, body: messageBody };
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
      const q = 'mail_queue';
      const maxRetries = Number(process.env.DIAG_PUBLISH_RETRIES || '3');

      let attempt = 0;
      let delay = 500;
      while (attempt <= maxRetries) {
        attempt += 1;
        try {
          server.log.info(`Diagnostic: intentando publicar (intento ${attempt}) a ${url}`);
          const conn = await amqp.connect(url);
          const ch = await conn.createConfirmChannel();
          await ch.assertQueue(q, { durable: true });
          ch.sendToQueue(q, Buffer.from(JSON.stringify(payload)), { persistent: true });
          await ch.waitForConfirms();
          await ch.close();
          await conn.close();
          server.log.info('Diagnostic: mensaje publicado correctamente', { payload });
          return reply.send({ ok: true, published: true, attempt });
        } catch (err: any) {
          server.log.error(`Diagnostic: error publicando en RabbitMQ (intento ${attempt})`, err?.message || err);
          if (attempt > maxRetries) {
            return reply.status(500).send({ ok: false, error: 'no se pudo publicar', details: err?.message || String(err) });
          }
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        }
      }

      return reply.status(500).send({ ok: false, error: 'no se pudo publicar' });
    });
  }
}

