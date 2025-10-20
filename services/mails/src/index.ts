import amqp from 'amqplib';
import dotenv from 'dotenv';
import MailModel from './models/mailModel';

dotenv.config();

/**
 * Conecta a RabbitMQ y consume mensajes de la cola 'mail_queue'.
 * Implementa reconexión con backoff exponencial y manejo robusto de errores
 * al procesar cada mensaje.
 *
 * Ejemplos de uso:
 * // 1) Ejecutar el servicio en entorno local
 * // node dist/index.js (o npm start según la configuración)
 *
 * // 2) Probar enviando un mensaje desde otro servicio (clients)
 * // clients publicará: { clientId, name, email, subject, body }
 *
 * // 3) Publicar manualmente desde node para verificar consumo
 * // const amqp = require('amqplib'); const c = await amqp.connect('amqp://guest:guest@localhost:5672'); const ch = await c.createChannel(); ch.assertQueue('mail_queue'); ch.sendToQueue('mail_queue', Buffer.from(JSON.stringify({ clientId:1, email:'a@a.com', subject:'Hi', body:'Test' }))); await ch.close(); await c.close();
 */
async function start(): Promise<void> {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
  const q = 'mail_queue';

  let attempt = 0;

  while (true) {
    try {
      attempt += 1;
      console.log(`Conectando a RabbitMQ (intento ${attempt}) ${url}`);
      const conn = await amqp.connect(url);
      conn.on('error', (err: any) => {
        console.error('Connection error', err);
      });
      conn.on('close', () => {
        console.warn('Conexión a RabbitMQ cerrada, reintentando...');
      });

      const ch = await conn.createChannel();
      await ch.assertQueue(q, { durable: true });
      console.log('Mails service listening on queue', q);

      ch.consume(q, async (msg: any) => {
        if (!msg) return; // No message
        try {
          const payload = JSON.parse(msg.content.toString());
          // Normalizar campos: aceptar 'email' o 'to_email'
          const toEmail = payload.email || payload.to_email || null;
          if (!toEmail) {
            console.error('Mensaje inválido: falta campo email/to_email', payload);
            // rechazar sin requeue
            ch.nack(msg, false, false);
            return;
          }

          // Registrar en DB
          await MailModel.create({ clientId: payload.clientId, to_email: toEmail, subject: payload.subject || '', body: payload.body || '' });
          ch.ack(msg);
          console.log('Mail recorded for', toEmail);
        } catch (err: any) {
          console.error('Error processing message', err);
          try {
            // Evitar requeue infinito: nack sin requeue
            ch.nack(msg, false, false);
          } catch (ackErr) {
            console.error('Error doing nack on message', ackErr);
          }
        }
      }, { noAck: false });

      // Esperar hasta que la conexión se cierre para reconectar
      await new Promise<void>((resolve, reject) => {
        conn.on('close', () => resolve());
        conn.on('error', (err: any) => reject(err));
      });

      // si llegamos aquí la conexión se cerró: continuar bucle para reconectar
      console.warn('RabbitMQ connection closed, will reconnect');
      attempt = 0; // reset attempts after successful connection
    } catch (err: any) {
      console.error(`Error connecting/consuming RabbitMQ (intento ${attempt}):`, err?.message || err);
      // Backoff exponencial con tope
      const backoff = Math.min(30000, 1000 * Math.pow(2, attempt));
      console.log(`Reintentando conexión en ${backoff}ms`);
      await new Promise((res) => setTimeout(res, backoff));
    }
  }
}

start().catch((err) => {
  console.error('Error starting mails service', err);
  process.exit(1);
});
