import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import TokenModel from '../models/tokenModel';

/**
 * Controlador de rutas para tokens de seguridad.
 *
 * Provee dos endpoints:
 * - POST /token -> genera y guarda un token de 8 dígitos
 * - POST /validate -> valida existencia y vigencia de un token
 */
export default class TokenController {
  /**
   * Registra las rutas en la instancia de Fastify
   *
   * Ejemplos:
   * // En el arranque del servidor
   * TokenController.registerRoutes(fastify);
   *
   * // Llamada para probar la ruta /token usando curl
   * // curl -X POST http://localhost:3001/token
   *
   * // Llamada para validar token
   * // curl -X POST http://localhost:3001/validate -H "Content-Type: application/json" -d '{"token":"12345678"}'
   *
   * @param server Instancia de Fastify
   */
  static registerRoutes(server: FastifyInstance) {
    // Esquema de respuesta para /token
    const tokenResponseSchema = {
      type: 'object',
      properties: {
        id: { type: 'number' },
        token: { type: 'string' }
      }
    } as const;

    // Generar token de 8 dígitos
    server.post('/token', {
      schema: {
        response: {
          200: tokenResponseSchema
        }
      }
    }, async (req: FastifyRequest, reply: FastifyReply) => {
      const token = Math.floor(10000000 + Math.random() * 90000000).toString();
      const id = await TokenModel.createToken(token);
      return reply.send({ id, token });
    });

    // Validación de token: recibe { token: string }
    const validateBodySchema = {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', minLength: 8, maxLength: 8 }
      }
    } as const;

    const validateResponseSchema = {
      type: 'object',
      properties: {
        ok: { type: 'boolean' }
      }
    } as const;

    server.post('/validate', {
      schema: {
        body: validateBodySchema,
        response: { 200: validateResponseSchema }
      }
    }, async (req: FastifyRequest, reply: FastifyReply) => {
      const body: any = req.body || {};
      const token = body.token;
      if (!token) {
        return reply.status(400).send({ ok: false, error: 'token requerido' });
      }
      const found = await TokenModel.findToken(token);
      const valid = !!found && found.valid === 1;
      return reply.send({ ok: valid });
    });
  }
}
