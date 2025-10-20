import pool from '../db';

/**
 * Modelo para la tabla clients.
 *
 * Ejemplos de uso:
 * // Crear cliente
 * await ClientModel.create({ name: 'Juan', email: 'j@e.com' });
 *
 * // Obtener cliente por id
 * const c = await ClientModel.findById(1);
 *
 * // Listar clientes
 * const list = await ClientModel.list();
 */
export default class ClientModel {
  /**
   * Inserta un cliente en la base de datos.
   * @param data Objeto con name y email
   * @returns id insertado
   */
  static async create(data: { name: string; email: string }): Promise<number> {
    const [result]: any = await pool.execute(
      'INSERT INTO clients (name, email) VALUES (?, ?)',
      [data.name, data.email]
    );
    return result.insertId as number;
  }

  /**
   * Busca un cliente por id
   * @param id Identificador
   * @returns Datos del cliente o null
   */
  static async findById(id: number): Promise<{ id: number; name: string; email: string } | null> {
    const [rows]: any = await pool.execute('SELECT id, name, email FROM clients WHERE id = ? LIMIT 1', [id]);
    if (rows && rows.length > 0) return rows[0];
    return null;
  }

  /**
   * Lista clientes
   */
  static async list(): Promise<Array<{ id: number; name: string; email: string }>> {
    const [rows]: any = await pool.execute('SELECT id, name, email FROM clients');
    return rows as Array<{ id: number; name: string; email: string }>;
  }
}

