import Fastify from 'fastify';
import cors from '@fastify/cors';
import TokenController from './controllers/tokenController';

const server = Fastify({ logger: true });

server.register(cors, { origin: true });

TokenController.registerRoutes(server);

const port = Number(process.env.PORT || 3001);

server.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`Security service running on port ${port}`);
}).catch((err) => {
  console.error('Error starting security service', err);
  process.exit(1);
});
