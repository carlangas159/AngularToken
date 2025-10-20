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
        const res = await (globalThis as any).fetch(`${securityUrl}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!data.ok) {
          return reply.status(401).send({ ok: false, error: 'token inválido' });
        }
      } catch (err) {
        return reply.status(500).send({ ok: false, error: 'error validando token' });
      }

      // Guardar cliente
      const clientId = await ClientModel.create({ name, email });

      // Consultar parámetro enable_emails en Redis
      const param = await redis.get('enable_emails');
      const enableEmails = param === 'true';

      if (enableEmails) {
        // Enviar orden a RabbitMQ
        try {
          const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672');
          const ch = await conn.createChannel();
          const q = 'mail_queue';
          await ch.assertQueue(q, { durable: true });
          const payload = { clientId, name, email, subject: 'Bienvenido', body: 'Gracias por registrarte' };
          ch.sendToQueue(q, Buffer.from(JSON.stringify(payload)), { persistent: true });
          await ch.close();
          await conn.close();
        } catch (err) {
          // Log y continuar
          server.log.error('Error enviando a RabbitMQ', err);
        }
      }

      return reply.send({ ok: true, id: clientId });
    });
  }
}
