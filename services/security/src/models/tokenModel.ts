import pool from '../db';

/**
 * Modelo para la gestión de tokens de seguridad.
 *
 * Métodos:
 * - createToken(token: string): Promise<number>
 * - findToken(token: string): Promise<{id: number, token: string, valid: number} | null>
 */
export default class TokenModel {
  /**
   * Crea un token en la base de datos.
   *
   * Ejemplos:
   * // Crear token '12345678'
   * await TokenModel.createToken('12345678');
   *
   * // Crear token generado aleatoriamente
   * await TokenModel.createToken(generateToken());
   *
   * // Reintentar crear token si hay colisión
   * await TokenModel.createToken('00000000');
   *
   * @param token Token de seguridad (8 dígitos)
   * @returns ID del registro insertado
   */
  static async createToken(token: string): Promise<number> {
    const [result]: any = await (pool as any).execute(
      'INSERT INTO tokens (token, valid) VALUES (?, 1)',
      [token]
    );
    return result.insertId as number;
  }

  /**
   * Busca un token en la base de datos.
   *
   * Ejemplos:
   * // Buscar token existente
   * const t = await TokenModel.findToken('12345678');
   *
   * // Buscar token no existente devuelve null
   * const t2 = await TokenModel.findToken('00000000');
   *
   * // Validar bandera "valid"
   * const t3 = await TokenModel.findToken('87654321');
   *
   * @param token Token a buscar
   * @returns Objeto con campos id, token y valid o null si no existe
   */
  static async findToken(token: string): Promise<{ id: number; token: string; valid: number } | null> {
    const [rows]: any = await (pool as any).execute('SELECT id, token, valid FROM tokens WHERE token = ? LIMIT 1', [token]);
    if (rows && rows.length > 0) {
      return rows[0] as { id: number; token: string; valid: number };
    }
    return null;
  }
}
