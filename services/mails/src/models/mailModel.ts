import pool from '../db';

/**
 * Modelo para registrar correos enviados en la tabla `mails`.
 *
 * Ejemplos:
 * // Registrar un correo
 * await MailModel.create({ clientId: 1, to_email: 'a@e.com', subject: 'Hola', body: 'Bienvenido' });
 *
 * // Registrar sin clientId
 * await MailModel.create({ to_email: 'b@e.com', subject: 'Test', body: 'Cuerpo' });
 */
export default class MailModel {
  /**
   * Inserta un registro en la tabla mails
   * @param data Objeto con clientId?, to_email, subject, body
   */
  static async create(data: { clientId?: number; to_email: string; subject: string; body: string }): Promise<number> {
    const [result]: any = await pool.execute(
      'INSERT INTO mails (client_id, to_email, subject, body) VALUES (?, ?, ?, ?)',
      [data.clientId || null, data.to_email, data.subject, data.body]
    );
    return result.insertId as number;
  }
}

