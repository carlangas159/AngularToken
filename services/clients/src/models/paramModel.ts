import pool from '../db';

/**
 * Modelo para parámetros globales (tabla params).
 *
 * Ejemplos:
 * // Obtener todos los parámetros
 * const p = await ParamModel.list();
 *
 * // Obtener un parámetro por clave
 * const v = await ParamModel.getByKey('enable_emails');
 *
 * // Actualizar un parámetro
 * await ParamModel.set('enable_emails', 'false');
 */
export default class ParamModel {
  /**
   * Lista todos los parámetros de la tabla params
   * @returns Array de objetos { param_key, param_value }
   */
  static async list(): Promise<Array<{ param_key: string; param_value: string }>> {
    const [rows]: any = await pool.execute('SELECT param_key, param_value FROM params');
    return rows as Array<{ param_key: string; param_value: string }>;
  }

  /**
   * Obtiene un parámetro por clave
   * @param key Clave del parámetro
   */
  static async getByKey(key: string): Promise<string | null> {
    const [rows]: any = await pool.execute('SELECT param_value FROM params WHERE param_key = ? LIMIT 1', [key]);
    if (rows && rows.length > 0) return rows[0].param_value;
    return null;
  }

  /**
   * Inserta o actualiza un parámetro
   * @param key Clave
   * @param value Valor
   */
  static async set(key: string, value: string): Promise<void> {
    await pool.execute(
      'INSERT INTO params (param_key, param_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE param_value = VALUES(param_value)',
      [key, value]
    );
  }
}

