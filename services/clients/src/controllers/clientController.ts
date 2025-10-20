import ClientModel from '../models/clientModel';
import ParamModel from '../models/paramModel';
import amqp from 'amqplib';

/**
 * Controlador para el microservicio de clientes.
 *
 * Provee endpoint para registrar clientes y lógica de publicación a RabbitMQ.
 */
export default class ClientController {
  /**
   * Registra las rutas del microservicio de clientes.
   *
   * Ejemplos:
   * // 1) En el arranque del servidor
   * // ClientController.registerRoutes(fastify, redis);
   *
   * // 2) Petición desde frontend (curl)
   * // curl -X POST http://localhost:3002/clients/register -H "Content-Type: application/json" -d '{"name":"Ana","email":"a@e.com","token":"12345678"}'
   *
   * // 3) Prueba manual: publicar un token inválido para ver respuesta 401
   * // curl -X POST http://localhost:3002/clients/register -H "Content-Type: application/json" -d '{"name":"X","email":"x@x.com","token":"00000000"}'
   *
   * @param server Instancia de Fastify
   * @param redis Instancia de ioredis
   */
  static registerRoutes(server: any, redis: any) {
    const bodySchema = {
      type: 'object',
      required: ['name', 'email', 'token'],
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        token: { type: 'string', minLength: 8, maxLength: 8 }
      }
    } as const;

    const responseSchema = {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        id: { type: 'number' },
        error: { type: 'string' }
      }
    } as const;

    /**
     * Publica un mensaje en RabbitMQ usando un canal de confirmación y reintentos.
     *
     * Ejemplos:
     * // 1) Publicar con retry por defecto
     * // await publishMailWithRetry(payload);
     *
     * // 2) Publicar con 5 reintentos
     * // await publishMailWithRetry(payload, 5);
     *
     * // 3) Manejar errores en el llamador
     * // try { await publishMailWithRetry(payload); } catch (e) { console.error(e); }
     *
     * @param payload Objeto a enviar por la cola
     * @param maxRetries Número máximo de reintentos (por defecto 3)
     */
    async function publishMailWithRetry(payload: any, maxRetries = 3): Promise<void> {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
      const q = 'mail_queue';
      let attempt = 0;
      let delay = 500; // ms

      while (attempt <= maxRetries) {
        attempt += 1;
        try {
          server.log.info(`Intentando publicar en RabbitMQ (intento ${attempt})`, { queue: q });
          const conn = await amqp.connect(url);
          // Usar confirm channel para asegurar entrega
          const ch = await conn.createConfirmChannel();
          await ch.assertQueue(q, { durable: true });
          ch.sendToQueue(q, Buffer.from(JSON.stringify(payload)), { persistent: true });
          // Esperar confirmación de todos los mensajes enviados
          await ch.waitForConfirms();
          await ch.close();
          await conn.close();
          server.log.info('Mensaje publicado correctamente en RabbitMQ', { queue: q, payload });
          return;
        } catch (err: any) {
          server.log.error(`Error publicando en RabbitMQ en intento ${attempt}: ${err?.message || err}`);
          if (attempt > maxRetries) {
            // Re-intento agotado
            server.log.error('Reintentos agotados al publicar en RabbitMQ', { payload });
            throw err;
          }
          // Backoff exponencial
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        }
      }
    }

    server.post('/clients/register', {
      schema: {
        body: bodySchema,
        response: { 200: responseSchema }
      }
    }, async (req: any, reply: any) => {
      const body: any = req.body || {};
      const name = body.name;
      const email = body.email;
      const token = body.token;

      if (!name || !email || !token) {
        return reply.status(400).send({ ok: false, error: 'name, email y token son requeridos' });
      }

      // Validar token con microservicio de seguridad
      try {
        const securityUrl = process.env.SECURITY_URL || 'http://security:3001';
        server.log.info('Validando token con security', { token, securityUrl });
        const res = await (globalThis as any).fetch(`${securityUrl}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!data.ok) {
          server.log.warn('Token inválido', { token });
          return reply.status(401).send({ ok: false, error: 'token inválido' });
        }
      } catch (err) {
        server.log.error('Error validando token con security', err);
        return reply.status(500).send({ ok: false, error: 'error validando token' });
      }

      // Guardar cliente
      let clientId: number;
      try {
        clientId = await ClientModel.create({ name, email });
      } catch (err) {
        server.log.error('Error guardando cliente en BD', err);
        return reply.status(500).send({ ok: false, error: 'error guardando cliente' });
      }

      // Consultar parámetro enable_emails en Redis
      let enableEmails = false;
      try {
        const param = await redis.get('enable_emails');
        enableEmails = param === 'true';
        server.log.info('Valor de enable_emails desde Redis', { value: param });
      } catch (err) {
        server.log.error('Error consultando Redis para enable_emails', err);
        // Continuar: no bloqueamos el registro por fallo de Redis
      }

      if (enableEmails) {
        // Enviar orden a RabbitMQ con manejo de errores y reintentos
        try {
          const payload = { clientId, name, email, subject: 'Bienvenido', body: 'Gracias por registrarte' };
          await publishMailWithRetry(payload, 3);
        } catch (err) {
          // No fallamos el registro del cliente, solo registramos el error
          server.log.error('No se pudo publicar la orden de mail después de reintentos', err);
        }
      } else {
        server.log.info('enable_emails está desactivado; no se publiará mensaje en RabbitMQ');
      }

      return reply.send({ ok: true, id: clientId });
    });
  }
}
