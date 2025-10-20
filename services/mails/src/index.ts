import amqp from 'amqplib';
import dotenv from 'dotenv';
import MailModel from './models/mailModel';

dotenv.config();

/**
 * Consumidor simple de RabbitMQ que escucha la cola 'mail_queue' y registra
 * los mensajes en la tabla `mails`.
 *
 * Ejemplos:
 * // 1) Ejecutar el servicio
 * start().catch(console.error);
 *
 * // 2) Enviar mensaje desde clients (payload JSON esperado):
 * // { clientId: 1, name: 'Ana', email: 'a@e.com', subject: 'Bienvenido', body: '...' }
 *
 * // 3) Publicar manualmente a la cola para pruebas (ejemplo usando node):
 * // const amqp = require('amqplib');
 * // const c = await amqp.connect('amqp://guest:guest@localhost:5672');
 * // const ch = await c.createChannel();
 * // ch.sendToQueue('mail_queue', Buffer.from(JSON.stringify({ clientId:1, email:'t@t.com', subject:'Hi', body:'Test' })));
 */

async function start(): Promise<void> {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  const q = 'mail_queue';
  await ch.assertQueue(q, { durable: true });
  console.log('Mails service listening on queue', q);

  ch.consume(q, async (msg: any) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      // Registrar en DB
      await MailModel.create({ clientId: payload.clientId, to_email: payload.email, subject: payload.subject, body: payload.body });
      ch.ack(msg);
      console.log('Mail recorded for', payload.email);
    } catch (err) {
      console.error('Error processing message', err);
      // Nack para requeue=false (descartar) o true según criterio
      ch.nack(msg, false, false);
    }
  });
}

start().catch((err) => {
  console.error('Error starting mails service', err);
  process.exit(1);
});
