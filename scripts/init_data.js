// Script de inicialización para poblar la base de datos con datos de prueba
// Ejecutar usando node scripts/init_data.js o como servicio en docker-compose

const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'rootpass';
  const database = process.env.DB_DATABASE || 'microservices';

  const conn = await mysql.createConnection({ host, user, password });
  console.log('Conectando a MySQL en', host);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
  await conn.query(`USE \`${database}\`;`);

  // Insertar parámetros de ejemplo
  await conn.query("INSERT INTO params (param_key, param_value) VALUES ('enable_emails', 'true') ON DUPLICATE KEY UPDATE param_value=VALUES(param_value);");

  // Insertar tokens de prueba
  const tokens = ['11111111', '22222222', '33333333'];
  for (const t of tokens) {
    try {
      await conn.query('INSERT INTO tokens (token, valid) VALUES (?, 1)', [t]);
    } catch (e) {
      // ignore duplicates
    }
  }

  // Insertar clientes de prueba
  try {
    await conn.query("INSERT INTO clients (name, email) VALUES ('Cliente Demo', 'demo@ejemplo.com')");
  } catch (e) {}

  console.log('Inicialización completada');
  await conn.end();
}

main().catch((err) => {
  console.error('Error inicializando datos:', err);
  process.exit(1);
});

